let clickCount = 0;
let timer = null;

const logo = document.getElementById("logoSecret");

logo.addEventListener("click", () => {

    clickCount++;

    clearTimeout(timer);

    timer = setTimeout(() => {

        clickCount = 0;

    }, 2000);

    if (clickCount >= 5) {

        window.location.href = "../html/superadmin-login.html";

    }

});