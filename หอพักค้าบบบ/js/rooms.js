import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";
import { generatePromptPayPayload } from "./promptpay.js";

await loadTheme();

let currentUser = null;
let currentRoom = null;

// ================= AUTH =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.replace("login.html");
        return;
    }

    try {

        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (!userSnap.exists()) {
            alert("ไม่พบข้อมูลผู้ใช้");
            return;
        }

        currentUser = userSnap.data();

        document.getElementById("userName").innerText =
            "ยินดีต้อนรับ " + currentUser.fullname;

        // ยังไม่มีห้อง
        if (!currentUser.room) {

            document.getElementById("roomInfo").innerHTML = `
                <h2>คุณยังไม่มีห้องพัก</h2>
                <br>
                <a href="booking.html" class="action-btn repair">
                    ไปจองห้องพัก
                </a>
            `;

            document.getElementById("facilityList").innerHTML = "";
            document.getElementById("leaveRoomBtn").style.display = "none";

            return;
        }

        // โหลดข้อมูลห้อง
        const roomSnap = await getDoc(doc(db, "rooms", currentUser.room));

        if (!roomSnap.exists()) {
            alert("ไม่พบข้อมูลห้อง");
            return;
        }

        currentRoom = roomSnap.data();

        loadRoom();
        listenLeaveRequest(user.uid);

    } catch (err) {

        console.error(err);

    }

});

// ================= ROOM =================

function loadRoom() {

    document.getElementById("roomInfo").innerHTML = `

        <h2 style="color:#ff2b2b">
            ห้อง ${currentRoom.roomNumber}
        </h2>

        <br>

        <p><b>ประเภท :</b> ${currentRoom.type}</p>

        <p><b>ชั้น :</b> ${currentRoom.floor}</p>

        <p><b>ค่าเช่า :</b> ${currentRoom.price} บาท / เดือน</p>

        <p><b>สถานะ :</b> เข้าพักแล้ว</p>

        <br>

        <p>${currentRoom.description}</p>

    `;

    document.getElementById("facilityList").innerHTML = `

        <li>✔ เครื่องปรับอากาศ</li>
        <li>✔ เตียงนอน</li>
        <li>✔ ตู้เสื้อผ้า</li>
        <li>✔ โต๊ะอ่านหนังสือ</li>
        <li>✔ ห้องน้ำในตัว</li>
        <li>✔ Wi-Fi ฟรี</li>
        <li>✔ ระเบียง</li>

    `;

}

// ================= SEND REQUEST =================

document.getElementById("leaveRoomBtn").addEventListener("click", async () => {

    if (!confirm("ยืนยันการส่งคำขอเลิกเช่า ?")) return;

    try {

            await setDoc(doc(db, "leaseRequests", auth.currentUser.uid), {

            userId: auth.currentUser.uid,
            fullname: currentUser.fullname,
            roomId: currentUser.room,
            roomNumber: currentRoom.roomNumber,
            roomType: currentRoom.type,
            rent: currentRoom.price,
            status: "pending",
            createdAt: serverTimestamp()

        });
        
        // ================= NOTIFY OWNER =================


const ownerQuery = query(
    collection(db,"users"),
    where("role","==","owner")
);


const ownerSnap = await getDocs(ownerQuery);



ownerSnap.forEach(async(owner)=>{


    await addDoc(
        collection(db,"notifications"),
        {

            userId: owner.id,

            title:"มีคำขอเลิกเช่า",

            message:
            `${currentUser.fullname} ขอเลิกเช่าห้อง ${currentRoom.roomNumber}`,


            type:"leave",


            read:false,


            createdAt:
            serverTimestamp()

        }
    );


});

        alert("ส่งคำขอเลิกเช่าเรียบร้อย");

        checkLeaveRequest(auth.currentUser.uid);

    } catch (err) {

        console.error(err);

    }

});

// ================= REALTIME CHECK STATUS =================

function listenLeaveRequest(uid) {

    const leaveBtn =
    document.getElementById("leaveRoomBtn");

    const statusBox =
    document.getElementById("leaveStatus");


    onSnapshot(
        doc(db,"leaseRequests",uid),

        async (snap)=>{


            // ไม่มีคำขอ

            if(!snap.exists()){

                leaveBtn.disabled=false;

                leaveBtn.innerText="ขอเลิกเช่า";

                statusBox.innerHTML="";

                return;

            }



            const data=snap.data();



            if(data.roomId !== currentUser.room){

                leaveBtn.disabled=false;

                statusBox.innerHTML="";

                return;

            }



            // PENDING

            if(data.status==="pending"){


                leaveBtn.disabled=true;

                leaveBtn.innerText="ส่งคำขอแล้ว";


                statusBox.innerHTML=`

                <h3 style="color:orange">
                ⏳ รอเจ้าของหออนุมัติ
                </h3>

                `;


            }



           // APPROVED
else if (data.status === "approved") {

    leaveBtn.disabled = true;
    leaveBtn.innerText = "รอชำระเงิน";

    statusBox.innerHTML = `

        <h3 style="color:lightgreen">
            ✅ เจ้าของหออนุมัติแล้ว
        </h3>

        <h2>ยอดชำระ ${data.total} บาท</h2>

        <canvas id="promptpayQR"></canvas>

        <br><br>

        <button id="paidBtn" class="action-btn">
            ฉันชำระเงินแล้ว
        </button>

    `;

    // ดึงข้อมูล PromptPay จาก Firebase
        const paymentSnap = await getDoc(doc(db, "settings", "payment"));

        if (paymentSnap.exists()) {

            const payment = paymentSnap.data();

            const payload = generatePromptPayPayload(
                payment.promptpay,
                Number(data.total)
            );

            QRCode.toCanvas(
                document.getElementById("promptpayQR"),
                payload,
                {
                    width: 220
                }
            );

        }

    document.getElementById("paidBtn").onclick = async () => {

        if (!confirm("ยืนยันว่าชำระเงินแล้ว ?")) return;

        await updateDoc(
            doc(db, "leaseRequests", uid),
            {
                status: "waitingConfirm",
                paymentStatus: "paid",
                transactionId: "TX" + Date.now(),
                paidAt: new Date()
            }
        );

    };

}

            // WAIT PAYMENT CHECK

            else if(data.status==="waitingConfirm"){


                leaveBtn.disabled=true;


                leaveBtn.innerText="รอตรวจสอบ";


                statusBox.innerHTML=`

                <h3 style="color:#00c3ff">
                💳 ชำระเงินแล้ว
                </h3>


                <p>
                Transaction:
                ${data.transactionId}
                </p>


                `;


            }




            // OWNER REJECT

            else if(data.status==="rejected"){


                leaveBtn.disabled=false;


                leaveBtn.innerText=
                "ขอเลิกเช่าอีกครั้ง";


                statusBox.innerHTML=`

                <h3 style="color:red">
                ❌ เจ้าของหอปฏิเสธคำขอ
                </h3>


                <p>
                ${data.reason ?? ""}
                </p>

                `;


            }


        }

    );

}

document.getElementById("logoutBtn").addEventListener("click", async () => {

    const confirmLogout = confirm("คุณต้องการออกจากระบบใช่หรือไม่ ?");

    if (!confirmLogout) return;

    try {

        await signOut(auth);

        alert("ออกจากระบบสำเร็จ");

        window.location.href = "../index.html";

    } catch (error) {

        alert(error.message);

    }

});