// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDw5SzfnC2aE7e3cvFjbPT4OtxE_-Pw_Fs",
  authDomain: "myifgfpalmy.firebaseapp.com",
  projectId: "myifgfpalmy",
  storageBucket: "myifgfpalmy.firebasestorage.app",
  messagingSenderId: "848090209235",
  appId: "1:848090209235:web:9fd2266a9f08a9e13d6d26",
  measurementId: "G-JK9DNP3KXD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
