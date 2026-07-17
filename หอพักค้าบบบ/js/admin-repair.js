import { auth, db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadTheme } from "../js/theme.js";

await loadTheme();
// ================= LOAD =================

async function loadRepairs() {

    const container = document.getElementById("repairContainer");

    container.innerHTML = "";

    let total = 0;
    let pending = 0;
    let working = 0;
    let completed = 0;

    const snap = await getDocs(collection(db, "repairs"));

    snap.forEach(docSnap => {

        total++;

        const data = docSnap.data();

        if(data.status==="pending") pending++;

        if(data.status==="working") working++;

        if(data.status==="completed") completed++;

        renderRepair(docSnap.id,data);

    });

    document.getElementById("totalRepair").innerText=total;

    document.getElementById("pendingRepair").innerText=pending;

    document.getElementById("workingRepair").innerText=working;

    document.getElementById("completedRepair").innerText=completed;

}

function renderRepair(id,data){

    const container=document.getElementById("repairContainer");

    const card=document.createElement("div");

    card.className="repair-card";

    let statusColor="#ff9800";
    let statusText="รอดำเนินการ";

    if(data.status==="working"){

        statusColor="#2196f3";

        statusText="กำลังดำเนินการ";

    }

    if(data.status==="completed"){

        statusColor="#2e7d32";

        statusText="ซ่อมเสร็จ";

    }

    let html=`

        <h3>${data.fullname}</h3>

        <p><b>ห้อง :</b> ${data.roomNumber}</p>

        <p><b>ชั้น :</b> ${data.floor}</p>

        <p><b>เบอร์ :</b> ${data.phone}</p>

        <hr>

        <p><b>ประเภท :</b> ${data.problem}</p>

        <p><b>รายละเอียด</b></p>

        <p>${data.detail}</p>

        <span class="status"

        style="background:${statusColor};margin-top:15px;display:inline-block;padding:8px 15px;border-radius:20px;">

        ${statusText}

        </span>

        <br><br>

    `;

    if(data.status==="pending"){

        html+=`

        <button
        onclick="startRepair('${id}')"
        class="btn">

        รับเรื่อง

        </button>

        `;

    }

    if(data.status==="working"){

        html+=`

        <button
        onclick="finishRepair('${id}')"
        class="btn">

        ซ่อมเสร็จ

        </button>

        `;

    }

    card.innerHTML=html;

    container.appendChild(card);

}

window.startRepair=async function(id){

    if(!confirm("เริ่มดำเนินการซ่อม ?")) return;

    await updateDoc(doc(db,"repairs",id),{

        status:"working"

    });

    loadRepairs();

}

window.finishRepair=async function(id){

    if(!confirm("ยืนยันว่าซ่อมเสร็จแล้ว ?")) return;

    await updateDoc(doc(db,"repairs",id),{

        status:"completed"

    });

    loadRepairs();

}

loadRepairs();

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