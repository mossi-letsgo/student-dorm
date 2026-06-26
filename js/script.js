function send() {
  const input = document.getElementById("input");
  const chat = document.getElementById("chat");

  const msg = input.value;
  if (msg === "") return;

  // แสดงข้อความผู้ใช้
  chat.innerHTML += "<p class='user'><b>คุณ:</b> " + msg + "</p>";

  // AI ตอบแบบง่าย
  let reply = "";

  if (msg.includes("สวัสดี")) {
    reply = "สวัสดีครับ 👋";
  } else if (msg.includes("ชื่อ")) {
    reply = "ฉันคือ Mini AI Bot";
  } else {
    reply = "ฉันยังไม่เข้าใจ 😅";
  }

  chat.innerHTML += "<p class='ai'><b>AI:</b> " + reply + "</p>";

  input.value = "";
}