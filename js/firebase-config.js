// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




const firebaseConfig = {
  apiKey: "AIzaSyDw5SzfICzaE7e3cvFjbPT4OtxE_-Pw_Fs",
  authDomain: "myifgfpalmy.firebaseapp.com",
  projectId: "myifgfpalmy",
  storageBucket: "myifgfpalmy.firebasestorage.app",
  messagingSenderId: "848090209235",
  appId: "1:848090209235:web:9fd2266a9f08a9e13d6d26",
  measurementId: "G-JK9DNP3KXD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Timezone lock wajib (Pacific/Auckland)
export const CHURCH_TIMEZONE = "Pacific/Auckland";
