import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";

await loadTheme();

const fullname = document.getElementById("fullname");
const email = document.getElementById("email");
const studentId = document.getElementById("studentId");
const phone = document.getElementById("phone");
const themeColor = document.getElementById("themeColor");

let currentUser = null;

// ================= LOAD USER =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "login.html";
        return;

    }

    currentUser = user;

    try {

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้");
            return;

        }

        const data = snap.data();

        document.getElementById("welcomeText").innerHTML =
            `สวัสดี ${data.fullname}`;

        fullname.value = data.fullname || "";
        email.value = data.email || "";
        studentId.value = data.studentId || "";
        phone.value = data.phone || "";

        themeColor.value = data.themeColor || "#b30000";

    } catch (err) {

        console.error(err);
        alert("โหลดข้อมูลไม่สำเร็จ");

    }

});

// ================= SAVE PROFILE =================

document.getElementById("saveBtn").addEventListener("click", async () => {

    try {

        await updateDoc(doc(db, "users", currentUser.uid), {

            fullname: fullname.value,
            studentId: studentId.value,
            phone: phone.value

        });

        alert("บันทึกข้อมูลเรียบร้อย");

    } catch (err) {

        console.error(err);
        alert("บันทึกไม่สำเร็จ");

    }

});

// ================= SAVE THEME =================

document.getElementById("saveThemeBtn").addEventListener("click", async () => {

    try {

await updateDoc(doc(db, "users", currentUser.uid), {

    themeColor: themeColor.value

});

const color = themeColor.value;

// สีหลัก
document.documentElement.style.setProperty("--theme", color);
document.documentElement.style.setProperty("--theme-color", color);

// แปลงเป็น RGB
const hex = color.replace("#", "");

const r = parseInt(hex.substring(0, 2), 16);
const g = parseInt(hex.substring(2, 4), 16);
const b = parseInt(hex.substring(4, 6), 16);

// สี Shadow
document.documentElement.style.setProperty(
    "--theme-shadow",
    `rgba(${r}, ${g}, ${b}, 0.35)`
);

// สี Hover (อ่อนลง)
document.documentElement.style.setProperty(
    "--theme-hover",
    `rgb(
        ${Math.min(255, r + 40)},
        ${Math.min(255, g + 40)},
        ${Math.min(255, b + 40)}
    )`
);

alert("เปลี่ยนธีมเรียบร้อย");

    } catch (err) {

        console.error(err);
        alert("บันทึกธีมไม่สำเร็จ");

    }

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