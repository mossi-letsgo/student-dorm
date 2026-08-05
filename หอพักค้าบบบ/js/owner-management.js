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

document.getElementById("adminName").innerText = me.fullname;

// ล้างช่องค้นหา
document.getElementById("searchOwner").value = "";

loadOwners();   

});

// ================= LOAD OWNER =================

async function loadOwners() {

    const snap = await getDocs(collection(db, "users"));

    owners = [];

    snap.forEach(doc => {

        const data = doc.data();

        console.log(data.role);

        if (data.role === "owner") {

            owners.push({
                id: doc.id,
                ...data
            });

        }

    });

    console.log("owners =", owners);

  console.log("Owners =", owners);
    renderTable(owners);

}
function renderTable(data){
    console.log("renderTable()", data);
    const table = document.getElementById("ownerTable");

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
.getElementById("searchOwner")
.addEventListener("input", () => {

    const keyword = document
        .getElementById("searchOwner")
        .value
        .trim()
        .toLowerCase();

    console.log("keyword =", keyword);

    const result = owners.filter(owner =>

        owner.fullname?.toLowerCase().includes(keyword) ||

        owner.email?.toLowerCase().includes(keyword)

    );

    console.log("result =", result);

    renderTable(result);

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
.getElementById("addOwnerBtn")
.addEventListener("click",()=>{

    alert("จะทำระบบเพิ่ม Owner ในขั้นตอนถัดไป");

});

// ================= SAVE =================

document
.getElementById("saveOwnerBtn")
.addEventListener("click",()=>{

    alert("ยังไม่ได้พัฒนาส่วนนี้");

});

// ================= DELETE =================

document
.getElementById("deleteOwnerBtn")
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