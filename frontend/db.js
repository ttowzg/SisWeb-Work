// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjVCWtHAs_j1GOREAHUA2UMi0sN6Kbi-8",
  authDomain: "sisweb-diagsis.firebaseapp.com",
  projectId: "sisweb-diagsis",
  storageBucket: "sisweb-diagsis.appspot.com",
  messagingSenderId: "818890249613",
  appId: "1:818890249613:web:d53b71877612961d4119c4",
  measurementId: "G-93LHT92M8E",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged };
