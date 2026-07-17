import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let locked = false;

onAuthStateChanged(auth, async (user) => {

    if (locked) return;

    locked = true;

    // ❌ ไม่ login → ไป login
    if (!user) {
        location.replace("login.html");
        return;
    }

    try {

        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
            location.replace("login.html");
            return;
        }

        const data = snap.data();
        const role = data.role;

        const path = location.pathname;

        // ================= OWNER =================
        if (role === "owner") {

            // owner ห้ามเข้า user dashboard
            if (path.includes("dashboard.html")) {
                location.replace("admin-dashboard.html");
                return;
            }

        } 
        // ================= USER =================
        else {

            // user ต้องอยู่ dashboard เท่านั้น
            if (!path.includes("dashboard.html")) {
                location.replace("dashboard.html");
                return;
            }
        }

        // ================= SAFE RENDER =================
        const el = document.getElementById("userName");

        if (el) {
            el.innerText = "สวัสดี, " + data.fullname;
        }

        if (typeof loadUserDashboard === "function") {
            loadUserDashboard(data);
        }

        // lock final
        locked = true;

    } catch (err) {
        console.error(err);
        location.replace("login.html");
    }

});