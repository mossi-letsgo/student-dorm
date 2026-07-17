import { auth, db } from "./firebase-config.js";


import {
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
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import { loadTheme } from "../js/theme.js";


await loadTheme();



let allRooms=[];





// ================= LOAD ROOM =================


function listenRooms(){


onSnapshot(

collection(db,"rooms"),

(snap)=>{


allRooms=[];



snap.forEach(item=>{


allRooms.push({

id:item.id,

...item.data()

});});
renderRooms(allRooms);});}

// ================= RENDER =================


function renderRooms(rooms){


const box =
document.getElementById(
"roomContainer"
);



box.innerHTML="";




rooms.forEach(room=>{



let statusText="ไม่ว่าง";

let statusColor="red";



if(room.status==="available"){

statusText="ว่าง";

statusColor="lightgreen";

}


if(room.status==="pending"){

statusText="รออนุมัติ";

statusColor="orange";

}




const card =
document.createElement("div");



card.className="card";



card.innerHTML=`

<h3>
ห้อง ${room.roomNumber}
</h3>


<p>
ชั้น : ${room.floor}
</p>


<p>
ราคา :
${room.price}
บาท
</p>


<p>
สถานะ :

<b style="color:${statusColor}">
${statusText}
</b>

</p>



<button

${room.status!=="available"?"disabled":""}

onclick="
bookRoom('${room.id}')
"

>


${
room.status==="available"

?

"จองห้อง"

:

"ไม่ว่าง"

}


</button>


`;



box.appendChild(card);



});



}









// ================= FILTER =================


window.filterRoom=function(type){


if(type==="all"){

renderRooms(allRooms);

return;

}


renderRooms(

allRooms.filter(
r=>r.type===type
)

);


};









// ================= BOOK =================


window.bookRoom =
async function(roomId){



const user =
auth.currentUser;



if(!user){

alert(
"กรุณาเข้าสู่ระบบ"
);

return;

}



try{



// ROOM


const roomRef =
doc(
db,
"rooms",
roomId
);



const roomSnap =
await getDoc(roomRef);



if(!roomSnap.exists()){

alert(
"ไม่พบห้อง"
);

return;

}



const room =
roomSnap.data();





if(room.status!=="available"){

alert(
"ห้องไม่ว่าง"
);

return;

}







// USER


const userSnap =
await getDoc(
doc(db,"users",user.uid)
);



if(!userSnap.exists()){

alert(
"ไม่พบข้อมูลผู้ใช้"
);

return;

}



const userData =
userSnap.data();







// CHECK ROOM


if(userData.room){

alert(
"คุณมีห้องอยู่แล้ว"
);

return;

}








// CHECK BOOKING


const check =
query(

collection(db,"bookings"),

where(
"userId",
"==",
user.uid
),

where(
"status",
"==",
"pending"
)

);



const old =
await getDocs(check);



if(!old.empty){

alert(
"มีคำขอรออนุมัติอยู่แล้ว"
);

return;

}









// CREATE BOOKING


const booking =
await addDoc(

collection(db,"bookings"),

{


userId:user.uid,


fullname:
userData.fullname,


studentId:
userData.studentId,


phone:
userData.phone,


roomId,


roomNumber:
room.roomNumber,


floor:
room.floor,


price:
room.price,


type:
room.type,


status:
"pending",


createdAt:
serverTimestamp()


}

);








// UPDATE ROOM


await updateDoc(

roomRef,

{

status:"pending"

}

);

// SEND OWNER NOTIFICATION

const ownerQuery = query(
    collection(db,"users"),
    where("role","==","owner")
);


const ownerSnap = await getDocs(ownerQuery);


ownerSnap.forEach(async(owner)=>{

    await addDoc(
        collection(db,"notifications"),
        {

            userId: owner.id,

            title:"มีคำขอจองห้องใหม่",

            message:
            `${userData.fullname} ขอเช่าห้อง ${room.roomNumber}`,

            type:"booking",

            bookingId:booking.id,

            read:false,

            createdAt:serverTimestamp()

        }
    );

});


alert(
"ส่งคำขอจองเรียบร้อย"
);



listenRooms();




}
catch(err){


console.error(err);


alert(
"เกิดข้อผิดพลาด"
);


}



};









// START


listenRooms();






// LOGOUT


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