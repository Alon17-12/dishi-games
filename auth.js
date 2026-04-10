// dishi-games/auth.js
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export let currentUser = null;

export function initAuth(onUserChange) {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    onUserChange(user);
  });
}

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    return e; // return so caller can display it
  }
}

export async function signOutUser() {
  await signOut(auth);
}
