import { auth, db } from "./firebase-config.js";
import { loadTheme } from "./theme.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;

// ================= LOAD USER =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.replace("login.html");
        return;

    }

    try {

        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้");
            return;

        }

        currentUser = user;

        const data = snap.data();

        document.getElementById("adminName").innerHTML =
            `👋 สวัสดี <b>${data.fullname}</b>`;

        document.getElementById("fullname").value =
            data.fullname || "";

        document.getElementById("email").value =
            data.email || "";

        document.getElementById("phone").value =
            data.phone || "";

        document.getElementById("dormName").value =
            data.dormName || "";

        document.getElementById("address").value =
            data.address || "";

        document.getElementById("themeColor").value =
            data.themeColor || "#b30000";

        await loadTheme();

    }

    catch (err) {

        console.error(err);

    }

});


// ================= SAVE =================

document.getElementById("saveBtn").addEventListener("click", async () => {

    try {

        const fullname =
            document.getElementById("fullname").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const dormName =
            document.getElementById("dormName").value.trim();

        const address =
            document.getElementById("address").value.trim();

        const themeColor =
            document.getElementById("themeColor").value;

        await updateDoc(doc(db, "users", currentUser.uid), {

            fullname,
            phone,
            dormName,
            address,
            themeColor

        });

        await loadTheme();

        alert("บันทึกข้อมูลเรียบร้อย");

    }

    catch (err) {

        console.error(err);

        alert("บันทึกข้อมูลไม่สำเร็จ");

    }

});


// ================= LIVE COLOR =================

document.getElementById("themeColor").addEventListener("input", (e) => {

    const color = e.target.value;

    document.documentElement.style.setProperty(
        "--theme",
        color
    );

});


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