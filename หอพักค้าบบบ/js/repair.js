import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    addDoc,
    collection,
    serverTimestamp,
    query,
    where,
    getDocs,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";

await loadTheme();

let currentUser = null;
let currentRoom = null;

// ================= LOGIN =================

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

        if (!currentUser.room) {

            alert("กรุณาเช่าห้องก่อนแจ้งซ่อม");

            location.href = "booking.html";

            return;

        }

        const roomSnap = await getDoc(doc(db, "rooms", currentUser.room));

        currentRoom = roomSnap.data();

        loadRepairStatus();

    } catch (err) {

        console.error(err);

    }

});

// ================= SEND REPAIR =================

document.getElementById("sendRepairBtn").addEventListener("click", async () => {

    const problem = document.getElementById("problem").value;

    const detail = document.getElementById("detail").value.trim();

    if (problem === "") {

        alert("เลือกประเภทปัญหา");

        return;

    }

    if (detail === "") {

        alert("กรอกรายละเอียด");

        return;

    }

    try {

        await addDoc(collection(db, "repairs"), {

            userId: auth.currentUser.uid,

            fullname: currentUser.fullname,

            phone: currentUser.phone,

            roomId: currentUser.room,

            roomNumber: currentRoom.roomNumber,

            floor: currentRoom.floor,

            problem,

            detail,

            status: "pending",

            createdAt: serverTimestamp()

        });

        alert("ส่งคำขอแจ้งซ่อมเรียบร้อย");

        document.getElementById("problem").selectedIndex = 0;

        document.getElementById("detail").value = "";

        loadRepairStatus();

    }

    catch (err) {

        console.error(err);

        alert("เกิดข้อผิดพลาด");

    }

});

// ================= LOAD STATUS =================

async function loadRepairStatus() {

    const box = document.getElementById("repairStatus");

    box.innerHTML = "";

    const q = query(

        collection(db, "repairs"),

        where("userId", "==", auth.currentUser.uid),

        orderBy("createdAt", "desc")

    );

    const snap = await getDocs(q);

    if (snap.empty) {

        box.innerHTML = `

            <div class="empty-box">

                <i class="fa-solid fa-screwdriver-wrench"></i>

                ยังไม่มีรายการแจ้งซ่อม

            </div>

        `;

        return;

    }

    snap.forEach(docSnap => {

        const data = docSnap.data();

        let statusText = "";
        let statusClass = "";

        switch (data.status) {

            case "pending":
                statusText = "รอดำเนินการ";
                statusClass = "pending";
                break;

            case "working":
                statusText = "กำลังดำเนินการ";
                statusClass = "working";
                break;

            case "completed":
                statusText = "ซ่อมเสร็จแล้ว";
                statusClass = "completed";
                break;

            case "rejected":
                statusText = "ยกเลิก";
                statusClass = "rejected";
                break;

        }

        box.innerHTML += `

            <div class="repair-card">

                <h3>${data.problem}</h3>

                <p><b>ห้อง :</b> ${data.roomNumber}</p>

                <p><b>ชั้น :</b> ${data.floor}</p>

                <p><b>รายละเอียด :</b></p>

                <p>${data.detail}</p>

                <span class="status ${statusClass}">

                    ${statusText}

                </span>

            </div>

        `;

    });

}

// ================= LOGOUT =================

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