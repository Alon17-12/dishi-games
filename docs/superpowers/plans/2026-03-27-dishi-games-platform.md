# Dishi Games Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hebrew birthday surprise games hub for "Dishi" — 2 playable games (Flappy + Hangman) + 2 scaffolds, with Google login and global leaderboard via Firebase.

**Architecture:** Static HTML/JS files served from the domain. A central `index.html` lobby hosts game cards and a live leaderboard. Each game is a standalone HTML file. Firebase Auth handles Google login; Firestore stores per-user high scores per game.

**Tech Stack:** Vanilla HTML5/CSS3/JS (ES modules via CDN), Firebase v10 (Auth + Firestore) via CDN, deployed under WordPress/Elementor as an iframe.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dishi-games/index.html` | Create | Lobby: game grid, leaderboard, auth UI |
| `dishi-games/firebase-config.js` | Create | Firebase app init (user fills real keys) |
| `dishi-games/auth.js` | Create | Google Sign-In / Sign-Out, user state |
| `dishi-games/leaderboard.js` | Create | saveScore(), getTopScores(), live listener |
| `dishi-games/games/flying-dishi.html` | Modify (copy) | Existing Flappy game + Firebase score save |
| `dishi-games/games/dishi-hangman.html` | Create | Full Hebrew hangman game |
| `dishi-games/games/raspia-king.html` | Create | "Coming soon" scaffold |
| `dishi-games/games/fireman-dishi.html` | Create | "Coming soon" scaffold |
| `dishi-games/assets/dishi.png` | Copy | Dishi character image |
| `dishi-games/assets/dishi-combat.jpeg` | Copy | Dishi combat image |

---

## Task 1: Project Structure + Assets

**Files:**
- Create: `dishi-games/` folder tree
- Copy: `דישי המעופף/דישי.png` → `dishi-games/assets/dishi.png`
- Copy: `דישי המעופף/דישי קרב.jpeg` → `dishi-games/assets/dishi-combat.jpeg`

- [ ] **Step 1: Create folder structure**

```bash
mkdir -p "dishi-games/games"
mkdir -p "dishi-games/assets"
```
Run from: `/Users/alongabaymain/קלוד קוד/`

- [ ] **Step 2: Copy assets**

```bash
cp "דישי המעופף/דישי.png" "dishi-games/assets/dishi.png"
cp "דישי המעופף/דישי קרב.jpeg" "dishi-games/assets/dishi-combat.jpeg"
```
Run from: `/Users/alongabaymain/קלוד קוד/`

- [ ] **Step 3: Verify**

```bash
ls dishi-games/assets/
```
Expected output:
```
dishi-combat.jpeg  dishi.png
```

- [ ] **Step 4: Commit**

```bash
cd "dishi-games" && git init && git add assets/
git commit -m "chore: init dishi-games project with assets"
```

---

## Task 2: Firebase Setup (Manual + Config File)

**Files:**
- Create: `dishi-games/firebase-config.js`

> **NOTE:** This task requires creating a Firebase project in the browser. Follow steps exactly.

- [ ] **Step 1: Create Firebase project**

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it `dishi-games`
3. Disable Google Analytics (not needed) → "Create project"

- [ ] **Step 2: Enable Authentication**

1. In Firebase console → left menu → "Build" → "Authentication"
2. Click "Get started"
3. Click "Google" provider → toggle Enable → enter your email as support email → Save

- [ ] **Step 3: Enable Firestore**

1. Left menu → "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" → Next
4. Select region: `europe-west1` (closest to Israel) → Enable

- [ ] **Step 4: Set Firestore Security Rules**

In Firestore → "Rules" tab, replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{gameId}/scores/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click "Publish".

- [ ] **Step 5: Get Web App config**

1. Firebase console → Project Overview (gear icon) → "Project settings"
2. Scroll to "Your apps" → click Web icon (`</>`)
3. App nickname: `dishi-games-web` → "Register app"
4. Copy the `firebaseConfig` object shown

- [ ] **Step 6: Create firebase-config.js**

Create `dishi-games/firebase-config.js` — paste YOUR values from Step 5:

```js
// dishi-games/firebase-config.js
// Replace ALL values below with your actual Firebase project config
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Step 7: Add authorized domain**

1. Firebase console → Authentication → Settings → "Authorized domains"
2. Add your domain (e.g. `yourdomain.co.il`) and `localhost`

- [ ] **Step 8: Commit**

```bash
cd dishi-games
git add firebase-config.js
git commit -m "feat: add Firebase config (keys already in file)"
```

---

## Task 3: auth.js — Google Sign-In Module

**Files:**
- Create: `dishi-games/auth.js`

- [ ] **Step 1: Create auth.js**

```js
// dishi-games/auth.js
import { auth, googleProvider } from './firebase-config.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export let currentUser = null;

// Call this once from lobby to wire up auth state changes
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
    if (e.code !== 'auth/popup-closed-by-user') {
      console.error('Login error:', e);
    }
  }
}

export async function signOutUser() {
  await signOut(auth);
}
```

- [ ] **Step 2: Verify in browser console**

Open any HTML file that imports auth.js with `type="module"`. In DevTools console run:
```js
// Should not throw. Module loads = success.
```
Expected: No errors in console.

- [ ] **Step 3: Commit**

```bash
git add auth.js
git commit -m "feat: add Google Auth module"
```

---

## Task 4: leaderboard.js — Firestore Module

**Files:**
- Create: `dishi-games/leaderboard.js`

- [ ] **Step 1: Create leaderboard.js**

```js
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
```

- [ ] **Step 2: Verify (manual)**

Open browser console on a page that imports this module. Confirm no import errors. Run:
```js
// After Firebase config is valid, this should resolve without error:
// saveScore('test', null, 100)  ← returns immediately (user is null)
```

- [ ] **Step 3: Commit**

```bash
git add leaderboard.js
git commit -m "feat: add Firestore leaderboard module"
```

---

## Task 5: index.html — Lobby

**Files:**
- Create: `dishi-games/index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>עולם דישי 🎮</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #1a1a0e;
      color: #e8e0b0;
      font-family: Arial, sans-serif;
      min-height: 100vh;
      padding: 16px;
    }
    /* ── Header ── */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(80,100,40,0.3);
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid rgba(160,180,80,0.3);
    }
    .logo { font-size: 1.6rem; font-weight: bold; color: #c8e060; }
    .logo span { font-size: 1rem; color: #a0b060; display:block; }
    #authArea { display:flex; align-items:center; gap:10px; }
    #authArea img { width:36px; height:36px; border-radius:50%; border:2px solid #a0c040; }
    #authArea span { font-size:0.85rem; color:#c0d080; }
    .btn {
      background: rgba(80,120,30,0.6);
      color: #e8e0b0;
      border: 1.5px solid rgba(160,180,80,0.5);
      padding: 7px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: bold;
      transition: background 0.2s;
    }
    .btn:hover { background: rgba(100,150,40,0.8); }
    /* ── Games Grid ── */
    h2 { color: #a8c050; margin-bottom: 12px; font-size: 1.1rem; }
    .games-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .game-card {
      background: rgba(50,70,20,0.5);
      border: 2px solid rgba(120,160,40,0.4);
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.2s;
      position: relative;
    }
    .game-card:hover:not(.locked) { transform: translateY(-3px); border-color: #a0c040; }
    .game-card.locked { opacity: 0.5; cursor: not-allowed; }
    .game-card .emoji { font-size: 2.2rem; display:block; margin-bottom:6px; }
    .game-card .game-name { font-weight: bold; color: #d8e898; font-size: 0.95rem; }
    .game-card .game-sub { font-size: 0.75rem; color: #8a9a50; margin-top:3px; }
    .game-card .coming-soon {
      position: absolute; top:6px; left:6px;
      background: rgba(200,80,40,0.8);
      color:#fff; font-size:0.65rem; padding:2px 6px;
      border-radius:4px; font-weight:bold;
    }
    /* ── Game Container ── */
    #gameContainer {
      display: none;
      margin-bottom: 24px;
    }
    #gameContainer.visible { display: block; }
    #backBtn { margin-bottom: 10px; }
    #gameFrame {
      width: 100%;
      height: 680px;
      border: none;
      border-radius: 10px;
    }
    /* ── Leaderboard ── */
    .lb-tabs { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
    .lb-tab {
      background: rgba(60,80,20,0.5);
      border: 1.5px solid rgba(120,160,40,0.3);
      color: #a0b060;
      padding: 5px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .lb-tab.active { background: rgba(100,140,30,0.7); color:#fff; border-color:#a0c040; }
    .lb-list { list-style:none; }
    .lb-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-bottom: 1px solid rgba(100,120,40,0.2);
      font-size: 0.85rem;
    }
    .lb-list li:first-child { color:#ffd700; }
    .lb-list li:nth-child(2) { color:#c0c0c0; }
    .lb-list li:nth-child(3) { color:#cd7f32; }
    .lb-rank { width:24px; font-weight:bold; text-align:center; }
    .lb-avatar { width:28px; height:28px; border-radius:50%; object-fit:cover; }
    .lb-avatar-placeholder { width:28px; height:28px; border-radius:50%; background:rgba(100,140,40,0.4); display:flex; align-items:center; justify-content:center; font-size:0.75rem; }
    .lb-name { flex:1; }
    .lb-score { font-weight:bold; color:#c8e060; }
    .lb-empty { color:#606840; font-size:0.85rem; padding:16px; text-align:center; }
  </style>
</head>
<body>

<header>
  <div class="logo">🎮 עולם דישי <span>פלטפורמת המשחקים</span></div>
  <div id="authArea">
    <button class="btn" id="loginBtn" onclick="handleAuth()">התחבר עם גוגל</button>
  </div>
</header>

<h2>🕹️ המשחקים</h2>
<div class="games-grid">
  <div class="game-card" onclick="openGame('flying-dishi')">
    <span class="emoji">🚀</span>
    <div class="game-name">דישי המעופף</div>
    <div class="game-sub">Flappy Dishi</div>
  </div>
  <div class="game-card" onclick="openGame('dishi-hangman')">
    <span class="emoji">🔤</span>
    <div class="game-name">דיש תלוי</div>
    <div class="game-sub">נחש את המילה</div>
  </div>
  <div class="game-card locked">
    <span class="coming-soon">בקרוב</span>
    <span class="emoji">👑</span>
    <div class="game-name">מלך הרספיה</div>
    <div class="game-sub">בקרוב...</div>
  </div>
  <div class="game-card locked">
    <span class="coming-soon">בקרוב</span>
    <span class="emoji">🔥</span>
    <div class="game-name">דישי הכבאי</div>
    <div class="game-sub">בקרוב...</div>
  </div>
</div>

<div id="gameContainer">
  <button class="btn" id="backBtn" onclick="closeGame()">← חזרה ללובי</button>
  <iframe id="gameFrame" id="gameFrame" allowfullscreen></iframe>
</div>

<h2>🏆 לידרבורד</h2>
<div class="lb-tabs">
  <button class="lb-tab active" onclick="switchLbTab('flying-dishi', this)">דישי המעופף</button>
  <button class="lb-tab" onclick="switchLbTab('dishi-hangman', this)">דיש תלוי</button>
</div>
<ul class="lb-list" id="lbList"><li class="lb-empty">טוען...</li></ul>

<script type="module">
  import { initAuth, signInWithGoogle, signOutUser, currentUser as _cu } from './auth.js';
  import { subscribeTopScores } from './leaderboard.js';

  // Expose to onclick handlers
  window._auth = { signInWithGoogle, signOutUser };
  window._lb   = { subscribeTopScores };

  let currentUser = null;
  let lbUnsub     = null;

  initAuth((user) => {
    currentUser = user;
    window._currentUser = user;
    const area = document.getElementById('authArea');
    if (user) {
      area.innerHTML = `
        <img src="${user.photoURL}" alt="">
        <span>${user.displayName}</span>
        <button class="btn" onclick="handleAuth()">התנתק</button>
      `;
    } else {
      area.innerHTML = `<button class="btn" onclick="handleAuth()">התחבר עם גוגל</button>`;
    }
  });

  window.handleAuth = async () => {
    if (window._currentUser) {
      await window._auth.signOutUser();
    } else {
      await window._auth.signInWithGoogle();
    }
  };

  window.openGame = (gameId) => {
    const gc = document.getElementById('gameContainer');
    const frame = document.getElementById('gameFrame');
    frame.src = `games/${gameId}.html`;
    gc.classList.add('visible');
    document.querySelector('.games-grid').style.display = 'none';
  };

  window.closeGame = () => {
    const gc = document.getElementById('gameContainer');
    const frame = document.getElementById('gameFrame');
    frame.src = '';
    gc.classList.remove('visible');
    document.querySelector('.games-grid').style.display = 'grid';
  };

  let activeLbGame = 'flying-dishi';
  window.switchLbTab = (gameId, btn) => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    loadLeaderboard(gameId);
  };

  function loadLeaderboard(gameId) {
    if (lbUnsub) lbUnsub();
    activeLbGame = gameId;
    lbUnsub = window._lb.subscribeTopScores(gameId, renderLeaderboard);
  }

  function renderLeaderboard(scores) {
    const list = document.getElementById('lbList');
    if (!scores.length) {
      list.innerHTML = '<li class="lb-empty">אין ניקודים עדיין — היה הראשון!</li>';
      return;
    }
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = scores.map((s, i) => `
      <li>
        <span class="lb-rank">${medals[i] || (i+1)}</span>
        ${s.photoURL
          ? `<img class="lb-avatar" src="${s.photoURL}" alt="">`
          : `<div class="lb-avatar-placeholder">😊</div>`}
        <span class="lb-name">${s.name}</span>
        <span class="lb-score">${s.score}</span>
      </li>
    `).join('');
  }

  // Load default leaderboard
  loadLeaderboard('flying-dishi');
</script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify**

```bash
open "dishi-games/index.html"
```

Expected:
- Dark background, RTL Hebrew layout
- 4 game cards (2 active, 2 locked with "בקרוב")
- Leaderboard shows "אין ניקודים עדיין" (empty, normal before data)
- "התחבר עם גוגל" button visible
- Console: no errors (Firebase connection errors OK until config filled)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add lobby with game grid and leaderboard"
```

---

## Task 6: flying-dishi.html — Firebase Score Integration

**Files:**
- Copy: `דישי המעופף/flying-dishi.html` → `dishi-games/games/flying-dishi.html`
- Modify: `dishi-games/games/flying-dishi.html` (add Firebase score save on game over)

- [ ] **Step 1: Copy existing game**

```bash
cp "דישי המעופף/flying-dishi.html" "dishi-games/games/flying-dishi.html"
```

- [ ] **Step 2: Fix asset path in copied file**

In `dishi-games/games/flying-dishi.html`, find the image src lines and update paths:

Find:
```js
dishiImg.src = 'דישי.png';
```
Replace with:
```js
dishiImg.src = '../assets/dishi.png';
```

Find:
```js
combatImg.src = 'דישי קרב.jpeg';
```
Replace with:
```js
combatImg.src = '../assets/dishi-combat.jpeg';
```

- [ ] **Step 3: Add Firebase score import at top of `<script>` block**

Find the very first line of the `<script>` block (after `<script>`):
```js
// ─── Responsive canvas ───────────────────────────────────────────────────────
```

Insert BEFORE that line:

```js
// ─── Firebase leaderboard ────────────────────────────────────────────────────
import { saveScore } from '../leaderboard.js';
import { auth } from '../firebase-config.js';
```

Also change the opening `<script>` tag to:
```html
<script type="module">
```

- [ ] **Step 4: Add score submission on game over**

Find the function where `gameState` is set to `STATE.DEAD` (search for `gameState = STATE.DEAD`). It looks like:
```js
gameState = STATE.DEAD;
```

Add AFTER that line:
```js
// Submit score to Firebase leaderboard
saveScore('flying-dishi', auth.currentUser, score);
```

- [ ] **Step 5: Verify in browser**

```bash
open "dishi-games/games/flying-dishi.html"
```

Expected:
- Game loads with Dishi image
- Playing and dying works as before
- In DevTools Network tab: after dying, see a Firestore request (if Firebase config is filled)
- No JS errors

- [ ] **Step 6: Commit**

```bash
git add games/flying-dishi.html
git commit -m "feat: integrate Firebase score save into flying-dishi"
```

---

## Task 7: dishi-hangman.html — Full Hangman Game

**Files:**
- Create: `dishi-games/games/dishi-hangman.html`

> **Word list note:** The list below contains sample words. Replace with real words about Dishi before launch (names of friends, places, his phrases).

- [ ] **Step 1: Create dishi-hangman.html**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>דיש תלוי 🔤</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #1a1a0e;
      color: #e8e0b0;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 16px;
      user-select: none;
    }
    h1 { color:#c8e060; font-size:1.4rem; margin-bottom:4px; }
    #score-area { color:#a0b060; font-size:0.9rem; margin-bottom:12px; }
    /* Dishi reveal image */
    #dishi-container {
      position: relative;
      width: 160px;
      height: 180px;
      margin-bottom: 12px;
    }
    #dishi-img {
      width: 160px;
      height: 180px;
      object-fit: cover;
      border-radius: 12px;
      border: 2px solid rgba(160,180,80,0.4);
    }
    #dishi-overlay {
      position: absolute;
      inset: 0;
      background: #1a1a0e;
      border-radius: 12px;
      transition: opacity 0.5s;
    }
    /* Lives as ❤️ */
    #lives { font-size:1.3rem; margin-bottom:10px; letter-spacing:2px; }
    /* Word blanks */
    #word-display {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 14px;
      min-height: 40px;
    }
    .letter-box {
      width: 28px;
      border-bottom: 3px solid #a0c040;
      text-align: center;
      font-size: 1.4rem;
      font-weight: bold;
      color: #e8e0b0;
      height: 36px;
      line-height: 36px;
    }
    /* Hint */
    #hint-text { color:#8a9a50; font-size:0.85rem; margin-bottom:12px; min-height:18px; }
    /* Keyboard */
    #keyboard {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 5px;
      max-width: 340px;
      margin-bottom: 14px;
    }
    .key-btn {
      background: rgba(70,90,30,0.6);
      border: 1.5px solid rgba(120,160,40,0.4);
      color: #d8e898;
      width: 34px;
      height: 34px;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .key-btn:hover:not(:disabled) { background: rgba(100,140,40,0.8); }
    .key-btn:disabled { opacity:0.25; cursor:default; }
    .key-btn.wrong { background: rgba(180,50,30,0.5); border-color: rgba(200,80,60,0.5); }
    /* Result overlay */
    #result {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      z-index: 10;
    }
    #result.show { display:flex; }
    #result-title { font-size:2.2rem; }
    #result-word { color:#c8e060; font-size:1.1rem; }
    #result-score { color:#a0b060; font-size:0.95rem; }
    .btn {
      background: rgba(80,120,30,0.7);
      color: #e8e0b0;
      border: 1.5px solid rgba(160,180,80,0.5);
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size:1rem;
      font-weight:bold;
    }
    .btn:hover { background: rgba(110,150,40,0.9); }
  </style>
</head>
<body>
<h1>🔤 דיש תלוי</h1>
<div id="score-area">ניקוד: <span id="scoreDisplay">0</span></div>

<div id="dishi-container">
  <img id="dishi-img" src="../assets/dishi.png" alt="דישי">
  <div id="dishi-overlay"></div>
</div>

<div id="lives">❤️❤️❤️❤️❤️❤️</div>
<div id="word-display"></div>
<div id="hint-text"></div>
<div id="keyboard"></div>

<div id="result">
  <div id="result-title"></div>
  <div id="result-word"></div>
  <div id="result-score"></div>
  <button class="btn" onclick="startNewRound()">משחק נוסף ▶</button>
</div>

<script type="module">
import { saveScore } from '../leaderboard.js';
import { auth } from '../firebase-config.js';

// ── Word list: replace with real Dishi words before launch ──
const WORDS = [
  { word: 'דישי',      hint: 'הגיבור שלנו' },
  { word: 'רספיה',     hint: 'המאכל האהוב' },
  { word: 'פלאפל',     hint: 'מאכל ישראלי קלאסי' },
  { word: 'ירושלים',   hint: 'עיר הבירה' },
  { word: 'חומוס',     hint: 'ממרח פופולרי' },
  { word: 'שוק',       hint: 'מקום קניות' },
  { word: 'גריל',      hint: 'אופן בישול' },
  { word: 'מנגל',      hint: 'מסורת ישראלית' },
  { word: 'שישליק',    hint: 'בשר על שיפוד' },
  { word: 'לחמנייה',   hint: 'מה שעוטף את הפלאפל' },
  { word: 'טחינה',     hint: 'רוטב מפולי שומשום' },
  { word: 'כבשים',     hint: 'חיות שמכאן מגיע הלשניצל' },
  { word: 'חברים',     hint: 'מה שיש לדישי הרבה' },
  { word: 'מוזיקה',    hint: 'דישי אוהב לשמוע' },
  { word: 'מסיבה',     hint: 'היום הזה בגלל מה' },
  { word: 'יומהולדת',  hint: 'אירוע מיוחד' },
];

const MAX_WRONG = 6;
const ALEPH_BET = 'אבגדהוזחטיכלמנסעפצקרשת';

let state = {
  word: '', hint: '', guessed: new Set(),
  wrongCount: 0, score: 0, roundScore: 0
};

function pickWord() {
  const item = WORDS[Math.floor(Math.random() * WORDS.length)];
  return item;
}

function startNewRound() {
  const { word, hint } = pickWord();
  state.guessed   = new Set();
  state.wrongCount = 0;
  state.roundScore = word.length * 10;
  Object.assign(state, { word, hint });
  document.getElementById('result').classList.remove('show');
  renderAll();
}

function renderAll() {
  renderWord();
  renderLives();
  renderKeyboard();
  renderOverlay();
  document.getElementById('hint-text').textContent = `רמז: ${state.hint}`;
  document.getElementById('scoreDisplay').textContent = state.score;
}

function renderWord() {
  const display = document.getElementById('word-display');
  display.innerHTML = state.word.split('').map(ch => {
    const revealed = state.guessed.has(ch) || ch === ' ';
    return `<div class="letter-box">${revealed ? ch : ''}</div>`;
  }).join('');
}

function renderLives() {
  const remaining = MAX_WRONG - state.wrongCount;
  document.getElementById('lives').textContent =
    '❤️'.repeat(remaining) + '🖤'.repeat(state.wrongCount);
}

function renderKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = ALEPH_BET.split('').map(ch => {
    const isGuessed = state.guessed.has(ch);
    const isWrong   = isGuessed && !state.word.includes(ch);
    return `<button
      class="key-btn${isWrong ? ' wrong' : ''}"
      ${isGuessed ? 'disabled' : ''}
      onclick="guess('${ch}')">${ch}</button>`;
  }).join('');
}

function renderOverlay() {
  const overlay = document.getElementById('dishi-overlay');
  // 0 wrong = fully hidden (0% opacity = fully visible? No: overlay covers dishi)
  // opacity 1 = dishi hidden, opacity 0 = dishi fully visible
  const opacity = 1 - (state.wrongCount / MAX_WRONG);
  overlay.style.opacity = opacity;
}

window.guess = (ch) => {
  if (state.guessed.has(ch)) return;
  state.guessed.add(ch);

  if (!state.word.includes(ch)) {
    state.wrongCount++;
    state.roundScore = Math.max(0, state.roundScore - 15);
  }

  const wordChars     = new Set(state.word.replace(/ /g, '').split(''));
  const allGuessed    = [...wordChars].every(c => state.guessed.has(c));
  const outOfLives    = state.wrongCount >= MAX_WRONG;

  if (allGuessed) {
    state.score += state.roundScore;
    showResult(true);
  } else if (outOfLives) {
    showResult(false);
  } else {
    renderAll();
  }
};

function showResult(won) {
  const res = document.getElementById('result');
  document.getElementById('result-title').textContent = won ? '🎉 כל הכבוד!' : '💔 אוי לא...';
  document.getElementById('result-word').textContent  = `המילה הייתה: ${state.word}`;
  document.getElementById('result-score').textContent = `ניקוד: ${state.score}`;
  res.classList.add('show');
  if (won) {
    saveScore('dishi-hangman', auth.currentUser, state.score);
  }
  renderAll();
}

window.startNewRound = startNewRound;

// Start
startNewRound();
</script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and test**

```bash
open "dishi-games/games/dishi-hangman.html"
```

Expected:
- Dishi image starts hidden behind overlay
- Clicking Hebrew letters works
- Wrong guess: heart turns black + overlay reveals more of Dishi
- Correct guess: letter appears in blank
- Win/lose result screen shows
- "משחק נוסף" starts new round

- [ ] **Step 3: Commit**

```bash
git add games/dishi-hangman.html
git commit -m "feat: add Hebrew hangman game (dishi-hangman)"
```

---

## Task 8: Scaffold Games — "Coming Soon" Pages

**Files:**
- Create: `dishi-games/games/raspia-king.html`
- Create: `dishi-games/games/fireman-dishi.html`

- [ ] **Step 1: Create raspia-king.html**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>מלך הרספיה 👑</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background:#1a1a0e; color:#e8e0b0;
      font-family:Arial,sans-serif;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      min-height:100vh; text-align:center; gap:16px;
    }
    img { width:140px; height:140px; object-fit:cover; border-radius:50%; border:3px solid #c8e060; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(200,224,96,0.4)} 50%{box-shadow:0 0 0 14px rgba(200,224,96,0)} }
    h1 { color:#c8e060; font-size:1.8rem; }
    p { color:#8a9a50; font-size:1rem; }
    .crown { font-size:3rem; }
  </style>
</head>
<body>
  <div class="crown">👑</div>
  <img src="../assets/dishi.png" alt="דישי">
  <h1>מלך הרספיה</h1>
  <p>המשחק בדרך...<br>דישי מתאמן על הרספיה שלו</p>
</body>
</html>
```

- [ ] **Step 2: Create fireman-dishi.html**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דישי הכבאי 🔥</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background:#1a1a0e; color:#e8e0b0;
      font-family:Arial,sans-serif;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      min-height:100vh; text-align:center; gap:16px;
    }
    img { width:140px; height:140px; object-fit:cover; border-radius:50%; border:3px solid #ff6030; animation: flicker 1.5s infinite alternate; }
    @keyframes flicker { 0%{box-shadow:0 0 8px rgba(255,96,48,0.6)} 100%{box-shadow:0 0 24px rgba(255,150,30,0.9)} }
    h1 { color:#ff8040; font-size:1.8rem; }
    p { color:#8a9a50; font-size:1rem; }
    .fire { font-size:3rem; }
  </style>
</head>
<body>
  <div class="fire">🔥</div>
  <img src="../assets/dishi.png" alt="דישי">
  <h1>דישי הכבאי</h1>
  <p>דישי מתלבש על הציוד...<br>בקרוב מכבים שריפות!</p>
</body>
</html>
```

- [ ] **Step 3: Verify scaffolds**

```bash
open "dishi-games/games/raspia-king.html"
open "dishi-games/games/fireman-dishi.html"
```

Expected: both show Dishi image with pulsing/glowing animation and Hebrew "coming soon" text.

- [ ] **Step 4: Commit**

```bash
git add games/raspia-king.html games/fireman-dishi.html
git commit -m "feat: add coming-soon scaffolds for raspia-king and fireman-dishi"
```

---

## Task 9: End-to-End Test (Local)

**No files to create** — manual verification flow.

- [ ] **Step 1: Confirm firebase-config.js has real keys**

Open `dishi-games/firebase-config.js`. Verify all values are replaced (no "YOUR_" strings):
```bash
grep "YOUR_" dishi-games/firebase-config.js
```
Expected output: nothing (empty = all replaced).

- [ ] **Step 2: Open lobby and test full flow**

```bash
open "dishi-games/index.html"
```

Run through:
1. Click "התחבר עם גוגל" → Google popup → signs in → name + photo appear in header ✓
2. Click "דישי המעופף" → game loads in iframe ✓
3. Play until game over → click "חזרה ללובי" ✓
4. Leaderboard shows your name + score ✓
5. Click "דיש תלוי" → hangman loads ✓
6. Play and win → leaderboard updates for hangman tab ✓
7. Two locked cards show "בקרוב" and are not clickable ✓

- [ ] **Step 3: Test signed-out flow**

1. Click "התנתק" → user signs out ✓
2. Play flying-dishi → game over → score should NOT appear in leaderboard ✓

---

## Task 10: WordPress/Elementor Integration

**No code files** — deployment + Elementor steps.

- [ ] **Step 1: Upload files to server**

Upload the entire `dishi-games/` folder to your WordPress server root (via FTP/SFTP or file manager):
```
/public_html/dishi-games/
```

- [ ] **Step 2: Add authorized domain to Firebase**

1. Firebase console → Authentication → Settings → Authorized domains
2. Add your domain: `yourdomain.co.il`

- [ ] **Step 3: Create Elementor page**

1. WordPress admin → Pages → Add New
2. Edit with Elementor
3. Add widget: "HTML" or "Code"
4. Paste:

```html
<iframe
  src="/dishi-games/index.html"
  style="width:100%; height:90vh; border:none; display:block;"
  allow="autoplay"
  title="עולם דישי">
</iframe>
```

5. Publish page.

- [ ] **Step 4: Final verification on live site**

Open the published page in browser:
- Lobby loads ✓
- Google login works ✓
- Games load ✓
- Leaderboard updates ✓

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: ready for WordPress deployment"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Firebase Auth (Google Sign-In) — Task 2-3
- ✅ Firestore leaderboard global top-10 — Task 4-5
- ✅ Lobby with 4 game cards — Task 5
- ✅ flying-dishi Firebase integration — Task 6
- ✅ dishi-hangman full game — Task 7
- ✅ raspia-king + fireman-dishi scaffolds — Task 8
- ✅ WordPress/Elementor iframe integration — Task 10
- ✅ Upsert (only save if new score > old) — Task 4 `saveScore()`
- ✅ Firestore security rules — Task 2 Step 4
- ✅ Signed-out users can play but score not saved — Task 4 `if (!user) return`

**Type consistency:**
- `saveScore(gameId, user, score)` — used consistently in Tasks 4, 6, 7
- `subscribeTopScores(gameId, callback)` — used consistently in Tasks 4, 5
- `auth.currentUser` — used in Tasks 6, 7 (from firebase-config.js export)
- `currentUser` from `initAuth` callback — used in Task 5 lobby
