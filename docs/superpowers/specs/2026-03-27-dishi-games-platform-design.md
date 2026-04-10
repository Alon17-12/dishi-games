# עולם דישי — פלטפורמת משחקים: מסמך עיצוב

**תאריך:** 2026-03-27
**מטרה:** אתר משחקים ליום ההולדת של דישי — הפתעה
**Stack:** HTML/JS + Firebase (Auth + Firestore) + WordPress/Elementor (iframe)

---

## 1. ארכיטקטורה כללית

```
WordPress/Elementor (הדומיין של המשתמש)
└── עמוד "עולם דישי" ← iframe אחד רחב
      └── lobby.html  ← לובי מרכזי

תיקיית הפרויקט (קבצים סטטיים):
├── lobby.html             ← לובי ראשי
├── firebase-config.js     ← הגדרות Firebase (לא ב-git)
├── auth.js                ← Google Sign-In + Firebase Auth
├── leaderboard.js         ← קריאה/כתיבה ל-Firestore
├── flying-dishi.html      ← קיים, עם שדרוג Firebase
├── dishi-hangman.html     ← MVP
├── raspia-king.html       ← scaffold ("בקרוב")
└── fireman-dishi.html     ← scaffold ("בקרוב")
```

**זרימת שחקן:**
1. נכנס לעמוד WordPress → רואה iframe עם הלובי
2. לובי מציג: תמונת דישי, 4 כרטיסיות משחקים, לידרבורד top-10, כפתור גוגל לוגין
3. לחיצה על משחק → המשחק נטען בתוך הלובי (div swap, ללא ניווט)
4. בסוף משחק → ניקוד נשמר ב-Firestore (אם מחובר)
5. לידרבורד מתעדכן בזמן אמת (Firestore onSnapshot)

---

## 2. Firebase

**שירותים בשימוש:** Authentication (Google provider) + Firestore
**תוכנית:** Spark (חינמי) — מספיק לפרויקט זה

### מבנה Firestore

```
leaderboard/
  {gameId}/          ← "flying-dishi" | "dishi-hangman" | ...
    scores/
      {userId}: {
        uid:       string,
        name:      string,     // מגוגל
        photoURL:  string,     // מגוגל
        score:     number,
        timestamp: Timestamp
      }
```

**כללים:**
- כל משתמש שומר רק את הניקוד הגבוה ביותר שלו (upsert — מחליף רק אם score חדש > ישן)
- לידרבורד מציג top-10 מסודר לפי score DESC
- משתמש לא-מחובר יכול לשחק אבל ניקוד לא נשמר

### Firestore Security Rules
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

---

## 3. המשחקים

### 3.1 דישי המעופף (קיים — שדרוג)
- **קוד קיים:** `flying-dishi.html` — Flappy Bird ב-Canvas HTML5
- **שדרוג נדרש:** בסוף משחק (game over) → קריאה ל-`leaderboard.js` לשמירת ניקוד
- **שינויים מינימליים** — לא נגע בלוגיקת המשחק

### 3.2 דיש תלוי — MVP
- **סגנון:** Hangman בעברית
- **תמונה:** תמונת דישי מוצגת במקום ה-"איש התלוי" הקלאסי (שלבי גילוי הדרגתיים)
- **מילים:** רשימה שיספק המשתמש — מילים מהעולם של דישי (שמות, ביטויים, מקומות)
- **UI:** RTL, עברית, כפתורי אותיות א-ת
- **ניקוד:** מספר ניחושים נכונים × קושי המילה

### 3.3 מלך הרספיה — Scaffold
- **מסך "בקרוב"** עם תמונת דישי ואנימציה קטנה
- **כרטיסייה נעולה** בלובי עם מונה ספירה לאחור (ניתן למלא תאריך)

### 3.4 דישי הכבאי — Scaffold
- **מסך "בקרוב"** עם תמונת דישי ואנימציה קטנה
- **כרטיסייה נעולה** בלובי

---

## 4. הלובי (lobby.html)

**קומפוננטים:**
- **Header:** לוגו "עולם דישי" + תמונת דישי + כפתור Google Sign-In
- **Grid משחקים:** 4 כרטיסיות — 2 פעילות, 2 נעולות עם "בקרוב"
- **לידרבורד:** tabs לבחירת משחק + top-10 עם תמונות פרופיל + שמות + ניקוד
- **Game Container:** div נסתר שמציג את המשחק הנבחר (iframe או div)

**עיצוב:** RTL עברית, סגנון דומה ל-flying-dishi (כהה, ירקרק, pixel-art vibes)

---

## 5. אינטגרציה עם WordPress/Elementor

- קבצי הפרויקט מועלים לתיקייה בשרת (לא דרך WP media)
- עמוד Elementor מכיל widget HTML עם: `<iframe src="/dishi-games/lobby.html" ...>`
- גובה iframe: 100vh או fixed height עם scroll פנימי
- אין צורך בפלאגין WP — Firebase מטפל בכל ה-backend

---

## 6. MVP לספרינט ראשון

**כלול:**
1. `lobby.html` — לובי מלא עם לוגין גוגל
2. `flying-dishi.html` — שדרוג שמירת ניקוד ל-Firebase
3. `dishi-hangman.html` — משחק מלא
4. Scaffold לשאר 2 המשחקים
5. `firebase-config.js` + `auth.js` + `leaderboard.js`

**לא כלול בספרינט זה:**
- מלך הרספיה — לוגיקת משחק מלאה
- דישי הכבאי — לוגיקת משחק מלאה
- ניהול admin לניקודים

---

## 7. מבנה תיקיות סופי

```
/dishi-games/
├── index.html (= lobby.html)
├── firebase-config.js
├── auth.js
├── leaderboard.js
├── games/
│   ├── flying-dishi.html
│   ├── dishi-hangman.html
│   ├── raspia-king.html
│   └── fireman-dishi.html
├── assets/
│   ├── dishi.png
│   └── dishi-combat.jpeg
└── docs/
    └── superpowers/specs/...
```
