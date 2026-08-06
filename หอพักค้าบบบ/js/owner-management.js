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
        await signOut(auth);
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

    loadOwners();

});

// ================= LOAD OWNER =================

async function loadOwners() {

    owners = [];

    const snap = await getDocs(collection(db, "users"));

    snap.forEach(item => {

        const data = item.data();

        if (data.role === "owner") {

            owners.push({

                id: item.id,
                ...data

            });

        }

    });

    renderTable(owners);

}

// ================= RENDER TABLE =================

function renderTable(data) {

    const table = document.getElementById("ownerTable");

    table.innerHTML = "";

    if (data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    ไม่พบ Owner
                </td>
            </tr>
        `;

        return;

    }

    data.forEach(owner => {

        const date = owner.createdAt?.toDate
            ? owner.createdAt.toDate().toLocaleDateString("th-TH")
            : "-";

        table.innerHTML += `

        <tr>

            <td>${owner.fullname ?? "-"}</td>

            <td>${owner.email}</td>

            <td>${owner.status ?? "active"}</td>

            <td>${date}</td>

            <td>

                <button onclick="changeStatus('${owner.id}')">

                    ${owner.status === "active" ? "ระงับ" : "เปิด"}

                </button>

            </td>

        </tr>

        `;

    });

}

// ================= SEARCH =================

document.getElementById("searchOwner").addEventListener("input", () => {

    const keyword = document
        .getElementById("searchOwner")
        .value
        .trim()
        .toLowerCase();

    const result = owners.filter(owner =>

        owner.fullname?.toLowerCase().includes(keyword) ||

        owner.email?.toLowerCase().includes(keyword)

    );

    renderTable(result);

});

// ================= OPEN MODAL =================

document.getElementById("addOwnerBtn").onclick = () => {

    document.getElementById("ownerEmail").value = "";

    document.getElementById("userModal").style.display = "flex";

};

// ================= ADD OWNER =================

document.getElementById("saveOwnerBtn").onclick = async () => {

    const email = document
        .getElementById("ownerEmail")
        .value
        .trim()
        .toLowerCase();

    if (!email) {

        alert("กรุณากรอก Email");

        return;

    }

    const q = query(

        collection(db, "users"),

        where("email", "==", email)

    );

    const snap = await getDocs(q);

    if (snap.empty) {

        alert("ไม่พบ Email นี้ในระบบ");

        return;

    }

    const userDoc = snap.docs[0];

    const data = userDoc.data();

    if (data.role === "owner") {

        alert("ผู้ใช้นี้เป็น Owner อยู่แล้ว");

        return;

    }

    if (data.role === "superadmin") {

        alert("ไม่สามารถเพิ่ม Super Admin ได้");

        return;

    }

    await updateDoc(

        doc(db, "users", userDoc.id),

        {

            role: "owner",

            status: "active"

        }

    );

    alert("เพิ่ม Owner สำเร็จ");

    closeModal();

    loadOwners();

};

// ================= REMOVE OWNER =================

document.getElementById("deleteOwnerBtn").onclick = async () => {

    const email = document
        .getElementById("ownerEmail")
        .value
        .trim()
        .toLowerCase();

    if (!email) {

        alert("กรุณากรอก Email");

        return;

    }

    const q = query(

        collection(db, "users"),

        where("email", "==", email)

    );

    const snap = await getDocs(q);

    if (snap.empty) {

        alert("ไม่พบ Email");

        return;

    }

    const userDoc = snap.docs[0];

    const data = userDoc.data();

    if (data.role !== "owner") {

        alert("ผู้ใช้นี้ไม่ได้เป็น Owner");

        return;

    }

    if (!confirm("ต้องการลบ Owner ใช่หรือไม่ ?"))
        return;

    await updateDoc(

        doc(db, "users", userDoc.id),

        {

            role: "student",

            status: "active"

        }

    );

    alert("ลบ Owner สำเร็จ");

    closeModal();

    loadOwners();

};

// ================= CHANGE STATUS =================

window.changeStatus = async function (uid) {

    const owner = owners.find(x => x.id === uid);

    if (!owner) return;

    const status = owner.status === "active"
        ? "disabled"
        : "active";

    if (!confirm("ต้องการเปลี่ยนสถานะใช่หรือไม่ ?"))
        return;

    await updateDoc(

        doc(db, "users", uid),

        {

            status: status

        }

    );

    loadOwners();

};

// ================= CLOSE MODAL =================

window.closeModal = function () {

    document.getElementById("userModal").style.display = "none";

    document.getElementById("ownerEmail").value = "";

};

// ================= LOGOUT =================

document.getElementById("logoutBtn").onclick = async () => {

    if (!confirm("ออกจากระบบ ?"))
        return;

    await signOut(auth);

    location.href = "superadmin-login.html";

};