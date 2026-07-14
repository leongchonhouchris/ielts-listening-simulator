// =============================================================
// DATABASE HELPERS — IELTS Listening Simulator
// All Firestore calls go through here.
// Collections used:
//   listening_tests   — test documents
//   results           — student submission results (shared with reading sim;
//                       distinguished by testType: "listening")
//   config            — admin password, class list (shared with reading sim)
// =============================================================

import {
  db, collection, doc,
  getDocs, getDoc, setDoc, deleteDoc, addDoc
} from "./firebase-config.js";

const TESTS_COL    = "listening_tests";
const RESULTS_COL  = "results";
const CONFIG_COL   = "config";
const CONFIG_DOC   = "settings";

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

export async function updateResult(id, data) {
  await setDoc(doc(db, RESULTS_COL, id), data, { merge: true });
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

