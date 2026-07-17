import { auth, db } from "./firebase-config.js";


import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import { loadTheme } from "../js/theme.js";


await loadTheme();





// ================= CHECK OWNER =================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "login.html";
        return;

    }

    const userSnap = await getDoc(
        doc(db, "users", user.uid)
    );

    if (!userSnap.exists()) {

        location.href = "login.html";
        return;

    }

    const userData = userSnap.data();

    if (userData.role !== "owner") {

        location.href = "dashboard.html";
        return;

    }

    // แสดงชื่อเจ้าของหอ
    const name = document.getElementById("adminName");

    if (name) {

        name.innerText = "Welcome, " + userData.fullname;

    }

    // โหลดข้อมูล Dashboard
    await loadStatistics();

    // โหลดรายการจอง
    await loadBookings();

    // โหลดแจ้งเตือนเก่า
    await loadOwnerNotifications(user.uid);

    // ฟังแจ้งเตือนแบบ Real-time
    listenOwnerNotification(user.uid);

});


// ================= LOAD BOOKING =================


async function loadBookings(){


const box =
document.getElementById(
"bookingContainer"
);



if(!box) return;



box.innerHTML="";



const snap =
await getDocs(
collection(db,"bookings")
);



let total=0;

let pending=0;

let approved=0;

let rejected=0;




snap.forEach(item=>{


const booking={

id:item.id,

...item.data()

};



total++;



if(booking.status==="pending")
pending++;


if(booking.status==="approved")
approved++;


if(booking.status==="rejected")
rejected++;




showBooking(booking);



});





setText(
"totalBooking",
total
);


setText(
"pendingBooking",
pending
);


setText(
"approvedBooking",
approved
);


setText(
"rejectedBooking",
rejected
);



}







function setText(id,value){


const el =
document.getElementById(id);


if(el){

el.innerText=value;

}


}









// ================= CARD =================


function showBooking(data){


const box =
document.getElementById(
"bookingContainer"
);



const card =
document.createElement(
"div"
);



card.className="card";



card.innerHTML=`

<h3>
ห้อง ${data.roomNumber}
</h3>


<p>
ชื่อ :
${data.fullname}
</p>


<p>
รหัส:
${data.studentId}
</p>


<p>
เบอร์:
${data.phone}
</p>


<p>
ราคา:
${data.price}
บาท
</p>


<p>
สถานะ :

${data.status}

</p>



${
data.status==="pending"

?

`

<button onclick="
approveBooking('${data.id}')
">

อนุมัติ

</button>


<button onclick="
rejectBooking('${data.id}')
">

ปฏิเสธ

</button>

`

:""

}


`;



box.appendChild(card);


}









// ================= APPROVE =================


window.approveBooking =
async function(id){



const bookingRef =
doc(db,"bookings",id);



const snap =
await getDoc(bookingRef);



if(!snap.exists())
return;



const booking =
snap.data();





await updateDoc(

bookingRef,

{

status:"approved",

approvedAt:
serverTimestamp()

}

);







await updateDoc(

doc(
db,
"rooms",
booking.roomId
),

{

status:"occupied",

tenantId:
booking.userId

}

);







await updateDoc(

doc(
db,
"users",
booking.userId
),

{

room:
booking.roomNumber,


roomId:
booking.roomId,


floor:
booking.floor,


tenant:true


}

);








await sendNotification(

booking.userId,

"จองห้องได้รับอนุมัติ",

`ห้อง ${booking.roomNumber} ได้รับอนุมัติแล้ว`,

"approve"

);

alert("อนุมัติเรียบร้อย");

await loadStatistics();

await loadBookings();

};









// ================= REJECT =================


window.rejectBooking =
async function(id){



const bookingRef =
doc(db,"bookings",id);



const snap =
await getDoc(bookingRef);



const booking =
snap.data();






await updateDoc(

bookingRef,

{

status:"rejected",

rejectedAt:
serverTimestamp()

}

);







await updateDoc(

doc(
db,
"rooms",
booking.roomId
),

{

status:"available",

tenantId:""

}

);








await sendNotification(

booking.userId,

"คำขอจองถูกปฏิเสธ",

`ห้อง ${booking.roomNumber} ไม่ได้รับอนุมัติ`,

"reject"

);






alert("ปฏิเสธเรียบร้อย");

await loadStatistics();

await loadBookings();



};









// ================= SEND NOTIFICATION =================


async function sendNotification(
userId,
title,
message,
type
){



await addDoc(

collection(db,"notifications"),

{


userId,


title,


message,


type,


read:false,


createdAt:
serverTimestamp()


}


);


}









// ================= OWNER POPUP =================

function listenOwnerNotification(uid){

    const q = query(

        collection(db,"notifications"),

        where("userId","==",uid),

        where("read","==",false),

        orderBy("createdAt","desc"),

        limit(1)

    );

    onSnapshot(q,(snap)=>{

        snap.docChanges().forEach(change=>{

            if(change.type !== "added") return;

            const notificationId = change.doc.id;

            const data = change.doc.data();

            popup(
                notificationId,
                data.title,
                data.message
            );

        });

    });

}

// ================= POPUP =================

function popup(id,title,message){

    const div = document.createElement("div");

    div.innerHTML = `

    <div style="
        background:#222;
        color:white;
        padding:30px;
        border-radius:15px;
        text-align:center;
        width:350px;
    ">

        <h2>🔔 ${title}</h2>

        <p>${message}</p>

        <button id="close">
            ปิด
        </button>

    </div>

    `;

    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.background = "rgba(0,0,0,.5)";
    div.style.zIndex = "9999";

    document.body.appendChild(div);

    div.querySelector("#close").onclick = async()=>{

        try{

            await updateDoc(
                doc(db,"notifications",id),
                {
                    read:true
                }
            );

        }catch(err){

            console.error(err);

        }

        div.remove();

    };

}









// ================= LOAD OLD NOTIFY =================


async function loadOwnerNotifications(uid){


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



snap.forEach(item=>{


const data =
item.data();



box.innerHTML +=`

<div>

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

// ================= STATISTICS =================

async function loadStatistics() {

    // ผู้เช่าทั้งหมด
   const tenantSnap = await getDocs(
    query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("tenant", "==", true)
    )
);

    document.getElementById("totalUser").innerText =
        tenantSnap.size;

    // ห้องทั้งหมด
    const roomSnap = await getDocs(
        collection(db, "rooms")
    );

    document.getElementById("totalRooms").innerText =
        roomSnap.size;

    // แจ้งซ่อม
    const repairSnap = await getDocs(
        collection(db, "repairs")
    );

    document.getElementById("totalRepairs").innerText =
        repairSnap.size;

    // รายได้รวม
    let income = 0;

    const paymentSnap = await getDocs(
        query(
            collection(db, "leaseRequests"),
            where("paymentStatus", "==", "paid")
        )
    );

    paymentSnap.forEach(doc => {

        income += Number(doc.data().total || 0);

    });

    document.getElementById("totalIncome").innerText =
        income.toLocaleString() + " บาท";

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