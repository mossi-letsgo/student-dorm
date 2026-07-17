import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";


await loadTheme();


// ================= LOGIN =================


onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    console.log("Login UID =", user.uid);

    try {

        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (!userSnap.exists()) {
            location.href = "login.html";
            return;
        }

        const data = userSnap.data();

        const name = document.getElementById("userName");

        if (name) {
            name.innerHTML = `
                👋 สวัสดี,
                <b>${data.fullname}</b>
            `;
        }

        await loadDashboard(data);

        await loadNotifications(user.uid);

        listenUserNotification(user.uid);

    } catch (err) {

        console.error(err);
        alert("โหลดข้อมูลผิดพลาด");

    }

});

// ================= DASHBOARD =================

async function loadDashboard(data) {

    const room = document.getElementById("myRoom");
    const rent = document.getElementById("myRent");
    const status = document.getElementById("roomStatus");
    const repair = document.getElementById("myRepair");

    // โหลดข้อมูลห้อง
    if (data.room) {

        const roomSnap = await getDoc(
            doc(db, "rooms", data.room)
        );

        if (roomSnap.exists()) {

            const roomData = roomSnap.data();

            if (room)
                room.innerText = roomData.roomNumber;

            if (rent)
                rent.innerText = roomData.price + " บาท";

            if (status)
                status.innerText = "เข้าพักอยู่";

        } else {

            if (room)
                room.innerText = "-";

            if (rent)
                rent.innerText = "-";

            if (status)
                status.innerText = "ไม่พบข้อมูลห้อง";

        }

    } else {

        if (room)
            room.innerText = "-";

        if (rent)
            rent.innerText = "-";

        if (status)
            status.innerText = "ยังไม่มีห้อง";

    }

    // จำนวนแจ้งซ่อม
    if (repair) {

        const repairSnap = await getDocs(
            query(
                collection(db, "repairs"),
                where("userId", "==", auth.currentUser.uid)
            )
        );

        repair.innerText = repairSnap.size;

    }

}


// ================= LOAD NOTIFICATION =================


async function loadNotifications(uid){



const box =
document.getElementById(
"notificationContainer"
);



if(!box)
return;





const q =
query(

collection(db,"notifications"),

where(
"userId",
"==",
uid
),

orderBy(
"createdAt",
"desc"
),

limit(10)

);






const snap =
await getDocs(q);





box.innerHTML="";





if(snap.empty){



box.innerHTML=
`
<p>
🔔 ไม่มีการแจ้งเตือน
</p>
`;

return;


}






snap.forEach(item=>{


const data =
item.data();



box.innerHTML +=
`

<div class="notification-item">


<h3>
🔔 ${data.title}
</h3>


<p>
${data.message}
</p>


</div>


`;



});



}









// ================= REALTIME POPUP =================

function listenUserNotification(uid) {

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", uid),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(1)
    );

    onSnapshot(
        q,
        (snap) => {

            console.log("Notification Count :", snap.size);

            snap.docChanges().forEach(change => {

                console.log("Change :", change.type);

                if (change.type !== "added") return;

                const id = change.doc.id;
                const data = change.doc.data();

                console.log(data);

                showPopup(
                    id,
                    data.title,
                    data.message
                );

            });

        },
        (error) => {

            console.error("Snapshot Error :", error);

        }
    );

}

function showPopup(id, title, message) {

    if (document.getElementById("notifyPopup")) return;

    const popup = document.createElement("div");

    popup.id = "notifyPopup";

    popup.innerHTML = `
        <div style="
            background:#222;
            color:#fff;
            padding:30px;
            border-radius:15px;
            width:350px;
            text-align:center;
        ">

            <h2>🔔 ${title}</h2>

            <p>${message}</p>

            <button id="closePopup">
                ตกลง
            </button>

        </div>
    `;

    popup.style.position = "fixed";
    popup.style.top = "0";
    popup.style.left = "0";
    popup.style.width = "100%";
    popup.style.height = "100%";
    popup.style.display = "flex";
    popup.style.alignItems = "center";
    popup.style.justifyContent = "center";
    popup.style.background = "rgba(0,0,0,.5)";
    popup.style.zIndex = "9999";

    document.body.appendChild(popup);

    popup.querySelector("#closePopup").onclick = async () => {

        try {

            await updateDoc(
                doc(db, "notifications", id),
                {
                    read: true
                }
            );

        } catch (err) {

            console.error(err);

        }

        popup.remove();

    };

}

// ================= LOGOUT =================


document.getElementById("logoutBtn").addEventListener("click", async () => {

    const confirmLogout = confirm("คุณต้องการออกจากระบบใช่หรือไม่ ?");

    if (!confirmLogout) return;

    try {

        await signOut(auth);

        alert("ออกจากระบบสำเร็จ");

        window.location.href = "../index.html";

    } catch (error) {

        alert(error.message);

    }

});