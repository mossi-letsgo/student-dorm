import { auth, db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadTheme } from "./theme.js";
import {
    writeLog
} from "./logger.js";

await loadTheme();

const table = document.getElementById("roomTable");
const modal = document.getElementById("roomModal");
const search = document.getElementById("searchRoom");
const category = document.getElementById("roomCategory");

let rooms = [];
let currentCategory = "small";


// =========================
// โหลดชื่อ Super Admin
// =========================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "../index.html";
        return;
    }

    try {

        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) return;

        document.getElementById("adminName").textContent =
            snap.data().fullname || "Super Admin";

    } catch (err) {

        console.error(err);

    }

});


// =========================
// โหลดข้อมูลห้อง
// =========================

async function loadRooms() {

    table.innerHTML = `
    <tr>
        <td colspan="6" style="text-align:center;">
            กำลังโหลดข้อมูล...
        </td>
    </tr>`;

    rooms = [];

    const snap = await getDocs(collection(db, "rooms"));

    snap.forEach(docSnap => {

        rooms.push({

            id: docSnap.id,
            ...docSnap.data()

        });
        rooms.sort((a, b) => {

    return a.roomNumber.localeCompare(
        b.roomNumber,
        undefined,
        {
            numeric: true,
            sensitivity: "base"
        }
    );

});

    });

    filterRooms();

}

loadRooms();


// =========================
// กรองประเภทห้อง
// =========================

function filterRooms() {

    const keyword = search.value.toLowerCase();

    const result = rooms.filter(room => {

        const roomType = room.type || room.roomType;

        return roomType === currentCategory &&
            room.roomNumber.toLowerCase().includes(keyword);

    });

    renderTable(result);

}


// =========================
// เปลี่ยนหมวด
// =========================

category.addEventListener("change", () => {

    currentCategory = category.value;

    filterRooms();

});


// =========================
// ค้นหา
// =========================

search.addEventListener("input", () => {

    filterRooms();

});


// =========================
// แสดงตาราง
// =========================

function renderTable(data) {

    if (data.length === 0) {

        table.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;">
                ไม่มีข้อมูลห้อง
            </td>
        </tr>`;

        return;

    }

    table.innerHTML = "";

    data.forEach(room => {

        let statusText = "";

        switch (room.status) {

            case "available":
                statusText = "🟢 ว่าง";
                break;

            case "occupied":
                statusText = "🔴 มีผู้เช่า";
                break;

            case "booked":
                statusText = "🟡 รออนุมัติ";
                break;

            default:
                statusText = "⚫ ปิดใช้งาน";

        }

        let typeText = "";

        switch (room.type || room.roomType) {

            case "small":
                typeText = "ห้องขนาดเล็ก";
                break;

            case "medium":
                typeText = "ห้องขนาดกลาง";
                break;

            case "large":
                typeText = "ห้องขนาดขนาดใหญ่";
                break;

            default:
                typeText = "-";

        }

        table.innerHTML += `

        <tr>

            <td>${room.roomNumber}</td>

            <td>${room.floor}</td>

            <td>${typeText}</td>

            <td>${Number(room.price).toLocaleString()} บาท</td>

            <td>${statusText}</td>

            <td>

                <button onclick="editRoom('${room.id}')">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button onclick="deleteRoom('${room.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        </tr>

        `;

    });

}

// =========================
// เปิด Modal เพิ่มห้อง
// =========================

document.getElementById("addRoomBtn").onclick = () => {

    document.getElementById("roomId").value = "";
    document.getElementById("roomNumber").value = "";
    document.getElementById("floor").value = "";
    document.getElementById("roomType").value = currentCategory;
    document.getElementById("price").value = "";
    document.getElementById("description").value = "";
    document.getElementById("status").value = "available";

    modal.style.display = "flex";

};


// =========================
// ปิด Modal
// =========================

window.closeRoomModal = () => {

    modal.style.display = "none";

};


// =========================
// บันทึกข้อมูล
// =========================

document.getElementById("saveRoomBtn").onclick = async () => {

    const id = document.getElementById("roomId").value;

    const data = {

        roomNumber: document.getElementById("roomNumber").value.trim(),

        floor: Number(document.getElementById("floor").value),

        type: document.getElementById("roomType").value,

        price: Number(document.getElementById("price").value),

        description: document.getElementById("description").value.trim(),

        status: document.getElementById("status").value,

        updatedAt: new Date()

    };

    if (
        !data.roomNumber ||
        !data.floor ||
        !data.type ||
        !data.price
    ) {

        alert("กรุณากรอกข้อมูลให้ครบ");

        return;

    }

    try {

        if (id) {

            await updateDoc(doc(db, "rooms", id), {

                ...data,
                updatedAt: serverTimestamp()

            });

            alert("แก้ไขข้อมูลสำเร็จ");

        } else {

            await addDoc(collection(db, "rooms"), {

                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()

            });

            alert("เพิ่มห้องสำเร็จ");

        }

        closeRoomModal();

        loadRooms();

    } catch (err) {

        console.error(err);

        alert("เกิดข้อผิดพลาด");

    }

};


// =========================
// แก้ไขห้อง
// =========================

window.editRoom = (id) => {

    const room = rooms.find(r => r.id === id);

    if (!room) return;

    document.getElementById("roomId").value = room.id;

    document.getElementById("roomNumber").value = room.roomNumber;

    document.getElementById("floor").value = room.floor;

    document.getElementById("roomType").value =
        room.type || room.roomType;

    document.getElementById("price").value = room.price;

    document.getElementById("description").value =
        room.description || "";

    document.getElementById("status").value = room.status;

    modal.style.display = "flex";

};


// =========================
// ลบห้อง
// =========================

window.deleteRoom = async (id) => {

    if (!confirm("ต้องการลบห้องนี้ใช่หรือไม่?")) return;

    try {

        await deleteDoc(doc(db, "rooms", id));

        alert("ลบห้องสำเร็จ");

        loadRooms();

    } catch (err) {

        console.error(err);

        alert("ไม่สามารถลบข้อมูลได้");

    }

};


// =========================
// Logout
// =========================

document.getElementById("logoutBtn").onclick = async () => {

    await signOut(auth);

    location.href = "../index.html";

};