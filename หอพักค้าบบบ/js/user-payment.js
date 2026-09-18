// =====================================================
// USER PAYMENT (FIXED & COMPLETED)
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
// THEME & INITIALIZATION
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
// DOM ELEMENTS
// =====================================================

const userName = document.getElementById("userName");
const roomNumber = document.getElementById("roomNumber");
const monthlyRent = document.getElementById("monthlyRent");
const tenantName = document.getElementById("tenantName");
const noticeText = document.getElementById("noticeText");
const paymentStatus = document.getElementById("paymentStatus");
const paymentAction = document.getElementById("paymentAction");
const dueDate = document.getElementById("dueDate");
const dueStatus = document.getElementById("dueStatus");
const paymentAmount = document.getElementById("paymentAmount");
const paymentHistory = document.getElementById("paymentHistory");
const paymentModal = document.getElementById("paymentModal");
const promptpayQR = document.getElementById("promptpayQR");
const modalPaymentAmount = document.getElementById("modalPaymentAmount");
const modalDueDate = document.getElementById("modalDueDate");
const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
const closePaymentModal = document.getElementById("closePaymentModal");
const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
const logoutBtn = document.getElementById("logoutBtn");


// =====================================================
// AUTH & INITIAL LOAD
// =====================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        cleanupListeners();
        location.replace("login.html");
        return;
    }

    try {
        await loadUserPaymentData(user);
    } catch (error) {
        console.error("User Payment Auth Error:", error);
        showError("ไม่สามารถโหลดข้อมูลการชำระเงินได้");

        try {
            await writeLog({
                action: "ERROR",
                module: "payment",
                targetId: user.uid,
                targetType: "user",
                description: "โหลดหน้าชำระค่าเช่าไม่สำเร็จ",
                status: "error",
                extra: { error: error?.message || String(error) }
            });
        } catch (logError) {
            console.error("Payment Error Log:", logError);
        }
    }
});


// =====================================================
// LOGOUT EVENT
// =====================================================

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            cleanupListeners();
            await signOut(auth);
            location.replace("login.html");
        } catch (error) {
            console.error("Logout Error:", error);
            alert("ไม่สามารถออกจากระบบได้");
        }
    });
}


// =====================================================
// LOAD USER & ROOM DATA
// =====================================================

async function loadUserPaymentData(user) {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
        showError("ไม่พบข้อมูลผู้ใช้งาน");
        return;
    }

    currentUser = {
        uid: user.uid,
        ...userSnap.data()
    };

    if (userName) {
        userName.innerText = "ยินดีต้อนรับ " + (currentUser.fullname || user.displayName || user.email || "ผู้ใช้งาน");
    }

    if (!currentUser.room) {
        cleanupListeners();
        showNoRoom();
        return;
    }

    // Load Room Data
    try {
        const roomSnap = await getDoc(doc(db, "rooms", currentUser.room));
        if (roomSnap.exists()) {
            currentRoom = roomSnap.data();
        }
    } catch (roomErr) {
        console.warn("Could not fetch room details from collection 'rooms':", roomErr);
    }

    renderRoom();

    // Load Payments
    await loadCurrentPayment(user.uid);
    await loadPaymentHistory(user.uid);
}


// =====================================================
// RENDER ROOM INFO
// =====================================================

function renderRoom() {
    if (roomNumber) {
        roomNumber.innerText = currentRoom?.roomNumber || currentUser?.room || "-";
    }

    if (monthlyRent) {
        monthlyRent.innerText = formatMoney(currentRoom?.price || 0);
    }

    if (tenantName) {
        tenantName.innerText = currentUser?.fullname || "-";
    }
}


// =====================================================
// NO ROOM & NO PAYMENT STATES
// =====================================================

function showNoRoom() {
    currentPayment = null;

    if (noticeText) noticeText.innerText = "คุณยังไม่มีห้องพัก กรุณาจองห้องพักก่อนจึงจะสามารถชำระค่าเช่าได้";
    if (paymentAmount) paymentAmount.innerText = "-";
    if (dueDate) dueDate.innerText = "-";

    if (dueStatus) {
        dueStatus.innerText = "ยังไม่มีห้องพัก";
        dueStatus.className = "status-text pending";
    }

    if (paymentStatus) {
        paymentStatus.innerHTML = `
            <div class="empty-history">
                <i class="fa-solid fa-house"></i>
                <p>ยังไม่มีห้องพัก</p>
            </div>
        `;
    }

    if (paymentAction) {
        paymentAction.innerHTML = `
            <a href="booking.html" class="btn btn-primary">
                <i class="fa-solid fa-calendar-check"></i> ไปจองห้องพัก
            </a>
        `;
    }

    if (paymentHistory) {
        paymentHistory.innerHTML = `
            <div class="empty-history">
                <i class="fa-solid fa-receipt"></i>
                <p>ยังไม่มีประวัติการชำระเงิน</p>
            </div>
        `;
    }
}

function showNoPaymentCreated() {
    currentPayment = null;

    if (noticeText) noticeText.innerText = "ยังไม่มีรายการค่าเช่าที่เจ้าของหอสร้าง กรุณารอเจ้าของหอสร้างบิลค่าเช่าก่อน";
    if (paymentAmount) paymentAmount.innerText = "-";
    if (dueDate) dueDate.innerText = "-";

    if (dueStatus) {
        dueStatus.innerText = "รอเจ้าของหอสร้างรายการค่าเช่า";
        dueStatus.className = "status-text pending";
    }

    if (paymentStatus) {
        paymentStatus.innerHTML = `
            <div>
                <i class="fa-solid fa-file-invoice" style="font-size:42px; margin-bottom:12px;"></i>
                <h3>ยังไม่มีรายการค่าเช่า</h3>
                <p style="margin-top:8px; color:#aaa;">กรุณารอเจ้าของหอสร้างบิลค่าเช่าก่อนจึงจะสามารถชำระเงินได้</p>
            </div>
        `;
    }

    if (paymentAction) {
        paymentAction.innerHTML = `
            <div style="color:#aaa; text-align:center; padding:10px;">
                <i class="fa-solid fa-clock"></i> รอเจ้าของหอสร้างรายการค่าเช่า
            </div>
        `;
    }
}


// =====================================================
// LOAD CURRENT PAYMENT (UPDATED & FIXED)
// =====================================================

async function loadCurrentPayment(uid) {
    cleanupListeners();

    try {
        const paymentsRef = collection(db, "payments");
        
        // ค้นหาทั้งจาก userId และ tenantId เพื่อป้องกันชื่อฟิลด์ไม่ตรงกัน
        const qUser = query(paymentsRef, where("userId", "==", uid));
        const qTenant = query(paymentsRef, where("tenantId", "==", uid));

        const [snapUser, snapTenant] = await Promise.all([
            getDocs(qUser),
            getDocs(qTenant)
        ]);

        const paymentsMap = new Map();

        snapUser.forEach((docSnap) => {
            paymentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });

        snapTenant.forEach((docSnap) => {
            paymentsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });

        const payments = Array.from(paymentsMap.values()).filter(isOwnerCreatedPayment);

        if (!payments.length) {
            showNoPaymentCreated();
            listenPaymentsRealtime(uid);
            return;
        }

        const selectedPayment = selectCurrentPayment(payments);

        if (!selectedPayment) {
            showNoPaymentCreated();
            listenPaymentsRealtime(uid);
            return;
        }

        currentPayment = selectedPayment;
        renderPayment(currentPayment);

        listenCurrentPayment(currentPayment.id);
        listenPaymentsRealtime(uid);

    } catch (error) {
        console.error("Load Current Payment Error:", error);
        showNoPaymentCreated();
    }
}


// =====================================================
// HELPER: IS OWNER CREATED PAYMENT (FIXED)
// =====================================================

function isOwnerCreatedPayment(payment) {
    if (!payment) return false;
    // หากมีข้อมูลถือว่าเป็นบิลที่ถูกสร้างในระบบโดยสมบูรณ์
    return true;
}


// =====================================================
// SELECT CURRENT PAYMENT
// =====================================================

function selectCurrentPayment(payments) {
    if (!Array.isArray(payments) || !payments.length) return null;

    const sorted = [...payments].sort((a, b) => {
        const dateA = getPaymentSortDate(a);
        const dateB = getPaymentSortDate(b);
        return dateB - dateA;
    });

    // หากมีบิลที่ยังไม่ชำระ ให้เลือกบิลล่าสุดที่ยังค้างอยู่ก่อน
    const active = sorted.find((payment) => !isFinalPayment(payment));
    if (active) return active;

    // ถ้าทุกบิลถูกชำระหมดแล้ว ให้แสดงบิลล่าสุด
    return sorted[0] || null;
}

function isFinalPayment(payment) {
    const status = normalizeStatus(payment?.status || payment?.paymentStatus);
    return status === "paid" || status === "success" || status === "completed";
}

function getPaymentSortDate(payment) {
    const candidates = [payment?.createdAt, payment?.updatedAt, payment?.dueDate, payment?.paidAt];
    for (const value of candidates) {
        const date = normalizeDate(value);
        if (date) return date.getTime();
    }
    return 0;
}


// =====================================================
// RENDER PAYMENT
// =====================================================

function renderPayment(payment) {
    if (!payment) {
        showNoPaymentCreated();
        return;
    }

    const amount = getPaymentAmount(payment);
    const due = normalizeDate(payment.dueDate);
    const status = getPaymentStatus(payment, due);

    if (paymentAmount) paymentAmount.innerText = formatMoney(amount);
    if (modalPaymentAmount) modalPaymentAmount.innerText = formatMoney(amount);

    if (dueDate) dueDate.innerText = due ? formatThaiDate(due) : "-";
    if (modalDueDate) {
        modalDueDate.innerText = due ? "ครบกำหนดชำระ " + formatThaiDate(due) : "ไม่พบวันครบกำหนด";
    }

    if (dueStatus) {
        dueStatus.innerText = status.text;
        dueStatus.className = "status-text " + status.className;
    }

    renderNotice(status, due, amount);
    renderPaymentStatus(status, amount, due);
    renderPaymentAction(status, payment);
}


function getPaymentAmount(payment) {
    const amount = Number(payment?.amount);
    if (Number.isFinite(amount) && amount > 0) return amount;

    const total = Number(payment?.total);
    if (Number.isFinite(total) && total > 0) return total;

    return Number(currentRoom?.price || 0);
}


function getPaymentStatus(payment, due) {
    const rawStatus = normalizeStatus(payment?.status || payment?.paymentStatus || "unpaid");

    if (rawStatus === "paid" || rawStatus === "success" || rawStatus === "completed") {
        return { text: "ชำระเงินแล้ว", className: "paid" };
    }

    if (isWaitingVerificationStatus(rawStatus)) {
        return { text: "รอตรวจสอบการชำระเงิน", className: "waiting" };
    }

    if (rawStatus === "rejected") {
        return { text: "การชำระเงินถูกปฏิเสธ", className: "rejected" };
    }

    if (due && isPastDate(due)) {
        return { text: "เกินกำหนดชำระ", className: "overdue" };
    }

    if (rawStatus === "pending") {
        return { text: "รอชำระเงิน", className: "pending" };
    }

    return { text: "รอชำระเงิน", className: "unpaid" };
}


function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}


function isWaitingVerificationStatus(status) {
    return (
        status === "pending_verify" ||
        status === "waiting_verify" ||
        status === "waitingconfirm" ||
        status === "waiting_confirm"
    );
}


// =====================================================
// RENDER NOTICES & CARDS
// =====================================================

function renderNotice(status, due, amount) {
    if (!noticeText) return;

    if (status.className === "paid") {
        noticeText.innerText = "ค่าเช่ารอบนี้ชำระเรียบร้อยแล้ว";
        return;
    }

    if (status.className === "waiting") {
        noticeText.innerText = "คุณได้แจ้งชำระเงินแล้ว กรุณารอเจ้าของหอตรวจสอบ";
        return;
    }

    if (status.className === "rejected") {
        noticeText.innerText = "การชำระเงินถูกปฏิเสธ กรุณาตรวจสอบข้อมูลและแจ้งชำระใหม่";
        return;
    }

    if (status.className === "overdue") {
        noticeText.innerText = "ค่าเช่าของคุณเกินกำหนดแล้ว กรุณาชำระเงินโดยเร็ว";
        return;
    }

    if (due) {
        const days = getDaysUntil(due);
        if (days === 0) {
            noticeText.innerText = `วันนี้ครบกำหนดชำระค่าเช่า ${formatMoney(amount)}`;
            return;
        }
        if (days > 0 && days <= 3) {
            noticeText.innerText = `ใกล้ถึงกำหนดชำระค่าเช่า เหลืออีก ${days} วัน`;
            return;
        }
        noticeText.innerText = `ค่าเช่ารอบนี้ครบกำหนดวันที่ ${formatThaiDate(due)}`;
        return;
    }

    noticeText.innerText = "มีรายการค่าเช่าที่รอชำระ";
}


function renderPaymentStatus(status, amount, due) {
    if (!paymentStatus) return;

    let icon = "fa-money-bill-wave";
    if (status.className === "paid") icon = "fa-circle-check";
    else if (status.className === "overdue") icon = "fa-triangle-exclamation";
    else if (status.className === "waiting") icon = "fa-clock";
    else if (status.className === "rejected") icon = "fa-circle-xmark";

    paymentStatus.innerHTML = `
        <div>
            <i class="fa-solid ${icon}" style="font-size:42px; margin-bottom:12px;"></i>
            <h3>${escapeHTML(status.text)}</h3>
            <p style="margin-top:8px; color:#aaa;">
                ยอดชำระ <strong style="color:#fff;">${formatMoney(amount)}</strong>
            </p>
            ${due ? `<p style="margin-top:5px; color:#888;">ครบกำหนด ${formatThaiDate(due)}</p>` : ""}
        </div>
    `;
}


function renderPaymentAction(status, payment) {
    if (!paymentAction) return;

    if (status.className === "paid") {
        paymentAction.innerHTML = `
            <div style="color:#55d98a; text-align:center; padding:10px;">
                <i class="fa-solid fa-circle-check"></i> ชำระเงินเรียบร้อยแล้ว
            </div>
        `;
        return;
    }

    if (status.className === "waiting") {
        paymentAction.innerHTML = `
            <div style="color:#00c3ff; text-align:center; padding:10px;">
                <i class="fa-solid fa-clock"></i> รอเจ้าของหอตรวจสอบการชำระเงิน
            </div>
        `;
        return;
    }

    if (status.className === "rejected") {
        paymentAction.innerHTML = `
            <div style="color:#ff6b6b; text-align:center; margin-bottom:12px;">
                <i class="fa-solid fa-circle-xmark"></i> การชำระเงินถูกปฏิเสธ
            </div>
            <button type="button" id="openPaymentBtn" class="btn btn-primary" style="max-width:350px;">
                <i class="fa-solid fa-qrcode"></i> แจ้งชำระเงินอีกครั้ง
            </button>
        `;
        attachOpenPaymentButton(payment);
        return;
    }

    const amount = getPaymentAmount(payment);
    paymentAction.innerHTML = `
        <button type="button" id="openPaymentBtn" class="btn btn-primary" style="max-width:350px;">
            <i class="fa-solid fa-qrcode"></i> ชำระค่าเช่า ${formatMoney(amount)}
        </button>
    `;

    attachOpenPaymentButton(payment);
}


function attachOpenPaymentButton(payment) {
    const openPaymentBtn = document.getElementById("openPaymentBtn");
    if (openPaymentBtn) {
        openPaymentBtn.onclick = () => openPaymentModal(payment);
    }
}


// =====================================================
// MODAL & PROMPTPAY QR GENERATOR
// =====================================================

async function openPaymentModal(payment) {
    if (!paymentModal || !payment) return;

    const status = normalizeStatus(payment.status || payment.paymentStatus);
    if (status === "paid" || isWaitingVerificationStatus(status)) return;

    currentPayment = payment;
    paymentModal.classList.add("show");

    const amount = getPaymentAmount(payment);
    if (modalPaymentAmount) modalPaymentAmount.innerText = formatMoney(amount);

    const due = normalizeDate(payment.dueDate);
    if (modalDueDate) {
        modalDueDate.innerText = due ? "ครบกำหนดชำระ " + formatThaiDate(due) : "ไม่พบวันครบกำหนด";
    }

    await createPromptPayQR(amount);
}

function closeModal() {
    if (paymentModal) paymentModal.classList.remove("show");
}

if (closePaymentModal) closePaymentModal.addEventListener("click", closeModal);
if (cancelPaymentBtn) cancelPaymentBtn.addEventListener("click", closeModal);
if (paymentModal) {
    paymentModal.addEventListener("click", (e) => {
        if (e.target === paymentModal) closeModal();
    });
}


async function createPromptPayQR(amount) {
    if (!promptpayQR) return;

    try {
        const context = promptpayQR.getContext?.("2d");
        if (context) {
            context.clearRect(0, 0, promptpayQR.width, promptpayQR.height);
        }

        const paymentSnap = await getDoc(doc(db, "paymentSettings", "promptpay"));

        if (!paymentSnap.exists()) {
            showQRMessage("ยังไม่ได้ตั้งค่า PromptPay ในระบบ");
            return;
        }

        const promptpayNumber = paymentSnap.data()?.promptpayNumber;

        if (!promptpayNumber) {
            showQRMessage("ไม่พบหมายเลข PromptPay");
            return;
        }

        if (typeof QRCode === "undefined") {
            showQRMessage("ระบบสร้าง QR Code ไม่พร้อมใช้งาน");
            return;
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            showQRMessage("ยอดชำระไม่ถูกต้อง");
            return;
        }

        const payload = generatePromptPayPayload(promptpayNumber, numericAmount);

        QRCode.toCanvas(promptpayQR, payload, { width: 220, margin: 2 }, (err) => {
            if (err) {
                console.error("QR Canvas Error:", err);
                showQRMessage("ไม่สามารถสร้าง QR Code ได้");
            }
        });

    } catch (error) {
        console.error("Create PromptPay QR Error:", error);
        showQRMessage("เกิดข้อผิดพลาดในการโหลด QR Code");
    }
}

function showQRMessage(msg) {
    if (!promptpayQR) return;
    const parent = promptpayQR.parentElement;
    if (parent) {
        parent.innerHTML = `<div style="padding:20px; color:#ff6b6b; text-align:center;">${escapeHTML(msg)}</div>`;
    }
}


// =====================================================
// CONFIRM PAYMENT ACTION
// =====================================================

if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener("click", async () => {
        if (!currentPayment || !auth.currentUser) return;

        confirmPaymentBtn.disabled = true;
        confirmPaymentBtn.innerText = "กำลังบันทึกข้อมูล...";

        try {
            const paymentRef = doc(db, "payments", currentPayment.id);
            await updateDoc(paymentRef, {
                status: "waiting_verify",
                paymentStatus: "waiting_verify",
                updatedAt: serverTimestamp()
            });

            try {
                await writeLog({
                    action: "UPDATE",
                    module: "payment",
                    targetId: currentPayment.id,
                    targetType: "payment",
                    description: "ผู้เช่าแจ้งชำระเงินค่าเช่าเรียบร้อยแล้ว"
                });
            } catch (logErr) {
                console.error("Log error:", logErr);
            }

            alert("แจ้งชำระเงินสำเร็จแล้ว กรุณารอเจ้าของหอพักตรวจสอบ");
            closeModal();
            await loadCurrentPayment(auth.currentUser.uid);

        } catch (error) {
            console.error("Confirm Payment Error:", error);
            alert("ไม่สามารถบันทึกการชำระเงินได้");
        } finally {
            confirmPaymentBtn.disabled = false;
            confirmPaymentBtn.innerText = "ยืนยันการชำระเงิน";
        }
    });
}


// =====================================================
// REALTIME LISTENERS & HISTORY
// =====================================================

function listenCurrentPayment(paymentId) {
    if (paymentUnsubscribe) paymentUnsubscribe();
    paymentUnsubscribe = onSnapshot(doc(db, "payments", paymentId), (snapshot) => {
        if (snapshot.exists()) {
            currentPayment = { id: snapshot.id, ...snapshot.data() };
            renderPayment(currentPayment);
        }
    });
}

function listenPaymentsRealtime(uid) {
    if (paymentsUnsubscribe) paymentsUnsubscribe();
    const q = query(collection(db, "payments"), where("userId", "==", uid));
    paymentsUnsubscribe = onSnapshot(q, () => {
        loadPaymentHistory(uid);
    });
}

async function loadPaymentHistory(uid) {
    if (!paymentHistory) return;

    try {
        const q = query(collection(db, "payments"), where("userId", "==", uid));
        const snap = await getDocs(q);

        if (snap.empty) {
            paymentHistory.innerHTML = `
                <div class="empty-history">
                    <i class="fa-solid fa-receipt"></i>
                    <p>ยังไม่มีประวัติการชำระเงิน</p>
                </div>
            `;
            return;
        }

        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => getPaymentSortDate(b) - getPaymentSortDate(a));

        paymentHistory.innerHTML = "";
        items.forEach(item => {
            const due = normalizeDate(item.dueDate);
            const st = getPaymentStatus(item, due);
            const div = document.createElement("div");
            div.className = "history-item";
            div.innerHTML = `
                <div class="history-main">
                    <strong>ประจำวันที่ ${formatThaiDate(due)}</strong>
                    <span class="status-text ${st.className}">${st.text}</span>
                </div>
                <div class="history-amount">${formatMoney(getPaymentAmount(item))}</div>
            `;
            paymentHistory.appendChild(div);
        });

    } catch (err) {
        console.error("Load History Error:", err);
    }
}

function cleanupListeners() {
    if (paymentUnsubscribe) { paymentUnsubscribe(); paymentUnsubscribe = null; }
    if (paymentsUnsubscribe) { paymentsUnsubscribe(); paymentsUnsubscribe = null; }
}

function cleanupPaymentListeners() {
    cleanupListeners();
}


// =====================================================
// UTILITY HELPERS
// =====================================================

function formatMoney(num) {
    const val = Number(num || 0);
    return val.toLocaleString("th-TH") + " บาท";
}

function normalizeDate(val) {
    if (!val) return null;
    if (val.toDate) return val.toDate();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function formatThaiDate(date) {
    if (!date) return "-";
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function isPastDate(date) {
    if (!date) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return target < now;
}

function getDaysUntil(date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showError(msg) {
    if (noticeText) noticeText.innerText = msg;
}