// dishi-games/firebase-config.js
// Firebase 10.12.0 via CDN — bump carefully, check breaking changes
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCxtigbF1SuethKddkkPol3V5S_32I3dEE",
  authDomain:        "dishi-world.firebaseapp.com",
  projectId:         "dishi-world",
  storageBucket:     "dishi-world.firebasestorage.app",
  messagingSenderId: "875971269673",
  appId:             "1:875971269673:web:4ae768f4903339d7187838"
};

const app = initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
