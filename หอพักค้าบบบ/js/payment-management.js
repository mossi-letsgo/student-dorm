// payment-management.js

import { auth, db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { loadTheme } from "./theme.js";
import {
    writeLog
} from "./logger.js";


// =========================
// LOAD THEME
// =========================

await loadTheme();


// =========================
// ELEMENTS
// =========================

const adminName =
    document.getElementById("adminName");

const logoutBtn =
    document.getElementById("logoutBtn");

const ownerSelect =
    document.getElementById("ownerSelect");

const promptpayNumber =
    document.getElementById("promptpayNumber");

const paymentStatus =
    document.getElementById("paymentStatus");

const currentPromptpay =
    document.getElementById("currentPromptpay");

const currentOwner =
    document.getElementById("currentOwner");

const savePaymentBtn =
    document.getElementById("savePaymentBtn");


// =========================
// VARIABLES
// =========================

let owners = [];

let currentPayment = null;


// =========================
// AUTH
// =========================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "../index.html";

        return;

    }

    try {

        // =========================
        // โหลดข้อมูล Admin
        // =========================

        const userRef =
            doc(db, "users", user.uid);

        const userSnap =
            await getDoc(userRef);


        if (!userSnap.exists()) {

            alert("ไม่พบข้อมูลผู้ใช้งาน");

            await signOut(auth);

            location.href = "../index.html";

            return;

        }


        const userData =
            userSnap.data();


        // ตรวจสอบ Super Admin

        if (userData.role !== "superadmin") {

            alert("คุณไม่มีสิทธิ์เข้าใช้งานหน้านี้");

            location.href = "../index.html";

            return;

        }


        adminName.textContent =
            userData.fullname || "Super Admin";


        // =========================
        // โหลดข้อมูล
        // =========================

        await loadOwners();

        await loadPaymentSettings();


    } catch (error) {

        console.error(error);

        alert("ไม่สามารถโหลดข้อมูลระบบได้");

    }

});


// =========================
// LOAD OWNER
// =========================

async function loadOwners() {

    ownerSelect.innerHTML = `
        <option value="">
            -- เลือกเจ้าของหอพัก --
        </option>
    `;


    try {

        const snap =
            await getDocs(
                collection(db, "users")
            );


        owners = [];


        snap.forEach(docSnap => {

            const data =
                docSnap.data();


            // เอาเฉพาะ Owner

            if (data.role === "owner") {

                owners.push({

                    id: docSnap.id,

                    ...data

                });

            }

        });


        // เรียงตามชื่อ

        owners.sort((a, b) => {

            return String(
                a.fullname || ""
            ).localeCompare(
                String(b.fullname || ""),
                "th"
            );

        });


        if (owners.length === 0) {

            ownerSelect.innerHTML = `
                <option value="">
                    ยังไม่มี Owner ในระบบ
                </option>
            `;

            return;

        }


        owners.forEach(owner => {

            const option =
                document.createElement("option");


            option.value =
                owner.id;


            option.textContent =
                owner.fullname ||
                owner.email ||
                "Owner";


            ownerSelect.appendChild(option);

        });


    } catch (error) {

        console.error(error);

        ownerSelect.innerHTML = `
            <option value="">
                โหลด Owner ไม่สำเร็จ
            </option>
        `;

    }

}


// =========================
// LOAD PAYMENT SETTINGS
// =========================

async function loadPaymentSettings() {

    try {

        const paymentRef =
            doc(
                db,
                "paymentSettings",
                "promptpay"
            );


        const paymentSnap =
            await getDoc(paymentRef);


        if (!paymentSnap.exists()) {

            currentPayment = null;

            currentPromptpay.textContent =
                "ยังไม่ได้กำหนด";

            currentOwner.textContent =
                "ยังไม่ได้กำหนด";

            promptpayNumber.value = "";

            paymentStatus.value =
                "active";

            ownerSelect.value = "";

            return;

        }


        currentPayment =
            paymentSnap.data();


        const data =
            currentPayment;


        // =========================
        // แสดง PromptPay
        // =========================

        currentPromptpay.textContent =
            data.promptpayNumber ||
            "ยังไม่ได้กำหนด";


        currentOwner.textContent =
            data.ownerName ||
            "ยังไม่ได้กำหนด";


        // =========================
        // ใส่ข้อมูลใน Form
        // =========================

        promptpayNumber.value =
            data.promptpayNumber || "";


        paymentStatus.value =
            data.status || "active";


        if (data.ownerId) {

            ownerSelect.value =
                data.ownerId;

        }


    } catch (error) {

        console.error(error);

        alert("ไม่สามารถโหลดข้อมูล PromptPay ได้");

    }

}


// =========================
// CHANGE OWNER
// =========================

ownerSelect.addEventListener(
    "change",
    () => {

        const ownerId =
            ownerSelect.value;


        if (!ownerId) {

            return;

        }


        const owner =
            owners.find(
                item => item.id === ownerId
            );


        if (!owner) {

            return;

        }


        // ถ้า Owner มีเบอร์โทร
        // สามารถนำมาใส่ให้ก่อนแก้ไขได้

        if (
            !promptpayNumber.value &&
            owner.phone
        ) {

            promptpayNumber.value =
                owner.phone;

        }

    }
);


// =========================
// SAVE PAYMENT
// =========================

savePaymentBtn.addEventListener(
    "click",
    async () => {

        const ownerId =
            ownerSelect.value;


        const number =
            promptpayNumber.value
                .trim()
                .replace(/\D/g, "");


        const status =
            paymentStatus.value;


        // =========================
        // VALIDATE OWNER
        // =========================

        if (!ownerId) {

            alert("กรุณาเลือกเจ้าของหอพัก");

            return;

        }


        // =========================
        // VALIDATE PROMPTPAY
        // =========================

        if (!number) {

            alert("กรุณากรอกหมายเลข PromptPay");

            return;

        }


        if (
            number.length !== 10 ||
            !number.startsWith("0")
        ) {

            alert(
                "หมายเลข PromptPay ต้องเป็นเบอร์โทรศัพท์ 10 หลัก"
            );

            return;

        }


        // =========================
        // FIND OWNER
        // =========================

        const owner =
            owners.find(
                item => item.id === ownerId
            );


        if (!owner) {

            alert("ไม่พบข้อมูล Owner");

            return;

        }


        // =========================
        // CONFIRM
        // =========================

        const confirmSave =
            confirm(
                `ต้องการตั้ง PromptPay เป็นของ\n\n` +
                `${owner.fullname || owner.email}\n` +
                `${number}\n\n` +
                `ใช่หรือไม่?`
            );


        if (!confirmSave) {

            return;

        }


        // =========================
        // SAVE
        // =========================

        savePaymentBtn.disabled = true;

        savePaymentBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            กำลังบันทึก...
        `;


        try {

            const paymentRef =
                doc(
                    db,
                    "paymentSettings",
                    "promptpay"
                );


            await setDoc(
                paymentRef,
                {

                    promptpayNumber:
                        number,

                    ownerId:
                        ownerId,

                    ownerName:
                        owner.fullname ||
                        owner.email ||
                        "Owner",

                    status:
                        status,

                    updatedAt:
                        serverTimestamp()

                },
                {
                    merge: true
                }
            );


            // =========================
            // UPDATE UI
            // =========================

            currentPayment = {

                promptpayNumber:
                    number,

                ownerId:
                    ownerId,

                ownerName:
                    owner.fullname ||
                    owner.email ||
                    "Owner",

                status:
                    status

            };


            currentPromptpay.textContent =
                number;


            currentOwner.textContent =
                owner.fullname ||
                owner.email ||
                "Owner";


            alert(
                "บันทึกข้อมูล PromptPay สำเร็จ"
            );


        } catch (error) {

            console.error(error);

            alert(
                "ไม่สามารถบันทึกข้อมูล PromptPay ได้\n\n" +
                error.message
            );


        } finally {

            savePaymentBtn.disabled = false;

            savePaymentBtn.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                บันทึกข้อมูล
            `;

        }

    }
);


// =========================
// LOGOUT
// =========================

logoutBtn.addEventListener(
    "click",
    async () => {

        const confirmLogout =
            confirm(
                "ต้องการออกจากระบบหรือไม่?"
            );


        if (!confirmLogout) {

            return;

        }


        try {

            await signOut(auth);

            location.href =
                "../index.html";


        } catch (error) {

            console.error(error);

            alert(
                "ไม่สามารถออกจากระบบได้"
            );

        }

    }
);