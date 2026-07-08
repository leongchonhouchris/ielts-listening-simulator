# IELTS Listening Simulator — Setup Guide

This simulator shares the same Firebase project as the Reading simulator.
If you have the Reading simulator already running, Firebase setup is done — skip to Step 3.

---

## File Structure

```
IELTS listening simulator/
├── index.html           ← Student test selection page
├── test.html            ← Live test simulator
├── admin.html           ← Teacher admin panel
├── SETUP.md             ← This file
├── AUDIO-GUIDE.md       ← Full tapescript, answer key, and audio production instructions
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js   ← Firebase credentials (edit this)
│   ├── db.js                ← Firestore helpers
│   ├── simulator.js         ← Test simulator logic
│   ├── admin.js             ← Admin panel logic
│   └── sample-data.js       ← Sample test (auto-seeded on first load)
└── audio/                   ← (optional) local audio files
```

---

## Step 1: Firebase Setup

**If you already have the Reading simulator Firebase project:**
1. Open `js/firebase-config.js`
2. The credentials are already filled in with the reading simulator's project values.
3. No changes needed — both simulators share the same Firestore database.
   - Reading tests are stored in the `tests` collection.
   - Listening tests are stored in the `listening_tests` collection.
   - Results are stored in the `results` collection (distinguished by `testType: "listening"`).

**If you are setting up a new Firebase project:**
1. Go to https://console.firebase.google.com
2. Click "Add project" → name it (e.g. `ielts-simulator`)
3. Disable Google Analytics → Create project
4. Left sidebar → Build → Firestore Database → Create database → Start in **test mode** → pick a region → Enable
5. Left sidebar → Project Settings (gear icon) → Your Apps → Web (`</>`) → Register app → copy the `firebaseConfig` values
6. Open `js/firebase-config.js` and replace the placeholder values with yours

---

## Step 2: Firestore Security Rules (optional, recommended before sharing with students)

In Firebase Console → Firestore → Rules, replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Students can read tests and write results
    match /listening_tests/{testId} {
      allow read: true;
      allow write: false;
    }
    match /results/{resultId} {
      allow read: false;
      allow create: true;
    }
    match /config/{docId} {
      allow read: true;
      allow write: false;
    }
    match /listening_sessions/{sessionId} {
      allow read: true;
      allow write: false;
    }
  }
}
```

This prevents students from editing tests or reading other students' results, while still allowing result submission and session polling.

---

## Step 3: Deploy to Netlify (same site as reading simulator)

**Option A — Same site, subfolder:**

1. In Finder, your Netlify-connected folder should be something like `/Users/chrislch/Desktop/OpenCode Workspace/`.
2. The listening simulator is at `/IELTS listening simulator/` inside that folder.
3. Simply drag-and-drop the whole workspace folder to Netlify (or trigger a redeploy if using git).
4. Access the listening simulator at: `https://your-site.netlify.app/IELTS%20listening%20simulator/`

**Option B — Separate Netlify site:**

1. Go to https://app.netlify.com → Add new site → Deploy manually
2. Drag the entire `IELTS listening simulator/` folder onto the Netlify upload area
3. Your site URL will be something like `https://random-name.netlify.app`

**Important:** Netlify serves plain HTML/JS files — no server configuration needed. The simulator is fully client-side.

---

## Step 4: First Run

1. Open the deployed URL (or open `index.html` directly in your browser for local testing).
2. The first load will automatically seed the sample listening test (Practice Test 1) into Firestore.
3. You should see one test card on the index page.
4. Click "Admin" → log in with password `admin123` → change the password in Settings immediately.

---

## Step 5: Configure Audio

### Option A — Teacher plays audio (room speaker mode)

This is the default mode for the sample test. No audio URL is needed.

**How it works:**
- Students see a "Your teacher will play the audio" status bar.
- Students answer questions as they hear the audio from the room speakers.
- When the audio ends, go to the **Admin panel → Live Control tab**.
- Select the test → click **"Start 2-min Transfer Time"**.
- All connected students will immediately see a 2-minute countdown overlay.
- When the 2 minutes expire, all students' tests are auto-submitted.
- If needed, use **"Force Submit All"** to submit immediately without waiting.

### Option B — In-browser audio

1. Produce the audio file by following the instructions in `AUDIO-GUIDE.md`.
2. Upload the MP3 file to a public host:
   - **Google Drive:** Upload → right-click → Share → Anyone with link → copy link → change `open?id=XXXX` to `uc?export=download&id=XXXX`
   - **Dropbox:** Share link → change `?dl=0` to `?dl=1`
   - **GitHub:** Upload to a public repo → use the raw file URL
   - **Netlify:** Place the MP3 in the `audio/` folder and reference it as `/IELTS listening simulator/audio/test1.mp3`
3. In Admin panel → edit the test → set Audio Mode to **"In-browser audio"** → paste the URL → Save.
4. Students will hear the audio play automatically when they open the test.
   - Audio cannot be paused or rewound.
   - After audio ends, a 2-minute transfer countdown appears automatically.

---

## Step 6: Adding Your Own Tests

### Method A — JSON Import (recommended)

1. Use the `AUDIO-GUIDE.md` tapescript as a template for writing your own.
2. In Admin panel → Tests → click **"Download Template"** to get a blank JSON template.
3. Fill in your test data following the JSON structure.
4. Click **"Import JSON"** → paste or upload your file → Import & Save.

### Method B — In-app editor

1. Admin panel → Tests → **"+ New Test"**
2. Fill in test title, time limit, audio mode/URL
3. Click **"+ Add Section"** for each section (1–4)
4. Within each section, click **"+ Add Question"** and select the question type
5. Fill in the stem, answer, and any type-specific fields
6. Click **Save Test**

---

## Question Types Reference

| Type | Used in | Answer format |
|---|---|---|
| `form_completion` | Section 1, 2 | Exact word(s), lowercase |
| `note_completion` | Section 1, 2 | Exact word(s), lowercase |
| `multiple_choice` | All sections | Letter: `A`, `B`, or `C` |
| `map_labelling` | Section 2 | Letter of map location |
| `table_completion` | Section 3 | Exact word(s) or number |
| `matching` | Section 3 | Letter of matched option |
| `sentence_completion` | Section 4 | ONE WORD, lowercase |
| `short_answer` | Section 4 | Up to TWO WORDS, lowercase |

**Important:** All answers are compared **case-insensitively** after trimming whitespace. Store answers in lowercase in the JSON (e.g. `"answer": "rapid growth"`, not `"Rapid Growth"`).

---

## Admin Panel Quick Reference

| Tab | Function |
|---|---|
| Tests | Create, edit, clone, export, import, delete tests |
| Live Control | Start 2-min transfer phase / force-submit all (teacher-play mode) |
| Results | View, filter, expand, delete, and CSV-export student results |
| Settings | Edit class list and admin password |

Default admin password: `admin123` — **change this before sharing with students.**

---

## Troubleshooting

**"Firebase is not configured yet" banner appears**
→ Open `js/firebase-config.js` and paste your real Firebase project credentials.

**Sample test does not appear on the index page**
→ Check Firestore security rules — ensure `listening_tests` collection is readable.
→ Open browser developer console (F12) and check for errors.

**Audio does not play in browser mode**
→ Browser autoplay policies may block audio. Students see a "Click to start audio" message — they must click the audio bar once.
→ Ensure the audio URL is a direct MP3 link (not a Google Drive preview link).

**"Force Submit All" doesn't work**
→ Ensure students are on the same Firestore project (same `firebase-config.js`).
→ In teacher-play mode, students poll Firestore every 3 seconds — there may be up to a 3-second delay.

**Results appear in the Reading simulator's Results tab**
→ This is expected if you share the same Firebase project. Listening results have `testType: "listening"` in Firestore and only appear in the Listening admin panel.
