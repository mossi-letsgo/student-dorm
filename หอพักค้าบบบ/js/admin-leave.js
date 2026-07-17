import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadTheme } from "../js/theme.js";

await loadTheme();

// ================= LOAD =================

async function loadLeaveRequests() {

    const container = document.getElementById("leaveContainer");
    container.innerHTML = "";

    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    const snap = await getDocs(collection(db, "leaseRequests"));

    snap.forEach(docSnap => {

        const data = docSnap.data();

        total++;

        if (data.status === "pending") pending++;
        if (data.status === "approved") approved++;
        if (data.status === "rejected") rejected++;

        if (
            data.status === "pending" ||
            data.status === "approved" ||
            data.status === "waitingConfirm"
        ) {
            renderCard(docSnap.id, data);
        }

    });

    document.getElementById("totalLeave").innerText = total;
    document.getElementById("pendingLeave").innerText = pending;
    document.getElementById("approvedLeave").innerText = approved;
    document.getElementById("rejectedLeave").innerText = rejected;

}

function renderCard(id, data) {

    const container = document.getElementById("leaveContainer");

    const rent = data.rent || (
        data.roomType === "small" ? 2500 :
        data.roomType === "medium" ? 3500 : 5000
    );

    const card = document.createElement("div");
    card.className = "card";

    let html = `
        <h3>${data.fullname}</h3>

        <p><b>ห้อง :</b> ${data.roomNumber}</p>
        <p><b>ประเภท :</b> ${data.roomType}</p>
        <p><b>ค่าเช่า :</b> ${rent.toLocaleString()} บาท</p>
        <hr>
    `;

    if (data.status === "pending") {

        html += `
            <label>ค่าน้ำ</label>
            <input type="number" id="water-${id}" value="0">

            <label>ค่าไฟ</label>
            <input type="number" id="electric-${id}" value="0">

            <label>ค่าปรับ</label>
            <input type="number" id="fine-${id}" value="0">

            <br><br>

            <button onclick="approveLeave('${id}')">
                อนุมัติ
            </button>

            <button
                style="background:#666;margin-left:10px;"
                onclick="rejectLeave('${id}')">
                ปฏิเสธ
            </button>
        `;

    }

    else if (data.status === "approved") {

        html += `
            <h3 style="color:orange;">
                รอผู้เช่าชำระเงิน
            </h3>

            <p>ยอดทั้งหมด ${data.total} บาท</p>
        `;

    }

    else if (data.status === "waitingConfirm") {

        html += `
            <h3 style="color:#00c3ff;">
                ผู้เช่าชำระเงินแล้ว
            </h3>

            <p>ยอด ${data.total} บาท</p>

            <p>Transaction : ${data.transactionId ?? "-"}</p>

            <button
                style="background:#2ecc71;margin-top:10px;"
                onclick="confirmPayment('${id}')">
                ยืนยันได้รับเงิน
            </button>
        `;

    }

    card.innerHTML = html;

    container.appendChild(card);

}

// ================= APPROVE =================

window.approveLeave = async function(id){

    const leaveRef = doc(db,"leaseRequests",id);

    const leaveSnap = await getDoc(leaveRef);

    const data = leaveSnap.data();

    let rent = 0;

    switch(data.roomType){

        case "small":
            rent = 2500;
            break;

        case "medium":
            rent = 3500;
            break;

        case "large":
            rent = 5000;
            break;

    }

    const water = Number(document.getElementById(`water-${id}`).value);

    const electric = Number(document.getElementById(`electric-${id}`).value);

    const fine = Number(document.getElementById(`fine-${id}`).value);

const subtotal = rent + water + electric + fine;

const vat = Math.round(subtotal * 0.07);

const total = subtotal + vat;


// อัปเดตคำขอเลิกเช่า

await updateDoc(
    leaveRef,
    {

        rent,
        water,
        electric,
        fine,

        vat,
        total,

        status:"approved"

    }
);


// แจ้งเตือน User

await addDoc(
collection(db,"notifications"),
{

    userId:data.userId,

    title:"คำขอเลิกเช่าได้รับอนุมัติ",

    message:
    `คำขอเลิกเช่าห้อง ${data.roomNumber} ได้รับอนุมัติ กรุณาชำระเงิน`,

    type:"leaveApprove",

    read:false,

    createdAt:
    serverTimestamp()

}
);

    alert("อนุมัติเรียบร้อย");

    loadLeaveRequests();

}

// ================= REJECT =================

window.rejectLeave = async function(id){

    if(!confirm("ปฏิเสธคำขอนี้ ?")) return;


    const leaveRef =
    doc(db,"leaseRequests",id);


    const leaveSnap =
    await getDoc(leaveRef);


    if(!leaveSnap.exists())
    return;


    const data =
    leaveSnap.data();



    await updateDoc(
        leaveRef,
        {
            status:"rejected"
        }
    );



    // แจ้ง User

    await addDoc(
        collection(db,"notifications"),
        {

            userId:data.userId,

            title:"คำขอเลิกเช่าถูกปฏิเสธ",

            message:
            `คำขอเลิกเช่าห้อง ${data.roomNumber} ไม่ได้รับอนุมัติ`,

            type:"leaveReject",

            read:false,

            createdAt:
            serverTimestamp()

        }
    );



    alert("ปฏิเสธเรียบร้อย");


    loadLeaveRequests();

};

window.confirmPayment = async function(id){

    if(!confirm("ยืนยันว่าได้รับเงินแล้ว ?")) return;

    const leaveRef = doc(db,"leaseRequests",id);
    const leaveSnap = await getDoc(leaveRef);

    if(!leaveSnap.exists()){
        alert("ไม่พบข้อมูล");
        return;
    }

    const data = leaveSnap.data();

    // 1. ตัดสิทธิ์ผู้เช่า
    await updateDoc(doc(db,"users",data.userId),{

        room:"",
        role:"student",
        tenant:false,
        roomStatus:"none"

    });

    // 2. คืนห้อง
    await updateDoc(doc(db,"rooms",data.roomId),{

        status:"available",
        tenantId:""

    });
    
    await deleteDoc(doc(db,"leaseRequests",id));

    // 3. ลบคำขอเลิกเช่า
    await deleteDoc(leaveRef);

    alert("คืนห้องเรียบร้อย");

    loadLeaveRequests();

};

loadLeaveRequests();

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