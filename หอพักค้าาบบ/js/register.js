import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const registerBtn = document.getElementById("registerBtn");

registerBtn.addEventListener("click", async () => {

    const fullname = document.getElementById("fullname").value.trim();
    const studentId = document.getElementById("studentId").value.trim();
    const faculty = document.getElementById("faculty").value.trim();
    const major = document.getElementById("major").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // ตรวจสอบข้อมูล
    if (
        fullname === "" ||
        studentId === "" ||
        faculty === "" ||
        major === "" ||
        phone === "" ||
        email === "" ||
        password === "" ||
        confirmPassword === ""
    ) {
        alert("กรุณากรอกข้อมูลให้ครบ");
        return;
    }

    if (password.length < 6) {
        alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
    }

    if (password !== confirmPassword) {
        alert("รหัสผ่านไม่ตรงกัน");
        return;
    }

    try {

        // สมัครสมาชิก Authentication
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        // บันทึกข้อมูลลง Firestore
        await setDoc(doc(db, "users", user.uid), {

            fullname: fullname,
            studentId: studentId,
            faculty: faculty,
            major: major,
            phone: phone,
            email: email,

            role: "student",

            room: "",

            status: "active",

            createdAt: serverTimestamp()

        });

        alert("สมัครสมาชิกสำเร็จ");

        window.location.href = "login.html";

    } catch (error) {

        switch (error.code) {

            case "auth/email-already-in-use":
                alert("อีเมลนี้ถูกใช้งานแล้ว");
                break;

            case "auth/invalid-email":
                alert("รูปแบบอีเมลไม่ถูกต้อง");
                break;

            case "auth/weak-password":
                alert("รหัสผ่านสั้นเกินไป");
                break;

            default:
                alert(error.message);

        }

    }

});