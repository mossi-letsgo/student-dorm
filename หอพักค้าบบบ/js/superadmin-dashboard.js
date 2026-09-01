import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= CHECK LOGIN =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "superadmin-login.html";
        return;

    }

    try {

        const userSnap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!userSnap.exists()) {

            await signOut(auth);
            location.href = "superadmin-login.html";
            return;

        }

        const data = userSnap.data();

        if (data.role !== "superadmin") {

            alert("คุณไม่มีสิทธิ์เข้าใช้งาน");

            await signOut(auth);

            location.href = "login.html";
            return;

        }

        document.getElementById("adminName").innerText =
            data.fullname;

        await loadDashboard();

    } catch (err) {

        console.error(err);

    }

});


// ================= LOAD DASHBOARD =================

async function loadDashboard() {

    // Student
    const studentSnap = await getDocs(
        query(
            collection(db, "users"),
            where("role", "==", "student")
        )
    );

    document.getElementById("studentCount").innerText =
        studentSnap.size;


    // Owner
    const ownerSnap = await getDocs(
        query(
            collection(db, "users"),
            where("role", "==", "owner")
        )
    );

    document.getElementById("ownerCount").innerText =
        ownerSnap.size;


    // Admin
    const adminSnap = await getDocs(
        query(
            collection(db, "users"),
            where("role", "==", "admin")
        )
    );

    if(document.getElementById("adminCount")){

        document.getElementById("adminCount").innerText =
            adminSnap.size;

    }


    // ห้องทั้งหมด
    const roomSnap = await getDocs(
        collection(db, "rooms")
    );

    if(document.getElementById("roomCount")){

        document.getElementById("roomCount").innerText =
            roomSnap.size;

    }

}


// ================= LOGOUT =================

document.getElementById("logoutBtn").onclick = async () => {

    if (!confirm("ออกจากระบบ ?"))
        return;

    await signOut(auth);

    location.href = "../index.html";

};

// ================= SECRET MULTI-GAME ACCESS (FIREBASE) =================
let secretClickCount = 0;
let secretClickTimer = null;

const shieldBtn = document.getElementById("secretShieldBtn");

if (shieldBtn) {
    shieldBtn.addEventListener("click", async () => {
        secretClickCount++;

        clearTimeout(secretClickTimer);
        secretClickTimer = setTimeout(() => {
            secretClickCount = 0;
        }, 2000);

        // เมื่อกดครบ 5 ครั้งภายใน 2 วินาที
        if (secretClickCount === 5) {
            secretClickCount = 0;
            clearTimeout(secretClickTimer);

            const inputPass = prompt("🔒 กรุณากรอกรหัสลับเพื่อเข้าสู่มินิเกม:");
            
            if (inputPass === null) return; // กดยกเลิก

            const cleanInput = inputPass.trim().toLowerCase();

            try {
                // ดึงข้อมูลรหัสลับจาก Firestore (collection: system, doc: game)
                const secretDocRef = doc(db, "system", "game");
                const secretSnap = await getDoc(secretDocRef);

                if (secretSnap.exists()) {
                    const secretData = secretSnap.data();
                    
                    const snakeCode = secretData.gametag;   // เช่น "snake"
                    const dinoCode = secretData.dinotag;     // เช่น "dino"
                    const flappyCode = secretData.flappytag; // 👈 1. เพิ่มการดึงค่ารหัส Flappy Bird
                    const marioCode = secretData.mariotag; // เช่น ตั้งใน DB ไว้ว่า "mario"
                    const fighterCode = secretData.fightertag; // เช่น ตั้งใน DB ไว้ว่า "street"
                    const pokemonCode = secretData.pokemontag; // เช่น ตั้งใน DB ไว้ว่า "pokemon"
                    const terrariaCode = secretData.terrariatag; // เช่น ตั้งไว้ว่า "terraria"
                    const nfsCode = secretData.nfstag; // เช่น ตั้งใน DB ไว้ว่า "nfs"

                    // ตรวจสอบรหัสและเปลี่ยนหน้าตามที่พิมพ์
                    if (cleanInput === snakeCode) {
                        alert("🐍 รหัสถูกต้อง! กำลังเข้าสู่เกม Snake...");
                        window.location.href = "../minigame/minigame.html";

                    } else if (cleanInput === dinoCode) {
                        alert("🦖 รหัสถูกต้อง! กำลังเข้าสู่เกม Dino Runner...");
                        window.location.href = "../minigame/dinosour.html";

                    } else if (flappyCode && cleanInput === flappyCode) { 
                        // 👈 2. เพิ่มเงื่อนไขตรวจสอบรหัส Flappy Bird
                        alert("🐦 รหัสถูกต้อง! กำลังเข้าสู่เกม Flappy Bird...");
                        window.location.href = "../minigame/flappybird.html"; // เปลี่ยน Path ตามตำแหน่งไฟล์จริงของคุณ

                     } else if (marioCode && cleanInput === marioCode) { 
                        // 👈 2. เพิ่มเงื่อนไขตรวจสอบรหัส Flappy Bird
                        alert("🎩 รหัสถูกต้อง! กำลังเข้าสู่เกม Mario");
                        window.location.href = "../minigame/mario.html"; // เปลี่ยน Path ตามตำแหน่งไฟล์จริงของคุณ

                     } else if (fighterCode && cleanInput === fighterCode) { 
                        // 👈 2. เพิ่มเงื่อนไขตรวจสอบรหัส Flappy Bird
                        alert("👊 รหัสถูกต้อง! กำลังเข้าสู่เกม Streetfighter");
                        window.location.href = "../minigame/streetfighter.html"; // เปลี่ยน Path ตามตำแหน่งไฟล์จริงของคุณ

                     } else if (pokemonCode && cleanInput === pokemonCode) { 
                        // 👈 2. เพิ่มเงื่อนไขตรวจสอบรหัส Flappy Bird
                        alert("⚡ รหัสถูกต้อง! กำลังเข้าสู่เกม pokemon");
                        window.location.href = "../minigame/pokemon.html"; // เปลี่ยน Path ตามตำแหน่งไฟล์จริงของคุณ

                      } else if (terrariaCode && cleanInput === terrariaCode) { 
                        // 👈 2. เพิ่มเงื่อนไขตรวจสอบรหัส Flappy Bird
                        alert("🪓 รหัสถูกต้อง! กำลังเข้าสู่เกม terraria");
                        window.location.href = "../minigame/terraria.html"; // เปลี่ยน Path ตามตำแหน่งไฟล์จริงของคุณ

                     } else if (nfsCode && cleanInput === nfsCode) { 
                        // 👈 2. เพิ่มเงื่อนไขตรวจสอบรหัส Flappy Bird
                        alert("🏎️ รหัสถูกต้อง! กำลังเข้าสู่ Need For Speed JDM...");
                        window.location.href = "../minigame/nfs.html"; // เปลี่ยน Path ตามตำแหน่งไฟล์จริงของคุณ

                    } else {
                        alert("❌ รหัสผ่านไม่ถูกต้อง!");
                    }
                } else {
                    alert("⚠️ ไม่พบข้อมูลรหัสลับในระบบ Firestore");
                }
            } catch (error) {
                console.error("Error fetching secret code:", error);
                alert("เกิดข้อผิดพลาดในการตรวจสอบรหัสลับ");
            }
        }
    });
}