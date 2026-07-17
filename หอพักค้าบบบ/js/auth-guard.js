import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "./theme.js";

await loadTheme();

onAuthStateChanged(auth, async (user) => {

    // ❌ ยังไม่ login → ไปหน้า login
    if (!user) {
        window.location.href = "login.html";
        return;
    }

        const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        window.location.href = "login.html";
        return;
    }

    const role = snap.data().role;

        const path = window.location.pathname;

    // 🏢 ถ้าเข้า admin page แต่ไม่ใช่ owner
    if (path.includes("admin") && role !== "owner") {
        window.location.href = "dashboard.html";
    }

    // 👤 ถ้าเป็น owner แต่เข้า dashboard user → ส่งไป admin
    if (path.includes("dashboard") && role === "owner") {
        window.location.href = "admin-dashboard.html";
    }

});