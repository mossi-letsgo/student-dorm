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
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";


await loadTheme();



// ================= CHECK LOGIN =================

onAuthStateChanged(auth, async(user)=>{


    if(!user){

        location.href="login.html";

        return;

    }



    const snap = await getDoc(
        doc(db,"users",user.uid)
    );



    if(!snap.exists()){

        location.href="login.html";

        return;

    }



    const data = snap.data();



    if(data.role !== "owner"){

        location.href="dashboard.html";

        return;

    }



    document.getElementById("adminName").innerText =
        "Welcome, " + data.fullname;

    listenBookings();

});









// ================= LOAD BOOKINGS =================

function listenBookings(){


const q = query(
    collection(db,"bookings"),
    orderBy("createdAt","desc")
);



onSnapshot(q,(bookingSnap)=>{


const container =
document.getElementById(
"bookingContainer"
);


container.innerHTML="";



let total=0;
let pending=0;
let approved=0;
let rejected=0;



bookingSnap.forEach(docSnap=>{


const booking={

id:docSnap.id,

...docSnap.data()

};



total++;


if(booking.status==="pending")
pending++;


if(booking.status==="approved")
approved++;


if(booking.status==="rejected")
rejected++;



renderBooking(booking);



});




document.getElementById("totalBooking").innerText =
total;


document.getElementById("pendingBooking").innerText =
pending;


document.getElementById("approvedBooking").innerText =
approved;
document.getElementById("rejectedBooking").innerText =
rejected;

});

}

// ================= CARD =================


function renderBooking(booking){


    const container =
    document.getElementById(
        "bookingContainer"
    );



    const card =
    document.createElement(
        "div"
    );



    card.className="card";



    let color="orange";



    if(booking.status==="approved")
        color="lightgreen";


    if(booking.status==="rejected")
        color="red";





    card.innerHTML = `


    <h3>
    ห้อง ${booking.roomNumber}
    </h3>



    <p>
    ชื่อ : ${booking.fullname}
    </p>



    <p>
    รหัส : ${booking.studentId}
    </p>



    <p>
    เบอร์ : ${booking.phone}
    </p>



    <p>
    ราคา : ${booking.price} บาท
    </p>



    <p>

    สถานะ :

    <b style="color:${color}">

    ${booking.status}

    </b>


    </p>





    ${
        booking.status==="pending"

        ?

        `

        <button onclick="approveBooking('${booking.id}')">

        อนุมัติ

        </button>



        <button onclick="rejectBooking('${booking.id}')">

        ปฏิเสธ

        </button>

        `

        :

        ""

    }



    `;



    container.appendChild(card);



}









// ================= APPROVE =================


window.approveBooking = async function(id){



    try{


        const bookingRef =
        doc(
            db,
            "bookings",
            id
        );



        const bookingSnap =
        await getDoc(
            bookingRef
        );



        if(!bookingSnap.exists()){


            alert(
                "ไม่พบข้อมูลการจอง"
            );


            return;

        }



        const booking =
        bookingSnap.data();







        // เปลี่ยนสถานะ booking


        await updateDoc(
            bookingRef,
            {

                status:"approved",

                approvedAt:
                serverTimestamp()

            }
        );







        // เปลี่ยนสถานะห้อง


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







        // เพิ่มห้องให้ User


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







        // ================= NOTIFICATION =================


        await addDoc(
            collection(
                db,
                "notifications"
            ),
            {


                userId:
                booking.userId,


                title:
                "จองห้องได้รับอนุมัติ",


                message:
                `ห้อง ${booking.roomNumber} ได้รับการอนุมัติแล้ว สามารถเข้าพักได้`,


                type:
                "approve",


                read:
                false,


                createdAt:
                serverTimestamp()


            }
        );







        alert(
            "อนุมัติเรียบร้อย"
        );



        listenBookings();



    }

    catch(err){


        console.error(err);


        alert(
            "เกิดข้อผิดพลาด"
        );


    }


};









// ================= REJECT =================


window.rejectBooking = async function(id){



    try{



        const bookingRef =
        doc(
            db,
            "bookings",
            id
        );



        const bookingSnap =
        await getDoc(
            bookingRef
        );



        if(!bookingSnap.exists()){


            alert(
                "ไม่พบข้อมูลการจอง"
            );


            return;


        }




        const booking =
        bookingSnap.data();








        // เปลี่ยนสถานะ


        await updateDoc(
            bookingRef,
            {

                status:"rejected",

                rejectedAt:
                serverTimestamp()

            }
        );








        // คืนห้อง


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








        // ล้างข้อมูล User


        await updateDoc(
            doc(
                db,
                "users",
                booking.userId
            ),
            {

                room:"",

                roomId:"",

                floor:"",

                tenant:false

            }
        );








        // ================= NOTIFICATION =================


        await addDoc(
            collection(
                db,
                "notifications"
            ),
            {


                userId:
                booking.userId,


                title:
                "คำขอจองถูกปฏิเสธ",


                message:
                `คำขอเช่าห้อง ${booking.roomNumber} ไม่ได้รับการอนุมัติ`,


                type:
                "reject",


                read:
                false,


                createdAt:
                serverTimestamp()


            }
        );







        alert(
            "ปฏิเสธเรียบร้อย"
        );



        listenBookings();




    }

    catch(err){


        console.error(err);


        alert(
            "เกิดข้อผิดพลาด"
        );


    }


};









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