// =====================================================
// LOGIN SYSTEM
// =====================================================

import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signOut,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    updateDoc,
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { loadTheme } from "../js/theme.js";

import {
    logLogin,
    logError
} from "./logger.js";


// =====================================================
// START
// =====================================================

console.log(
    "========== LOGIN.JS LOADED =========="
);


await loadTheme();


const provider =
    new GoogleAuthProvider();


// =====================================================
// SAVE LOGIN LOG
// =====================================================

async function saveLoginLog(
    user,
    loginMethod,
    accountCreated = false
) {

    try {

        console.log(
            "กำลังสร้าง System Log...",
            loginMethod
        );


        if (!user) {

            console.error(
                "ไม่มี Firebase User"
            );

            return null;

        }


        const logId =
            await logLogin({

                user,

                loginMethod,

                accountCreated

            });


        console.log(
            "System Log ID:",
            logId
        );


        if (!logId) {

            console.error(
                "System Log ไม่ถูกสร้าง"
            );

            return null;

        }


        console.log(
            "System Log สร้างสำเร็จ:",
            logId
        );


        return logId;

    }

    catch (error) {

        console.error(
            "System Log Write Error:",
            error
        );

        return null;

    }

}


// =====================================================
// EMAIL LOGIN
// =====================================================

const loginBtn =
    document.getElementById(
        "loginBtn"
    );


if (loginBtn) {

    loginBtn.addEventListener(
        "click",
        async () => {

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("password")
                    .value;


            if (
                !email ||
                !password
            ) {

                alert(
                    "กรุณากรอกอีเมลและรหัสผ่าน"
                );

                return;

            }


            // ---------------------------------------------
            // LOGIN
            // ---------------------------------------------

            try {

                console.log(
                    "กำลัง Login:",
                    email
                );


                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                console.log(
                    "Firebase Login สำเร็จ:",
                    user.uid
                );


                // ---------------------------------------------
                // USER DATA
                // ---------------------------------------------

                const userRef =
                    doc(
                        db,
                        "users",
                        user.uid
                    );


                const snap =
                    await getDoc(
                        userRef
                    );


                if (!snap.exists()) {

                    alert(
                        "ไม่พบข้อมูลผู้ใช้"
                    );

                    await signOut(auth);

                    return;

                }


                const data =
                    snap.data();


                // ---------------------------------------------
                // DISABLED
                // ---------------------------------------------

                if (
                    data.status ===
                    "disabled"
                ) {

                    alert(
                        "บัญชีของคุณถูกระงับ"
                    );

                    await signOut(auth);

                    return;

                }


                // ---------------------------------------------
                // SUPERADMIN
                // ---------------------------------------------

                if (
                    data.role ===
                    "superadmin"
                ) {

                    alert(
                        "บัญชี Super Admin กรุณาเข้าสู่ระบบผ่านหน้า Super Admin"
                    );

                    await signOut(auth);

                    location.href =
                        "index.html";

                    return;

                }


                // ---------------------------------------------
                // UPDATE LAST LOGIN
                // ---------------------------------------------

                await updateDoc(
                    userRef,
                    {

                        lastLogin:
                            serverTimestamp()

                    }
                );


                console.log(
                    "อัปเดต lastLogin สำเร็จ"
                );


                // =============================================
                // IMPORTANT
                // สร้าง System Log ก่อน Redirect
                // =============================================

                const logId =
                    await saveLoginLog(
                        user,
                        "email",
                        false
                    );


                // ---------------------------------------------
                // ตรวจสอบ Log
                // ---------------------------------------------

                if (!logId) {

                    console.error(
                        "LOGIN LOG FAILED"
                    );


                    alert(
                        "เข้าสู่ระบบสำเร็จ แต่ไม่สามารถบันทึก System Log ได้\nกรุณาลองใหม่อีกครั้ง"
                    );


                    return;

                }


                console.log(
                    "LOGIN LOG CREATED:",
                    logId
                );


                // =============================================
                // REDIRECT
                // =============================================

                if (
                    data.role ===
                    "student"
                ) {

                    alert(
                        "เข้าสู่ระบบสำเร็จ"
                    );


                    location.href =
                        "dashboard.html";


                    return;

                }


                if (
                    data.role ===
                    "owner"
                ) {

                    alert(
                        "เข้าสู่ระบบสำเร็จ"
                    );


                    location.href =
                        "admin-dashboard.html";


                    return;

                }


                // ---------------------------------------------
                // UNKNOWN ROLE
                // ---------------------------------------------

                alert(
                    "ไม่มีสิทธิ์เข้าใช้งาน"
                );


                await signOut(auth);

            }

            catch (error) {

                console.error(
                    "EMAIL LOGIN ERROR:",
                    error
                );


                // ---------------------------------------------
                // ERROR LOG
                // ---------------------------------------------

                try {

                    await logError({

                        module:
                            "authentication",

                        description:
                            "เข้าสู่ระบบไม่สำเร็จ",

                        error

                    });

                }

                catch (logErrorException) {

                    console.error(
                        "ไม่สามารถสร้าง Error Log:",
                        logErrorException
                    );

                }


                // ---------------------------------------------
                // ERROR MESSAGE
                // ---------------------------------------------

                switch (
                    error.code
                ) {

                    case "auth/invalid-email":

                        alert(
                            "รูปแบบอีเมลไม่ถูกต้อง"
                        );

                        break;


                    case "auth/invalid-credential":

                        alert(
                            "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
                        );

                        break;


                    case "auth/user-disabled":

                        alert(
                            "บัญชีนี้ถูกระงับ"
                        );

                        break;


                    case "auth/too-many-requests":

                        alert(
                            "เข้าสู่ระบบหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง"
                        );

                        break;


                    case "auth/network-request-failed":

                        alert(
                            "ไม่สามารถเชื่อมต่ออินเทอร์เน็ต"
                        );

                        break;


                    default:

                        alert(
                            error.message
                        );

                }

            }

        }
    );

}


// =====================================================
// GOOGLE LOGIN
// =====================================================

const googleLoginBtn =
    document.getElementById(
        "googleLoginBtn"
    );


if (googleLoginBtn) {

    googleLoginBtn.addEventListener(
        "click",
        async () => {

            try {

                console.log(
                    "เริ่ม Google Login"
                );


                // ---------------------------------------------
                // GOOGLE AUTH
                // ---------------------------------------------

                const result =
                    await signInWithPopup(
                        auth,
                        provider
                    );


                const user =
                    result.user;


                console.log(
                    "Google Login สำเร็จ:",
                    user.uid
                );


                // ---------------------------------------------
                // USER DOCUMENT
                // ---------------------------------------------

                const userRef =
                    doc(
                        db,
                        "users",
                        user.uid
                    );


                const userSnap =
                    await getDoc(
                        userRef
                    );


                // =============================================
                // NEW GOOGLE USER
                // =============================================

                if (
                    !userSnap.exists()
                ) {

                    const newUserData = {

                        fullname:
                            user.displayName ||
                            "",

                        email:
                            user.email ||
                            "",

                        studentId:
                            "",

                        faculty:
                            "",

                        level:
                            "",

                        major:
                            "",

                        phone:
                            "",

                        role:
                            "student",

                        room:
                            "",

                        tenant:
                            false,

                        status:
                            "active",

                        photoURL:
                            user.photoURL ||
                            "",

                        themeColor:
                            "#b30000",

                        createdAt:
                            serverTimestamp(),

                        lastLogin:
                            serverTimestamp()

                    };


                    await setDoc(
                        userRef,
                        newUserData
                    );


                    console.log(
                        "สร้าง User Google สำเร็จ"
                    );


                    // =========================================
                    // CREATE LOGIN LOG
                    // =========================================

                    const logId =
                        await saveLoginLog(
                            user,
                            "google",
                            true
                        );


                    if (!logId) {

                        alert(
                            "สร้างบัญชีสำเร็จ แต่ไม่สามารถสร้าง System Log ได้"
                        );

                        return;

                    }


                    console.log(
                        "GOOGLE REGISTER LOG CREATED:",
                        logId
                    );


                    alert(
                        "สร้างบัญชีด้วย Google สำเร็จ"
                    );


                    // -----------------------------------------
                    // REDIRECT AFTER LOG
                    // -----------------------------------------

                    location.href =
                        "dashboard.html";


                    return;

                }


                // =============================================
                // EXISTING GOOGLE USER
                // =============================================

                const data =
                    userSnap.data();


                // ---------------------------------------------
                // DISABLED
                // ---------------------------------------------

                if (
                    data.status ===
                    "disabled"
                ) {

                    alert(
                        "บัญชีของคุณถูกระงับ"
                    );

                    await signOut(auth);

                    return;

                }


                // ---------------------------------------------
                // SUPERADMIN
                // ---------------------------------------------

                if (
                    data.role ===
                    "superadmin"
                ) {

                    alert(
                        "บัญชี Super Admin กรุณาเข้าสู่ระบบผ่านหน้า Super Admin"
                    );

                    await signOut(auth);

                    location.href =
                        "index.html";

                    return;

                }


                // ---------------------------------------------
                // UPDATE LAST LOGIN
                // ---------------------------------------------

                await updateDoc(
                    userRef,
                    {

                        lastLogin:
                            serverTimestamp()

                    }
                );


                console.log(
                    "Google lastLogin สำเร็จ"
                );


                // =============================================
                // CREATE LOGIN LOG
                // =============================================

                const logId =
                    await saveLoginLog(
                        user,
                        "google",
                        false
                    );


                if (!logId) {

                    alert(
                        "เข้าสู่ระบบสำเร็จ แต่ไม่สามารถสร้าง System Log ได้"
                    );

                    return;

                }


                console.log(
                    "GOOGLE LOGIN LOG CREATED:",
                    logId
                );


                // =============================================
                // REDIRECT AFTER LOG
                // =============================================

                alert(
                    "เข้าสู่ระบบด้วย Google สำเร็จ"
                );


                if (
                    data.role ===
                    "owner"
                ) {

                    location.href =
                        "admin-dashboard.html";

                    return;

                }


                location.href =
                    "dashboard.html";

            }

            catch (error) {

                console.error(
                    "GOOGLE LOGIN ERROR:",
                    error
                );


                // ---------------------------------------------
                // ERROR LOG
                // ---------------------------------------------

                try {

                    await logError({

                        module:
                            "authentication",

                        description:
                            "เข้าสู่ระบบด้วย Google ไม่สำเร็จ",

                        error

                    });

                }

                catch (logErrorException) {

                    console.error(
                        "ไม่สามารถสร้าง Error Log:",
                        logErrorException
                    );

                }


                // ---------------------------------------------
                // ERROR MESSAGE
                // ---------------------------------------------

                switch (
                    error.code
                ) {

                    case "auth/popup-closed-by-user":

                        alert(
                            "ยกเลิกการเข้าสู่ระบบ"
                        );

                        break;


                    case "auth/popup-blocked":

                        alert(
                            "Browser บล็อก Popup"
                        );

                        break;


                    default:

                        alert(
                            error.message
                        );

                }

            }

        }
    );

}