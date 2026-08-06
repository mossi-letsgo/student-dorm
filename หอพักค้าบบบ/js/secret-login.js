import { db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let clickCount = 0;
let timer = null;

const logo = document.getElementById("logoSecret");

logo.addEventListener("click", async () => {

    clickCount++;

    clearTimeout(timer);

    timer = setTimeout(() => {
        clickCount = 0;
    }, 2000);

    if (clickCount < 5) return;

    clickCount = 0;

    const code = prompt("กรอกรหัสลับ");

    if (!code) return;

    const snap = await getDoc(doc(db, "system", "superadmin"));

    if (!snap.exists()) {
        alert("ไม่พบข้อมูลระบบ");
        return;
    }

    const secret = snap.data().secretCode;

    if (code === secret) {

        location.href = "../html/superadmin-login.html";

    } else {

        alert("รหัสไม่ถูกต้อง");

    }

});