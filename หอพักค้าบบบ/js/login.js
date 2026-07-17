import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    updateDoc,
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";

await loadTheme();
const provider = new GoogleAuthProvider();

// ================= AUTO LOGIN =================

onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    try {

        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) return;

        const role = snap.data().role;

        if (role === "owner") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }

    } catch (err) {

        console.error(err);

    }

});

// ================= LOGIN EMAIL =================

document.getElementById("loginBtn").addEventListener("click", async () => {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {

        alert("กรุณากรอกอีเมลและรหัสผ่าน");
        return;

    }

    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;

        const ref = doc(db, "users", user.uid);

        const snap = await getDoc(ref);

        if (!snap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้");
            return;

        }

        const role = snap.data().role || "student";

        await updateDoc(ref, {

            lastLogin: serverTimestamp()

        });

        alert("เข้าสู่ระบบสำเร็จ");

        if (role === "owner") {

            window.location.href = "admin-dashboard.html";

        } else {

            window.location.href = "dashboard.html";

        }

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

            case "auth/too-many-requests":
                alert("ลองใหม่ภายหลัง");
                break;

            default:
                alert(error.message);

        }

    }

});

// ================= LOGIN GOOGLE =================

document.getElementById("googleLoginBtn").addEventListener("click", async () => {

    try {

        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);

        // ถ้ายังไม่มีข้อมูลใน Firestore
        if (!userSnap.exists()) {

           await setDoc(userRef, {

                fullname: user.displayName,
                email: user.email,

                studentId: "",
                faculty: "",
                major: "",
                phone: "",

                role: "student",

                room: "",
                tenant: false,
                status: "active",

                photoURL: user.photoURL || "",

                themeColor: "#b30000",

                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()

            });

            alert("สร้างบัญชีด้วย Google สำเร็จ");

            window.location.href = "dashboard.html";

            return;

        }

        // อัปเดตเวลา Login
        await updateDoc(userRef, {

            lastLogin: serverTimestamp()

        });

        const role = userSnap.data().role || "student";

        alert("เข้าสู่ระบบด้วย Google สำเร็จ");

        if (role === "owner") {

            window.location.href = "admin-dashboard.html";

        } else {

            window.location.href = "dashboard.html";

        }

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

});