// =============================================================
// ADMIN PANEL LOGIC — IELTS Listening Simulator
// =============================================================

import {
  getAllTests, getTest, saveTest, deleteTest,
  getConfig, saveConfig,
  getAllResults, deleteResult,
  startTransferPhase, triggerForceSubmit
} from "./db.js";

// ── State ──────────────────────────────────────────────────────
let currentTestData     = null;
let pendingDeleteId     = null;
let pendingDeleteResult = null;
let adminPassword       = "admin123";
let allResultsCache     = [];
let allTestsCache       = [];

// ── DOM refs ───────────────────────────────────────────────────
const loading       = document.getElementById("loading");
const passwordGate  = document.getElementById("password-gate");
const pwInput       = document.getElementById("pw-input");
const pwError       = document.getElementById("pw-error");
const pwSubmit      = document.getElementById("pw-submit");
const adminPage     = document.getElementById("admin-page");
const testList      = document.getElementById("test-list");
const adminEmpty    = document.getElementById("admin-empty");
const testEditor    = document.getElementById("test-editor");
const tabTests      = document.getElementById("tab-tests");
const tabLive       = document.getElementById("tab-live");
const tabResults    = document.getElementById("tab-results");
const tabSettings   = document.getElementById("tab-settings");

// ── Boot ────────────────────────────────────────────────────────
async function init() {
  try {
    const cfg = await getConfig();
    adminPassword = cfg.adminPassword || "admin123";
  } catch (e) { console.warn("Could not load config:", e); }
  loading.classList.add("hidden");
  passwordGate.classList.remove("hidden");
  pwInput.focus();
}

// ── Password ───────────────────────────────────────────────────
pwInput.addEventListener("keydown", e => { if (e.key === "Enter") pwSubmit.click(); });
pwSubmit.addEventListener("click", () => {
  if (pwInput.value === adminPassword) {
    pwError.classList.add("hidden");
    passwordGate.classList.add("hidden");
    adminPage.classList.remove("hidden");
    loadTestList();
    loadLiveTestSelect();
    loadSettingsPanel();
  } else {
    pwError.classList.remove("hidden");
    pwInput.value = "";
    pwInput.focus();
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  adminPage.classList.add("hidden");
  passwordGate.classList.remove("hidden");
  pwInput.value = "";
});

// ── Tab switching ──────────────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  tabTests.classList.toggle("hidden",    tab !== "tests");
  tabLive.classList.toggle("hidden",     tab !== "live");
  tabResults.classList.toggle("hidden",  tab !== "results");
  tabSettings.classList.toggle("hidden", tab !== "settings");
  testEditor.classList.add("hidden");
  if (tab === "results") loadResultsDashboard();
  if (tab === "live")    loadLiveTestSelect();
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});
document.getElementById("btn-settings").addEventListener("click", () => showTab("settings"));

// ── Settings ───────────────────────────────────────────────────
async function loadSettingsPanel() {
  try {
    const cfg = await getConfig();
    document.getElementById("class-list-input").value = (cfg.classList || []).join(", ");
  } catch (e) { /* ignore */ }
}

document.getElementById("btn-save-classes").addEventListener("click", async () => {
  const raw = document.getElementById("class-list-input").value;
  const classList = raw.split(",").map(s => s.trim()).filter(Boolean);
  const msg = document.getElementById("class-save-msg");
  await saveConfig({ classList });
  showMsg(msg, "Class list saved.");
});

document.getElementById("btn-save-password").addEventListener("click", async () => {
  const np  = document.getElementById("new-password").value;
  const cp  = document.getElementById("confirm-password").value;
  const msg = document.getElementById("pw-save-msg");
  if (!np) { showMsg(msg, "Please enter a new password.", true); return; }
  if (np !== cp) { showMsg(msg, "Passwords do not match.", true); return; }
  await saveConfig({ adminPassword: np });
  adminPassword = np;
  showMsg(msg, "Password updated successfully.");
  document.getElementById("new-password").value = "";
  document.getElementById("confirm-password").value = "";
});

// ── Test list ──────────────────────────────────────────────────
async function loadTestList() {
  testList.innerHTML = `<div style="padding:20px;text-align:center;"><div class="spinner" style="margin:auto;"></div></div>`;
  adminEmpty.classList.add("hidden");
  allTestsCache = await getAllTests();
  testList.innerHTML = "";
  if (!allTestsCache.length) { adminEmpty.classList.remove("hidden"); return; }

  allTestsCache.forEach(test => {
    const qCount = (test.sections || []).reduce((s, sec) => s + (sec.questions || []).length, 0);
    const modeLabel = (test.audioMode === "browser") ? "In-browser audio" : "Teacher plays audio";
    const isHidden = !!test.hidden;
    const item = document.createElement("div");
    item.className = "test-list-item" + (isHidden ? " test-list-item--hidden" : "");
    item.innerHTML = `
      <div>
        <div class="item-title">${escHtml(test.title || "Untitled")}${isHidden ? ' <span class="test-hidden-badge">Hidden</span>' : ""}</div>
        <div class="item-meta">${(test.sections||[]).length} sections &nbsp;·&nbsp; ${qCount} questions &nbsp;·&nbsp; ${test.timeLimit||30} min &nbsp;·&nbsp; ${escHtml(modeLabel)}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-ghost btn-sm" data-action="toggle-hidden" data-id="${test.id}">${isHidden ? "Show" : "Hide"}</button>
        <button class="btn btn-ghost btn-sm" data-action="clone"  data-id="${test.id}">Clone</button>
        <button class="btn btn-ghost btn-sm" data-action="export" data-id="${test.id}">Export</button>
        <button class="btn btn-ghost btn-sm" data-action="edit"   data-id="${test.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${test.id}">Delete</button>
      </div>`;
    item.querySelector("[data-action='edit']").addEventListener("click",          () => openEditor(test.id));
    item.querySelector("[data-action='delete']").addEventListener("click",        () => confirmDeleteTest(test.id));
    item.querySelector("[data-action='clone']").addEventListener("click",         () => cloneTest(test));
    item.querySelector("[data-action='export']").addEventListener("click",        () => exportTestAsJson(test));
    item.querySelector("[data-action='toggle-hidden']").addEventListener("click", () => toggleTestVisibility(test));
    testList.appendChild(item);
  });
}

document.getElementById("btn-new-test").addEventListener("click", () => openEditor(null));

async function cloneTest(test) {
  const { id, ...data } = test;
  try {
    await saveTest({ ...data, title: (data.title || "Untitled") + " (Copy)" });
    loadTestList();
  } catch (err) { alert("Clone failed: " + err.message); }
}

async function toggleTestVisibility(test) {
  try {
    await saveTest({ ...test, hidden: !test.hidden });
    loadTestList();
  } catch (err) { alert("Could not update visibility: " + err.message); }
}

function exportTestAsJson(test) {
  const { id, ...data } = test;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = (data.title || "test").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Audio mode toggle in editor ────────────────────────────────
document.getElementById("ed-audio-mode").addEventListener("change", e => {
  document.getElementById("audio-url-group").classList.toggle("hidden", e.target.value !== "browser");
});

// ── Import JSON ────────────────────────────────────────────────
const importModal    = document.getElementById("import-modal");
const importTextarea = document.getElementById("import-json-textarea");
const importError    = document.getElementById("import-error");
const importSuccess  = document.getElementById("import-success");

document.getElementById("btn-import-json").addEventListener("click", () => {
  importTextarea.value = "";
  importError.classList.add("hidden");
  importSuccess.classList.add("hidden");
  importModal.classList.remove("hidden");
});
document.getElementById("import-cancel").addEventListener("click", () => importModal.classList.add("hidden"));

document.getElementById("import-file-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    importTextarea.value = ev.target.result;
    importError.classList.add("hidden");
    importSuccess.classList.add("hidden");
  };
  reader.readAsText(file);
  e.target.value = "";
});

document.getElementById("btn-format-json").addEventListener("click", () => {
  try {
    importTextarea.value = JSON.stringify(JSON.parse(importTextarea.value), null, 2);
    importError.classList.add("hidden");
  } catch (err) {
    importError.textContent = "Invalid JSON: " + err.message;
    importError.classList.remove("hidden");
  }
});

document.getElementById("btn-download-template").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(JSON_TEMPLATE, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "ielts-listening-template.json"; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import-confirm").addEventListener("click", async () => {
  importError.classList.add("hidden");
  importSuccess.classList.add("hidden");
  let parsed;
  try { parsed = JSON.parse(importTextarea.value); }
  catch (err) { importError.textContent = "Invalid JSON:\n" + err.message; importError.classList.remove("hidden"); return; }

  const err = validateTestJson(parsed);
  if (err) { importError.textContent = "Validation error:\n" + err; importError.classList.remove("hidden"); return; }

  const { id: _id, ...cleanData } = parsed;
  try {
    const newId = await saveTest(cleanData);
    importSuccess.textContent = `Test "${escHtml(cleanData.title)}" imported (ID: ${newId}).`;
    importSuccess.classList.remove("hidden");
    importTextarea.value = "";
    loadTestList();
    setTimeout(() => importModal.classList.add("hidden"), 2000);
  } catch (e) {
    importError.textContent = "Save failed:\n" + e.message;
    importError.classList.remove("hidden");
  }
});

function validateTestJson(obj) {
  if (typeof obj !== "object" || !obj) return "Root must be a JSON object.";
  if (!obj.title)   return 'Missing required field: "title"';
  if (!Array.isArray(obj.sections) || !obj.sections.length) return '"sections" must be a non-empty array.';
  const validTypes = ["form_completion","note_completion","multiple_choice","map_labelling","table_completion","matching","sentence_completion","short_answer"];
  for (let i = 0; i < obj.sections.length; i++) {
    const s = obj.sections[i];
    if (!Array.isArray(s.questions)) return `sections[${i}].questions must be an array.`;
    for (let j = 0; j < s.questions.length; j++) {
      const q = s.questions[j];
      if (q.id === undefined || q.id === null) return `sections[${i}].questions[${j}] is missing "id".`;
      if (q.answer === undefined) return `sections[${i}].questions[${j}] (id:${q.id}) is missing "answer".`;
    }
  }
  return null;
}

// ── JSON template ──────────────────────────────────────────────
const JSON_TEMPLATE = {
  "title": "IELTS Academic Listening – Practice Test N",
  "timeLimit": 30,
  "audioMode": "teacher",
  "audioUrl": "",
  "sections": [
    {
      "id": "s1", "title": "Section 1", "label": "Questions 1–10",
      "topic": "Booking a sports facility",
      "questions": [
        { "id": 1, "type": "form_completion", "stem": "Name of facility:", "answer": "Riverside", "formLabel": "Sports Centre", "placeholder": "Write ONE WORD" },
        { "id": 7, "type": "multiple_choice", "stem": "What is the cost of renting equipment?",
          "options": [{"letter":"A","text":"£2.50"},{"letter":"B","text":"£3.00"},{"letter":"C","text":"£4.50"}], "answer": "C" }
      ]
    },
    {
      "id": "s2", "title": "Section 2", "label": "Questions 11–20",
      "topic": "Nature reserve audio guide",
      "questions": [
        { "id": 11, "type": "note_completion", "stem": "Year established:", "answer": "1987", "noteLabel": "Year established", "placeholder": "Write a NUMBER" },
        { "id": 17, "type": "map_labelling", "stem": "The bird hide",
          "options": [{"letter":"A","text":"A"},{"letter":"B","text":"B"},{"letter":"C","text":"C"}],
          "answer": "C", "mapDescription": "Map key: A=Entrance, B=Car park, C=Bird hide" }
      ]
    }
  ]
};

// ── Delete test ────────────────────────────────────────────────
const deleteModal = document.getElementById("delete-modal");

function confirmDeleteTest(id) {
  pendingDeleteId = id;
  deleteModal.classList.remove("hidden");
}

document.getElementById("del-cancel").addEventListener("click", () => { deleteModal.classList.add("hidden"); pendingDeleteId = null; });
document.getElementById("del-confirm").addEventListener("click", async () => {
  if (pendingDeleteId) { await deleteTest(pendingDeleteId); pendingDeleteId = null; deleteModal.classList.add("hidden"); loadTestList(); }
});

// ── Editor open ────────────────────────────────────────────────
async function openEditor(id) {
  tabTests.classList.add("hidden");
  testEditor.classList.remove("hidden");
  if (id) {
    document.getElementById("editor-heading").textContent = "Edit Test";
    currentTestData = await getTest(id);
  } else {
    document.getElementById("editor-heading").textContent = "New Test";
    currentTestData = { title: "", timeLimit: 30, audioMode: "teacher", audioUrl: "", sections: [] };
  }
  document.getElementById("ed-title").value      = currentTestData.title || "";
  document.getElementById("ed-timelimit").value  = currentTestData.timeLimit || 30;
  document.getElementById("ed-audio-mode").value = currentTestData.audioMode || "teacher";
  document.getElementById("ed-audio-url").value  = currentTestData.audioUrl || "";
  document.getElementById("audio-url-group").classList.toggle("hidden", (currentTestData.audioMode || "teacher") !== "browser");
  renderSectionsEditor();
  document.getElementById("btn-delete-test").classList.toggle("hidden", !id);
  document.getElementById("save-msg").classList.add("hidden");
}

document.getElementById("btn-back-to-list").addEventListener("click", backToList);
document.getElementById("btn-cancel-edit").addEventListener("click", backToList);

function backToList() {
  testEditor.classList.add("hidden");
  tabTests.classList.remove("hidden");
  showTab("tests");
  loadTestList();
}

document.getElementById("btn-delete-test").addEventListener("click", () => {
  if (currentTestData?.id) confirmDeleteTest(currentTestData.id);
});

document.getElementById("btn-save-test").addEventListener("click", saveCurrentTest);
document.getElementById("btn-save-test-bottom").addEventListener("click", saveCurrentTest);

async function saveCurrentTest() {
  collectFormData();
  const msg = document.getElementById("save-msg");
  if (!currentTestData.title.trim()) { showMsg(msg, "Please enter a test title.", true); return; }
  try {
    const savedId = await saveTest(currentTestData);
    currentTestData.id = savedId;
    showMsg(msg, "Test saved successfully.");
    document.getElementById("btn-delete-test").classList.remove("hidden");
    document.getElementById("editor-heading").textContent = "Edit Test";
  } catch (err) {
    showMsg(msg, "Error saving: " + err.message, true);
  }
}

// ── Sections editor ────────────────────────────────────────────
function renderSectionsEditor() {
  const container = document.getElementById("sections-editor");
  container.innerHTML = "";
  (currentTestData.sections || []).forEach((sec, i) => container.appendChild(buildSectionBlock(sec, i)));
}

document.getElementById("btn-add-section").addEventListener("click", () => {
  const count = document.querySelectorAll(".section-editor-block").length;
  const newSec = { id: "s" + (count + 1), title: "Section " + (count + 1), label: "", topic: "", questions: [] };
  document.getElementById("sections-editor").appendChild(buildSectionBlock(newSec, count));
});

function buildSectionBlock(sec, i) {
  const block = document.createElement("div");
  block.className = "section-editor-block";
  block.dataset.secId = sec.id || "s" + (i + 1);

  block.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;">Section ${i + 1}</h3>
      <button class="btn btn-danger btn-sm sec-remove">Remove Section</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;">
      <div class="form-group" style="margin:0;">
        <label>Section Title (e.g. "Section 1")</label>
        <input type="text" class="se-title" value="${escHtml(sec.title || "")}" placeholder="Section 1" />
      </div>
      <div class="form-group" style="margin:0;">
        <label>Questions Label (e.g. "Questions 1–10")</label>
        <input type="text" class="se-label" value="${escHtml(sec.label || "")}" placeholder="Questions 1–10" />
      </div>
      <div class="form-group" style="margin:0;">
        <label>Topic (shown to students)</label>
        <input type="text" class="se-topic" value="${escHtml(sec.topic || "")}" placeholder="e.g. Booking a sports facility" />
      </div>
    </div>
    <div class="q-editor-area"></div>
    <button class="btn btn-ghost btn-sm sec-add-q" style="margin-top:8px;">+ Add Question</button>
  `;

  const qArea = block.querySelector(".q-editor-area");
  (sec.questions || []).forEach(q => qArea.appendChild(buildQuestionBlock(q)));

  block.querySelector(".sec-remove").addEventListener("click", () => { block.remove(); renumberSectionBlocks(); });
  block.querySelector(".sec-add-q").addEventListener("click", () => {
    const nextId = getNextQId();
    qArea.appendChild(buildQuestionBlock({ id: nextId, type: "form_completion", stem: "", answer: "" }));
  });

  return block;
}

function renumberSectionBlocks() {
  document.querySelectorAll(".section-editor-block h3").forEach((h, i) => { h.textContent = `Section ${i + 1}`; });
}

function getNextQId() {
  let max = 0;
  document.querySelectorAll(".q-editor-block").forEach(b => { max = Math.max(max, parseInt(b.dataset.qid) || 0); });
  return max + 1;
}

function buildQuestionBlock(q) {
  const block = document.createElement("details");
  block.className = "q-editor-block";
  block.dataset.qid = q.id;

  const questionTypes = [
    ["form_completion",    "Form Completion"],
    ["note_completion",    "Note Completion"],
    ["multiple_choice",   "Multiple Choice"],
    ["map_labelling",     "Map / Plan Labelling"],
    ["table_completion",  "Table Completion"],
    ["matching",          "Matching"],
    ["sentence_completion","Sentence Completion"],
    ["short_answer",      "Short Answer"],
  ];
  const typeOptions = questionTypes.map(([v, l]) =>
    `<option value="${v}" ${q.type === v ? "selected" : ""}>${l}</option>`
  ).join("");

  block.innerHTML = `
    <summary>Q${q.id}: ${escHtml((q.stem || "").slice(0, 55))}${(q.stem||"").length > 55 ? "…" : ""}</summary>
    <div class="q-editor-inner">
      <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;">
        <div class="form-group" style="margin:0;">
          <label>Q ID</label>
          <input type="number" class="qe-id" value="${q.id}" style="width:70px;" />
        </div>
        <div class="form-group" style="margin:0;flex:1;">
          <label>Question Type</label>
          <select class="qe-type">${typeOptions}</select>
        </div>
        <button type="button" class="btn btn-danger btn-sm qe-remove" style="margin-top:22px;">Remove</button>
      </div>
      <div class="form-group">
        <label>Stem / Label / Prompt</label>
        <textarea class="qe-stem" style="min-height:52px;">${escHtml(q.stem || "")}</textarea>
      </div>
      <div class="form-group">
        <label>Correct Answer</label>
        <input type="text" class="qe-answer" value="${escHtml(q.answer || "")}" placeholder="Exact accepted answer (lowercase)" />
        <div class="form-hint">For MCQ/matching: the letter (A, B, C). For text inputs: the expected word(s) in lowercase.</div>
      </div>
      <div class="form-group">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <label style="margin:0;">Additional Accepted Answers</label>
          <button type="button" class="btn btn-ghost btn-sm qe-add-alt">+ Add alternative</button>
        </div>
        <div class="alt-answers-list qe-alt-list">
          ${(q.altAnswers || []).map(a => `
            <div class="alt-answer-row">
              <input type="text" class="qe-alt-answer" value="${escHtml(a)}" placeholder="Alternative accepted answer (lowercase)" />
              <button type="button" class="btn btn-ghost btn-sm alt-remove" title="Remove">✕</button>
            </div>`).join("")}
        </div>
        <div class="form-hint">Any of these will be accepted as correct. Leave blank rows will be ignored.</div>
      </div>
      <div class="qe-extra-fields"></div>
    </div>`;

  injectQTypeFields(block, q);

  block.querySelector(".qe-id").addEventListener("change", e => { block.dataset.qid = e.target.value; });
  block.querySelector(".qe-remove").addEventListener("click", () => block.remove());
  block.querySelector(".qe-type").addEventListener("change", () => injectQTypeFields(block, { ...q, type: block.querySelector(".qe-type").value }));
  block.querySelector(".qe-stem").addEventListener("input", e => {
    const text = e.target.value.slice(0, 55) + (e.target.value.length > 55 ? "…" : "");
    block.querySelector("summary").textContent = `Q${block.querySelector(".qe-id").value}: ${text}`;
  });

  block.querySelector(".qe-add-alt").addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "alt-answer-row";
    row.innerHTML = `<input type="text" class="qe-alt-answer" placeholder="Alternative accepted answer (lowercase)" />
                     <button type="button" class="btn btn-ghost btn-sm alt-remove" title="Remove">✕</button>`;
    row.querySelector(".alt-remove").addEventListener("click", () => row.remove());
    block.querySelector(".qe-alt-list").appendChild(row);
    row.querySelector("input").focus();
  });

  block.querySelectorAll(".alt-answer-row .alt-remove").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".alt-answer-row").remove());
  });

  return block;
}

function injectQTypeFields(block, q) {
  const extra = block.querySelector(".qe-extra-fields");
  extra.innerHTML = "";
  const type = q.type || block.querySelector(".qe-type").value;

  if (type === "form_completion" || type === "note_completion") {
    extra.innerHTML = `
      <div class="form-group">
        <label>Field Label (shown in the form/note)</label>
        <input type="text" class="qe-formlabel" value="${escHtml(q.formLabel || q.noteLabel || "")}" placeholder="e.g. Sports Centre Name" />
      </div>
      <div class="form-group">
        <label>Placeholder text</label>
        <input type="text" class="qe-placeholder" value="${escHtml(q.placeholder || "")}" placeholder="Write ONE WORD" />
      </div>`;
  }
  if (type === "multiple_choice" || type === "matching" || type === "map_labelling") {
    const opts = q.options || [{ letter:"A",text:"" },{ letter:"B",text:"" },{ letter:"C",text:"" }];
    extra.innerHTML = `
      <div class="form-group">
        <label>Options</label>
        <div class="qe-options-list">
          ${opts.map(o => `
            <div class="option-editor-row">
              <input type="text" class="qe-opt-letter" value="${escHtml(o.letter)}" style="max-width:50px;" placeholder="A" />
              <input type="text" class="qe-opt-text"   value="${escHtml(o.text || "")}" placeholder="Option text…" style="flex:1;" />
            </div>`).join("")}
        </div>
        <button type="button" class="btn btn-ghost btn-sm qe-add-option" style="margin-top:6px;">+ Add Option</button>
      </div>`;
    if (type === "map_labelling") {
      extra.innerHTML += `
        <div class="form-group">
          <label>Map Image URL (optional)</label>
          <input type="text" class="qe-mapimage" value="${escHtml(q.mapImage || "")}" placeholder="images/map1.png" />
        </div>
        <div class="form-group">
          <label>Map Description (shown as placeholder)</label>
          <input type="text" class="qe-mapdesc" value="${escHtml(q.mapDescription || "")}" placeholder="Map key: A=Entrance, B=…" />
        </div>`;
    }
    extra.querySelector(".qe-add-option")?.addEventListener("click", () => {
      const row = document.createElement("div");
      row.className = "option-editor-row";
      row.innerHTML = `<input type="text" class="qe-opt-letter" style="max-width:50px;" placeholder="D" />
                       <input type="text" class="qe-opt-text" placeholder="Option text…" style="flex:1;" />`;
      extra.querySelector(".qe-options-list").appendChild(row);
    });
  }
  if (type === "table_completion") {
    extra.innerHTML = `
      <div class="form-group">
        <label>Table Label / Column heading</label>
        <input type="text" class="qe-tablelabel" value="${escHtml(q.tableLabel || "")}" placeholder="e.g. Bamboo fibre – Advantage" />
      </div>`;
  }
}

// ── Collect form data ──────────────────────────────────────────
function collectFormData() {
  currentTestData.title     = document.getElementById("ed-title").value.trim();
  currentTestData.timeLimit = parseInt(document.getElementById("ed-timelimit").value) || 30;
  currentTestData.audioMode = document.getElementById("ed-audio-mode").value;
  currentTestData.audioUrl  = document.getElementById("ed-audio-url").value.trim();

  currentTestData.sections = [];
  document.querySelectorAll(".section-editor-block").forEach((block, i) => {
    const sec = {
      id:        block.dataset.secId || "s" + (i + 1),
      title:     block.querySelector(".se-title").value.trim(),
      label:     block.querySelector(".se-label").value.trim(),
      topic:     block.querySelector(".se-topic").value.trim(),
      questions: []
    };

    block.querySelectorAll(".q-editor-block").forEach(qblock => {
      const type = qblock.querySelector(".qe-type").value;
      const q = {
        id:     parseInt(qblock.querySelector(".qe-id").value) || 0,
        type,
        stem:   qblock.querySelector(".qe-stem").value.trim(),
        answer: qblock.querySelector(".qe-answer").value.trim()
      };

      const altAnswers = [];
      qblock.querySelectorAll(".qe-alt-answer").forEach(inp => {
        const v = inp.value.trim();
        if (v) altAnswers.push(v);
      });
      if (altAnswers.length) q.altAnswers = altAnswers;

      if (type === "form_completion" || type === "note_completion") {
        const label = qblock.querySelector(".qe-formlabel")?.value.trim() || "";
        if (type === "form_completion") q.formLabel = label;
        else q.noteLabel = label;
        q.placeholder = qblock.querySelector(".qe-placeholder")?.value.trim() || "";
      }
      if (type === "multiple_choice" || type === "matching" || type === "map_labelling") {
        q.options = [];
        qblock.querySelectorAll(".option-editor-row").forEach(row => {
          const letter = row.querySelector(".qe-opt-letter")?.value.trim();
          const text   = row.querySelector(".qe-opt-text")?.value.trim();
          if (letter) q.options.push({ letter, text: text || "" });
        });
        if (type === "map_labelling") {
          q.mapImage       = qblock.querySelector(".qe-mapimage")?.value.trim() || null;
          q.mapDescription = qblock.querySelector(".qe-mapdesc")?.value.trim() || "";
        }
      }
      if (type === "table_completion") {
        q.tableLabel = qblock.querySelector(".qe-tablelabel")?.value.trim() || "";
      }

      sec.questions.push(q);
    });

    currentTestData.sections.push(sec);
  });
}

// ── Live Control ───────────────────────────────────────────────
async function loadLiveTestSelect() {
  try {
    if (!allTestsCache.length) allTestsCache = await getAllTests();
    const sel = document.getElementById("live-test-select");
    sel.innerHTML = `<option value="">— Select a test —</option>`;
    allTestsCache.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.title || "Untitled";
      sel.appendChild(opt);
    });
  } catch (e) { console.warn("Could not load tests for live control:", e); }
}

document.getElementById("btn-start-transfer").addEventListener("click", async () => {
  const testId = document.getElementById("live-test-select").value;
  const msg    = document.getElementById("live-msg");
  if (!testId) { showMsg(msg, "Please select a test first.", true); return; }
  try {
    await startTransferPhase(testId);
    showMsg(msg, "Transfer phase started. Students will see the 2-minute countdown.");
  } catch (e) {
    showMsg(msg, "Error: " + e.message, true);
  }
});

document.getElementById("btn-force-submit").addEventListener("click", async () => {
  const testId = document.getElementById("live-test-select").value;
  const msg    = document.getElementById("live-msg");
  if (!testId) { showMsg(msg, "Please select a test first.", true); return; }
  if (!confirm("Force-submit all active sessions? This cannot be undone.")) return;
  try {
    await triggerForceSubmit(testId);
    showMsg(msg, "Force submit triggered. All students will be submitted immediately.");
  } catch (e) {
    showMsg(msg, "Error: " + e.message, true);
  }
});

// ── Results dashboard ──────────────────────────────────────────
async function loadResultsDashboard() {
  const tbody   = document.getElementById("results-tbody-admin");
  const summary = document.getElementById("results-summary");
  const empty   = document.getElementById("results-empty");
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;"><div class="spinner" style="margin:auto;"></div></td></tr>`;
  empty.classList.add("hidden");

  try {
    allResultsCache = await getAllResults();
    allResultsCache.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
    populateResultFilters();
    renderResultsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent);padding:16px;">Error loading results: ${escHtml(err.message)}</td></tr>`;
  }
}

function populateResultFilters() {
  const filterTest  = document.getElementById("filter-test");
  const filterClass = document.getElementById("filter-class");
  const testTitles  = [...new Set(allResultsCache.map(r => r.testTitle).filter(Boolean))];
  const classes     = [...new Set(allResultsCache.map(r => r.studentClass).filter(Boolean))].sort();
  filterTest.innerHTML  = `<option value="">All Tests</option>`;
  filterClass.innerHTML = `<option value="">All Classes</option>`;
  testTitles.forEach(t => { const o = document.createElement("option"); o.value = o.textContent = t; filterTest.appendChild(o); });
  classes.forEach(c    => { const o = document.createElement("option"); o.value = o.textContent = c; filterClass.appendChild(o); });
}

function getFilteredResults() {
  const ft = document.getElementById("filter-test").value;
  const fc = document.getElementById("filter-class").value;
  const fn = document.getElementById("filter-name").value.trim().toLowerCase();
  return allResultsCache.filter(r => {
    if (ft && r.testTitle    !== ft)                            return false;
    if (fc && r.studentClass !== fc)                            return false;
    if (fn && !(r.studentName||"").toLowerCase().includes(fn)) return false;
    return true;
  });
}

function renderResultsTable() {
  const tbody   = document.getElementById("results-tbody-admin");
  const summary = document.getElementById("results-summary");
  const empty   = document.getElementById("results-empty");
  const filtered = getFilteredResults();
  tbody.innerHTML = "";

  if (!filtered.length) { empty.classList.remove("hidden"); summary.innerHTML = ""; return; }
  empty.classList.add("hidden");

  const avgScore = (filtered.reduce((s, r) => s + (r.score || 0), 0) / filtered.length).toFixed(1);
  const avgBand  = (filtered.reduce((s, r) => s + parseFloat(r.bandEstimate || 0), 0) / filtered.length).toFixed(1);
  summary.innerHTML = `<span>Showing <strong>${filtered.length}</strong> result${filtered.length !== 1 ? "s" : ""}</span>
    <span>Avg. score: <strong>${avgScore}</strong></span>
    <span>Avg. band: <strong>${avgBand}</strong></span>`;

  filtered.forEach((r, idx) => {
    const date = r.submittedAt
      ? new Date(r.submittedAt).toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
      : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><button class="btn btn-ghost btn-sm result-expand-btn" data-idx="${idx}">▶</button></td>
      <td><strong>${escHtml(r.studentName || "Unknown")}</strong></td>
      <td>${escHtml(r.studentClass || "—")}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(r.testTitle||"")}">${escHtml(r.testTitle || "—")}</td>
      <td style="white-space:nowrap;">${date}</td>
      <td>${escHtml(r.timeTaken || "—")}</td>
      <td><span class="score-pill">${r.score??'?'}/${r.totalQuestions??40}</span></td>
      <td><span class="band-pill">${r.bandEstimate??'—'}</span></td>
      <td><button class="btn btn-danger btn-sm result-del-btn" data-id="${r.id}">Delete</button></td>
    `;

    tr.querySelector(".result-expand-btn").addEventListener("click", e => {
      const btn = e.currentTarget;
      const existing = tr.nextElementSibling;
      if (existing?.classList.contains("result-detail-row")) { existing.remove(); btn.textContent = "▶"; }
      else { btn.textContent = "▼"; tr.insertAdjacentElement("afterend", buildDetailRow(r)); }
    });
    tr.querySelector(".result-del-btn").addEventListener("click", () => confirmDeleteResult(r.id));
    tbody.appendChild(tr);
  });
}

function buildDetailRow(r) {
  const tr = document.createElement("tr");
  tr.className = "result-detail-row";
  const qs = r.questionResults || [];
  const tableHtml = qs.length
    ? `<table class="result-detail-table">
        <thead><tr><th>#</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th></tr></thead>
        <tbody>${qs.map(q => `<tr>
          <td>${q.id}</td>
          <td style="max-width:260px;">${escHtml(q.stem||"")}</td>
          <td class="${q.correct?"your-answer-correct":"your-answer-wrong"}">${escHtml(String(q.given??"—"))}</td>
          <td>${escHtml(String(q.expected??""))}</td>
          <td>${q.correct?'<span class="correct-mark">✓</span>':'<span class="incorrect-mark">✗</span>'}</td>
        </tr>`).join("")}</tbody>
      </table>`
    : "<p style='color:var(--text-muted);font-size:0.88rem;'>No per-question data.</p>";

  tr.innerHTML = `<td colspan="9">
    <div class="result-detail-panel">
      <div class="result-detail-header">
        <span><strong>${escHtml(r.studentName||"")}</strong> — ${escHtml(r.studentClass||"")} — ${escHtml(r.testTitle||"")}</span>
        <span>Score: <strong>${r.score}/${r.totalQuestions}</strong> &nbsp;|&nbsp; Band: <strong>${r.bandEstimate}</strong> &nbsp;|&nbsp; Time: <strong>${r.timeTaken||"—"}</strong></span>
      </div>
      ${tableHtml}
    </div>
  </td>`;
  return tr;
}

["filter-test","filter-class","filter-name"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderResultsTable);
});
document.getElementById("btn-clear-filters").addEventListener("click", () => {
  ["filter-test","filter-class","filter-name"].forEach(id => { document.getElementById(id).value = ""; });
  renderResultsTable();
});
document.getElementById("btn-refresh-results").addEventListener("click", loadResultsDashboard);

// ── Delete result ──────────────────────────────────────────────
const deleteResultModal = document.getElementById("delete-result-modal");

function confirmDeleteResult(id) { pendingDeleteResult = id; deleteResultModal.classList.remove("hidden"); }

document.getElementById("del-result-cancel").addEventListener("click", () => { deleteResultModal.classList.add("hidden"); pendingDeleteResult = null; });
document.getElementById("del-result-confirm").addEventListener("click", async () => {
  if (pendingDeleteResult) {
    await deleteResult(pendingDeleteResult);
    pendingDeleteResult = null;
    deleteResultModal.classList.add("hidden");
    loadResultsDashboard();
  }
});

// ── CSV Export ─────────────────────────────────────────────────
document.getElementById("btn-export-csv").addEventListener("click", () => {
  const filtered = getFilteredResults();
  if (!filtered.length) { alert("No results to export."); return; }
  const maxQs = Math.max(...filtered.map(r => (r.questionResults || []).length));
  const qHeaders = Array.from({ length: maxQs }, (_, i) => `Q${i + 1}`);
  const headers = ["Student Name","Class","Test","Date & Time","Time Taken","Score","Total Questions","Band Estimate",...qHeaders];
  const rows = filtered.map(r => {
    const date = r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
    const qAns = (r.questionResults || []).map(q => `${q.correct?"✓":"✗"} ${q.given??""}`);
    while (qAns.length < maxQs) qAns.push("");
    return [r.studentName||"",r.studentClass||"",r.testTitle||"",date,r.timeTaken||"",r.score??"",r.totalQuestions??"",r.bandEstimate??"",...qAns];
  });
  const csv = [headers,...rows].map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `ielts-listening-results-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
});

// ── Utility ────────────────────────────────────────────────────
function escHtml(str) {
  if (!str && str !== 0) return "";
  return str.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function showMsg(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? "var(--accent)" : "#218838";
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ── Boot ────────────────────────────────────────────────────────
init();
