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

// ================= SECRET MULTI-GAME ACCESS (NO PASSWORD DROPDOWN) =================
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

            // แสดง Pop-up เลือกเกม
            const { value: selectedGame } = await Swal.fire({
                title: '🎮 เลือกมินิเกมที่ต้องการเล่น',
                html: `
                    <div style="text-align: left; font-family: 'Kanit', 'Segoe UI Emoji', sans-serif;">
                        <label style="font-size: 13px; color: #bbb;">เลือกเกมจากรายการด้านล่าง:</label>
                        <select id="swal-game-select" class="swal2-input" style="width: 100%; margin: 10px 0 5px 0; background: #222; color: #fff; border: 1px solid #444; border-radius: 8px; padding: 10px; font-size: 14px; font-family: inherit;">
                            <option value="snake" style="background: #222; color: #fff;">🐍 Snake Game</option>
                            <option value="dino" style="background: #222; color: #fff;">🦖 Dino Runner</option>
                            <option value="flappy" style="background: #222; color: #fff;">🐦 Flappy Bird</option>
                            <option value="mario" style="background: #222; color: #fff;">🎩 Super Mario</option>
                            <option value="fighter" style="background: #222; color: #fff;">👊 Street Fighter</option>
                            <option value="pokemon" style="background: #222; color: #fff;">⚡ Pokémon</option>
                            <option value="terraria" style="background: #222; color: #fff;">🪓 Terraria Mini</option>
                            <option value="nfs" style="background: #222; color: #fff;">🏎️ Need For Speed JDM</option>
                            <option value="bloxfruits" style="background: #222; color: #fff;">⚔️ Blox Fruits 3D</option>
                            <option value="spiderman" style="background: #222; color: #fff;">🕷️ Spiderman</option>
                             <option value="amongus" style="background: #222; color: #fff;">🤨 Amongus</option>
                        </select>
                    </div>
                `,
                background: '#1a1515',
                color: '#ffffff',
                confirmButtonColor: '#ff1a1a',
                cancelButtonColor: '#333333',
                confirmButtonText: '🚀 เข้าเล่นเกม',
                cancelButtonText: 'ยกเลิก',
                showCancelButton: true,
                focusConfirm: false,
                preConfirm: () => {
                    return document.getElementById('swal-game-select').value;
                }
            });

            // ถ้าผู้ใช้กดเลือกเกมและกดยืนยัน
            if (selectedGame) {
                const gameConfigs = {
                    snake: { name: "Snake", url: "../minigame/minigame.html", icon: "🐍" },
                    dino: { name: "Dino Runner", url: "../minigame/dinosour.html", icon: "🦖" },
                    flappy: { name: "Flappy Bird", url: "../minigame/flappybird.html", icon: "🐦" },
                    mario: { name: "Super Mario", url: "../minigame/mario.html", icon: "🎩" },
                    fighter: { name: "Street Fighter", url: "../minigame/streetfighter.html", icon: "👊" },
                    pokemon: { name: "Pokémon", url: "../minigame/pokemon.html", icon: "⚡" },
                    terraria: { name: "Terraria Mini", url: "../minigame/terraria.html", icon: "🪓" },
                    nfs: { name: "Need For Speed JDM", url: "../minigame/nfs.html", icon: "🏎️" },
                    amongus: { name: "Amongus", url: "../minigame/amongus2d.html", icon: "🤨" },
                    spiderman: { name: "spiderman", url: "../minigame/spiderman.html", icon: "🤨" },
                    bloxfruits: { name: "Blox Fruits 3D", url: "../minigame/bloxfruits.html", icon: "⚔️" }
                };

                const targetGame = gameConfigs[selectedGame];

                if (targetGame) {
                    Swal.fire({
                        icon: 'success',
                        title: `${targetGame.icon} กำลังเข้าสู่เกม!`,
                        text: `พาคุณไปยังเกม ${targetGame.name}...`,
                        background: '#1a1515',
                        color: '#fff',
                        timer: 1000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = targetGame.url;
                    });
                }
            }
        }
    });
}