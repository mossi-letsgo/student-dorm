// =====================================================
// SUPERADMIN SYSTEM LOG
// REALTIME FIRESTORE SYSTEM
// =====================================================

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    collection,
    getDoc,
    doc,
    query,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// =====================================================
// VARIABLES
// =====================================================

let allLogs = [];

let unsubscribeLogs = null;


// =====================================================
// AUTH
// =====================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        try {

            // ตรวจสอบ Superadmin
            const isSuperadmin =
                await checkSuperadmin(user);


            if (!isSuperadmin) {

                return;

            }


            // เริ่ม Realtime Listener
            startRealtimeLogs();


            // ตั้งค่า Filter
            setupFilters();

        }
        catch (error) {

            console.error(
                "System Log Init Error:",
                error
            );

            const container =
                document.getElementById(
                    "logContainer"
                );


            if (container) {

                container.innerHTML = `
                    <div class="log-error">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        ไม่สามารถโหลด System Log ได้

                        <br>

                        <small>
                            ${escapeHTML(
                                error.message
                            )}
                        </small>

                    </div>
                `;

            }

        }

    }
);


// =====================================================
// CHECK SUPERADMIN
// =====================================================

async function checkSuperadmin(user) {

    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const snap =
            await getDoc(userRef);


        if (!snap.exists()) {

            alert(
                "ไม่พบข้อมูลผู้ใช้"
            );

            window.location.href =
                "login.html";

            return false;

        }


        const data =
            snap.data();


        // ---------------------------------------------
        // CHECK ROLE
        // ---------------------------------------------

        if (
            data.role !==
            "superadmin"
        ) {

            alert(
                "คุณไม่มีสิทธิ์เข้าหน้านี้"
            );

            window.location.href =
                "dashboard.html";

            return false;

        }


        // ---------------------------------------------
        // ADMIN NAME
        // ---------------------------------------------

        const adminName =
            document.getElementById(
                "adminName"
            );


        if (adminName) {

            adminName.textContent =
                data.fullname ||
                data.name ||
                user.email ||
                "Superadmin";

        }


        return true;

    }
    catch (error) {

        console.error(
            "Check Superadmin Error:",
            error
        );

        throw error;

    }

}


// =====================================================
// REALTIME SYSTEM LOG
// =====================================================

function startRealtimeLogs() {

    const container =
        document.getElementById(
            "logContainer"
        );


    if (!container) {

        console.warn(
            "ไม่พบ #logContainer"
        );

        return;

    }


    container.innerHTML = `
        <div class="log-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            กำลังเชื่อมต่อ System Log...

        </div>
    `;


    // ---------------------------------------------
    // ป้องกัน Listener ซ้ำ
    // ---------------------------------------------

    if (unsubscribeLogs) {

        unsubscribeLogs();

        unsubscribeLogs = null;

    }


    // ---------------------------------------------
    // QUERY
    // ---------------------------------------------

    const q =
        query(

            collection(
                db,
                "systemLogs"
            ),

            orderBy(
                "timestamp",
                "desc"
            ),

            limit(500)

        );


    // ---------------------------------------------
    // REALTIME LISTENER
    // ---------------------------------------------

    unsubscribeLogs =
        onSnapshot(

            q,

            (snapshot) => {

                console.log(
                    "System Log Realtime:",
                    snapshot.size
                );


                allLogs = [];


                snapshot.forEach(
                    (docSnap) => {

                        allLogs.push({

                            id:
                                docSnap.id,

                            ...docSnap.data()

                        });

                    }
                );


                // ---------------------------------
                // SUMMARY
                // ---------------------------------

                updateSummary();


                // ---------------------------------
                // RENDER
                // ---------------------------------

                applyFilter();

            },


            (error) => {

                console.error(
                    "Realtime System Log Error:",
                    error
                );


                container.innerHTML = `
                    <div class="log-error">

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        ไม่สามารถโหลด System Log ได้

                        <br>

                        <small>
                            ${escapeHTML(
                                error.message
                            )}
                        </small>

                    </div>
                `;

            }

        );

}


// =====================================================
// SUMMARY
// =====================================================

function updateSummary() {

    const total =
        allLogs.length;


    const login =
        allLogs.filter(
            log =>
                log.action ===
                "LOGIN"
        ).length;


    const update =
        allLogs.filter(
            log =>
                log.action ===
                "UPDATE"
        ).length;


    const errors =
        allLogs.filter(
            log =>
                log.action ===
                    "ERROR" ||

                log.status ===
                    "error"
        ).length;


    setText(
        "totalLogs",
        total
    );


    setText(
        "loginLogs",
        login
    );


    setText(
        "updateLogs",
        update
    );


    setText(
        "errorLogs",
        errors
    );

}


// =====================================================
// FILTER SETUP
// =====================================================

function setupFilters() {

    const search =
        document.getElementById(
            "logSearch"
        );


    const action =
        document.getElementById(
            "logAction"
        );


    const role =
        document.getElementById(
            "logRole"
        );


    const button =
        document.getElementById(
            "filterLogBtn"
        );


    // ---------------------------------------------
    // BUTTON
    // ---------------------------------------------

    if (button) {

        button.addEventListener(
            "click",
            applyFilter
        );

    }


    // ---------------------------------------------
    // SEARCH ENTER
    // ---------------------------------------------

    if (search) {

        search.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    applyFilter();

                }

            }
        );

    }


    // ---------------------------------------------
    // ACTION
    // ---------------------------------------------

    if (action) {

        action.addEventListener(
            "change",
            applyFilter
        );

    }


    // ---------------------------------------------
    // ROLE
    // ---------------------------------------------

    if (role) {

        role.addEventListener(
            "change",
            applyFilter
        );

    }

}


// =====================================================
// APPLY FILTER
// =====================================================

function applyFilter() {

    const search =
        document.getElementById(
            "logSearch"
        )?.value
        ?.trim()
        ?.toLowerCase() || "";


    const action =
        document.getElementById(
            "logAction"
        )?.value ||
        "all";


    const role =
        document.getElementById(
            "logRole"
        )?.value ||
        "all";


    const filtered =
        allLogs.filter(
            (log) => {

                // ---------------------------------
                // ACTION
                // ---------------------------------

                if (
                    action !== "all" &&
                    log.action !== action
                ) {

                    return false;

                }


                // ---------------------------------
                // ROLE
                // ---------------------------------

                if (
                    role !== "all" &&
                    log.role !== role
                ) {

                    return false;

                }


                // ---------------------------------
                // SEARCH
                // ---------------------------------

                if (search) {

                    const text = [

                        log.userId,

                        log.userEmail,

                        log.userName,

                        log.description,

                        log.module,

                        log.action,

                        log.targetId,

                        log.targetType,

                        log.page

                    ]
                        .filter(
                            value =>
                                value !==
                                null &&
                                value !==
                                undefined
                        )
                        .join(" ")
                        .toLowerCase();


                    if (
                        !text.includes(
                            search
                        )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    renderLogs(
        filtered
    );

}


// =====================================================
// RENDER LOGS
// =====================================================

function renderLogs(logs) {

    const container =
        document.getElementById(
            "logContainer"
        );


    if (!container) return;


    // ---------------------------------------------
    // EMPTY
    // ---------------------------------------------

    if (!logs.length) {

        container.innerHTML = `

            <div class="empty-log">

                <i class="fa-solid fa-file-circle-xmark"></i>

                <p>
                    ไม่พบ System Log
                </p>

            </div>

        `;

        return;

    }


    // ---------------------------------------------
    // TABLE
    // ---------------------------------------------

    let html = `

        <div class="log-table-wrapper">

            <table class="log-table">

                <thead>

                    <tr>

                        <th>
                            เวลา
                        </th>

                        <th>
                            ผู้ใช้งาน
                        </th>

                        <th>
                            Role
                        </th>

                        <th>
                            Action
                        </th>

                        <th>
                            Module
                        </th>

                        <th>
                            รายละเอียด
                        </th>

                        <th>
                            สถานะ
                        </th>

                    </tr>

                </thead>

                <tbody>

    `;


    logs.forEach(
        (log) => {

            html += `

                <tr>

                    <!-- TIME -->

                    <td>

                        ${formatDate(
                            log.timestamp
                        )}

                    </td>


                    <!-- USER -->

                    <td>

                        <strong>

                            ${escapeHTML(
                                log.userName ||
                                "-"
                            )}

                        </strong>

                        <br>

                        <small>

                            ${escapeHTML(
                                log.userEmail ||
                                "-"
                            )}

                        </small>

                    </td>


                    <!-- ROLE -->

                    <td>

                        <span
                            class="
                                role-badge
                                role-${escapeHTML(
                                    log.role ||
                                    "unknown"
                                )}
                            "
                        >

                            ${escapeHTML(
                                log.role ||
                                "-"
                            )}

                        </span>

                    </td>


                    <!-- ACTION -->

                    <td>

                        <span
                            class="
                                action-badge
                                action-${escapeHTML(
                                    String(
                                        log.action ||
                                        "unknown"
                                    ).toLowerCase()
                                )}
                            "
                        >

                            ${escapeHTML(
                                log.action ||
                                "-"
                            )}

                        </span>

                    </td>


                    <!-- MODULE -->

                    <td>

                        ${escapeHTML(
                            log.module ||
                            "-"
                        )}

                    </td>


                    <!-- DESCRIPTION -->

                    <td>

                        ${escapeHTML(
                            log.description ||
                            "-"
                        )}


                        ${
                            log.targetId
                                ? `

                                    <br>

                                    <small>

                                        Target:
                                        ${escapeHTML(
                                            log.targetId
                                        )}

                                    </small>

                                  `
                                : ""
                        }


                        ${
                            log.page
                                ? `

                                    <br>

                                    <small>

                                        Page:
                                        ${escapeHTML(
                                            log.page
                                        )}

                                    </small>

                                  `
                                : ""
                        }

                    </td>


                    <!-- STATUS -->

                    <td>

                        ${
                            log.status ===
                            "error"

                                ? `

                                    <span
                                        class="
                                            status-error
                                        "
                                    >
                                        Error
                                    </span>

                                  `

                                : `

                                    <span
                                        class="
                                            status-success
                                        "
                                    >
                                        Success
                                    </span>

                                  `
                        }

                    </td>

                </tr>

            `;

        }
    );


    html += `

                </tbody>

            </table>

        </div>

    `;


    container.innerHTML =
        html;

}


// =====================================================
// DATE FORMAT
// =====================================================

function formatDate(timestamp) {

    if (!timestamp) {

        return "-";

    }


    let date;


    try {

        if (
            typeof timestamp.toDate ===
            "function"
        ) {

            date =
                timestamp.toDate();

        }
        else {

            date =
                new Date(
                    timestamp
                );

        }

    }
    catch {

        return "-";

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }


    return date.toLocaleString(
        "th-TH",
        {

            dateStyle:
                "medium",

            timeStyle:
                "medium"

        }
    );

}


// =====================================================
// SET TEXT
// =====================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


// =====================================================
// ESCAPE HTML
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


// =====================================================
// CLEANUP
// =====================================================

window.addEventListener(
    "beforeunload",
    () => {

        if (unsubscribeLogs) {

            unsubscribeLogs();

            unsubscribeLogs =
                null;

        }

    }
);