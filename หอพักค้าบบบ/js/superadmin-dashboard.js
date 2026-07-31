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