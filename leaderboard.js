// dishi-games/leaderboard.js
import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, collection,
  query, orderBy, limit, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// gameId: "flying-dishi" | "dishi-hangman" | "raspia-king" | "fireman-dishi"
// user: Firebase Auth user object
// score: number
export async function saveScore(gameId, user, score) {
  if (!user) return;
  const ref = doc(db, 'leaderboard', gameId, 'scores', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().score >= score) return; // keep highest
  await setDoc(ref, {
    uid:       user.uid,
    name:      user.displayName || 'אנונימי',
    photoURL:  user.photoURL || '',
    score,
    timestamp: serverTimestamp()
  });
}

// Returns unsubscribe function. Calls callback with array of top-10 score objects.
export function subscribeTopScores(gameId, callback) {
  const q = query(
    collection(db, 'leaderboard', gameId, 'scores'),
    orderBy('score', 'desc'),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => d.data()));
  });
}
