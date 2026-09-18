// =====================================================
// OWNER CREATE PAYMENT
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
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    writeLog
} from "./logger.js";


// =====================================================
// VARIABLES
// =====================================================

let currentOwner = null;
let tenants = [];
let isLoadingPayments = false;
let isCreatingPayment = false;


// =====================================================
// ELEMENTS
// =====================================================

const tenantSelect = document.getElementById("tenantSelect");
const paymentForm = document.getElementById("paymentForm");
const paymentList = document.getElementById("paymentList");
const totalBills = document.getElementById("totalBills");
const pendingBills = document.getElementById("pendingBills");
const paidBills = document.getElementById("paidBills");
const refreshBtn = document.getElementById("refreshBtn");
const ownerName = document.getElementById("ownerName");
const logoutBtn = document.getElementById("logoutBtn");
const roomDisplay = document.getElementById("roomDisplay");


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        location.replace("login.html");
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            alert("ไม่พบข้อมูลผู้ใช้งาน");
            await signOut(auth);
            location.replace("login.html");
            return;
        }

        currentOwner = {
            id: userSnap.id,
            ...userSnap.data()
        };

        if (currentOwner.role !== "owner") {
            alert("คุณไม่มีสิทธิ์เข้าหน้านี้");
            location.replace("../index.html");
            return;
        }

        if (ownerName) {
            ownerName.innerText = currentOwner.fullname || user.displayName || "Owner";
        }

        await loadTenants();
        await loadPayments();

    } catch (error) {
        console.error("Owner Payment Auth Error:", error);
        alert("ไม่สามารถโหลดข้อมูลได้");
    }
});


// =====================================================
// EVENT LISTENERS (LOGOUT & REFRESH)
// =====================================================

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            location.replace("login.html");
        } catch (error) {
            console.error("Logout Error:", error);
            alert("ไม่สามารถออกจากระบบได้");
        }
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        loadPayments();
    });
}


// =====================================================
// LOAD TENANTS
// =====================================================

async function loadTenants() {
    if (!tenantSelect) return;

    tenantSelect.disabled = true;
    tenantSelect.innerHTML = `<option value="">กำลังโหลดผู้เช่า...</option>`;

    try {
        const tenantQuery = query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("tenant", "==", true)
        );

        const snapshot = await getDocs(tenantQuery);
        tenants = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        const tenantsWithRoom = tenants.filter(
            (tenant) =>
                tenant.room !== undefined &&
                tenant.room !== null &&
                String(tenant.room).trim() !== ""
        );

        tenantSelect.innerHTML = `<option value="">-- เลือกผู้เช่า --</option>`;

        tenantsWithRoom.forEach((tenant) => {
            const option = document.createElement("option");
            option.value = tenant.id;
            option.textContent = `${tenant.fullname || "ไม่ระบุชื่อ"} — ห้อง ${tenant.room}`;
            tenantSelect.appendChild(option);
        });

        if (tenantsWithRoom.length === 0) {
            tenantSelect.innerHTML = `<option value="">ไม่พบผู้เช่าที่มีห้อง</option>`;
        }

        tenantSelect.disabled = false;

    } catch (error) {
        console.error("Load Tenants Error:", error);
        tenants = [];
        tenantSelect.innerHTML = `<option value="">โหลดข้อมูลไม่สำเร็จ</option>`;
    }
}


// =====================================================
// SELECT TENANT
// =====================================================

if (tenantSelect) {
    tenantSelect.addEventListener("change", () => {
        const tenantId = tenantSelect.value;
        const tenant = tenants.find((item) => item.id === tenantId);

        if (!tenant) {
            if (roomDisplay) {
                roomDisplay.innerText = "กรุณาเลือกผู้เช่า";
                roomDisplay.classList.remove("has-room");
            }
            return;
        }

        if (roomDisplay) {
            roomDisplay.innerHTML = `
                <i class="fa-solid fa-bed" style="margin-right:8px;color:var(--theme,#00ffff);"></i>
                ห้อง ${escapeHTML(tenant.room || "-")}
            `;
            roomDisplay.classList.add("has-room");
        }
    });
}


// =====================================================
// CREATE PAYMENT BILL
// =====================================================

if (paymentForm) {
    paymentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isCreatingPayment) return;

        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("กรุณาเข้าสู่ระบบใหม่");
            return;
        }

        const tenantId = tenantSelect?.value || "";
        const amountInput = document.getElementById("amount");
        const dueDateInput = document.getElementById("dueDate");
        const noteInput = document.getElementById("note");

        const amount = Number(amountInput?.value);
        const dueDate = dueDateInput?.value || "";
        const note = noteInput?.value.trim() || "";

        if (!tenantId) {
            alert("กรุณาเลือกผู้เช่า");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            alert("กรุณาระบุจำนวนเงินที่ถูกต้อง");
            amountInput?.focus();
            return;
        }

        if (!dueDate) {
            alert("กรุณาระบุวันครบกำหนด");
            dueDateInput?.focus();
            return;
        }

        if (!isValidDateString(dueDate)) {
            alert("รูปแบบวันครบกำหนดไม่ถูกต้อง");
            dueDateInput?.focus();
            return;
        }

        const tenant = tenants.find((item) => item.id === tenantId);
        if (!tenant) {
            alert("ไม่พบข้อมูลผู้เช่า");
            return;
        }

        if (!tenant.room || String(tenant.room).trim() === "") {
            alert("ผู้เช่ารายนี้ยังไม่ได้ระบุห้อง");
            return;
        }

        const button = document.getElementById("createPaymentBtn");

        try {
            isCreatingPayment = true;

            if (button) {
                button.disabled = true;
                button.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    กำลังสร้างบิล...
                `;
            }

            const paymentData = {
                userId: tenant.id,
                fullname: tenant.fullname || "",
                roomId: tenant.room || "",
                roomNumber: tenant.room || "",
                amount: amount,
                dueDate: dueDate,
                note: note,
                status: "pending",
                paymentStatus: "unpaid",
                verifiedAt: null,
                verifiedBy: null,
                rejectedAt: null,
                rejectedBy: null,
                rejectionReason: "",
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid
            };

            const paymentRef = await addDoc(
                collection(db, "payments"),
                paymentData
            );

            try {
                await writeLog({
                    action: "CREATE",
                    module: "payment",
                    targetId: paymentRef.id,
                    targetType: "payment",
                    description: `สร้างบิลค่าเช่า ห้อง ${tenant.room || ""}`,
                    newData: paymentData
                });
            } catch (logError) {
                console.error("Payment Log Error:", logError);
            }

            alert("สร้างบิลค่าเช่าเรียบร้อยแล้ว");

            paymentForm.reset();

            if (roomDisplay) {
                roomDisplay.innerText = "กรุณาเลือกผู้เช่า";
                roomDisplay.classList.remove("has-room");
            }

            if (tenantSelect) {
                tenantSelect.value = "";
            }

            await loadPayments();

        } catch (error) {
            console.error("Create Payment Error:", error);
            alert(getFirebaseErrorMessage(error, "ไม่สามารถสร้างบิลได้"));
        } finally {
            isCreatingPayment = false;

            if (button) {
                button.disabled = false;
                button.innerHTML = `
                    <i class="fa-solid fa-file-circle-plus"></i>
                    สร้างบิล
                `;
            }
        }
    });
}


// =====================================================
// LOAD PAYMENTS
// =====================================================

async function loadPayments() {
    if (!paymentList) return;
    if (isLoadingPayments) return;

    isLoadingPayments = true;

    if (refreshBtn) refreshBtn.disabled = true;

    paymentList.innerHTML = `
        <div class="loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            กำลังโหลดรายการบิล...
        </div>
    `;

    try {
        const paymentQuery = query(
            collection(db, "payments"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(paymentQuery);

        if (snapshot.empty) {
            updateSummary([]);
            paymentList.innerHTML = `
                <div class="empty">
                    <i class="fa-solid fa-file-invoice"></i>
                    ยังไม่มีรายการบิล
                </div>
            `;
            return;
        }

        const payments = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        updateSummary(payments);

        paymentList.innerHTML = "";
        payments.forEach((payment) => {
            paymentList.appendChild(createPaymentElement(payment));
        });

    } catch (error) {
        console.error("Load Payments Error:", error);
        updateSummary([]);
        paymentList.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                ไม่สามารถโหลดรายการบิลได้
            </div>
        `;
    } finally {
        isLoadingPayments = false;
        if (refreshBtn) refreshBtn.disabled = false;
    }
}


// =====================================================
// SUMMARY
// =====================================================

function updateSummary(payments) {
    const total = payments.length;

    const paid = payments.filter(
        (payment) => getPaymentStatusKey(payment) === "paid"
    ).length;

    const pending = payments.filter((payment) => {
        const status = getPaymentStatusKey(payment);
        return status === "pending" || status === "waiting_verify";
    }).length;

    if (totalBills) totalBills.innerText = total;
    if (pendingBills) pendingBills.innerText = pending;
    if (paidBills) paidBills.innerText = paid;
}


// =====================================================
// CREATE PAYMENT ELEMENT
// =====================================================

function createPaymentElement(payment) {
    const element = document.createElement("div");
    element.className = "payment-item";

    const status = getPaymentStatus(payment);
    const statusKey = getPaymentStatusKey(payment);

    let actionHTML = "";

    if (statusKey === "waiting_verify") {
        actionHTML = `
            <div class="payment-actions">
                <button type="button" class="btn btn-confirm" data-action="confirm" data-id="${escapeHTML(payment.id)}">
                    <i class="fa-solid fa-circle-check"></i> ยืนยันการชำระเงิน
                </button>
                <button type="button" class="btn btn-reject" data-action="reject" data-id="${escapeHTML(payment.id)}">
                    <i class="fa-solid fa-circle-xmark"></i> ปฏิเสธ
                </button>
            </div>
        `;
    }

    element.innerHTML = `
        <div class="payment-main">
            <strong>${escapeHTML(payment.fullname || "ไม่ระบุชื่อ")}</strong>
            <span class="room">
                <i class="fa-solid fa-bed"></i> ห้อง ${escapeHTML(payment.roomNumber || payment.roomId || "-")}
            </span>
            <span>
                <i class="fa-solid fa-calendar-days"></i> ครบกำหนด ${formatDate(payment.dueDate)}
            </span>
            <span class="status ${escapeHTML(status.className)}">
                <i class="fa-solid ${escapeHTML(status.icon)}"></i> ${escapeHTML(status.text)}
            </span>
            ${actionHTML}
        </div>
        <div class="payment-side">
            <span class="payment-amount">
                ${Number(payment.amount || 0).toLocaleString("th-TH")} บาท
            </span>
            <span class="payment-date">
                สร้างเมื่อ ${formatTimestamp(payment.createdAt)}
            </span>
        </div>
    `;

    const confirmBtn = element.querySelector('[data-action="confirm"]');
    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            if (confirmBtn.disabled) return;

            const confirmed = window.confirm(
                `ยืนยันว่าผู้เช่า ${payment.fullname || ""} ชำระเงินจำนวน ${Number(payment.amount || 0).toLocaleString("th-TH")} บาทแล้วใช่หรือไม่?`
            );

            if (!confirmed) return;

            confirmBtn.disabled = true;
            await updatePaymentStatus(payment.id, "paid");
        });
    }

    const rejectBtn = element.querySelector('[data-action="reject"]');
    if (rejectBtn) {
        rejectBtn.addEventListener("click", async () => {
            if (rejectBtn.disabled) return;

            const reason = window.prompt("กรุณาระบุเหตุผลที่ปฏิเสธการชำระเงิน");
            if (reason === null) return;

            rejectBtn.disabled = true;
            await updatePaymentStatus(payment.id, "rejected", reason.trim());
        });
    }

    return element;
}


// =====================================================
// UPDATE PAYMENT STATUS
// =====================================================

async function updatePaymentStatus(paymentId, newStatus, rejectionReason = "") {
    if (!paymentId) {
        alert("ไม่พบรหัสรายการชำระเงิน");
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบใหม่");
        return;
    }

    if (newStatus !== "paid" && newStatus !== "rejected") {
        alert("สถานะการชำระเงินไม่ถูกต้อง");
        return;
    }

    try {
        const paymentRef = doc(db, "payments", paymentId);
        const paymentSnap = await getDoc(paymentRef);

        if (!paymentSnap.exists()) {
            alert("ไม่พบรายการชำระเงินนี้");
            return;
        }

        const currentPayment = paymentSnap.data();
        const currentStatus = getPaymentStatusKey(currentPayment);

        if (currentStatus === "paid") {
            alert("รายการนี้ถูกยืนยันการชำระเงินแล้ว");
            await loadPayments();
            return;
        }

        if (currentStatus === "rejected") {
            alert("รายการนี้ถูกปฏิเสธไปแล้ว");
            await loadPayments();
            return;
        }

        if (currentStatus !== "waiting_verify") {
            alert("รายการนี้ยังไม่อยู่ในสถานะรอตรวจสอบการชำระเงิน");
            await loadPayments();
            return;
        }

        if (newStatus === "paid") {
            await updateDoc(paymentRef, {
                status: "paid",
                paymentStatus: "paid",
                verifiedAt: serverTimestamp(),
                verifiedBy: currentUser.uid,
                rejectedAt: null,
                rejectedBy: null,
                rejectionReason: ""
            });

            try {
                await writeLog({
                    action: "VERIFY",
                    module: "payment",
                    targetId: paymentId,
                    targetType: "payment",
                    description: "ยืนยันการชำระเงิน",
                    newData: {
                        status: "paid",
                        paymentStatus: "paid",
                        verifiedBy: currentUser.uid
                    }
                });
            } catch (logError) {
                console.error("Verify Payment Log Error:", logError);
            }

            alert("ยืนยันการชำระเงินเรียบร้อยแล้ว");

        } else if (newStatus === "rejected") {
            await updateDoc(paymentRef, {
                status: "rejected",
                paymentStatus: "rejected",
                rejectedAt: serverTimestamp(),
                rejectedBy: currentUser.uid,
                rejectionReason: rejectionReason || "",
                verifiedAt: null,
                verifiedBy: null
            });

            try {
                await writeLog({
                    action: "REJECT",
                    module: "payment",
                    targetId: paymentId,
                    targetType: "payment",
                    description: `ปฏิเสธการชำระเงิน${rejectionReason ? `: ${rejectionReason}` : ""}`,
                    newData: {
                        status: "rejected",
                        paymentStatus: "rejected",
                        rejectedBy: currentUser.uid,
                        rejectionReason: rejectionReason || ""
                    }
                });
            } catch (logError) {
                console.error("Reject Payment Log Error:", logError);
            }

            alert("ปฏิเสธการชำระเงินเรียบร้อยแล้ว");
        }

        await loadPayments();

    } catch (error) {
        console.error("Update Payment Status Error:", error);
        alert(getFirebaseErrorMessage(error, "ไม่สามารถอัปเดตสถานะได้"));
    }
}


// =====================================================
// HELPER FUNCTIONS
// =====================================================

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isValidDateString(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function formatTimestamp(timestamp) {
    if (!timestamp) return "-";
    let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getPaymentStatusKey(payment) {
    if (!payment) return "pending";
    if (payment.status === "paid" || payment.paymentStatus === "paid") return "paid";
    if (payment.status === "rejected" || payment.paymentStatus === "rejected") return "rejected";
    if (payment.status === "waiting_verify" || payment.paymentStatus === "waiting_verify" || payment.slipUrl) return "waiting_verify";
    return "pending";
}

function getPaymentStatus(payment) {
    const key = getPaymentStatusKey(payment);
    switch (key) {
        case "paid":
            return { text: "ชำระเงินแล้ว", className: "status-paid", icon: "fa-circle-check" };
        case "rejected":
            return { text: "ปฏิเสธการชำระเงิน", className: "status-rejected", icon: "fa-circle-xmark" };
        case "waiting_verify":
            return { text: "รอตรวจสอบ", className: "status-waiting", icon: "fa-clock" };
        default:
            return { text: "ค้างชำระ", className: "status-pending", icon: "fa-triangle-exclamation" };
    }
}

function getFirebaseErrorMessage(error, defaultMsg = "เกิดข้อผิดพลาด") {
    if (!error) return defaultMsg;
    switch (error.code) {
        case "permission-denied":
            return "คุณไม่มีสิทธิ์ในการดำเนินการนี้";
        case "unavailable":
            return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในขณะนี้";
        default:
            return error.message || defaultMsg;
    }
}