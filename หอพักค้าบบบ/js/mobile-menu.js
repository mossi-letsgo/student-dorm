// =====================================================
// MOBILE SIDEBAR MENU
// รองรับทั้ง User และ Owner
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    // =================================================
    // หา Sidebar
    // =================================================

    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) {

        console.warn(
            "Mobile Sidebar: ไม่พบ .sidebar ในหน้านี้"
        );

        return;
    }


    // =================================================
    // สร้างปุ่ม Menu ถ้ายังไม่มี
    // =================================================

    let menuToggle =
        document.getElementById("menuToggle");

    if (!menuToggle) {

        menuToggle = document.createElement("button");

        menuToggle.id = "menuToggle";

        menuToggle.className = "menu-toggle";

        menuToggle.setAttribute(
            "aria-label",
            "เปิดเมนู"
        );

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );

        menuToggle.innerHTML = `
            <i class="fa-solid fa-bars"></i>
        `;

        document.body.appendChild(menuToggle);
    }


    // =================================================
    // สร้าง Overlay ถ้ายังไม่มี
    // =================================================

    let overlay =
        document.getElementById("sidebarOverlay");

    if (!overlay) {

        overlay = document.createElement("div");

        overlay.id = "sidebarOverlay";

        overlay.className = "sidebar-overlay";

        document.body.appendChild(overlay);
    }


    // =================================================
    // เปิด Sidebar
    // =================================================

    function openSidebar() {

        sidebar.classList.add("open");

        overlay.classList.add("show");

        menuToggle.classList.add("active");

        menuToggle.setAttribute(
            "aria-expanded",
            "true"
        );


        // เปลี่ยน icon เป็น X

        const icon =
            menuToggle.querySelector("i");

        if (icon) {

            icon.classList.remove(
                "fa-bars"
            );

            icon.classList.add(
                "fa-xmark"
            );

        }


        document.body.classList.add(
            "sidebar-open"
        );
    }


    // =================================================
    // ปิด Sidebar
    // =================================================

    function closeSidebar() {

        sidebar.classList.remove("open");

        overlay.classList.remove("show");

        menuToggle.classList.remove("active");

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );


        // เปลี่ยน icon กลับเป็น ☰

        const icon =
            menuToggle.querySelector("i");

        if (icon) {

            icon.classList.remove(
                "fa-xmark"
            );

            icon.classList.add(
                "fa-bars"
            );

        }


        document.body.classList.remove(
            "sidebar-open"
        );
    }


    // =================================================
    // Toggle
    // =================================================

    function toggleSidebar() {

        if (
            sidebar.classList.contains("open")
        ) {

            closeSidebar();

        } else {

            openSidebar();

        }

    }


    // =================================================
    // ปุ่ม Menu
    // =================================================

    menuToggle.addEventListener(
        "click",
        toggleSidebar
    );


    // =================================================
    // กด Overlay
    // =================================================

    overlay.addEventListener(
        "click",
        closeSidebar
    );


    // =================================================
    // กดเมนูใน Sidebar
    // ให้ปิด Sidebar
    // =================================================

    const menuLinks =
        sidebar.querySelectorAll("a");

    menuLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                closeSidebar();

            }
        );

    });


    // =================================================
    // กด ESC
    // =================================================

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                sidebar.classList.contains("open")
            ) {

                closeSidebar();

            }

        }
    );


    // =================================================
    // Resize
    // Desktop = ปิด Sidebar
    // =================================================

    window.addEventListener(
        "resize",
        () => {

            if (window.innerWidth > 768) {

                closeSidebar();

            }

        }
    );


    console.log(
        "Mobile Sidebar: พร้อมใช้งาน"
    );

});