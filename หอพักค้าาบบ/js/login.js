import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ถ้าล็อกอินอยู่แล้ว ให้ไป Dashboard ทันที
onAuthStateChanged(auth, (user) => {

    if (user) {
        window.location.href = "dashboard.html";
    }

});

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("กรุณากรอกอีเมลและรหัสผ่าน");
        return;
    }

    try {

        await signInWithEmailAndPassword(auth, email, password);

        alert("เข้าสู่ระบบสำเร็จ");

        window.location.href = "dashboard.html";

    } catch (error) {

        switch (error.code) {

            case "auth/invalid-email":
                alert("รูปแบบอีเมลไม่ถูกต้อง");
                break;

            case "auth/invalid-credential":
                alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
                break;

            case "auth/user-disabled":
                alert("บัญชีนี้ถูกระงับ");
                break;

            default:
                alert("เกิดข้อผิดพลาด : " + error.message);

        }

    }

});