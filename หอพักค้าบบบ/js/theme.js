import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ================= ทำสี Hover =================
function lightenColor(hex, amount = 20) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);

    return `rgb(${r}, ${g}, ${b})`;
}

// ================= เลือกสีตัวหนังสือ =================
function getTextColor(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // สูตร YIQ คำนวณค่าความสว่างสัมพัทธ์
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // ถ้าค่าความสว่างเกิน 128-150 จะถือว่าสีเอนไปทางสว่าง และบังคับฟอนต์เป็นสีเข้ม
    return brightness > 140 ? "#111111" : "#ffffff";
}

// ================= ฟังก์ชันปรับแต่งธีมลงใน CSS Variables =================
export function applyThemeColor(color) {
    if (!color) return;

    // 1. ตั้งค่าสีหลักและสี Hover
    document.documentElement.style.setProperty("--theme", color);
    document.documentElement.style.setProperty("--theme-hover", lightenColor(color, 20));

    // 2. ตั้งค่า เงา (Shadow)
    const cleanHex = color.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) || 0;

    document.documentElement.style.setProperty("--theme-shadow", `rgba(${r}, ${g}, ${b}, .35)`);

    // 3. ปรับสีตัวหนังสือตามความสว่างของธีม
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

// ================= โหลดธีมจาก Database =================
export async function loadTheme() {
    if (!auth.currentUser) return;

    try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (!snap.exists()) return;

        const color = snap.data().themeColor || "#b30000";
        applyThemeColor(color);
    } catch (err) {
        console.error("Load theme error:", err);
    }
}

// ================= โหลดอัตโนมัติเมื่อเปิดหน้าเว็บ =================
onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    await loadTheme();
});