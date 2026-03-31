# Candy Dishi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Candy Crush clone called "קאנדי דישי" with army-cleaning-themed tiles (soap, toilet paper, poop stick, mop, dirty dishes) as a single self-contained HTML file.

**Architecture:** Canvas-based rendering with a `requestAnimationFrame` game loop and an explicit state machine (`IDLE → SWAPPING → REMOVING → FALLING → CHECKING → GAMEOVER`). All animation state lives in the board array (per-tile `y` offset, `alpha`, `scale`). Firebase score saving is lazy-loaded only on game-over.

**Tech Stack:** Vanilla JS ES Module, HTML5 Canvas, Firebase 10.12.0 via CDN (lazy import), Fredoka One + Nunito (Google Fonts), served by existing `python3 -m http.server 8080`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `dishi-games/games/candy-dishi.html` | **Create** | Entire game — HTML shell, canvas, CSS, game logic |
| `dishi-games/index.html` | **Modify** (games grid) | Unlock candy-dishi card (replace a "coming soon" slot) |

---

### Task 1: HTML Shell + Canvas + Game Loop

**Files:**
- Create: `dishi-games/games/candy-dishi.html`

- [ ] **Step 1: Create the file with this exact content**

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>קאנדי דישי 🍬</title>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: linear-gradient(150deg, #0d0820 0%, #1a0d2e 45%, #2a1240 100%);
      color: #f0e0d0;
      font-family: 'Nunito', sans-serif;
      display: flex; flex-direction: column; align-items: center;
      min-height: 100vh;
      padding: 12px 8px 24px;
      user-select: none; overflow-x: hidden;
    }
    h1 {
      font-family: 'Fredoka One', cursive; font-size: 1.8rem;
      background: linear-gradient(135deg, #ff6b35, #ff9a5c, #ffd700);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; margin-bottom: 4px; text-align: center;
    }
    #hud {
      display: flex; gap: 24px; margin-bottom: 10px;
      font-family: 'Fredoka One', cursive;
    }
    .hud-box {
      text-align: center;
      background: rgba(255,255,255,0.07);
      border: 1.5px solid rgba(255,255,255,0.12);
      border-radius: 12px; padding: 6px 18px;
    }
    .hud-label { font-size: 0.65rem; color: rgba(240,224,208,0.55); text-transform: uppercase; letter-spacing: 1px; }
    .hud-val   { font-size: 1.6rem; color: #ffd700; line-height: 1.1; }
    #timer-val { color: #ff8c42; }
    #gameCanvas {
      display: block;
      border-radius: 16px;
      box-shadow: 0 0 40px rgba(192,132,252,0.25), 0 0 0 2px rgba(255,255,255,0.08);
      cursor: pointer;
      touch-action: none;
    }
    /* Overlay for game-over */
    #overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(5,2,18,0.93);
      flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; z-index: 100; padding: 32px 24px;
    }
    #overlay.show { display: flex; }
    #ov-title  { font-family:'Fredoka One',cursive; font-size:2.8rem; text-align:center; }
    #ov-score  { font-family:'Fredoka One',cursive; font-size:2rem; color:#ffd700; }
    .btn {
      background: linear-gradient(135deg, #ff6b35, #ff9a5c);
      color: white; border: none; padding: 13px 36px;
      border-radius: 50px; cursor: pointer;
      font-family: 'Fredoka One', cursive; font-size: 1.2rem;
      box-shadow: 0 4px 20px rgba(255,107,53,0.45);
      transition: transform 0.18s;
    }
    .btn:hover { transform: scale(1.06); }
  </style>
</head>
<body>
  <h1>🍬 קאנדי דישי</h1>
  <div id="hud">
    <div class="hud-box">
      <div class="hud-label">ניקוד</div>
      <div class="hud-val" id="score-val">0</div>
    </div>
    <div class="hud-box">
      <div class="hud-label">זמן</div>
      <div class="hud-val" id="timer-val">60</div>
    </div>
  </div>
  <canvas id="gameCanvas"></canvas>

  <div id="overlay">
    <div id="ov-title">⏰ נגמר הזמן!</div>
    <div id="ov-score"></div>
    <button class="btn" onclick="restartGame()">🔄 שחק שוב</button>
  </div>

  <script type="module">
  // ─── Constants ────────────────────────────────────────────────────────────
  const ROWS = 8, COLS = 8;
  const GAME_DURATION = 60; // seconds

  const TILES = [
    { emoji: '🧴', color: '#4ecdc455', label: 'סבון'          },
    { emoji: '🧻', color: '#f7dc6f55', label: 'נייר טואלט'    },
    { emoji: '💩', color: '#8b451355', label: 'קקי סטיק'      },
    { emoji: '🪣', color: '#85c1e955', label: 'מגב'           },
    { emoji: '🍽️', color: '#e8daef55', label: 'כלים מלוכלכים' },
  ];

  // ─── Canvas setup ─────────────────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  let TILE_SIZE, BOARD_PX;
  function resizeCanvas() {
    const maxW  = Math.min(window.innerWidth - 16, 400);
    TILE_SIZE   = Math.floor(maxW / COLS);
    BOARD_PX    = TILE_SIZE * COLS;
    canvas.width  = BOARD_PX;
    canvas.height = BOARD_PX;
  }
  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); });

  // ─── Game loop placeholder ─────────────────────────────────────────────────
  let lastTime = 0;
  function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = ts;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }
  function update(dt) { /* filled in later tasks */ }
  function render()   {
    ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);
    // placeholder grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }
  window.restartGame = () => {};
  requestAnimationFrame(gameLoop);
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify it loads**

Navigate to `http://localhost:8080/games/candy-dishi.html`.
Expected: dark purple page with "קאנדי דישי" title, HUD with score/timer, empty checkerboard canvas.

- [ ] **Step 3: Commit**

```bash
cd "/Users/alongabaymain/קלוד קוד/dishi-games"
git add games/candy-dishi.html
git commit -m "feat(candy): HTML shell + canvas + game loop skeleton"
```

---

### Task 2: Board Data + Tile Rendering

**Files:**
- Modify: `dishi-games/games/candy-dishi.html` — add board init + drawBoard

- [ ] **Step 1: Add board data structures + `initBoard()` after the `TILES` constant**

Insert this block right after `const TILES = [...]`:

```javascript
// ─── Board state ──────────────────────────────────────────────────────────
// board[r][c] = { type, y, alpha, scale, removing }
//   type:     0-4 index into TILES
//   y:        pixel offset from resting position (for fall animation)
//   alpha:    0-1 opacity (for removal flash)
//   scale:    0-1 size scale (for pop effect)
//   removing: true while flash animation plays
let board = [];

function mkTile(type) {
  return { type, y: 0, alpha: 1, scale: 1, removing: false };
}

function initBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let type;
      // Backtrack to avoid initial matches
      do {
        type = Math.floor(Math.random() * TILES.length);
      } while (
        (c >= 2 && board[r][c-1].type === type && board[r][c-2].type === type) ||
        (r >= 2 && board[r-1][c].type === type && board[r-2][c].type === type)
      );
      board[r][c] = mkTile(type);
    }
  }
}
```

- [ ] **Step 2: Replace the placeholder `render()` with a real `drawBoard()` + `drawTile()`**

Replace the existing `render()` function with:

```javascript
function drawTile(type, px, py, alpha, scale) {
  if (alpha <= 0 || scale <= 0) return;
  const s  = TILE_SIZE;
  const cx = px + s / 2;
  const cy = py + s / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // Background bubble
  ctx.beginPath();
  ctx.roundRect(-s/2 + 3, -s/2 + 3, s - 6, s - 6, 10);
  ctx.fillStyle = TILES[type].color;
  ctx.fill();
  // Emoji
  ctx.font      = `${Math.round(s * 0.52)}px serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(TILES[type].emoji, 0, 2);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);
  // Board background
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.roundRect(0, 0, BOARD_PX, BOARD_PX, 14);
  ctx.fill();
  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 1;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * TILE_SIZE, 0); ctx.lineTo(i * TILE_SIZE, BOARD_PX); ctx.stroke();
  }
  for (let i = 1; i < ROWS; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * TILE_SIZE); ctx.lineTo(BOARD_PX, i * TILE_SIZE); ctx.stroke();
  }
  // Tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = board[r][c];
      if (!t) continue;
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE + t.y;
      drawTile(t.type, px, py, t.alpha, t.scale);
    }
  }
}
```

- [ ] **Step 3: Call `initBoard()` before starting the game loop**

Replace:
```javascript
window.restartGame = () => {};
requestAnimationFrame(gameLoop);
```
With:
```javascript
window.restartGame = () => {};
initBoard();
requestAnimationFrame(gameLoop);
```

- [ ] **Step 4: Verify**

Reload `http://localhost:8080/games/candy-dishi.html`.
Expected: 8×8 grid of emoji tiles (🧴 🧻 💩 🪣 🍽️), no three-in-a-row.

- [ ] **Step 5: Commit**

```bash
git add games/candy-dishi.html
git commit -m "feat(candy): board init + emoji tile rendering"
```

---

### Task 3: Input Handling + Selection Highlight

**Files:**
- Modify: `dishi-games/games/candy-dishi.html`

- [ ] **Step 1: Add input state + selection highlight to game state block (after `let board = []`)**

```javascript
// ─── Input / selection ────────────────────────────────────────────────────
let selected = null;       // { r, c } or null
let gamePhase = 'IDLE';    // IDLE | SWAPPING | REMOVING | FALLING | GAMEOVER
```

- [ ] **Step 2: Add `drawSelection()` call inside `render()`, after the tile-drawing loop**

```javascript
  // Selection highlight
  if (selected && gamePhase === 'IDLE') {
    const { r, c } = selected;
    ctx.save();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.9 + 0.1 * Math.sin(Date.now() / 200); // pulse
    ctx.beginPath();
    ctx.roundRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4, 10);
    ctx.stroke();
    ctx.restore();
  }
```

- [ ] **Step 3: Add event listeners (mouse + touch) after `initBoard()`**

```javascript
function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return {
    r: Math.floor(y / TILE_SIZE),
    c: Math.floor(x / TILE_SIZE),
  };
}

function handleTap(e) {
  e.preventDefault();
  if (gamePhase !== 'IDLE') return;
  const { r, c } = getCellFromEvent(e);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

  if (!selected) {
    selected = { r, c };
    return;
  }
  const dr = Math.abs(r - selected.r);
  const dc = Math.abs(c - selected.c);
  if (dr + dc === 1) {
    // Adjacent — attempt swap (wired up in Task 4)
    attemptSwap(selected.r, selected.c, r, c);
    selected = null;
  } else {
    // Re-select
    selected = { r, c };
  }
}

canvas.addEventListener('click',      handleTap);
canvas.addEventListener('touchstart', handleTap, { passive: false });
```

- [ ] **Step 4: Stub `attemptSwap`** (before event listeners, after game state block)

```javascript
function attemptSwap(r1, c1, r2, c2) {
  // Implemented in Task 4
  console.log('swap', r1, c1, '→', r2, c2);
}
```

- [ ] **Step 5: Verify**

Reload. Click a tile — gold pulsing border appears. Click adjacent tile — console shows "swap r c → r c". Click non-adjacent — selection moves.

- [ ] **Step 6: Commit**

```bash
git add games/candy-dishi.html
git commit -m "feat(candy): tap selection + swap input handler"
```

---

### Task 4: Match Detection + Swap Logic

**Files:**
- Modify: `dishi-games/games/candy-dishi.html`

- [ ] **Step 1: Add `findMatches()` after the `attemptSwap` stub**

```javascript
// Returns Set of "r,c" strings for all tiles in matches of 3+
function findMatches() {
  const matched = new Set();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < COLS - 2) {
      const t = board[r][c].type;
      let end = c + 1;
      while (end < COLS && board[r][end].type === t) end++;
      if (end - c >= 3) {
        for (let i = c; i < end; i++) matched.add(`${r},${i}`);
      }
      c = end;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    let r = 0;
    while (r < ROWS - 2) {
      const t = board[r][c].type;
      let end = r + 1;
      while (end < ROWS && board[end][c].type === t) end++;
      if (end - r >= 3) {
        for (let i = r; i < end; i++) matched.add(`${i},${c}`);
      }
      r = end;
    }
  }
  return matched;
}
```

- [ ] **Step 2: Replace the `attemptSwap` stub with the real implementation**

```javascript
function swapCells(r1, c1, r2, c2) {
  const tmp    = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = tmp;
}

// Swap animation state
let swapAnim = null; // { r1,c1,r2,c2, progress } — progress 0→1

function attemptSwap(r1, c1, r2, c2) {
  // Try the swap
  swapCells(r1, c1, r2, c2);
  const matches = findMatches();
  if (matches.size === 0) {
    // Invalid swap — revert immediately
    swapCells(r1, c1, r2, c2);
    // Brief shake: temporarily shift selected tile
    return;
  }
  // Valid swap — play animation
  gamePhase = 'SWAPPING';
  swapAnim  = { r1, c1, r2, c2, progress: 0 };
  pendingMatches = matches;
}
```

- [ ] **Step 3: Add `pendingMatches` to game state block** (alongside `selected`)

```javascript
let pendingMatches = new Set();
let cascadeLevel   = 0;
```

- [ ] **Step 4: Update the `update(dt)` function to handle SWAPPING state**

Replace the empty `function update(dt) {}` with:

```javascript
const SWAP_DURATION    = 0.15; // seconds
const REMOVE_DURATION  = 0.25;
const FALL_SPEED       = 600;  // pixels/second

function update(dt) {
  if (gamePhase === 'SWAPPING') {
    swapAnim.progress += dt / SWAP_DURATION;
    if (swapAnim.progress >= 1) {
      swapAnim      = null;
      gamePhase     = 'REMOVING';
      cascadeLevel  = 0;
      startRemoving(pendingMatches);
    }
  }
  // Other phases filled in Tasks 5-7
}
```

- [ ] **Step 5: Update `render()` to draw swap animation**

Inside the tile-drawing loop, replace:
```javascript
      const px = c * TILE_SIZE;
      const py = r * TILE_SIZE + t.y;
      drawTile(t.type, px, py, t.alpha, t.scale);
```
With:
```javascript
      let px = c * TILE_SIZE;
      let py = r * TILE_SIZE + t.y;
      // Interpolate swapping tiles
      if (swapAnim) {
        const { r1,c1,r2,c2,progress } = swapAnim;
        const ease = progress < 0.5 ? 2*progress*progress : -1+(4-2*progress)*progress;
        if (r === r1 && c === c1) {
          px += (c2 - c1) * TILE_SIZE * ease;
          py += (r2 - r1) * TILE_SIZE * ease;
        } else if (r === r2 && c === c2) {
          px += (c1 - c2) * TILE_SIZE * ease;
          py += (r1 - r2) * TILE_SIZE * ease;
        }
      }
      drawTile(t.type, px, py, t.alpha, t.scale);
```

- [ ] **Step 6: Stub `startRemoving`** (temporary, replaced in Task 5)

```javascript
function startRemoving(matches) {
  // Mark tiles as removing
  matches.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    board[r][c].removing = true;
  });
  // Implemented further in Task 5
  console.log('removing', matches.size, 'tiles');
}
```

- [ ] **Step 7: Verify**

Click two adjacent identical tiles — they should slide toward each other (smooth 150ms animation). Non-matching swaps: tiles do not swap.

- [ ] **Step 8: Commit**

```bash
git add games/candy-dishi.html
git commit -m "feat(candy): match detection + animated swap"
```

---

### Task 5: Match Removal + Score

**Files:**
- Modify: `dishi-games/games/candy-dishi.html`

- [ ] **Step 1: Add score state** (alongside `cascadeLevel`)

```javascript
let score       = 0;
let scorePopups = []; // { x, y, text, alpha, vy } — floating +N labels
```

- [ ] **Step 2: Replace the `startRemoving` stub with the full implementation**

```javascript
let removeTimer = 0;

function startRemoving(matches) {
  removeTimer = REMOVE_DURATION;
  // Mark + flash
  matches.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    board[r][c].removing = true;
  });
  // Score: base 30 per tile, ×1.5 per cascade level
  const pts = Math.round(matches.size * 30 * Math.pow(1.5, cascadeLevel));
  score += pts;
  document.getElementById('score-val').textContent = score;
  // Score popup at center of matched tiles
  let sumR = 0, sumC = 0;
  matches.forEach(key => { const [r,c] = key.split(',').map(Number); sumR+=r; sumC+=c; });
  const avgR = sumR / matches.size, avgC = sumC / matches.size;
  scorePopups.push({
    x: (avgC + 0.5) * TILE_SIZE,
    y: (avgR + 0.5) * TILE_SIZE,
    text: `+${pts}`,
    alpha: 1,
    vy: -80,
  });
}
```

- [ ] **Step 3: Handle REMOVING phase in `update(dt)`** (add inside the SWAPPING if-block chain)

```javascript
  else if (gamePhase === 'REMOVING') {
    removeTimer -= dt;
    // Animate flash (tiles blink alpha)
    const flashAlpha = 0.3 + 0.7 * Math.abs(Math.sin(removeTimer * 30));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]?.removing) board[r][c].alpha = flashAlpha;
      }
    }
    // Animate score popups
    scorePopups.forEach(p => { p.y += p.vy * dt; p.alpha -= dt * 2; });
    scorePopups = scorePopups.filter(p => p.alpha > 0);

    if (removeTimer <= 0) {
      // Remove tiles
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c]?.removing) board[r][c] = null;
        }
      }
      startFalling();
    }
  }
```

- [ ] **Step 4: Add score popup rendering inside `render()`, after tile loop**

```javascript
  // Score popups
  scorePopups.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.font        = 'bold 20px Fredoka One, cursive';
    ctx.fillStyle   = '#ffd700';
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur  = 4;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });
```

- [ ] **Step 5: Stub `startFalling`**

```javascript
function startFalling() {
  gamePhase = 'FALLING';
  // Implemented in Task 6
  console.log('falling...');
  // Temporary: go back to IDLE
  gamePhase = 'IDLE';
}
```

- [ ] **Step 6: Verify**

Match 3 tiles — they flash for 250ms, disappear, score increases, golden "+N" floats up.

- [ ] **Step 7: Commit**

```bash
git add games/candy-dishi.html
git commit -m "feat(candy): match removal flash + score popups"
```

---

### Task 6: Gravity + New Tile Spawn + Cascade

**Files:**
- Modify: `dishi-games/games/candy-dishi.html`

- [ ] **Step 1: Replace the `startFalling` stub with the full gravity implementation**

```javascript
function startFalling() {
  gamePhase = 'FALLING';

  // Column by column: shift non-null tiles to bottom, fill top with new tiles
  for (let c = 0; c < COLS; c++) {
    // Collect existing tiles bottom-up
    const existing = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== null) existing.push(board[r][c]);
    }
    // How many new tiles needed
    const need = ROWS - existing.length;
    // Fill column bottom-up: existing first, then new tiles above
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = ROWS - 1 - r;      // 0 = bottom
      if (idx < existing.length) {
        const tile = existing[idx];
        const oldRow = /* find old row */ (() => {
          for (let rr = 0; rr < ROWS; rr++) {
            if (board[rr][c] === tile) return rr;
          }
          return r;
        })();
        const dropPx = (r - oldRow) * TILE_SIZE;
        tile.y = -dropPx; // start above destination, will animate toward 0
        board[r][c] = tile;
      } else {
        // New tile spawning from above the board
        const newTile = mkTile(Math.floor(Math.random() * TILES.length));
        const spawnRow = -(idx - existing.length + 1);
        newTile.y = spawnRow * TILE_SIZE; // starts above canvas
        board[r][c] = newTile;
      }
    }
  }
}
```

- [ ] **Step 2: Handle FALLING phase in `update(dt)`**

Add after the REMOVING block:

```javascript
  else if (gamePhase === 'FALLING') {
    let stillFalling = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = board[r][c];
        if (!t || t.y === 0) continue;
        stillFalling = true;
        if (t.y < 0) {
          t.y = Math.min(0, t.y + FALL_SPEED * dt);
        } else {
          // Should not happen — clamp
          t.y = 0;
        }
      }
    }
    if (!stillFalling) {
      checkCascade();
    }
  }
```

- [ ] **Step 3: Add `checkCascade()`**

```javascript
function checkCascade() {
  const matches = findMatches();
  if (matches.size > 0) {
    cascadeLevel++;
    pendingMatches = matches;
    gamePhase = 'REMOVING';
    startRemoving(matches);
  } else {
    cascadeLevel = 0;
    gamePhase    = 'IDLE';
  }
}
```

- [ ] **Step 4: Verify**

Match 3 tiles — tiles above fall down (smooth animation), new tiles spawn from top. Chain reactions increase the score multiplier.

- [ ] **Step 5: Commit**

```bash
git add games/candy-dishi.html
git commit -m "feat(candy): gravity + new tile spawn + cascade chain"
```

---

### Task 7: Timer + Game Over

**Files:**
- Modify: `dishi-games/games/candy-dishi.html`

- [ ] **Step 1: Add timer state** (alongside `score`)

```javascript
let timeLeft = GAME_DURATION;
```

- [ ] **Step 2: Add timer logic in `update(dt)`** (at the very top of `update`, before phase checks)

```javascript
  if (gamePhase !== 'GAMEOVER') {
    timeLeft -= dt;
    const display = Math.max(0, Math.ceil(timeLeft));
    document.getElementById('timer-val').textContent = display;
    if (timeLeft <= 0 && gamePhase === 'IDLE') {
      triggerGameOver();
    }
  }
```

- [ ] **Step 3: Add `triggerGameOver()` and `restartGame()` implementation**

Replace the stub `window.restartGame = () => {};` with:

```javascript
async function triggerGameOver() {
  gamePhase = 'GAMEOVER';
  document.getElementById('ov-score').textContent  = `ניקוד: ${score}`;
  document.getElementById('overlay').classList.add('show');
  // Save to Firebase (lazy)
  try {
    const [{ saveScore }, { auth }] = await Promise.all([
      import('../leaderboard.js'),
      import('../firebase-config.js'),
    ]);
    await saveScore('candy-dishi', auth.currentUser, score);
  } catch (e) {
    console.warn('Score not saved:', e);
  }
}

window.restartGame = () => {
  document.getElementById('overlay').classList.remove('show');
  score     = 0;
  timeLeft  = GAME_DURATION;
  cascadeLevel = 0;
  scorePopups  = [];
  swapAnim     = null;
  selected     = null;
  document.getElementById('score-val').textContent = '0';
  initBoard();
  gamePhase = 'IDLE';
};
```

- [ ] **Step 4: Add timer color warning** (inside the timer display update)

```javascript
    document.getElementById('timer-val').style.color = display <= 10 ? '#ff4444' : '#ff8c42';
```

- [ ] **Step 5: Verify**

Wait 60 seconds — game over overlay appears with final score. Click "שחק שוב" — board resets, timer resets.

- [ ] **Step 6: Commit**

```bash
git add games/candy-dishi.html
git commit -m "feat(candy): 60s timer + game over + restart"
```

---

### Task 8: Add to Lobby + Polish

**Files:**
- Modify: `dishi-games/index.html` — unlock candy-dishi game card
- Modify: `dishi-games/games/candy-dishi.html` — selection shake, tile scale-pop

- [ ] **Step 1: In `dishi-games/index.html`, replace the "מלך הרספיה" coming-soon card**

Find:
```html
      <div class="game-card locked">
        <span class="coming-tag">בקרוב</span>
        <span class="card-icon">👑</span>
        <div class="card-name">מלך הרספיה</div>
        <div class="card-sub">בקרוב...</div>
      </div>
```
Replace with:
```html
      <div class="game-card card-candy" onclick="openGame('candy-dishi','קאנדי דישי')">
        <span class="card-icon">🍬</span>
        <div class="card-name">קאנדי דישי</div>
        <div class="card-sub">Match 3 הכי מלוכלך</div>
      </div>
```

- [ ] **Step 2: Add card-candy glow style in `index.html` CSS** (alongside `.card-hangman`)

```css
    .card-candy   { --card-glow: 0 0 20px rgba(255,107,157,0.2); }
```

- [ ] **Step 3: Add leaderboard tab for candy-dishi in `index.html`**

Find the `.lb-tabs` div. Add a third tab:
```html
      <button class="lb-tab" onclick="switchLbTab('candy-dishi',this)">🍬 קאנדי דישי</button>
```

- [ ] **Step 4: Add invalid-swap shake in `candy-dishi.html`**

In `attemptSwap`, replace the `// Brief shake` comment with:
```javascript
    // Flash selected tile briefly
    if (board[r1][c1]) {
      const t = board[r1][c1];
      const origAlpha = t.alpha;
      t.alpha = 0.3;
      setTimeout(() => { if (board[r1] && board[r1][c1]) board[r1][c1].alpha = origAlpha; }, 200);
    }
```

- [ ] **Step 5: Add tile pop-in on spawn in `initBoard()`**

After the `board[r][c] = mkTile(type)` line, add:
```javascript
      board[r][c].scale = 0;
      const tile = board[r][c];
      const delay = (r * COLS + c) * 20;
      setTimeout(() => {
        let t2 = 0;
        const anim = () => {
          t2 += 16;
          const p = Math.min(1, t2 / 300);
          const ease = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2,3)/2;
          tile.scale = ease;
          if (p < 1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
      }, delay);
```

- [ ] **Step 6: Verify the full flow**

1. Go to `http://localhost:8080` → games tab → see 🍬 קאנדי דישי card (not locked)
2. Click it → game opens in overlay
3. Play: match tiles, cascades work, score increases
4. After 60s → game over screen with score
5. Leaderboard tab → 🍬 קאנדי דישי tab shows (empty until signed in and scored)

- [ ] **Step 7: Commit**

```bash
git add games/candy-dishi.html index.html
git commit -m "feat(candy): add to lobby + leaderboard tab + polish"
```

---

## Self-Review

**Spec coverage:**
- ✅ 8×8 Match-3 grid
- ✅ 5 tile types: 🧴 סבון, 🧻 נייר טואלט, 💩 קקי סטיק, 🪣 מגב, 🍽️ כלים מלוכלכים
- ✅ Tap-to-select + adjacent tap-to-swap
- ✅ Match 3+ horizontal and vertical
- ✅ Tile removal animation (flash)
- ✅ Gravity + new tile spawn
- ✅ Cascade chain reactions with score multiplier
- ✅ 60-second timer
- ✅ Game over screen + restart
- ✅ Firebase leaderboard integration (lazy-loaded)
- ✅ Added to lobby (index.html card + leaderboard tab)
- ✅ Sunset theme (dark purple, orange/gold accents, Fredoka font)

**No placeholders:** All code blocks are complete and executable.

**Type consistency:** `mkTile()` used in Task 2 and Task 6 ✅. `findMatches()` returns `Set<"r,c">` used consistently ✅. `gamePhase` string literals match across all tasks ✅.
