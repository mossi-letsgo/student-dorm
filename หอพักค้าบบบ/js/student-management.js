import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    getDocs,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let students = [];

// ================= LOGIN =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "superadmin-login.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {

        await signOut(auth);

        location.href = "superadmin-login.html";

        return;
    }

    const me = snap.data();

    if (me.role !== "superadmin") {

        alert("คุณไม่มีสิทธิ์");

        await signOut(auth);

        location.href = "../index.html";

        return;

    }

    document.getElementById("adminName").innerText = me.fullname;

    document.getElementById("searchStudent").value = "";

    loadStudents();

});


// ================= LOAD STUDENTS =================

async function loadStudents(){

    students = [];

    const snap = await getDocs(collection(db,"users"));

    snap.forEach(docSnap=>{

        const data = docSnap.data();

        if(data.role==="student"){

            students.push({

                id:docSnap.id,

                ...data

            });

        }

    });

    renderTable(students);

}


// ================= RENDER TABLE =================

function renderTable(data){

    const table = document.getElementById("studentTable");

    table.innerHTML = "";

    if(data.length===0){

        table.innerHTML=`

        <tr>

            <td colspan="7" style="text-align:center">

                ไม่พบข้อมูลนักศึกษา

            </td>

        </tr>

        `;

        return;

    }

    data.forEach(student=>{

        table.innerHTML += `

        <tr>

            <td>${student.fullname ?? "-"}</td>

            <td>${student.studentId ?? "-"}</td>

            <td>${student.major ?? "-"}</td>

            <td>${student.age ?? "-"}</td>

            <td>${student.phone ?? "-"}</td>

            <td>

                <button onclick="editStudent('${student.id}')">

                    <i class="fa-solid fa-pen"></i>

                    แก้ไข

                </button>

            </td>

        </tr>

        `;

    });

}


// ================= SEARCH =================

document
.getElementById("searchStudent")
.addEventListener("input",()=>{

    const keyword=document
    .getElementById("searchStudent")
    .value
    .trim()
    .toLowerCase();

    const result=students.filter(student=>

        student.fullname?.toLowerCase().includes(keyword)||

        student.studentId?.toLowerCase().includes(keyword)

    );

    renderTable(result);

});


// ================= OPEN MODAL =================

window.editStudent = function(uid){

    const student = students.find(x=>x.id===uid);

    if(!student) return;

    document.getElementById("studentUid").value = uid;

    document.getElementById("fullname").value =
        student.fullname ?? "";

    document.getElementById("studentId").value =
        student.studentId ?? "";

    document.getElementById("major").value =
        student.major ?? "";

    document.getElementById("age").value =
        student.age ?? "";

    document.getElementById("phone").value =
        student.phone ?? "";

    document.getElementById("studentModal").style.display="flex";

};

// ================= SAVE =================

import {
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document
.getElementById("saveStudentBtn")
.addEventListener("click", async () => {

    const uid = document.getElementById("studentUid").value;

    const fullname = document.getElementById("fullname").value.trim();

    const studentId = document.getElementById("studentId").value.trim();

    const major = document.getElementById("major").value.trim();

    const age = Number(document.getElementById("age").value);

    const phone = document.getElementById("phone").value.trim();

    if (
        fullname === "" ||
        studentId === ""
    ){

        alert("กรุณากรอกข้อมูลให้ครบ");

        return;

    }

    try{

        await updateDoc(

            doc(db,"users",uid),

            {

                fullname,

                studentId,

                major,

                age,

                phone

            }

        );

        alert("บันทึกข้อมูลสำเร็จ");

        document.getElementById("studentModal").style.display="none";

        loadStudents();

    }catch(err){

        console.error(err);

        alert("เกิดข้อผิดพลาด");

    }

});


// ================= CHANGE PASSWORD =================

// Firebase Client เปลี่ยนรหัสของผู้ใช้อื่นไม่ได้
// ถ้าจะทำต้องใช้ Firebase Admin SDK (Cloud Functions)

window.changePassword = function(uid){

    alert(
`Firebase Client ไม่สามารถเปลี่ยนรหัสผ่านของผู้ใช้อื่นได้

ต้องใช้ Firebase Admin SDK หรือ Cloud Functions`
    );

};


// ================= LOGOUT =================

document
.getElementById("logoutBtn")
.addEventListener("click",async()=>{

    if(!confirm("ออกจากระบบ ?")) return;

    await signOut(auth);

    location.href="superadmin-login.html";

});