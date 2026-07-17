import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let listening = false;

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    if (listening) return;

    listening = true;

    listenOwnerNotification(user.uid);

});

// ================= REALTIME =================

function listenOwnerNotification(uid) {

    const q = query(

        collection(db, "notifications"),

        where("userId", "==", uid),

        where("read", "==", false),

        orderBy("createdAt", "desc"),

        limit(1)

    );

    onSnapshot(q, (snap) => {

        snap.docChanges().forEach(change => {

            if (change.type !== "added") return;

            const id = change.doc.id;

            const data = change.doc.data();

            popup(
                id,
                data.title,
                data.message
            );

        });

    });

}

// ================= POPUP =================

async function popup(id, title, message) {

    if (document.getElementById("owner-popup")) return;

    const bg = document.createElement("div");

    bg.id = "owner-popup";

    bg.style.position = "fixed";
    bg.style.top = "0";
    bg.style.left = "0";
    bg.style.width = "100%";
    bg.style.height = "100%";
    bg.style.background = "rgba(0,0,0,.45)";
    bg.style.display = "flex";
    bg.style.alignItems = "center";
    bg.style.justifyContent = "center";
    bg.style.zIndex = "99999";

    bg.innerHTML = `

        <div style="
            background:#222;
            color:#fff;
            width:360px;
            padding:25px;
            border-radius:15px;
            text-align:center;
        ">

            <h2>🔔 ${title}</h2>

            <p style="margin:20px 0;">
                ${message}
            </p>

            <button id="closeOwnerPopup"
                style="
                    padding:10px 25px;
                    border:none;
                    border-radius:8px;
                    background:#c00000;
                    color:white;
                    cursor:pointer;
                ">
                ตกลง
            </button>

        </div>

    `;

    document.body.appendChild(bg);

    document
        .getElementById("closeOwnerPopup")
        .onclick = async () => {

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

            bg.remove();

        };

}