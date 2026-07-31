import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= LOGIN =================

document.getElementById("loginForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("กรุณากรอกอีเมลและรหัสผ่าน");
        return;
    }

    try {

        // Login Firebase Auth
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        // ดึงข้อมูลผู้ใช้
        const userSnap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!userSnap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้");

            await signOut(auth);

            return;

        }

        const userData = userSnap.data();

        // เช็กสิทธิ์
        if (userData.role !== "superadmin") {

            alert("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน Super Admin");

            await signOut(auth);

            window.location.href = "../index.html";

            return;

        }

        alert("เข้าสู่ระบบสำเร็จ");

        window.location.href = "superadmin-dashboard.html";

    } catch (error) {

        console.error(error);

        switch (error.code) {

            case "auth/invalid-email":
                alert("รูปแบบอีเมลไม่ถูกต้อง");
                break;

            case "auth/invalid-credential":
            case "auth/wrong-password":
            case "auth/user-not-found":
                alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
                break;

            case "auth/too-many-requests":
                alert("พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง");
                break;

            default:
                alert(error.message);

        }

    }

});