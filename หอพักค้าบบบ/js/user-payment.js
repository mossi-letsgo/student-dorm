// =====================================================
// USER PAYMENT
// =====================================================

import {
    auth,
    db
} from "./firebase-config.js";

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
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    loadTheme
} from "../js/theme.js";

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
let currentPayment = null;

let paymentUnsubscribe = null;
let paymentsUnsubscribe = null;


// =====================================================
// DOM
// =====================================================

const userName =
    document.getElementById("userName");

const roomNumber =
    document.getElementById("roomNumber");

const monthlyRent =
    document.getElementById("monthlyRent");

const tenantName =
    document.getElementById("tenantName");

const noticeText =
    document.getElementById("noticeText");

const paymentStatus =
    document.getElementById("paymentStatus");

const paymentAction =
    document.getElementById("paymentAction");

const dueDate =
    document.getElementById("dueDate");

const dueStatus =
    document.getElementById("dueStatus");

const paymentAmount =
    document.getElementById("paymentAmount");

const paymentHistory =
    document.getElementById("paymentHistory");

const paymentModal =
    document.getElementById("paymentModal");

const promptpayQR =
    document.getElementById("promptpayQR");

const modalPaymentAmount =
    document.getElementById("modalPaymentAmount");

const modalDueDate =
    document.getElementById("modalDueDate");

const confirmPaymentBtn =
    document.getElementById("confirmPaymentBtn");

const closePaymentModal =
    document.getElementById("closePaymentModal");

const cancelPaymentBtn =
    document.getElementById("cancelPaymentBtn");

const logoutBtn =
    document.getElementById("logoutBtn");


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            cleanupListeners();

            location.replace("login.html");

            return;

        }


        try {

            await loadUserPaymentData(user);

        }

        catch (error) {

            console.error(
                "User Payment Error:",
                error
            );


            showError(
                "ไม่สามารถโหลดข้อมูลการชำระเงินได้"
            );


            try {

                await writeLog({

                    action:
                        "ERROR",

                    module:
                        "payment",

                    targetId:
                        user.uid,

                    targetType:
                        "user",

                    description:
                        "โหลดหน้าชำระค่าเช่าไม่สำเร็จ",

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
                    "Payment Error Log:",
                    logError
                );

            }

        }

    }
);


// =====================================================
// LOAD USER PAYMENT DATA
// =====================================================

async function loadUserPaymentData(
    user
) {

    const userSnap =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );


    if (!userSnap.exists()) {

        showError(
            "ไม่พบข้อมูลผู้ใช้งาน"
        );

        return;

    }


    currentUser = {

        uid:
            user.uid,

        ...userSnap.data()

    };


    // =================================================
    // USER NAME
    // =================================================

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

        cleanupPaymentListeners();

        showNoRoom();

        return;

    }


    // =================================================
    // LOAD ROOM
    // =================================================

    const roomSnap =
        await getDoc(
            doc(
                db,
                "rooms",
                currentUser.room
            )
        );


    if (!roomSnap.exists()) {

        showError(
            "ไม่พบข้อมูลห้องพัก"
        );

        return;

    }


    currentRoom =
        roomSnap.data();


    renderRoom();


    // =================================================
    // LOAD CURRENT PAYMENT
    // =================================================

    await loadCurrentPayment(
        user.uid
    );


    // =================================================
    // HISTORY
    // =================================================

    await loadPaymentHistory(
        user.uid
    );

}


// =====================================================
// ROOM
// =====================================================

function renderRoom() {

    if (roomNumber) {

        roomNumber.innerText =
            currentRoom?.roomNumber ||
            currentUser?.room ||
            "-";

    }


    if (monthlyRent) {

        monthlyRent.innerText =
            formatMoney(
                currentRoom?.price || 0
            );

    }


    if (tenantName) {

        tenantName.innerText =
            currentUser?.fullname ||
            "-";

    }

}


// =====================================================
// NO ROOM
// =====================================================

function showNoRoom() {

    currentPayment = null;


    if (noticeText) {

        noticeText.innerText =
            "คุณยังไม่มีห้องพัก กรุณาจองห้องพักก่อนจึงจะสามารถชำระค่าเช่าได้";

    }


    if (paymentAmount) {

        paymentAmount.innerText =
            "-";

    }


    if (dueDate) {

        dueDate.innerText =
            "-";

    }


    if (dueStatus) {

        dueStatus.innerText =
            "ยังไม่มีห้องพัก";

        dueStatus.className =
            "status-text pending";

    }


    if (paymentStatus) {

        paymentStatus.innerHTML = `

            <div class="empty-history">

                <i class="fa-solid fa-house"></i>

                <p>
                    ยังไม่มีห้องพัก
                </p>

            </div>

        `;

    }


    if (paymentAction) {

        paymentAction.innerHTML = `

            <a
                href="booking.html"
                class="btn btn-primary">

                <i class="fa-solid fa-calendar-check"></i>

                ไปจองห้องพัก

            </a>

        `;

    }


    if (paymentHistory) {

        paymentHistory.innerHTML = `

            <div class="empty-history">

                <i class="fa-solid fa-receipt"></i>

                <p>
                    ยังไม่มีประวัติการชำระเงิน
                </p>

            </div>

        `;

    }

}


// =====================================================
// NO PAYMENT CREATED BY OWNER
// =====================================================

function showNoPaymentCreated() {

    currentPayment = null;


    if (noticeText) {

        noticeText.innerText =
            "ยังไม่มีรายการค่าเช่าที่เจ้าของหอสร้าง กรุณารอเจ้าของหอสร้างบิลค่าเช่าก่อน";

    }


    if (paymentAmount) {

        paymentAmount.innerText =
            "-";

    }


    if (monthlyRent) {

        monthlyRent.innerText =
            formatMoney(
                currentRoom?.price || 0
            );

    }


    if (dueDate) {

        dueDate.innerText =
            "-";

    }


    if (dueStatus) {

        dueStatus.innerText =
            "รอเจ้าของหอสร้างรายการค่าเช่า";

        dueStatus.className =
            "status-text pending";

    }


    if (paymentStatus) {

        paymentStatus.innerHTML = `

            <div>

                <i
                    class="fa-solid fa-file-invoice"
                    style="
                        font-size:42px;
                        margin-bottom:12px;
                    ">
                </i>

                <h3>
                    ยังไม่มีรายการค่าเช่า
                </h3>

                <p
                    style="
                        margin-top:8px;
                        color:#aaa;
                    ">

                    กรุณารอเจ้าของหอสร้างบิลค่าเช่า
                    ก่อนจึงจะสามารถชำระเงินได้

                </p>

            </div>

        `;

    }


    if (paymentAction) {

        paymentAction.innerHTML = `

            <div
                style="
                    color:#aaa;
                    text-align:center;
                    padding:10px;
                ">

                <i class="fa-solid fa-clock"></i>

                รอเจ้าของหอสร้างรายการค่าเช่า

            </div>

        `;

    }

}


// =====================================================
// LOAD CURRENT PAYMENT
// =====================================================

async function loadCurrentPayment(
    uid
) {

    cleanupPaymentListeners();


    try {

        const paymentQuery =
            query(
                collection(
                    db,
                    "payments"
                ),
                where(
                    "userId",
                    "==",
                    uid
                )
            );


        const paymentSnap =
            await getDocs(
                paymentQuery
            );


        const payments = [];


        paymentSnap.forEach(
            (paymentDoc) => {

                const data =
                    paymentDoc.data();


                if (
                    !isOwnerCreatedPayment(
                        data
                    )
                ) {

                    return;

                }


                payments.push({

                    id:
                        paymentDoc.id,

                    ...data

                });

            }
        );


        if (!payments.length) {

            showNoPaymentCreated();

            listenPaymentsRealtime(uid);

            return;

        }


        const selectedPayment =
            selectCurrentPayment(
                payments
            );


        if (!selectedPayment) {

            showNoPaymentCreated();

            listenPaymentsRealtime(uid);

            return;

        }


        currentPayment =
            selectedPayment;


        renderPayment(
            currentPayment
        );


        listenCurrentPayment(
            currentPayment.id
        );


        listenPaymentsRealtime(
            uid
        );

    }

    catch (error) {

        console.error(
            "Load Current Payment Error:",
            error
        );


        showNoPaymentCreated();

    }

}


// =====================================================
// SELECT CURRENT PAYMENT
// =====================================================

function selectCurrentPayment(
    payments
) {

    if (!Array.isArray(payments) ||
        !payments.length) {

        return null;

    }


    const sorted =
        [...payments].sort(
            (a, b) => {

                const dateA =
                    getPaymentSortDate(
                        a
                    );

                const dateB =
                    getPaymentSortDate(
                        b
                    );


                return (
                    dateB -
                    dateA
                );

            }
        );


    // =================================================
    // IMPORTANT
    //
    // ถ้ามีบิลที่ยังไม่จบ ให้เลือกบิลล่าสุด
    // =================================================

    const active =
        sorted.find(
            (payment) =>
                !isFinalPayment(
                    payment
                )
        );


    if (active) {

        return active;

    }


    // =================================================
    // ถ้าทุกบิลจบแล้ว
    // ให้แสดงบิลล่าสุด เช่น paid
    // =================================================

    return sorted[0] || null;

}


// =====================================================
// FINAL PAYMENT
// =====================================================

function isFinalPayment(
    payment
) {

    const status =
        normalizeStatus(
            payment?.status ||
            payment?.paymentStatus
        );


    return (

        status === "paid" ||
        status === "success" ||
        status === "completed"

    );

}


// =====================================================
// PAYMENT SORT DATE
// =====================================================

function getPaymentSortDate(
    payment
) {

    const candidates = [

        payment?.createdAt,

        payment?.updatedAt,

        payment?.dueDate,

        payment?.paidAt

    ];


    for (
        const value of candidates
    ) {

        const date =
            normalizeDate(
                value
            );


        if (date) {

            return date.getTime();

        }

    }


    return 0;

}


// =====================================================
// RENDER PAYMENT
// =====================================================

function renderPayment(
    payment
) {

    if (!payment) {

        showNoPaymentCreated();

        return;

    }


    const amount =
        getPaymentAmount(
            payment
        );


    const due =
        normalizeDate(
            payment.dueDate
        );


    const status =
        getPaymentStatus(
            payment,
            due
        );


    // =================================================
    // AMOUNT
    // =================================================

    if (paymentAmount) {

        paymentAmount.innerText =
            formatMoney(
                amount
            );

    }


    if (modalPaymentAmount) {

        modalPaymentAmount.innerText =
            formatMoney(
                amount
            );

    }


    // =================================================
    // DUE DATE
    // =================================================

    if (dueDate) {

        dueDate.innerText =
            due
                ? formatThaiDate(due)
                : "-";

    }


    if (modalDueDate) {

        modalDueDate.innerText =
            due
                ? "ครบกำหนดชำระ " +
                  formatThaiDate(due)
                : "ไม่พบวันครบกำหนด";

    }


    // =================================================
    // STATUS
    // =================================================

    if (dueStatus) {

        dueStatus.innerText =
            status.text;

        dueStatus.className =
            "status-text " +
            status.className;

    }


    // =================================================
    // NOTICE
    // =================================================

    renderNotice(
        status,
        due,
        amount
    );


    // =================================================
    // STATUS CARD
    // =================================================

    renderPaymentStatus(
        status,
        amount,
        due
    );


    // =================================================
    // ACTION
    // =================================================

    renderPaymentAction(
        status,
        payment
    );

}


// =====================================================
// PAYMENT AMOUNT
// =====================================================

function getPaymentAmount(
    payment
) {

    const amount =
        Number(
            payment?.amount
        );


    if (
        Number.isFinite(amount) &&
        amount > 0
    ) {

        return amount;

    }


    const total =
        Number(
            payment?.total
        );


    if (
        Number.isFinite(total) &&
        total > 0
    ) {

        return total;

    }


    return Number(
        currentRoom?.price || 0
    );

}


// =====================================================
// PAYMENT STATUS
// =====================================================

function getPaymentStatus(
    payment,
    due
) {

    const rawStatus =
        normalizeStatus(
            payment?.status ||
            payment?.paymentStatus ||
            "unpaid"
        );


    // =================================================
    // PAID
    // =================================================

    if (

        rawStatus === "paid" ||
        rawStatus === "success" ||
        rawStatus === "completed"

    ) {

        return {

            text:
                "ชำระเงินแล้ว",

            className:
                "paid"

        };

    }


    // =================================================
    // WAITING VERIFY
    // =================================================

    if (
        isWaitingVerificationStatus(
            rawStatus
        )
    ) {

        return {

            text:
                "รอตรวจสอบการชำระเงิน",

            className:
                "waiting"

        };

    }


    // =================================================
    // REJECTED
    // =================================================

    if (
        rawStatus === "rejected"
    ) {

        return {

            text:
                "การชำระเงินถูกปฏิเสธ",

            className:
                "rejected"

        };

    }


    // =================================================
    // OVERDUE
    // =================================================

    if (
        due &&
        isPastDate(due)
    ) {

        return {

            text:
                "เกินกำหนดชำระ",

            className:
                "overdue"

        };

    }


    // =================================================
    // PENDING
    // =================================================

    if (
        rawStatus === "pending"
    ) {

        return {

            text:
                "รอชำระเงิน",

            className:
                "pending"

        };

    }


    // =================================================
    // UNPAID
    // =================================================

    return {

        text:
            "รอชำระเงิน",

        className:
            "unpaid"

    };

}


// =====================================================
// STATUS NORMALIZER
// =====================================================

function normalizeStatus(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replaceAll(
            "-",
            "_"
        )
        .replaceAll(
            " ",
            "_"
        );

}


// =====================================================
// WAITING VERIFY
// =====================================================

function isWaitingVerificationStatus(
    status
) {

    return (

        status ===
            "pending_verify" ||

        status ===
            "waiting_verify" ||

        status ===
            "waitingconfirm" ||

        status ===
            "waiting_confirm"

    );

}


// =====================================================
// NOTICE
// =====================================================

function renderNotice(
    status,
    due,
    amount
) {

    if (!noticeText) {

        return;

    }


    if (
        status.className ===
        "paid"
    ) {

        noticeText.innerText =
            "ค่าเช่ารอบนี้ชำระเรียบร้อยแล้ว";

        return;

    }


    if (
        status.className ===
        "waiting"
    ) {

        noticeText.innerText =
            "คุณได้แจ้งชำระเงินแล้ว กรุณารอเจ้าของหอตรวจสอบ";

        return;

    }


    if (
        status.className ===
        "rejected"
    ) {

        noticeText.innerText =
            "การชำระเงินถูกปฏิเสธ กรุณาตรวจสอบข้อมูลและแจ้งชำระใหม่";

        return;

    }


    if (
        status.className ===
        "overdue"
    ) {

        noticeText.innerText =
            "ค่าเช่าของคุณเกินกำหนดแล้ว กรุณาชำระเงินโดยเร็ว";

        return;

    }


    if (due) {

        const days =
            getDaysUntil(
                due
            );


        if (days === 0) {

            noticeText.innerText =
                `วันนี้ครบกำหนดชำระค่าเช่า ${formatMoney(amount)}`;

            return;

        }


        if (
            days > 0 &&
            days <= 3
        ) {

            noticeText.innerText =
                `ใกล้ถึงกำหนดชำระค่าเช่า เหลืออีก ${days} วัน`;

            return;

        }


        noticeText.innerText =
            `ค่าเช่ารอบนี้ครบกำหนดวันที่ ${formatThaiDate(due)}`;

        return;

    }


    noticeText.innerText =
        "มีรายการค่าเช่าที่รอชำระ";

}


// =====================================================
// STATUS CARD
// =====================================================

function renderPaymentStatus(
    status,
    amount,
    due
) {

    if (!paymentStatus) {

        return;

    }


    let icon =
        "fa-money-bill-wave";


    if (
        status.className ===
        "paid"
    ) {

        icon =
            "fa-circle-check";

    }

    else if (
        status.className ===
        "overdue"
    ) {

        icon =
            "fa-triangle-exclamation";

    }

    else if (
        status.className ===
        "waiting"
    ) {

        icon =
            "fa-clock";

    }

    else if (
        status.className ===
        "rejected"
    ) {

        icon =
            "fa-circle-xmark";

    }


    paymentStatus.innerHTML = `

        <div>

            <i
                class="fa-solid ${icon}"
                style="
                    font-size:42px;
                    margin-bottom:12px;
                ">
            </i>

            <h3>
                ${escapeHTML(
                    status.text
                )}
            </h3>

            <p
                style="
                    margin-top:8px;
                    color:#aaa;
                ">

                ยอดชำระ

                <strong
                    style="color:#fff;">

                    ${formatMoney(
                        amount
                    )}

                </strong>

            </p>

            ${
                due
                    ? `
                        <p
                            style="
                                margin-top:5px;
                                color:#888;
                            ">

                            ครบกำหนด
                            ${formatThaiDate(
                                due
                            )}

                        </p>
                    `
                    : ""
            }

        </div>

    `;

}


// =====================================================
// PAYMENT ACTION
// =====================================================

function renderPaymentAction(
    status,
    payment
) {

    if (!paymentAction) {

        return;

    }


    // =================================================
    // MUST BE OWNER CREATED
    // =================================================

    if (
        !isOwnerCreatedPayment(
            payment
        )
    ) {

        paymentAction.innerHTML = `

            <div
                style="
                    color:#aaa;
                    text-align:center;
                    padding:10px;
                ">

                <i class="fa-solid fa-clock"></i>

                รอเจ้าของหอสร้างรายการค่าเช่า

            </div>

        `;

        return;

    }


    // =================================================
    // PAID
    // =================================================

    if (
        status.className ===
        "paid"
    ) {

        paymentAction.innerHTML = `

            <div
                style="
                    color:#55d98a;
                    text-align:center;
                    padding:10px;
                ">

                <i class="fa-solid fa-circle-check"></i>

                ชำระเงินเรียบร้อยแล้ว

            </div>

        `;

        return;

    }


    // =================================================
    // WAITING VERIFY
    // =================================================

    if (
        status.className ===
        "waiting"
    ) {

        paymentAction.innerHTML = `

            <div
                style="
                    color:#00c3ff;
                    text-align:center;
                    padding:10px;
                ">

                <i class="fa-solid fa-clock"></i>

                รอเจ้าของหอตรวจสอบการชำระเงิน

            </div>

        `;

        return;

    }


    // =================================================
    // REJECTED
    // =================================================

    if (
        status.className ===
        "rejected"
    ) {

        paymentAction.innerHTML = `

            <div
                style="
                    color:#ff6b6b;
                    text-align:center;
                    margin-bottom:12px;
                ">

                <i class="fa-solid fa-circle-xmark"></i>

                การชำระเงินถูกปฏิเสธ

            </div>

            <button
                type="button"
                id="openPaymentBtn"
                class="btn btn-primary"
                style="max-width:350px;">

                <i class="fa-solid fa-qrcode"></i>

                แจ้งชำระเงินอีกครั้ง

            </button>

        `;


        attachOpenPaymentButton(
            payment
        );

        return;

    }


    // =================================================
    // UNPAID / PENDING / OVERDUE
    // =================================================

    const amount =
        getPaymentAmount(
            payment
        );


    paymentAction.innerHTML = `

        <button
            type="button"
            id="openPaymentBtn"
            class="btn btn-primary"
            style="max-width:350px;">

            <i class="fa-solid fa-qrcode"></i>

            ชำระค่าเช่า

            ${formatMoney(
                amount
            )}

        </button>

    `;


    attachOpenPaymentButton(
        payment
    );

}


// =====================================================
// ATTACH OPEN PAYMENT BUTTON
// =====================================================

function attachOpenPaymentButton(
    payment
) {

    const openPaymentBtn =
        document.getElementById(
            "openPaymentBtn"
        );


    if (!openPaymentBtn) {

        return;

    }


    openPaymentBtn.onclick =
        () => {

            openPaymentModal(
                payment
            );

        };

}


// =====================================================
// OPEN PAYMENT MODAL
// =====================================================

async function openPaymentModal(
    payment
) {

    if (!paymentModal) {

        return;

    }


    if (
        !payment ||
        !isOwnerCreatedPayment(
            payment
        )
    ) {

        return;

    }


    const status =
        normalizeStatus(
            payment.status ||
            payment.paymentStatus
        );


    // =================================================
    // PREVENT DUPLICATE
    // =================================================

    if (

        status === "paid" ||

        isWaitingVerificationStatus(
            status
        )

    ) {

        return;

    }


    currentPayment =
        payment;


    paymentModal.classList.add(
        "show"
    );


    const amount =
        getPaymentAmount(
            payment
        );


    if (modalPaymentAmount) {

        modalPaymentAmount.innerText =
            formatMoney(
                amount
            );

    }


    const due =
        normalizeDate(
            payment.dueDate
        );


    if (modalDueDate) {

        modalDueDate.innerText =
            due
                ? "ครบกำหนดชำระ " +
                  formatThaiDate(due)
                : "ไม่พบวันครบกำหนด";

    }


    await createPromptPayQR(
        amount
    );

}


// =====================================================
// CLOSE MODAL
// =====================================================

function closeModal() {

    if (paymentModal) {

        paymentModal.classList.remove(
            "show"
        );

    }

}


if (closePaymentModal) {

    closePaymentModal.addEventListener(
        "click",
        closeModal
    );

}


if (cancelPaymentBtn) {

    cancelPaymentBtn.addEventListener(
        "click",
        closeModal
    );

}


if (paymentModal) {

    paymentModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                paymentModal
            ) {

                closeModal();

            }

        }
    );

}


// =====================================================
// CREATE PROMPTPAY QR
// =====================================================

async function createPromptPayQR(
    amount
) {

    if (!promptpayQR) {

        return;

    }


    try {

        // Clear previous QR
        const context =
            promptpayQR.getContext?.(
                "2d"
            );


        if (context) {

            context.clearRect(
                0,
                0,
                promptpayQR.width,
                promptpayQR.height
            );

        }


        const paymentSnap =
            await getDoc(
                doc(
                    db,
                    "paymentSettings",
                    "promptpay"
                )
            );


        if (!paymentSnap.exists()) {

            showQRMessage(
                "ยังไม่ได้ตั้งค่า PromptPay"
            );

            return;

        }


        const payment =
            paymentSnap.data();


        const promptpayNumber =
            payment.promptpayNumber;


        if (!promptpayNumber) {

            showQRMessage(
                "ไม่พบหมายเลข PromptPay"
            );

            return;

        }


        if (
            typeof QRCode ===
            "undefined"
        ) {

            showQRMessage(
                "ระบบ QR Code ยังไม่พร้อม"
            );

            return;

        }


        const numericAmount =
            Number(amount);


        if (
            !Number.isFinite(
                numericAmount
            ) ||
            numericAmount <= 0
        ) {

            showQRMessage(
                "ยอดชำระไม่ถูกต้อง"
            );

            return;

        }


        const payload =
            generatePromptPayPayload(
                promptpayNumber,
                numericAmount
            );


        QRCode.toCanvas(

            promptpayQR,

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
                        "PromptPay QR Error:",
                        error
                    );

                    showQRMessage(
                        "สร้าง QR Code ไม่สำเร็จ"
                    );

                }

            }

        );

    }

    catch (error) {

        console.error(
            "Create PromptPay QR Error:",
            error
        );


        showQRMessage(
            "ไม่สามารถโหลด PromptPay ได้"
        );

    }

}


// =====================================================
// QR ERROR
// =====================================================

function showQRMessage(
    message
) {

    const wrapper =
        document.querySelector(
            ".qr-wrapper"
        );


    if (!wrapper) {

        return;

    }


    wrapper.innerHTML = `

        <p
            style="
                color:#e50909;
                padding:20px;
            ">

            ❌
            ${escapeHTML(
                message
            )}

        </p>

    `;

}


// =====================================================
// CONFIRM PAYMENT
// =====================================================

if (confirmPaymentBtn) {

    confirmPaymentBtn.addEventListener(
        "click",
        async () => {

            if (!auth.currentUser) {

                alert(
                    "กรุณาเข้าสู่ระบบใหม่"
                );

                return;

            }


            if (!currentPayment) {

                alert(
                    "ไม่พบรายการชำระเงิน"
                );

                return;

            }


            // =================================================
            // SECURITY CHECK
            // =================================================

            if (
                currentPayment.userId !==
                auth.currentUser.uid
            ) {

                alert(
                    "ไม่สามารถดำเนินการกับรายการนี้ได้"
                );

                return;

            }


            if (
                !isOwnerCreatedPayment(
                    currentPayment
                )
            ) {

                alert(
                    "รายการนี้ยังไม่ได้ถูกสร้างโดยเจ้าของหอ"
                );

                return;

            }


            // =================================================
            // GET LATEST PAYMENT
            // =================================================

            let latestPayment =
                currentPayment;


            try {

                const latestSnap =
                    await getDoc(
                        doc(
                            db,
                            "payments",
                            currentPayment.id
                        )
                    );


                if (
                    latestSnap.exists()
                ) {

                    latestPayment = {

                        id:
                            latestSnap.id,

                        ...latestSnap.data()

                    };

                    currentPayment =
                        latestPayment;

                }

            }

            catch (error) {

                console.error(
                    "Latest Payment Check Error:",
                    error
                );

            }


            const currentStatus =
                normalizeStatus(
                    latestPayment.status ||
                    latestPayment.paymentStatus
                );


            // =================================================
            // PAID
            // =================================================

            if (

                currentStatus === "paid" ||
                currentStatus === "success" ||
                currentStatus === "completed"

            ) {

                alert(
                    "รายการนี้ชำระเงินแล้ว"
                );

                closeModal();

                return;

            }


            // =================================================
            // ALREADY WAITING
            // =================================================

            if (
                isWaitingVerificationStatus(
                    currentStatus
                )
            ) {

                alert(
                    "คุณได้แจ้งชำระเงินรายการนี้แล้ว กรุณารอเจ้าของหอตรวจสอบ"
                );

                closeModal();

                return;

            }


            const confirmed =
                confirm(
                    "ยืนยันว่าคุณได้ชำระค่าเช่าแล้วใช่หรือไม่?"
                );


            if (!confirmed) {

                return;

            }


            try {

                confirmPaymentBtn.disabled =
                    true;


                confirmPaymentBtn.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    กำลังบันทึก...

                `;


                const transactionId =
                    "RENT-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .slice(2, 8)
                        .toUpperCase();


                // =================================================
                // UPDATE OWNER CREATED PAYMENT ONLY
                // =================================================

                await updateDoc(

                    doc(
                        db,
                        "payments",
                        latestPayment.id
                    ),

                    {

                        status:
                            "pending_verify",

                        paymentStatus:
                            "pending_verify",

                        transactionId,

                        paidAt:
                            null,

                        verifiedAt:
                            null,

                        verifiedBy:
                            null,

                        rejectedAt:
                            null,

                        rejectedBy:
                            null,

                        rejectionReason:
                            "",

                        updatedAt:
                            serverTimestamp()

                    }

                );


                // =================================================
                // UPDATE LOCAL
                // =================================================

                currentPayment = {

                    ...latestPayment,

                    status:
                        "pending_verify",

                    paymentStatus:
                        "pending_verify",

                    transactionId,

                    paidAt:
                        null,

                    verifiedAt:
                        null,

                    verifiedBy:
                        null,

                    rejectedAt:
                        null,

                    rejectedBy:
                        null,

                    rejectionReason:
                        ""

                };


                // =================================================
                // NOTIFY OWNER
                // =================================================

                await notifyOwner(
                    transactionId
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
                            currentPayment.id,

                        targetType:
                            "payment",

                        description:
                            `แจ้งชำระค่าเช่าห้อง ${currentRoom?.roomNumber || currentUser.room}`,

                        newData: {

                            status:
                                "pending_verify",

                            paymentStatus:
                                "pending_verify",

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


                // =================================================
                // SUCCESS
                // =================================================

                alert(
                    "แจ้งชำระเงินเรียบร้อยแล้ว กรุณารอเจ้าของหอตรวจสอบ"
                );


                closeModal();


                renderPayment(
                    currentPayment
                );


                await loadPaymentHistory(
                    auth.currentUser.uid
                );

            }

            catch (error) {

                console.error(
                    "Confirm Payment Error:",
                    error
                );


                alert(
                    error?.message ||
                    "ไม่สามารถแจ้งชำระเงินได้"
                );

            }

            finally {

                confirmPaymentBtn.disabled =
                    false;


                confirmPaymentBtn.innerHTML = `

                    <i class="fa-solid fa-check"></i>

                    แจ้งว่าชำระเงินแล้ว

                `;

            }

        }
    );

}


// =====================================================
// NOTIFY OWNER
// =====================================================

async function notifyOwner(
    transactionId
) {

    try {

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


        if (
            ownerSnap.empty
        ) {

            console.warn(
                "ไม่พบเจ้าของหอสำหรับส่ง notification"
            );

            return;

        }


        const promises = [];


        ownerSnap.forEach(
            (ownerDoc) => {

                promises.push(

                    importNotification(
                        ownerDoc.id,
                        transactionId
                    )

                );

            }
        );


        await Promise.all(
            promises
        );

    }

    catch (error) {

        console.error(
            "Notify Owner Error:",
            error
        );

    }

}


// =====================================================
// IMPORT NOTIFICATION
// =====================================================

async function importNotification(
    ownerId,
    transactionId
) {

    const {
        addDoc
    } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );


    await addDoc(

        collection(
            db,
            "notifications"
        ),

        {

            userId:
                ownerId,

            title:
                "มีการแจ้งชำระค่าเช่า",

            message:
                `${currentUser?.fullname || "ผู้เช่า"} แจ้งชำระค่าเช่าห้อง ${currentRoom?.roomNumber || currentUser?.room} Transaction: ${transactionId}`,

            type:
                "rent_payment",

            read:
                false,

            transactionId,

            roomId:
                currentUser?.room,

            roomNumber:
                currentRoom?.roomNumber ||
                currentUser?.room,

            createdAt:
                serverTimestamp()

        }

    );

}


// =====================================================
// REALTIME CURRENT PAYMENT
// =====================================================

function listenCurrentPayment(
    paymentId
) {

    if (!paymentId) {

        return;

    }


    if (paymentUnsubscribe) {

        paymentUnsubscribe();

        paymentUnsubscribe =
            null;

    }


    paymentUnsubscribe =
        onSnapshot(

            doc(
                db,
                "payments",
                paymentId
            ),

            (snap) => {

                if (!snap.exists()) {

                    currentPayment = null;

                    loadCurrentPayment(
                        auth.currentUser?.uid
                    );

                    return;

                }


                const data =
                    snap.data();


                // =================================================
                // SECURITY
                // =================================================

                if (
                    data.userId !==
                    auth.currentUser?.uid
                ) {

                    return;

                }


                if (
                    !isOwnerCreatedPayment(
                        data
                    )
                ) {

                    return;

                }


                currentPayment = {

                    id:
                        snap.id,

                    ...data

                };


                renderPayment(
                    currentPayment
                );


                // Update history
                if (
                    auth.currentUser
                ) {

                    loadPaymentHistory(
                        auth.currentUser.uid
                    );

                }

            },

            (error) => {

                console.error(
                    "Payment Realtime Error:",
                    error
                );

            }

        );

}


// =====================================================
// REALTIME PAYMENT LIST
// =====================================================

function listenPaymentsRealtime(
    uid
) {

    if (!uid) {

        return;

    }


    if (paymentsUnsubscribe) {

        paymentsUnsubscribe();

        paymentsUnsubscribe =
            null;

    }


    const paymentQuery =
        query(

            collection(
                db,
                "payments"
            ),

            where(
                "userId",
                "==",
                uid
            )

        );


    paymentsUnsubscribe =
        onSnapshot(

            paymentQuery,

            (snap) => {

                const payments = [];


                snap.forEach(
                    (paymentDoc) => {

                        const data =
                            paymentDoc.data();


                        if (
                            !isOwnerCreatedPayment(
                                data
                            )
                        ) {

                            return;

                        }


                        payments.push({

                            id:
                                paymentDoc.id,

                            ...data

                        });

                    }
                );


                if (!payments.length) {

                    if (
                        paymentUnsubscribe
                    ) {

                        paymentUnsubscribe();

                        paymentUnsubscribe =
                            null;

                    }


                    showNoPaymentCreated();

                    renderPaymentHistory(
                        []
                    );

                    return;

                }


                const selectedPayment =
                    selectCurrentPayment(
                        payments
                    );


                if (!selectedPayment) {

                    showNoPaymentCreated();

                    return;

                }


                const changed =
                    currentPayment?.id !==
                    selectedPayment.id;


                currentPayment =
                    selectedPayment;


                renderPayment(
                    currentPayment
                );


                if (changed) {

                    listenCurrentPayment(
                        selectedPayment.id
                    );

                }


                renderPaymentHistory(
                    sortPayments(
                        payments
                    )
                );

            },

            (error) => {

                console.error(
                    "Payments Realtime Error:",
                    error
                );

            }

        );

}


// =====================================================
// PAYMENT HISTORY
// =====================================================

async function loadPaymentHistory(
    uid
) {

    if (!paymentHistory) {

        return;

    }


    try {

        const paymentQuery =
            query(

                collection(
                    db,
                    "payments"
                ),

                where(
                    "userId",
                    "==",
                    uid
                )

            );


        const snap =
            await getDocs(
                paymentQuery
            );


        const payments = [];


        snap.forEach(
            (paymentDoc) => {

                const data =
                    paymentDoc.data();


                if (
                    !isOwnerCreatedPayment(
                        data
                    )
                ) {

                    return;

                }


                payments.push({

                    id:
                        paymentDoc.id,

                    ...data

                });

            }
        );


        renderPaymentHistory(
            sortPayments(
                payments
            )
        );

    }

    catch (error) {

        console.error(
            "Payment History Error:",
            error
        );


        paymentHistory.innerHTML = `

            <div class="empty-history">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    ไม่สามารถโหลดประวัติการชำระเงิน
                </p>

            </div>

        `;

    }

}


// =====================================================
// SORT PAYMENTS
// =====================================================

function sortPayments(
    payments
) {

    return [...payments].sort(
        (a, b) => {

            return (

                getPaymentSortDate(
                    b
                ) -

                getPaymentSortDate(
                    a
                )

            );

        }
    );

}


// =====================================================
// RENDER HISTORY
// =====================================================

function renderPaymentHistory(
    payments
) {

    if (!paymentHistory) {

        return;

    }


    if (!payments.length) {

        paymentHistory.innerHTML = `

            <div class="empty-history">

                <i class="fa-solid fa-receipt"></i>

                <p>
                    ยังไม่มีประวัติการชำระเงิน
                </p>

            </div>

        `;

        return;

    }


    paymentHistory.innerHTML =
        payments
            .map(
                (payment) => {

                    const amount =
                        getPaymentAmount(
                            payment
                        );


                    const date =
                        normalizeDate(
                            payment.paidAt ||
                            payment.updatedAt ||
                            payment.createdAt
                        );


                    const status =
                        getHistoryStatus(
                            payment
                        );


                    return `

                        <div class="history-item">

                            <div class="history-left">

                                <strong>

                                    ค่าเช่าห้อง
                                    ${escapeHTML(
                                        payment.roomNumber ||
                                        currentRoom?.roomNumber ||
                                        "-"
                                    )}

                                </strong>

                                <span>

                                    ${
                                        date
                                            ? formatThaiDate(
                                                date
                                            )
                                            : "-"
                                    }

                                </span>

                                ${
                                    payment.transactionId
                                        ? `
                                            <span>

                                                Transaction:
                                                ${escapeHTML(
                                                    payment.transactionId
                                                )}

                                            </span>
                                        `
                                        : ""
                                }

                            </div>


                            <div class="history-right">

                                <span class="history-amount">

                                    ${formatMoney(
                                        amount
                                    )}

                                </span>

                                <span
                                    class="history-status">

                                    ${escapeHTML(
                                        status
                                    )}

                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// =====================================================
// HISTORY STATUS
// =====================================================

function getHistoryStatus(
    payment
) {

    const status =
        normalizeStatus(
            payment.status ||
            payment.paymentStatus
        );


    if (

        status === "paid" ||
        status === "success" ||
        status === "completed"

    ) {

        return "ชำระแล้ว";

    }


    if (
        isWaitingVerificationStatus(
            status
        )
    ) {

        return "รอตรวจสอบ";

    }


    if (
        status === "rejected"
    ) {

        return "ถูกปฏิเสธ";

    }


    if (
        status === "overdue"
    ) {

        return "เกินกำหนด";

    }


    if (
        status === "pending"
    ) {

        return "รอชำระ";

    }


    return "รอชำระ";

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();


            const confirmLogout =
                confirm(
                    "คุณต้องการออกจากระบบใช่หรือไม่ ?"
                );


            if (!confirmLogout) {

                return;

            }


            try {

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
                        "Logout Log Error:",
                        logError
                    );

                }


                cleanupListeners();


                await signOut(
                    auth
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
// CLEANUP LISTENERS
// =====================================================

function cleanupPaymentListeners() {

    if (paymentUnsubscribe) {

        paymentUnsubscribe();

        paymentUnsubscribe =
            null;

    }


    if (paymentsUnsubscribe) {

        paymentsUnsubscribe();

        paymentsUnsubscribe =
            null;

    }

}


// =====================================================
// CLEANUP ALL
// =====================================================

function cleanupListeners() {

    cleanupPaymentListeners();

}


// =====================================================
// DATE HELPERS
// =====================================================

function normalizeDate(
    value
) {

    if (!value) {

        return null;

    }


    if (
        value instanceof Date
    ) {

        return isNaN(
            value.getTime()
        )
            ? null
            : value;

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        try {

            return value.toDate();

        }

        catch {

            return null;

        }

    }


    if (
        typeof value ===
        "number"
    ) {

        const date =
            new Date(
                value
            );


        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    if (
        typeof value ===
        "string"
    ) {

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                value
            )
        ) {

            const date =
                new Date(
                    `${value}T00:00:00`
                );


            return isNaN(
                date.getTime()
            )
                ? null
                : date;

        }


        const date =
            new Date(
                value
            );


        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    return null;

}


// =====================================================
// FORMAT THAI DATE
// =====================================================

function formatThaiDate(
    date
) {

    const d =
        normalizeDate(
            date
        );


    if (!d) {

        return "-";

    }


    return d.toLocaleDateString(
        "th-TH",
        {

            day:
                "numeric",

            month:
                "long",

            year:
                "numeric"

        }
    );

}


// =====================================================
// MONEY
// =====================================================

function formatMoney(
    value
) {

    const number =
        Number(
            value || 0
        );


    return (

        (
            Number.isFinite(
                number
            )
                ? number
                : 0
        ).toLocaleString(
            "th-TH"
        ) +

        " บาท"

    );

}


// =====================================================
// DAYS
// =====================================================

function getDaysUntil(
    date
) {

    const target =
        normalizeDate(
            date
        );


    if (!target) {

        return null;

    }


    const now =
        new Date();


    const today =
        new Date(

            now.getFullYear(),
            now.getMonth(),
            now.getDate()

        );


    const targetDay =
        new Date(

            target.getFullYear(),
            target.getMonth(),
            target.getDate()

        );


    return Math.ceil(

        (
            targetDay -
            today
        ) /

        (
            1000 *
            60 *
            60 *
            24
        )

    );

}


// =====================================================
// PAST DATE
// =====================================================

function isPastDate(
    date
) {

    const days =
        getDaysUntil(
            date
        );


    return (

        days !== null &&
        days < 0

    );

}


// =====================================================
// ERROR
// =====================================================

function showError(
    message
) {

    if (noticeText) {

        noticeText.innerText =
            message;

    }


    if (paymentStatus) {

        paymentStatus.innerHTML = `

            <div class="empty-history">

                <i
                    class="fa-solid fa-triangle-exclamation">
                </i>

                <p>
                    ${escapeHTML(
                        message
                    )}
                </p>

            </div>

        `;

    }

}


// =====================================================
// OWNER CREATED PAYMENT
// =====================================================

function isOwnerCreatedPayment(
    payment
) {

    if (!payment) {

        return false;

    }


    return (

        payment.ownerCreated === true ||

        payment.createdByRole ===
            "owner"

    );

}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHTML(
    value
) {

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