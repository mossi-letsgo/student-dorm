import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
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

        if (!snap.exists()) {

            await signOut(auth);
            return;

        }

        const data = snap.data();

        if (data.status === "disabled") {

            alert("บัญชีของคุณถูกระงับการใช้งาน");

            await signOut(auth);

            return;

        }

        if (data.role === "owner") {

            location.href = "admin-dashboard.html";

        }
        else if (data.role === "student") {

            location.href = "dashboard.html";

        }

    }
    catch (err) {

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

        const userCredential =
            await signInWithEmailAndPassword(auth, email, password);

        const user = userCredential.user;

        const userRef = doc(db, "users", user.uid);

        const snap = await getDoc(userRef);

        if (!snap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้");

            await signOut(auth);

            return;

        }

        const data = snap.data();

        // ตรวจสอบสถานะ
        if (data.status === "disabled") {

            alert("บัญชีของคุณถูกระงับ");

            await signOut(auth);

            return;

        }

        // กัน Super Admin
        if (data.role === "superadmin") {

            alert("บัญชี Super Admin กรุณาเข้าสู่ระบบผ่านหน้า Super Admin");

            await signOut(auth);

            location.href = "index.html";

            return;

        }

        // อัปเดตเวลา Login
        await updateDoc(userRef, {

            lastLogin: serverTimestamp()

        });

        // Student
        if (data.role === "student") {

            alert("เข้าสู่ระบบสำเร็จ");

            location.href = "dashboard.html";

            return;

        }

        // Owner
        if (data.role === "owner") {

            alert("เข้าสู่ระบบสำเร็จ");

            location.href = "admin-dashboard.html";

            return;

        }

        alert("ไม่มีสิทธิ์เข้าใช้งาน");

        await signOut(auth);

    }

    catch (error) {

        console.error(error);

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
                alert("เข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง");
                break;

            case "auth/network-request-failed":
                alert("ไม่สามารถเชื่อมต่ออินเทอร์เน็ต");
                break;

            default:
                alert(error.message);

        }

    }

});


// ================= GOOGLE LOGIN =================

document.getElementById("googleLoginBtn").addEventListener("click", async () => {

    try {

        const result = await signInWithPopup(auth, provider);

        const user = result.user;

        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);

        // ยังไม่มีข้อมูล
        if (!userSnap.exists()) {

            await setDoc(userRef, {

                fullname: user.displayName,

                email: user.email,

                studentId: "",

                faculty: "",

                level: "",

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

            location.href = "dashboard.html";

            return;

        }

        const data = userSnap.data();

        // ตรวจสอบสถานะ
        if (data.status === "disabled") {

            alert("บัญชีของคุณถูกระงับ");

            await signOut(auth);

            return;

        }

        // กัน Super Admin
        if (data.role === "superadmin") {

            alert("บัญชี Super Admin กรุณาเข้าสู่ระบบผ่านหน้า Super Admin");

            await signOut(auth);

            location.href = "index.html";

            return;

        }

        await updateDoc(userRef, {

            lastLogin: serverTimestamp()

        });

        alert("เข้าสู่ระบบด้วย Google สำเร็จ");

        if (data.role === "owner") {

            location.href = "admin-dashboard.html";

        }
        else {

            location.href = "dashboard.html";

        }

    }

    catch (error) {

        console.error(error);

        switch (error.code) {

            case "auth/popup-closed-by-user":
                alert("ยกเลิกการเข้าสู่ระบบ");
                break;

            case "auth/popup-blocked":
                alert("Browser บล็อก Popup");
                break;

            default:
                alert(error.message);

        }

    }

});