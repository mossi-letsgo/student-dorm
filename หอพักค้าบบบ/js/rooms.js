// =====================================================
// STUDENT DASHBOARD
// =====================================================

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";

import {
    generatePromptPayPayload
} from "./promptpay.js";

import {
    writeLog
} from "./logger.js";


// =====================================================
// THEME
// =====================================================

await loadTheme();


// =====================================================
// VARIABLES
// =====================================================

let currentUser = null;
let currentRoom = null;
let leaveRequestUnsubscribe = null;


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.replace("login.html");
        return;
    }

    try {

        // =================================================
        // LOAD USER
        // =================================================

        const userSnap = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!userSnap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้");
            return;

        }

        currentUser = userSnap.data();


        // =================================================
        // USER NAME
        // =================================================

        const userName =
            document.getElementById("userName");

        if (userName) {

            userName.innerText =
                "ยินดีต้อนรับ " +
                (
                    currentUser.fullname ||
                    user.displayName ||
                    user.email ||
                    "ผู้ใช้งาน"
                );

        }


        // =================================================
        // NO ROOM
        // =================================================

        if (!currentUser.room) {

            const roomInfo =
                document.getElementById("roomInfo");

            if (roomInfo) {

                roomInfo.innerHTML = `

                    <h2>
                        คุณยังไม่มีห้องพัก
                    </h2>

                    <br>

                    <a
                        href="booking.html"
                        class="action-btn repair">

                        ไปจองห้องพัก

                    </a>

                `;

            }


            const facilityList =
                document.getElementById("facilityList");

            if (facilityList) {
                facilityList.innerHTML = "";
            }


            const leaveBtn =
                document.getElementById("leaveRoomBtn");

            if (leaveBtn) {
                leaveBtn.style.display = "none";
            }


            return;

        }


        // =================================================
        // LOAD ROOM
        // =================================================
        // ใช้ collection: rooms
        // document ID = currentUser.room
        // =================================================

        const roomSnap = await getDoc(
            doc(
                db,
                "rooms",
                currentUser.room
            )
        );

        if (!roomSnap.exists()) {

            alert(
                `ไม่พบข้อมูลห้อง ${currentUser.room}`
            );

            return;

        }

        currentRoom = roomSnap.data();

        loadRoom();

        listenLeaveRequest(user.uid);

    }

    catch (error) {

        console.error(
            "Dashboard Auth Error:",
            error
        );

        try {

            await writeLog({

                action: "ERROR",

                module: "dashboard",

                description:
                    "โหลดข้อมูล Dashboard ไม่สำเร็จ",

                status: "error",

                extra: {
                    error:
                        error?.message ||
                        String(error)
                }

            });

        }
        catch (logError) {

            console.error(
                "Dashboard Error Log Failed:",
                logError
            );

        }

    }

});


// =====================================================
// ROOM
// =====================================================

function loadRoom() {

    const roomInfo =
        document.getElementById("roomInfo");

    if (roomInfo) {

        roomInfo.innerHTML = `

            <h2 style="color:#ff2b2b">

                ห้อง
                ${escapeHTML(currentRoom.roomNumber)}

            </h2>

            <br>

            <p>

                <b>ประเภท :</b>

                ${escapeHTML(currentRoom.type)}

            </p>

            <p>

                <b>ชั้น :</b>

                ${escapeHTML(currentRoom.floor)}

            </p>

            <p>

                <b>ค่าเช่า :</b>

                ${Number(
                    currentRoom.price || 0
                ).toLocaleString()}

                บาท / เดือน

            </p>

            <p>

                <b>สถานะ :</b>

                เข้าพักแล้ว

            </p>

            <br>

            <p>

                ${escapeHTML(
                    currentRoom.description || ""
                )}

            </p>

        `;

    }


    const facilityList =
        document.getElementById("facilityList");

    if (facilityList) {

        facilityList.innerHTML = `

            <li>✔ เครื่องปรับอากาศ</li>
            <li>✔ เตียงนอน</li>
            <li>✔ ตู้เสื้อผ้า</li>
            <li>✔ โต๊ะอ่านหนังสือ</li>
            <li>✔ ห้องน้ำในตัว</li>
            <li>✔ Wi-Fi ฟรี</li>
            <li>✔ ระเบียง</li>

        `;

    }

}


// =====================================================
// SEND LEAVE REQUEST
// =====================================================

const leaveRoomBtn =
    document.getElementById("leaveRoomBtn");


if (leaveRoomBtn) {

    leaveRoomBtn.addEventListener(
        "click",
        async () => {

            if (
                !confirm(
                    "ยืนยันการส่งคำขอเลิกเช่า ?"
                )
            ) {
                return;
            }


            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "กรุณาเข้าสู่ระบบใหม่"
                );

                return;

            }


            if (
                !currentUser ||
                !currentRoom
            ) {

                alert(
                    "ไม่พบข้อมูลห้องพัก"
                );

                return;

            }


            try {

                // =================================================
                // SAVE LEAVE REQUEST
                // =================================================

                const leaveRef =
                    doc(
                        db,
                        "leaseRequests",
                        user.uid
                    );


                const newRequestData = {

                    userId:
                        user.uid,

                    fullname:
                        currentUser.fullname ||
                        user.displayName ||
                        "",

                    roomId:
                        currentUser.room,

                    roomNumber:
                        currentRoom.roomNumber,

                    roomType:
                        currentRoom.type,

                    rent:
                        currentRoom.price,

                    status:
                        "pending",

                    createdAt:
                        serverTimestamp()

                };


                await setDoc(
                    leaveRef,
                    newRequestData
                );


                // =================================================
                // SYSTEM LOG
                // =================================================

                try {

                    await writeLog({

                        action: "CREATE",

                        module: "lease",

                        targetId:
                            user.uid,

                        targetType:
                            "leaseRequest",

                        description:
                            `ส่งคำขอเลิกเช่าห้อง ${currentRoom.roomNumber}`,

                        newData:
                            newRequestData

                    });

                }
                catch (logError) {

                    console.error(
                        "เขียน System Log ไม่สำเร็จ:",
                        logError
                    );

                }


                // =================================================
                // FIND OWNER
                // =================================================

                const ownerQuery =
                    query(
                        collection(
                            db,
                            "users"
                        ),
                        where(
                            "role",
                            "==",
                            "owner"
                        )
                    );


                const ownerSnap =
                    await getDocs(
                        ownerQuery
                    );


                // =================================================
                // CREATE NOTIFICATIONS
                // =================================================

                const notificationPromises = [];


                ownerSnap.forEach(
                    (ownerDoc) => {

                        notificationPromises.push(

                            addDoc(
                                collection(
                                    db,
                                    "notifications"
                                ),
                                {

                                    userId:
                                        ownerDoc.id,

                                    title:
                                        "มีคำขอเลิกเช่า",

                                    message:
                                        `${currentUser.fullname || "ผู้พัก"} ขอเลิกเช่าห้อง ${currentRoom.roomNumber}`,

                                    type:
                                        "leave",

                                    read:
                                        false,

                                    createdAt:
                                        serverTimestamp()

                                }
                            )

                        );

                    }
                );


                await Promise.all(
                    notificationPromises
                );


                // =================================================
                // REFRESH LISTENER
                // =================================================

                listenLeaveRequest(
                    user.uid
                );


                alert(
                    "ส่งคำขอเลิกเช่าเรียบร้อย"
                );

            }

            catch (error) {

                console.error(
                    "Leave Request Error:",
                    error
                );


                try {

                    await writeLog({

                        action: "ERROR",

                        module: "lease",

                        targetId:
                            user.uid,

                        targetType:
                            "leaseRequest",

                        description:
                            "ส่งคำขอเลิกเช่าไม่สำเร็จ",

                        status:
                            "error",

                        extra: {

                            error:
                                error?.message ||
                                String(error)

                        }

                    });

                }
                catch (logError) {

                    console.error(
                        "Error Log Write Failed:",
                        logError
                    );

                }


                alert(
                    error?.message ||
                    "ไม่สามารถส่งคำขอเลิกเช่าได้"
                );

            }

        }
    );

}


// =====================================================
// REALTIME LEAVE REQUEST
// =====================================================

function listenLeaveRequest(uid) {

    const leaveBtn =
        document.getElementById(
            "leaveRoomBtn"
        );


    const statusBox =
        document.getElementById(
            "leaveStatus"
        );


    if (!leaveBtn || !statusBox) {
        return;
    }


    // =================================================
    // REMOVE OLD LISTENER
    // =================================================

    if (leaveRequestUnsubscribe) {

        leaveRequestUnsubscribe();

        leaveRequestUnsubscribe = null;

    }


    // =================================================
    // LISTEN
    // =================================================

    leaveRequestUnsubscribe =
        onSnapshot(

            doc(
                db,
                "leaseRequests",
                uid
            ),

            async (snap) => {

                try {

                    // =================================================
                    // NO REQUEST
                    // =================================================

                    if (!snap.exists()) {

                        leaveBtn.disabled = false;

                        leaveBtn.innerText =
                            "ขอเลิกเช่า";

                        statusBox.innerHTML =
                            "";

                        return;

                    }


                    const data =
                        snap.data();


                    // =================================================
                    // WRONG ROOM
                    // =================================================

                    if (
                        data.roomId !==
                        currentUser.room
                    ) {

                        leaveBtn.disabled = false;

                        leaveBtn.innerText =
                            "ขอเลิกเช่า";

                        statusBox.innerHTML =
                            "";

                        return;

                    }


                    // =================================================
                    // PENDING
                    // =================================================

                    if (
                        data.status ===
                        "pending"
                    ) {

                        leaveBtn.disabled = true;

                        leaveBtn.innerText =
                            "ส่งคำขอแล้ว";

                        statusBox.innerHTML = `

                            <h3
                                style="color:orange">

                                ⏳ รอเจ้าของหออนุมัติ

                            </h3>

                        `;

                        return;

                    }


                    // =================================================
                    // APPROVED
                    // =================================================

                    if (
                        data.status ===
                        "approved"
                    ) {

                        leaveBtn.disabled = true;

                        leaveBtn.innerText =
                            "รอชำระเงิน";


                        statusBox.innerHTML = `

                            <h3
                                style="color:lightgreen">

                                ✅ เจ้าของหออนุมัติแล้ว

                            </h3>

                            <h2>

                                ยอดชำระ
                                ${Number(
                                    data.total || 0
                                ).toLocaleString()}
                                บาท

                            </h2>

                            <canvas
                                id="promptpayQR">
                            </canvas>

                            <br><br>

                            <button
                                id="paidBtn"
                                class="action-btn">

                                ฉันชำระเงินแล้ว

                            </button>

                        `;


                        await createPromptPayQR(
                            data
                        );


                        setupPaidButton(
                            uid,
                            data
                        );


                        return;

                    }


                    // =================================================
                    // WAITING CONFIRM
                    // =================================================

                    if (
                        data.status ===
                        "waitingConfirm"
                    ) {

                        leaveBtn.disabled = true;

                        leaveBtn.innerText =
                            "รอตรวจสอบ";


                        statusBox.innerHTML = `

                            <h3
                                style="color:#00c3ff">

                                💳 ชำระเงินแล้ว

                            </h3>

                            <p>

                                Transaction:

                                ${escapeHTML(
                                    data.transactionId ||
                                    "-"
                                )}

                            </p>

                        `;

                        return;

                    }


                    // =================================================
                    // REJECTED
                    // =================================================

                    if (
                        data.status ===
                        "rejected"
                    ) {

                        leaveBtn.disabled = false;

                        leaveBtn.innerText =
                            "ขอเลิกเช่าอีกครั้ง";


                        statusBox.innerHTML = `

                            <h3
                                style="color:red">

                                ❌ เจ้าของหอปฏิเสธคำขอ

                            </h3>

                            <p>

                                ${escapeHTML(
                                    data.reason || ""
                                )}

                            </p>

                        `;

                        return;

                    }


                }
                catch (error) {

                    console.error(
                        "Leave Request Listener Error:",
                        error
                    );

                }

            },

            (error) => {

                console.error(
                    "Realtime Leave Request Error:",
                    error
                );

            }

        );

}


// =====================================================
// CREATE PROMPTPAY QR
// =====================================================

async function createPromptPayQR(data) {

    const statusBox =
        document.getElementById(
            "leaveStatus"
        );


    if (!statusBox) {
        return;
    }


    try {

        // =================================================
        // LOAD PROMPTPAY SETTINGS
        // =================================================

        const paymentSnap =
            await getDoc(
                doc(
                    db,
                    "paymentSettings",
                    "promptpay"
                )
            );


        if (!paymentSnap.exists()) {

            statusBox.innerHTML += `

                <p style="color:red;">

                    ❌ ยังไม่ได้ตั้งค่า PromptPay

                </p>

            `;

            return;

        }


        const payment =
            paymentSnap.data();


        const promptpayNumber =
            payment.promptpayNumber;


        if (!promptpayNumber) {

            statusBox.innerHTML += `

                <p style="color:red;">

                    ❌ ไม่พบเบอร์ PromptPay

                </p>

            `;

            return;

        }


        // =================================================
        // CHECK QR LIBRARY
        // =================================================

        if (
            typeof QRCode ===
            "undefined"
        ) {

            statusBox.innerHTML += `

                <p style="color:red;">

                    ❌ ระบบสร้าง QR Code ยังไม่พร้อม

                </p>

            `;

            return;

        }


        // =================================================
        // GENERATE PAYLOAD
        // =================================================

        const payload =
            generatePromptPayPayload(

                promptpayNumber,

                Number(
                    data.total || 0
                )

            );


        const canvas =
            document.getElementById(
                "promptpayQR"
            );


        if (!canvas) {
            return;
        }


        // =================================================
        // GENERATE QR
        // =================================================

        QRCode.toCanvas(

            canvas,

            payload,

            {

                width:
                    220,

                margin:
                    2

            },

            (error) => {

                if (error) {

                    console.error(
                        "สร้าง QR ไม่สำเร็จ:",
                        error
                    );

                    return;

                }

                console.log(
                    "สร้าง QR PromptPay สำเร็จ"
                );

            }

        );

    }

    catch (error) {

        console.error(
            "PromptPay Error:",
            error
        );


        statusBox.innerHTML += `

            <p style="color:red;">

                ❌ ไม่สามารถโหลด PromptPay ได้

            </p>

        `;

    }

}


// =====================================================
// PAID BUTTON
// =====================================================

function setupPaidButton(uid, data) {

    const paidBtn =
        document.getElementById(
            "paidBtn"
        );


    if (!paidBtn) {
        return;
    }


    paidBtn.onclick =
        async () => {

            if (
                !confirm(
                    "ยืนยันว่าชำระเงินแล้ว ?"
                )
            ) {

                return;

            }


            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "กรุณาเข้าสู่ระบบใหม่"
                );

                return;

            }


            try {

                const transactionId =
                    "TX" + Date.now();


                // =================================================
                // UPDATE PAYMENT
                // =================================================

                await updateDoc(

                    doc(
                        db,
                        "leaseRequests",
                        uid
                    ),

                    {

                        status:
                            "waitingConfirm",

                        paymentStatus:
                            "paid",

                        transactionId:

                            transactionId,

                        paidAt:
                            serverTimestamp()

                    }

                );


                // =================================================
                // SYSTEM LOG
                // =================================================

                try {

                    await writeLog({

                        action:
                            "UPDATE",

                        module:
                            "payment",

                        targetId:
                            uid,

                        targetType:
                            "leaseRequest",

                        description:
                            `ชำระเงินคำขอเลิกเช่า ห้อง ${currentRoom?.roomNumber || ""}`,

                        oldData: {

                            status:
                                data.status,

                            paymentStatus:
                                data.paymentStatus ||
                                null

                        },

                        newData: {

                            status:
                                "waitingConfirm",

                            paymentStatus:
                                "paid",

                            transactionId:
                                transactionId

                        }

                    });

                }
                catch (logError) {

                    console.error(
                        "Payment Log Error:",
                        logError
                    );

                }


                alert(
                    "แจ้งชำระเงินเรียบร้อย"
                );

            }

            catch (error) {

                console.error(
                    "Payment Error:",
                    error
                );


                try {

                    await writeLog({

                        action:
                            "ERROR",

                        module:
                            "payment",

                        targetId:
                            uid,

                        targetType:
                            "leaseRequest",

                        description:
                            "บันทึกการชำระเงินไม่สำเร็จ",

                        status:
                            "error",

                        extra: {

                            error:
                                error?.message ||
                                String(error)

                        }

                    });

                }
                catch (logError) {

                    console.error(
                        "Payment Error Log Failed:",
                        logError
                    );

                }


                alert(
                    "ไม่สามารถบันทึกการชำระเงินได้"
                );

            }

        };

}


// =====================================================
// LOGOUT
// =====================================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async () => {

            const confirmLogout =
                confirm(
                    "คุณต้องการออกจากระบบใช่หรือไม่ ?"
                );


            if (!confirmLogout) {
                return;
            }


            try {

                // =================================================
                // WRITE LOG BEFORE SIGN OUT
                // =================================================

                try {

                    await writeLog({

                        action:
                            "LOGOUT",

                        module:
                            "authentication",

                        targetId:
                            auth.currentUser?.uid ||
                            null,

                        targetType:
                            "user",

                        description:
                            "ออกจากระบบ"

                    });

                }
                catch (logError) {

                    console.error(
                        "Logout System Log Error:",
                        logError
                    );

                }


                // =================================================
                // SIGN OUT
                // =================================================

                await signOut(auth);


                // =================================================
                // REDIRECT
                // =================================================

                alert(
                    "ออกจากระบบสำเร็จ"
                );


                window.location.href =
                    "../index.html";

            }

            catch (error) {

                console.error(
                    "Logout Error:",
                    error
                );


                alert(
                    error?.message ||
                    "ไม่สามารถออกจากระบบได้"
                );

            }

        }
    );

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}