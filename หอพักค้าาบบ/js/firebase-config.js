// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAWZipu2Nlhrm8AQrW_JaDmyohB3DycAs",
  authDomain: "hopaknaksuksa.firebaseapp.com",
  projectId: "hopaknaksuksa",
  storageBucket: "hopaknaksuksa.firebasestorage.app",
  messagingSenderId: "121076275174",
  appId: "1:121076275174:web:bcc362d36cb7feb242a827"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { auth, db };