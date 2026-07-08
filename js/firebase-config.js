// =============================================================
// FIREBASE CONFIGURATION
// =============================================================
// This listening simulator shares the same Firebase project
// as the reading simulator. Copy the same values from:
//   IELTS reading simulator/js/firebase-config.js
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Open your existing project (ielts-reading-simulator)
//    OR create a new project if using a separate Firebase project
// 3. Go to Project Settings > Your Apps > Add Web App (if new)
// 4. Copy the firebaseConfig values below
// 5. Save and redeploy to Netlify
// =============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyBJDW44yTId_csDzRb5nGO-6EH0mesQFuI",
  authDomain:        "ielts-reading-simulator.firebaseapp.com",
  projectId:         "ielts-reading-simulator",
  storageBucket:     "ielts-reading-simulator.firebasestorage.app",
  messagingSenderId: "462677121296",
  appId:             "1:462677121296:web:59baf77ab4ad5abec8ed95"
};

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc,
  getDocs, getDoc, setDoc, deleteDoc, addDoc, onSnapshot,
  query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export {
  db, collection, doc,
  getDocs, getDoc, setDoc, deleteDoc, addDoc, onSnapshot,
  query, where, serverTimestamp
};
