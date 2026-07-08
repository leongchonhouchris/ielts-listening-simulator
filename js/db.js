// =============================================================
// DATABASE HELPERS — IELTS Listening Simulator
// All Firestore calls go through here.
// Collections used:
//   listening_tests   — test documents
//   results           — student submission results (shared with reading sim;
//                       distinguished by testType: "listening")
//   config            — admin password, class list (shared with reading sim)
//   listening_sessions — live session state for teacher-play mode
// =============================================================

import {
  db, collection, doc,
  getDocs, getDoc, setDoc, deleteDoc, addDoc,
  serverTimestamp
} from "./firebase-config.js";

const TESTS_COL    = "listening_tests";
const RESULTS_COL  = "results";
const CONFIG_COL   = "config";
const CONFIG_DOC   = "settings";
const SESSIONS_COL = "listening_sessions";

// ── Tests ──────────────────────────────────────────────────────
export async function getAllTests() {
  const snap = await getDocs(collection(db, TESTS_COL));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTest(id) {
  const snap = await getDoc(doc(db, TESTS_COL, id));
  if (!snap.exists()) throw new Error("Test not found: " + id);
  return { id: snap.id, ...snap.data() };
}

export async function saveTest(testData) {
  if (testData.id) {
    const { id, ...data } = testData;
    await setDoc(doc(db, TESTS_COL, id), data);
    return id;
  } else {
    const ref = await addDoc(collection(db, TESTS_COL), testData);
    return ref.id;
  }
}

export async function deleteTest(id) {
  await deleteDoc(doc(db, TESTS_COL, id));
}

// ── Results ────────────────────────────────────────────────────
export async function saveResult(resultData) {
  const ref = await addDoc(collection(db, RESULTS_COL), {
    ...resultData,
    testType: "listening"
  });
  return ref.id;
}

export async function getAllResults() {
  const snap = await getDocs(collection(db, RESULTS_COL));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.testType === "listening");
}

export async function deleteResult(id) {
  await deleteDoc(doc(db, RESULTS_COL, id));
}

// ── Config ─────────────────────────────────────────────────────
export async function getConfig() {
  const snap = await getDoc(doc(db, CONFIG_COL, CONFIG_DOC));
  if (!snap.exists()) return { adminPassword: "admin123", classList: ["S3C", "S5B"] };
  const data = snap.data();
  if (!data.classList) data.classList = ["S3C", "S5B"];
  return data;
}

export async function saveConfig(configData) {
  const existing = await getConfig();
  await setDoc(doc(db, CONFIG_COL, CONFIG_DOC), { ...existing, ...configData });
}

// ── Seed helper ─────────────────────────────────────────────────
export async function seedIfEmpty(sampleTest) {
  const snap = await getDocs(collection(db, TESTS_COL));
  if (snap.empty) {
    await addDoc(collection(db, TESTS_COL), sampleTest);
    console.log("Seeded Firestore with sample listening test.");
  }
}

// ── Live sessions (teacher-play mode) ─────────────────────────
// A session document tracks whether the 2-min transfer phase has started.
// Students poll this every 3 seconds.
// Doc ID = testId (one active session per test at a time)

export async function getSession(testId) {
  const snap = await getDoc(doc(db, SESSIONS_COL, testId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function startTransferPhase(testId) {
  await setDoc(doc(db, SESSIONS_COL, testId), {
    testId,
    transferStarted: true,
    transferStartedAt: serverTimestamp(),
    forceSubmit: false
  });
}

export async function triggerForceSubmit(testId) {
  await setDoc(doc(db, SESSIONS_COL, testId), {
    testId,
    transferStarted: true,
    forceSubmit: true,
    forceSubmitAt: serverTimestamp()
  }, { merge: true });
}

export async function clearSession(testId) {
  await deleteDoc(doc(db, SESSIONS_COL, testId));
}
