import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { doc, getDoc }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= ทำสี Hover =================

function lightenColor(hex, amount = 20) {

    hex = hex.replace("#", "");

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);

    return `rgb(${r}, ${g}, ${b})`;

}

// ================= เลือกสีตัวหนังสือ =================

function getTextColor(hex){

    hex = hex.replace("#","");

    const r = parseInt(hex.substring(0,2),16);
    const g = parseInt(hex.substring(2,4),16);
    const b = parseInt(hex.substring(4,6),16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness > 170) {
        return "#111111";
    } else {
        return "#ffffff";
    }

}

// ================= โหลดธีม =================

export async function loadTheme() {

    if (!auth.currentUser) return;

    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));

    if (!snap.exists()) return;

    const color = snap.data().themeColor || "#b30000";

    document.documentElement.style.setProperty(
        "--theme",
        color
    );

    document.documentElement.style.setProperty(
        "--theme-hover",
        lightenColor(color, 20)
    );

    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);

    document.documentElement.style.setProperty(
        "--theme-shadow",
        `rgba(${r}, ${g}, ${b}, .35)`
    );

// เปลี่ยนสีตัวหนังสืออัตโนมัติ
const textColor = getTextColor(color);

document.documentElement.style.setProperty("--text", textColor);

document.documentElement.style.setProperty(
    "--text2",
    textColor === "#ffffff" ? "#dddddd" : "#333333"
);

document.documentElement.style.setProperty(
    "--text3",
    textColor === "#ffffff" ? "#999999" : "#666666"
);

}

// ================= โหลดอัตโนมัติ =================

onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    await loadTheme();

});