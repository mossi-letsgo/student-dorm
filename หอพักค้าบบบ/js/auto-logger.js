// =====================================================
// AUTO PAGE LOGGER
// =====================================================

import { logPageView } from "./logger.js";


// รอให้ Firebase Auth มี User ก่อน
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth } from "./firebase-config.js";


onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            console.log(
                "Auto Logger: ไม่มีผู้ใช้"
            );

            return;

        }


        try {

            const logId =
                await logPageView();


            console.log(
                "PAGE VIEW LOG:",
                logId
            );

        }
        catch (error) {

            console.error(
                "Auto Page Logger Error:",
                error
            );

        }

    }
);