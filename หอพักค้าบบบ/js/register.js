import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";
import {
    writeLog
} from "./logger.js";

await loadTheme();

// =======================
// ELEMENT
// =======================

const educationSelect = document.getElementById("education");
const levelSelect = document.getElementById("level");
const majorSelect = document.getElementById("major");

// =======================
// DATA
// =======================

const levelData = {

    "ปวช.": [
        "ปวช.1",
        "ปวช.2",
        "ปวช.3"
    ],

    "ปวส.": [
        "ปวส.1",
        "ปวส.2"
    ]

};

const majorData = {

    "ปวช.1":[
        "เทคโนโลยีสารสนเทศ",
        "คอมพิวเตอร์ธุรกิจ",
        "ช่างยนต์",
        "ช่างไฟฟ้า",
        "ช่างอิเล็กทรอนิกส์",
        "บัญชี"
    ],

    "ปวช.2":[
        "เทคโนโลยีสารสนเทศ",
        "คอมพิวเตอร์ธุรกิจ",
        "ช่างยนต์",
        "ช่างไฟฟ้า",
        "ช่างอิเล็กทรอนิกส์",
        "บัญชี"
    ],

    "ปวช.3":[
        "เทคโนโลยีสารสนเทศ",
        "คอมพิวเตอร์ธุรกิจ",
        "ช่างยนต์",
        "ช่างไฟฟ้า",
        "ช่างอิเล็กทรอนิกส์",
        "บัญชี"
    ],

    "ปวส.1":[
        "เทคโนโลยีสารสนเทศ",
        "คอมพิวเตอร์ธุรกิจ",
        "ช่างยนต์",
        "ช่างไฟฟ้า",
        "ช่างอิเล็กทรอนิกส์",
        "บัญชี"
    ],

    "ปวส.2":[
      "เทคโนโลยีสารสนเทศ",
        "คอมพิวเตอร์ธุรกิจ",
        "ช่างยนต์",
        "ช่างไฟฟ้า",
        "ช่างอิเล็กทรอนิกส์",
        "บัญชี"
    ]

};

// =======================
// เลือกระดับการศึกษา
// =======================

educationSelect.addEventListener("change", () => {

    levelSelect.innerHTML =
        `<option value="">เลือกระดับชั้น</option>`;

    majorSelect.innerHTML =
        `<option value="">เลือกสาขา</option>`;

    majorSelect.disabled = true;

    if (!educationSelect.value) {

        levelSelect.disabled = true;
        return;

    }

    levelSelect.disabled = false;

    levelData[educationSelect.value].forEach(item => {

        levelSelect.innerHTML +=
            `<option value="${item}">${item}</option>`;

    });

});

// =======================
// เลือกระดับชั้น
// =======================

levelSelect.addEventListener("change", () => {

    majorSelect.innerHTML =
        `<option value="">เลือกสาขา</option>`;

    if (!majorData[levelSelect.value]) {

        majorSelect.disabled = true;
        return;

    }

    majorSelect.disabled = false;

    majorData[levelSelect.value].forEach(item => {

        majorSelect.innerHTML +=
            `<option value="${item}">${item}</option>`;

    });

});

// =======================
// REGISTER
// =======================

document.getElementById("registerBtn").addEventListener("click", async () => {

    const fullname = document.getElementById("fullname").value.trim();

    const studentId = document.getElementById("studentId").value.trim();

    const education = educationSelect.value;

    const level = levelSelect.value;

    const major = majorSelect.value;

    const phone = document.getElementById("phone").value.trim();

    const email = document.getElementById("email").value.trim().toLowerCase();

    const password = document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const faculty = "เทคโนโลยีสารสนเทศ";

    // ================= VALIDATE =================

    if (
        !fullname ||
        !studentId ||
        !education ||
        !level ||
        !major ||
        !phone ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        alert("กรุณากรอกข้อมูลให้ครบ");
        return;

    }

    if (password.length < 6) {

        alert("รหัสผ่านต้องไม่น้อยกว่า 6 ตัว");
        return;

    }

    if (password !== confirmPassword) {

        alert("รหัสผ่านไม่ตรงกัน");
        return;

    }

    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {

            fullname,

            studentId,

            education,

            level,

            faculty,

            major,

            phone,

            email,

            role: "student",

            room: "",

            status: "active",

            photoURL: "",

            themeColor: "#b30000",

            createdAt: serverTimestamp()

        });

        alert("สมัครสมาชิกสำเร็จ");

        location.href = "../html/login.html";

    } catch (error) {

        console.error(error);

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