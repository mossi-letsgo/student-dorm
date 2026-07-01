import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// แสดงชื่อผู้ใช้
const userName = document.getElementById("userName");

// ตรวจสอบสถานะการ Login
onAuthStateChanged(auth, async (user) => {

    if (user) {

        try {

            // ดึงข้อมูลผู้ใช้จาก Firestore
            const docRef = doc(db, "users", user.uid);

            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {

                const data = docSnap.data();

                userName.innerHTML = `
                    👋 สวัสดี, <b>${data.fullname}</b>
                `;

            } else {

                userName.innerHTML = "ไม่พบข้อมูลผู้ใช้";

            }

        } catch (error) {

            console.log(error);

            alert("เกิดข้อผิดพลาดในการโหลดข้อมูล");

        }

    } else {

        // ถ้ายังไม่ได้ Login
        window.location.href = "login.html";

    }

});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {

    const confirmLogout = confirm("คุณต้องการออกจากระบบใช่หรือไม่ ?");

    if (!confirmLogout) return;

    try {

        await signOut(auth);

        alert("ออกจากระบบสำเร็จ");

        window.location.href = "login.html";

    } catch (error) {

        alert(error.message);

    }

});