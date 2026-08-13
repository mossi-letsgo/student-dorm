// =====================================================
// LOGGER
// =====================================================

import { auth, db } from "./firebase-config.js";

import {
    addDoc,
    collection,
    serverTimestamp,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// WRITE LOG
// =====================================================

export async function writeLog({

    user = null,

    action = "UNKNOWN",

    module = "system",

    targetId = null,

    targetType = null,

    description = "",

    oldData = null,

    newData = null,

    status = "success",

    extra = {}

} = {}) {

    try {

        const currentUser =
            user || auth.currentUser;


        if (!currentUser) {

            console.warn(
                "Logger: ยังไม่มีผู้ใช้ Login"
            );

            return null;

        }


        let userName = "";
        let role = "unknown";


        try {

            const userSnap =
                await getDoc(
                    doc(
                        db,
                        "users",
                        currentUser.uid
                    )
                );


            if (userSnap.exists()) {

                const data =
                    userSnap.data();

                userName =
                    data.fullname ||
                    data.name ||
                    "";

                role =
                    data.role ||
                    "unknown";

            }

        }
        catch (error) {

            console.warn(
                "Logger: อ่าน User ไม่สำเร็จ",
                error
            );

        }


        const logData = {

            userId:
                currentUser.uid,

            userEmail:
                currentUser.email || "",

            userName,

            role,

            action,

            module,

            targetId,

            targetType,

            description,

            oldData,

            newData,

            status,

            page:
                window.location.pathname
                    .split("/")
                    .pop() || "",

            userAgent:
                navigator.userAgent || "",

            extra,

            timestamp:
                serverTimestamp()

        };


        const logRef =
            await addDoc(
                collection(
                    db,
                    "systemLogs"
                ),
                logData
            );


        console.log(
            "LOGGER SUCCESS:",
            logRef.id
        );


        return logRef.id;

    }
    catch (error) {

        console.error(
            "LOGGER ERROR:",
            error
        );

        return null;

    }

}


// =====================================================
// PAGE VIEW
// =====================================================

export async function logPageView() {

    return writeLog({

        action:
            "PAGE_VIEW",

        module:
            "navigation",

        description:
            `เปิดหน้า ${document.title || location.pathname}`

    });

}


// =====================================================
// LOGIN
// =====================================================

export async function logLogin({

    user = null,

    loginMethod = "email",

    accountCreated = false,

    extra = {}

} = {}) {

    return writeLog({

        user,

        action:
            "LOGIN",

        module:
            "authentication",

        description:
            accountCreated
                ? "สร้างบัญชีและเข้าสู่ระบบ"
                : "เข้าสู่ระบบ",

        extra: {

            ...extra,

            loginMethod,

            accountCreated

        }

    });

}


// =====================================================
// LOGOUT
// =====================================================

export async function logLogout({

    user = null,

    extra = {}

} = {}) {

    return writeLog({

        user,

        action:
            "LOGOUT",

        module:
            "authentication",

        description:
            "ออกจากระบบ",

        extra

    });

}


// =====================================================
// CREATE
// =====================================================

export async function logCreate({

    module,

    targetId = null,

    targetType = null,

    description = "",

    newData = null,

    extra = {}

}) {

    return writeLog({

        action:
            "CREATE",

        module,

        targetId,

        targetType,

        description,

        newData,

        extra

    });

}


// =====================================================
// UPDATE
// =====================================================

export async function logUpdate({

    module,

    targetId = null,

    targetType = null,

    description = "",

    oldData = null,

    newData = null,

    extra = {}

}) {

    return writeLog({

        action:
            "UPDATE",

        module,

        targetId,

        targetType,

        description,

        oldData,

        newData,

        extra

    });

}


// =====================================================
// DELETE
// =====================================================

export async function logDelete({

    module,

    targetId = null,

    targetType = null,

    description = "",

    oldData = null,

    extra = {}

}) {

    return writeLog({

        action:
            "DELETE",

        module,

        targetId,

        targetType,

        description,

        oldData,

        extra

    });

}


// =====================================================
// ERROR
// =====================================================

export async function logError({

    module = "system",

    targetId = null,

    targetType = null,

    description = "",

    error = null,

    extra = {}

}) {

    return writeLog({

        action:
            "ERROR",

        module,

        targetId,

        targetType,

        description,

        status:
            "error",

        extra: {

            ...extra,

            error:
                error?.message ||
                String(error || "")

        }

    });

}