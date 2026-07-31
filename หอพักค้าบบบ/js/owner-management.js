import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let owners = [];

// ================= LOGIN =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "superadmin-login.html";
        return;
    }

    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
        location.href = "superadmin-login.html";
        return;
    }

    const me = userSnap.data();

    if (me.role !== "superadmin") {

        alert("ไม่มีสิทธิ์");

        await signOut(auth);

        location.href = "../index.html";

        return;

    }

    document.getElementById("adminName").innerText =
        me.fullname;

    loadOwners();

});

// ================= LOAD OWNER =================

async function loadOwners() {

    try {

        const snap = await getDocs(collection(db, "users"));

        owners = [];

        snap.forEach(item => {

            const data = item.data();

            console.log(data); // ดูข้อมูลใน Console

            // เอาเฉพาะ owner
            if (data.role === "owner") {

                owners.push({

                    id: item.id,
                    ...data

                });

            }

        });

        console.log("Owner ทั้งหมด =", owners);

        renderTable(owners);

    } catch (error) {

        console.error(error);

        alert("โหลดข้อมูล Owner ไม่สำเร็จ");

    }

}
function renderTable(data){

    const table = document.getElementById("adminTable");

    if(!table) return;

    table.innerHTML = "";

    if(data.length === 0){

        table.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center">
                ไม่พบ Owner
            </td>
        </tr>
        `;

        return;

    }

    data.forEach(owner=>{

        const date = owner.createdAt?.toDate
            ? owner.createdAt.toDate().toLocaleDateString("th-TH")
            : "-";

        table.innerHTML += `

        <tr>

            <td>${owner.fullname ?? "-"}</td>

            <td>${owner.email ?? "-"}</td>

            <td>${owner.status ?? "active"}</td>

            <td>${date}</td>

            <td>

                <button onclick="changeStatus('${owner.id}')">

                    เปลี่ยนสถานะ

                </button>

            </td>

        </tr>

        `;

    });

}

// ================= SEARCH =================

document
.getElementById("searchAdmin")
.addEventListener("input", () => {

    const keyword =

        document
        .getElementById("searchAdmin")
        .value
        .toLowerCase();

    renderTable(

        owners.filter(owner =>

            owner.fullname
            ?.toLowerCase()
            .includes(keyword)

            ||

            owner.email
            ?.toLowerCase()
            .includes(keyword)

        )

    );

});

// ================= CHANGE STATUS =================

window.changeStatus = async function(uid){

    const owner = owners.find(x=>x.id===uid);

    if(!owner) return;

    const newStatus =
        owner.status==="active"
        ? "disabled"
        : "active";

    const ok = confirm(

`เปลี่ยนสถานะเป็น

${newStatus}

ใช่หรือไม่ ?`

    );

    if(!ok) return;

    await updateDoc(

        doc(db,"users",uid),

        {

            status:newStatus

        }

    );

    alert("อัปเดตสถานะเรียบร้อย");

    loadOwners();

}

// ================= ADD OWNER =================

document
.getElementById("addAdminBtn")
.addEventListener("click",()=>{

    alert("จะทำระบบเพิ่ม Owner ในขั้นตอนถัดไป");

});

// ================= SAVE =================

document
.getElementById("saveAdminBtn")
.addEventListener("click",()=>{

    alert("ยังไม่ได้พัฒนาส่วนนี้");

});

// ================= DELETE =================

document
.getElementById("deleteAdminBtn")
.addEventListener("click",()=>{

    alert("ยังไม่ได้พัฒนาส่วนนี้");

});

// ================= LOGOUT =================

document
.getElementById("logoutBtn")
.addEventListener("click",async()=>{

    if(!confirm("ออกจากระบบ ?"))
        return;

    await signOut(auth);

    location.href="superadmin-login.html";

});