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
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let unsubscribe = null;

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    if (unsubscribe) {
        unsubscribe();
    }

    listenNotification(user.uid);

});

function listenNotification(uid) {

    const q = query(

        collection(db, "notifications"),

        where("userId", "==", uid),

        where("read", "==", false),

        orderBy("createdAt", "desc"),

        limit(1)

    );

    unsubscribe = onSnapshot(q, (snap) => {

        snap.docChanges().forEach(change => {

            if (change.type !== "added") return;

            const data = change.doc.data();

            showPopup(
                change.doc.id,
                data.title,
                data.message
            );

        });

    }, (err) => {

        console.error("Notification Error :", err);

    });

}

function showPopup(id, title, message) {

    if (document.getElementById("notifyPopup")) return;

    const popup = document.createElement("div");

    popup.id = "notifyPopup";

    popup.innerHTML = `

    <div style="
        width:360px;
        background:#222;
        color:white;
        padding:30px;
        border-radius:15px;
        text-align:center;
        box-shadow:0 10px 30px rgba(0,0,0,.3);
    ">

        <h2>🔔 ${title}</h2>

        <p style="margin:20px 0;">
            ${message}
        </p>

        <button id="closeNotify"
            style="
                padding:10px 25px;
                border:none;
                border-radius:8px;
                background:#b30000;
                color:white;
                cursor:pointer;
            ">
            ตกลง
        </button>

    </div>

    `;

    popup.style.position = "fixed";
    popup.style.left = "0";
    popup.style.top = "0";
    popup.style.width = "100%";
    popup.style.height = "100%";
    popup.style.display = "flex";
    popup.style.alignItems = "center";
    popup.style.justifyContent = "center";
    popup.style.background = "rgba(0,0,0,.45)";
    popup.style.zIndex = "99999";

    document.body.appendChild(popup);

    popup.querySelector("#closeNotify").onclick = async () => {

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