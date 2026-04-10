# Olympidishi Session Persistence

**Date:** 2026-04-10
**Status:** Approved

## Problem

When the host refreshes the page or exits mid-tournament, all tournament state is lost. Players must restart from scratch.

## Solution

Persist tournament state to `localStorage` on every screen transition. On page load, check for a recent session and offer to resume.

## What Gets Saved

Single JSON object under `localStorage` key `olympidishi_session`:

```json
{
  "ts": 1712700000000,
  "gameIdx": 2,
  "playerIdx": 0,
  "phase": "briefing",
  "players": [
    { "name": "דישי", "rawScores": [45, 120, 0, 0], "scores": [1000, 650, 0, 0], "total": 1650 },
    { "name": "רוני", "rawScores": [30, 80, 0, 0], "scores": [650, 1000, 0, 0], "total": 1650 }
  ]
}
```

- `ts` — last-save timestamp for TTL check (1 hour max)
- `phase` — which screen was active: `"briefing"` | `"playing"` | `"score"` | `"round"`

## When to Save

In every `showScreen()` call — one line calling `saveSession()`. Covers all screen transitions (briefing, playing, score reveal, round leaderboard). No mid-game saving needed — if refreshed during a game, resume at the briefing for that player/game.

## When to Restore

On olympidishi.html load, before showing the registration screen:

1. Check for `olympidishi_session` in localStorage
2. If exists and `Date.now() - ts < 3_600_000` (under 1 hour) → show recovery screen
3. Otherwise → delete stale session, show normal registration

## Recovery Screen

New screen shown before registration:

> **🏅 יש טורניר פעיל!**
>
> X שחקנים · משחק Y מתוך 4
>
> `[המשך טורניר]`  `[התחל מחדש]`

- **Continue** → load state, jump to `showBriefing()` for current player/game
- **Start over** → `clearSession()`, show registration

## When to Clear

- End of tournament (`showFinal()`)
- `resetTournament()`
- User clicks "Start over" on recovery screen

## Scope

Only `olympidishi.html` changes:

- 3 new functions: `saveSession()`, `loadSession()`, `clearSession()`
- 1 new HTML screen (`screen-recover`)
- 1 line added to `showScreen()` to call `saveSession()`
- Boot logic: check for session before showing registration

## Edge Cases

- **Playing phase recovery:** If `phase === "playing"`, the game iframe was active. Can't resume mid-game — fall back to briefing for the same player/game.
- **Corrupt data:** If JSON parse fails, silently clear and start fresh.
- **Stale session (>1 hour):** Silently clear, show registration.
