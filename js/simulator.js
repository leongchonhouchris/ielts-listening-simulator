// =============================================================
// IELTS LISTENING CBT SIMULATOR — Main Logic
// =============================================================

import { getTest, saveResult, getSession } from "./db.js";

// ── State ──────────────────────────────────────────────────────
let TEST              = null;
let currentSectionIdx = 0;
let answers           = {};        // { questionId: value }
let flagged           = new Set();
let timerSeconds      = 0;
let timerSecondsMax   = 0;
let timerInterval     = null;
let reviewOpen        = false;
let resultSaved       = false;
let transferActive    = false;
let transferSeconds   = 120;       // 2-minute transfer/checking phase
let transferInterval  = null;
let sessionPollInterval = null;    // teacher-mode polling

// ── DOM refs ───────────────────────────────────────────────────
const loading           = document.getElementById("loading");
const simTopbar         = document.getElementById("sim-topbar");
const audioBar          = document.getElementById("audio-bar");
const sectionNav        = document.getElementById("section-nav");
const simBody           = document.getElementById("sim-body");
const tbTitle           = document.getElementById("tb-test-title");
const timerDisplay      = document.getElementById("timer-display");
const audioIcon         = document.getElementById("audio-icon");
const audioStatusText   = document.getElementById("audio-status-text");
const audioModeBadge    = document.getElementById("audio-mode-badge");
const audioPlayer       = document.getElementById("audio-player");
const reviewPanel       = document.getElementById("review-panel");
const reviewContent     = document.getElementById("review-content");
const transferOverlay   = document.getElementById("transfer-overlay");
const transferCountdown = document.getElementById("transfer-countdown");
const submitModalOverlay = document.getElementById("submit-modal-overlay");
const submitModalBody    = document.getElementById("submit-modal-body");
const submitCancel       = document.getElementById("submit-cancel");
const submitConfirm      = document.getElementById("submit-confirm");
const btnReview          = document.getElementById("btn-review");
const btnSubmit          = document.getElementById("btn-submit");
const btnSubmitEarly     = document.getElementById("btn-submit-early");
const resultsWrapper     = document.getElementById("results-wrapper");

// ── Init ───────────────────────────────────────────────────────
async function init() {
  const testId = sessionStorage.getItem("activeTestId");
  if (!testId) { window.location.href = "index.html"; return; }

  try {
    TEST = await getTest(testId);
  } catch (err) {
    alert("Could not load test. Returning to test list.");
    window.location.href = "index.html";
    return;
  }

  timerSeconds    = (TEST.timeLimit || 30) * 60;
  timerSecondsMax = timerSeconds;
  tbTitle.textContent = TEST.title || "IELTS Listening";

  // Timer is hidden until the 2-min transfer phase begins
  timerDisplay.classList.add("hidden");

  buildSectionTabs();
  renderSection(0);
  buildReviewPanel();
  initAudio();

  simTopbar.classList.remove("hidden");
  audioBar.classList.remove("hidden");
  sectionNav.classList.remove("hidden");
  simBody.classList.remove("hidden");
  loading.classList.add("hidden");
}

// ── Timer ──────────────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 300) timerDisplay.classList.add("warn");  // last 5 min
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      // In teacher mode timer expiry = start transfer phase
      beginTransferPhase();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const t = Math.max(0, timerSeconds);
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = (t % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${m}:${s}`;
}

// ── Audio ──────────────────────────────────────────────────────
function initAudio() {
  const mode = TEST.audioMode || "teacher";
  audioModeBadge.textContent = mode === "browser" ? "In-browser audio" : "Teacher plays audio";

  if (mode === "browser") {
    if (!TEST.audioUrl) {
      audioStatusText.textContent = "No audio URL set. Use admin panel to add the audio URL.";
      audioIcon.textContent = "⚠";
      return;
    }
    audioPlayer.src = TEST.audioUrl;
    audioStatusText.textContent = "Audio loading…";
    audioIcon.textContent = "↺";

    audioPlayer.addEventListener("canplay", () => {
      audioStatusText.textContent = "Playing — do not pause or refresh the page.";
      audioIcon.textContent = "▶";
      audioPlayer.play().catch(() => {
        // Autoplay blocked — show a start button
        audioStatusText.textContent = "Click to start audio.";
        audioIcon.textContent = "▶";
        audioBar.style.cursor = "pointer";
        audioBar.addEventListener("click", () => {
          audioPlayer.play();
          audioStatusText.textContent = "Playing — do not pause or refresh the page.";
          audioBar.style.cursor = "default";
        }, { once: true });
      });
    });

    audioPlayer.addEventListener("ended", () => {
      audioStatusText.textContent = "Audio finished. You have 2 minutes to check your answers.";
      audioIcon.textContent = "✓";
      beginTransferPhase();
    });

    audioPlayer.addEventListener("error", () => {
      audioStatusText.textContent = "Could not load audio. Check the URL in the admin panel.";
      audioIcon.textContent = "⚠";
    });

  } else {
    // Teacher-play mode: poll Firestore for transfer start signal
    audioStatusText.textContent = "Your teacher will play the audio. Answer as you listen.";
    audioIcon.textContent = "🔊";
    startSessionPolling();
  }
}

// ── Teacher-mode session polling ────────────────────────────────
function startSessionPolling() {
  const testId = sessionStorage.getItem("activeTestId");
  if (!testId) return;

  sessionPollInterval = setInterval(async () => {
    try {
      const session = await getSession(testId);
      if (!session) return;

      if (session.forceSubmit) {
        clearInterval(sessionPollInterval);
        clearInterval(timerInterval);
        doSubmit();
        return;
      }

      if (session.transferStarted && !transferActive) {
        clearInterval(sessionPollInterval);
        beginTransferPhase();
      }
    } catch (e) {
      // Network error — silently retry next poll
    }
  }, 3000);
}

// ── Transfer / checking phase ──────────────────────────────────
function beginTransferPhase() {
  if (transferActive) return;
  transferActive = true;
  clearInterval(timerInterval);
  clearInterval(sessionPollInterval);

  timerDisplay.classList.remove("hidden");
  timerDisplay.classList.remove("warn");
  timerDisplay.classList.add("transfer");

  transferOverlay.classList.remove("hidden");
  // Push page content down so the banner doesn't overlap the topbar
  const bannerH = transferOverlay.getBoundingClientRect().height;
  document.body.style.paddingTop = bannerH + "px";
  updateTransferCountdown();

  transferInterval = setInterval(() => {
    transferSeconds--;
    updateTransferCountdown();
    if (transferSeconds <= 0) {
      clearInterval(transferInterval);
      transferOverlay.classList.add("hidden");
      document.body.style.paddingTop = "";
      doSubmit();
    }
  }, 1000);
}

function updateTransferCountdown() {
  const m = Math.floor(transferSeconds / 60).toString().padStart(2, "0");
  const s = (transferSeconds % 60).toString().padStart(2, "0");
  transferCountdown.textContent = `${m}:${s}`;
  timerDisplay.textContent = `${m}:${s}`;
}

btnSubmitEarly.addEventListener("click", () => {
  clearInterval(transferInterval);
  transferOverlay.classList.add("hidden");
  document.body.style.paddingTop = "";
  doSubmit();
});

// ── Section tabs ───────────────────────────────────────────────
function buildSectionTabs() {
  sectionNav.innerHTML = "";
  (TEST.sections || []).forEach((sec, i) => {
    const btn = document.createElement("button");
    btn.className = "section-tab" + (i === 0 ? " active" : "");
    btn.textContent = sec.title || `Section ${i + 1}`;
    btn.dataset.idx = i;
    btn.addEventListener("click", () => switchSection(i));
    sectionNav.appendChild(btn);
  });
}

function switchSection(idx) {
  currentSectionIdx = idx;
  document.querySelectorAll(".section-tab").forEach((t, i) => {
    t.classList.toggle("active", i === idx);
  });
  renderSection(idx);
  simBody.scrollTop = 0;
}

// ── Section rendering ──────────────────────────────────────────
function renderSection(idx) {
  const section = (TEST.sections || [])[idx];
  if (!section) { simBody.innerHTML = ""; return; }

  simBody.innerHTML = "";

  // Section header
  const hdr = document.createElement("div");
  hdr.className = "section-header";
  hdr.innerHTML = `
    <div class="section-label">${escHtml(section.label || section.title || "")}</div>
    <h2>${escHtml(section.title || `Section ${idx + 1}`)}</h2>
    ${section.topic ? `<div class="section-topic">${escHtml(section.topic)}</div>` : ""}
  `;
  simBody.appendChild(hdr);

  // Group questions by type for rendering
  // Build one "group" per consecutive run of the same question type
  const groups = [];
  let currentGroup = null;
  (section.questions || []).forEach(q => {
    if (!currentGroup || currentGroup.type !== q.type) {
      currentGroup = { type: q.type, questions: [] };
      groups.push(currentGroup);
    }
    currentGroup.questions.push(q);
  });

  groups.forEach(group => {
    const groupEl = buildQuestionGroup(group, section);
    if (groupEl) simBody.appendChild(groupEl);
  });
}

// ── Question group builders ────────────────────────────────────
function buildQuestionGroup(group, section) {
  const wrap = document.createElement("div");
  wrap.className = "q-group";

  const firstId = group.questions[0].id;
  const lastId  = group.questions[group.questions.length - 1].id;
  const qRange  = firstId === lastId ? `Question ${firstId}` : `Questions ${firstId}–${lastId}`;

  const typeLabels = {
    form_completion:   "Form Completion",
    note_completion:   "Note Completion",
    multiple_choice:   "Multiple Choice",
    map_labelling:     "Map / Plan Labelling",
    table_completion:  "Table Completion",
    matching:          "Matching",
    sentence_completion: "Sentence Completion",
    short_answer:      "Short Answer"
  };

  wrap.innerHTML = `
    <div class="q-group-title">${qRange}: ${typeLabels[group.type] || group.type}</div>
  `;

  // Instruction based on type
  const instructions = {
    form_completion:     "Complete the form. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    note_completion:     "Complete the notes. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    multiple_choice:     "Choose the correct letter, A, B, or C.",
    map_labelling:       "Choose the correct letter from the map for each location.",
    table_completion:    "Complete the table. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    matching:            "Match each item to the correct option.",
    sentence_completion: "Complete the sentences. Write NO MORE THAN ONE WORD for each answer.",
    short_answer:        "Answer the questions. Write NO MORE THAN TWO WORDS for each answer."
  };
  const instr = document.createElement("div");
  instr.className = "q-group-instruction";
  instr.textContent = instructions[group.type] || "";
  wrap.appendChild(instr);

  switch (group.type) {
    case "form_completion":
      wrap.appendChild(buildFormCompletion(group.questions));
      break;
    case "note_completion":
      wrap.appendChild(buildNoteCompletion(group.questions));
      break;
    case "multiple_choice":
      group.questions.forEach(q => wrap.appendChild(buildMCQ(q)));
      break;
    case "map_labelling":
      wrap.appendChild(buildMapLabelling(group.questions));
      break;
    case "table_completion":
      wrap.appendChild(buildTableCompletion(group.questions, section));
      break;
    case "matching":
      wrap.appendChild(buildMatching(group.questions));
      break;
    case "sentence_completion":
    case "short_answer":
      group.questions.forEach(q => wrap.appendChild(buildTextInput(q)));
      break;
    default:
      group.questions.forEach(q => wrap.appendChild(buildTextInput(q)));
  }

  return wrap;
}

// ── Form completion ────────────────────────────────────────────
function buildFormCompletion(questions) {
  const table = document.createElement("table");
  table.className = "form-completion-table";
  const tbody = document.createElement("tbody");

  questions.forEach(q => {
    const tr = document.createElement("tr");
    tr.dataset.qid = q.id;
    const val = escHtml(answers[q.id] || "");
    tr.innerHTML = `
      <td class="fc-label">
        <span class="fc-q-num">${q.id}.</span>
        ${escHtml(q.formLabel || q.stem || "")}
      </td>
      <td class="fc-input-cell">
        <input type="text" class="text-input" data-qid="${q.id}" value="${val}"
               placeholder="${escHtml(q.placeholder || "Your answer…")}" style="max-width:100%;" />
        <button class="flag-btn fc-flag${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag for review">⚑</button>
      </td>
    `;
    tr.querySelector("input").addEventListener("input", e => {
      answers[q.id] = e.target.value;
      updateReviewCell(q.id);
    });
    tr.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

// ── Note completion ────────────────────────────────────────────
function buildNoteCompletion(questions) {
  const block = document.createElement("div");
  block.className = "note-completion-block";

  questions.forEach(q => {
    const row = document.createElement("div");
    row.className = "nc-row";
    row.dataset.qid = q.id;
    const val = escHtml(answers[q.id] || "");
    row.innerHTML = `
      <span class="nc-label">
        <span class="q-num">${q.id}.</span> ${escHtml(q.noteLabel || q.stem || "")}
      </span>
      <input type="text" class="text-input" data-qid="${q.id}" value="${val}"
             placeholder="${escHtml(q.placeholder || "Your answer…")}" style="flex:1;" />
      <button class="flag-btn${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag">⚑</button>
    `;
    row.querySelector("input").addEventListener("input", e => {
      answers[q.id] = e.target.value;
      updateReviewCell(q.id);
    });
    row.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
    block.appendChild(row);
  });

  return block;
}

// ── Multiple choice ────────────────────────────────────────────
function buildMCQ(q) {
  const wrap = document.createElement("div");
  wrap.className = "q-item";
  wrap.dataset.qid = q.id;

  const optsHtml = (q.options || []).map(o => {
    const checked = answers[q.id] === o.letter ? "checked" : "";
    return `<label class="mcq-option">
      <input type="radio" name="mcq_${q.id}" value="${escHtml(o.letter)}" ${checked} />
      <label><strong>${escHtml(o.letter)}</strong>&nbsp; ${escHtml(o.text || "")}</label>
    </label>`;
  }).join("");

  wrap.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;flex-wrap:wrap;">
      <span class="q-num">${q.id}.</span>
      <button class="flag-btn${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag">⚑ Flag</button>
      ${flagged.has(q.id) ? '<span class="q-flagged-indicator">Flagged</span>' : ""}
    </div>
    <p style="font-size:0.92rem;margin-bottom:8px;padding-left:16px;">${escHtml(q.stem || "")}</p>
    <div class="mcq-options">${optsHtml}</div>
  `;

  wrap.querySelectorAll("input[type='radio']").forEach(inp => {
    inp.addEventListener("change", () => {
      answers[q.id] = inp.value;
      updateReviewCell(q.id);
    });
  });
  wrap.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
  return wrap;
}

// ── Map labelling ──────────────────────────────────────────────
function buildMapLabelling(questions) {
  const wrap = document.createElement("div");
  wrap.className = "map-block";

  // Use the first question's map data for the image/description
  const first = questions[0];

  let imgHtml = "";
  if (first.mapImage) {
    imgHtml = `<div class="map-image-area"><img src="${escHtml(first.mapImage)}" alt="Map" /></div>`;
  } else {
    imgHtml = `<div class="map-image-area">
      <div class="map-placeholder">Map image placeholder</div>
      ${first.mapDescription ? `<div class="map-description">${escHtml(first.mapDescription)}</div>` : ""}
    </div>`;
  }

  wrap.innerHTML = imgHtml;

  const qArea = document.createElement("div");
  qArea.className = "map-questions";

  questions.forEach(q => {
    const row = document.createElement("div");
    row.className = "map-q-row";
    row.dataset.qid = q.id;

    const optionsHtml = (q.options || []).map(o =>
      `<option value="${escHtml(o.letter)}" ${answers[q.id] === o.letter ? "selected" : ""}>${escHtml(o.text || o.letter)}</option>`
    ).join("");

    row.innerHTML = `
      <span class="q-num">${q.id}.</span>
      <span style="flex:1;">${escHtml(q.stem || "")}</span>
      <select class="match-select" data-qid="${q.id}" style="max-width:120px;">
        <option value="">—</option>
        ${optionsHtml}
      </select>
      <button class="flag-btn${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag">⚑</button>
    `;

    row.querySelector("select").addEventListener("change", e => {
      answers[q.id] = e.target.value;
      updateReviewCell(q.id);
    });
    row.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
    qArea.appendChild(row);
  });

  wrap.appendChild(qArea);
  return wrap;
}

// ── Table completion ───────────────────────────────────────────
function buildTableCompletion(questions, section) {
  const wrap = document.createElement("div");
  wrap.className = "table-completion-wrap";

  const table = document.createElement("table");
  table.className = "table-completion";

  // Header row
  const thead = document.createElement("thead");
  thead.innerHTML = `<tr>
    <th>Material</th>
    <th>Detail</th>
    <th>Answer</th>
    <th></th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  questions.forEach(q => {
    const tr = document.createElement("tr");
    tr.dataset.qid = q.id;
    const val = escHtml(answers[q.id] || "");

    // Parse stem: "Material studied — X: Y" → label / sublabel
    const parts = (q.stem || "").split(":");
    const labelPart = parts[0] || q.stem;
    const sublabel  = parts[1] ? parts[1].trim() : "";

    tr.innerHTML = `
      <td style="color:var(--text-muted);font-size:0.87rem;">${escHtml(labelPart)}</td>
      <td style="font-size:0.88rem;">${escHtml(sublabel)}</td>
      <td>
        <span class="tc-q-num">${q.id}.</span>
        <input type="text" class="text-input" data-qid="${q.id}" value="${val}"
               placeholder="${escHtml(q.placeholder || q.tableLabel || "Your answer…")}" style="max-width:200px;" />
      </td>
      <td><button class="flag-btn${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag">⚑</button></td>
    `;
    tr.querySelector("input").addEventListener("input", e => {
      answers[q.id] = e.target.value;
      updateReviewCell(q.id);
    });
    tr.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

// ── Matching (dropdown) ────────────────────────────────────────
function buildMatching(questions) {
  const wrap = document.createElement("div");

  // Show options list once (all questions share the same options list)
  if (questions[0]?.options?.length) {
    const optsList = document.createElement("div");
    optsList.className = "matching-options-list";
    optsList.innerHTML = questions[0].options.map(o =>
      `<div><strong>${escHtml(o.letter)}</strong> &nbsp;${escHtml(o.text || "")}</div>`
    ).join("");
    wrap.appendChild(optsList);
  }

  questions.forEach(q => {
    const row = document.createElement("div");
    row.className = "q-item";
    row.dataset.qid = q.id;

    const optsHtml = (q.options || []).map(o =>
      `<option value="${escHtml(o.letter)}" ${answers[q.id] === o.letter ? "selected" : ""}>${escHtml(o.letter)}</option>`
    ).join("");

    row.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
        <span class="q-num">${q.id}.</span>
        <span style="flex:1;font-size:0.92rem;">${escHtml(q.stem || "")}</span>
        <button class="flag-btn${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag">⚑</button>
      </div>
      <select class="match-select" data-qid="${q.id}">
        <option value="">— Select —</option>
        ${optsHtml}
      </select>
    `;
    row.querySelector("select").addEventListener("change", e => {
      answers[q.id] = e.target.value;
      updateReviewCell(q.id);
    });
    row.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
    wrap.appendChild(row);
  });

  return wrap;
}

// ── Text input (sentence completion / short answer) ────────────
function buildTextInput(q) {
  const wrap = document.createElement("div");
  wrap.className = "q-item";
  wrap.dataset.qid = q.id;
  const val = escHtml(answers[q.id] || "");

  wrap.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
      <span class="q-num">${q.id}.</span>
      <button class="flag-btn${flagged.has(q.id) ? " active" : ""}" data-qid="${q.id}" title="Flag">⚑ Flag</button>
      ${flagged.has(q.id) ? '<span class="q-flagged-indicator">Flagged</span>' : ""}
    </div>
    <p class="sentence-stem">${escHtml(q.stem || "")}</p>
    <input type="text" class="text-input" data-qid="${q.id}" value="${val}"
           placeholder="${escHtml(q.placeholder || "Your answer…")}" />
  `;

  wrap.querySelector("input").addEventListener("input", e => {
    answers[q.id] = e.target.value;
    updateReviewCell(q.id);
  });
  wrap.querySelector(".flag-btn").addEventListener("click", () => toggleFlag(q.id));
  return wrap;
}

// ── Flagging ───────────────────────────────────────────────────
function toggleFlag(qid) {
  if (flagged.has(qid)) flagged.delete(qid);
  else flagged.add(qid);

  document.querySelectorAll(`.flag-btn[data-qid="${qid}"]`).forEach(btn => {
    btn.classList.toggle("active", flagged.has(qid));
  });
  updateReviewCell(qid);
}

// ── Review panel ───────────────────────────────────────────────
function buildReviewPanel() {
  reviewContent.innerHTML = "";

  (TEST.sections || []).forEach((sec, sIdx) => {
    const label = document.createElement("div");
    label.className = "review-section-label";
    label.textContent = sec.title || `Section ${sIdx + 1}`;
    reviewContent.appendChild(label);

    const grid = document.createElement("div");
    grid.className = "review-grid";

    (sec.questions || []).forEach(q => {
      const cell = document.createElement("div");
      cell.className = "review-cell";
      cell.id = `rc-${q.id}`;
      cell.textContent = q.id;
      cell.title = `Question ${q.id}`;
      cell.addEventListener("click", () => jumpToQuestion(q.id, sIdx));
      grid.appendChild(cell);
    });

    reviewContent.appendChild(grid);
  });
}

function updateReviewCell(qid) {
  const cell = document.getElementById(`rc-${qid}`);
  if (!cell) return;
  const ans       = answers[qid];
  const isFlagged = flagged.has(qid);
  const isAnswered = ans !== undefined && ans !== "" && ans !== null;

  cell.className = "review-cell";
  if (isAnswered && isFlagged) cell.classList.add("ans-flagged");
  else if (isAnswered)          cell.classList.add("answered");
  else if (isFlagged)           cell.classList.add("flagged");
}

function jumpToQuestion(qid, sectionIdx) {
  if (sectionIdx !== currentSectionIdx) switchSection(sectionIdx);
  setTimeout(() => {
    const el = simBody.querySelector(`[data-qid="${qid}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
}

// ── Review panel toggle ────────────────────────────────────────
btnReview.addEventListener("click", () => {
  reviewOpen = !reviewOpen;
  reviewPanel.classList.toggle("hidden", !reviewOpen);
  btnReview.textContent = reviewOpen ? "Close Review" : "Review";
});

// ── Submit ─────────────────────────────────────────────────────
btnSubmit.addEventListener("click", () => {
  const total      = getAllQuestions().length;
  const answered   = Object.values(answers).filter(a => a !== "" && a !== null && a !== undefined).length;
  const unanswered = total - answered;

  submitModalBody.textContent = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Are you sure you want to submit?`
    : "Are you sure you want to submit? You cannot change your answers after submitting.";
  submitConfirm.textContent = "Submit Now";
  submitModalOverlay.classList.remove("hidden");
});

submitCancel.addEventListener("click",  () => submitModalOverlay.classList.add("hidden"));
submitConfirm.addEventListener("click", () => {
  submitModalOverlay.classList.add("hidden");
  clearInterval(timerInterval);
  clearInterval(transferInterval);
  clearInterval(sessionPollInterval);
  doSubmit();
});

// ── Results ────────────────────────────────────────────────────
function doSubmit() {
  if (resultSaved) return;   // guard against double submit
  resultSaved = true;

  // Hide simulator UI
  simTopbar.classList.add("hidden");
  audioBar.classList.add("hidden");
  sectionNav.classList.add("hidden");
  simBody.classList.add("hidden");
  reviewPanel.classList.add("hidden");
  transferOverlay.classList.add("hidden");

  resultsWrapper.classList.remove("hidden");
  showResults();
}

function showResults() {
  const allQs  = getAllQuestions();
  let correct  = 0;
  const questionResults = [];

  // Per-section result tables
  const sectionsDiv = document.getElementById("results-sections");
  sectionsDiv.innerHTML = "";

  (TEST.sections || []).forEach(sec => {
    const heading = document.createElement("div");
    heading.className = "results-section-heading";
    heading.textContent = sec.title || "Section";
    sectionsDiv.appendChild(heading);

    const table = document.createElement("table");
    table.className = "results-table";
    table.innerHTML = `<thead><tr>
      <th>#</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th>
    </tr></thead>`;
    const tbody = document.createElement("tbody");

    (sec.questions || []).forEach(q => {
      const userAns  = (answers[q.id] ?? "").toString().trim().toLowerCase();
      const accepted = [q.answer, ...(q.altAnswers || [])]
        .map(a => (a ?? "").toString().trim().toLowerCase())
        .filter(Boolean);
      const isCorrect = accepted.length > 0 && accepted.includes(userAns);
      if (isCorrect) correct++;

      const expectedDisplay = accepted.join(" / ");
      questionResults.push({ id: q.id, stem: q.stem || "", correct: isCorrect, given: answers[q.id] ?? "", expected: expectedDisplay });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${q.id}</td>
        <td style="max-width:280px;">${escHtml(q.stem || "")}</td>
        <td class="${isCorrect ? "your-answer-correct" : "your-answer-wrong"}">${escHtml(String(answers[q.id] ?? "—"))}</td>
        <td>${escHtml(expectedDisplay)}</td>
        <td>${isCorrect ? '<span class="correct-mark">✓ Correct</span>' : '<span class="incorrect-mark">✗ Incorrect</span>'}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    sectionsDiv.appendChild(table);
  });

  const total    = allQs.length;
  const band     = getBandScore(correct);
  const timeTaken = formatTimeTaken(timerSecondsMax - timerSeconds);

  document.getElementById("res-score").textContent = `${correct} / ${total} correct`;
  document.getElementById("res-band").textContent  = band;
  document.getElementById("res-time").textContent  = `Time taken: ${timeTaken}`;

  // Save to Firestore
  const studentName  = sessionStorage.getItem("studentName")  || "Unknown";
  const studentClass = sessionStorage.getItem("studentClass") || "Unknown";

  saveResult({
    studentName,
    studentClass,
    testId:         TEST.id,
    testTitle:      TEST.title || "Untitled Test",
    submittedAt:    new Date().toISOString(),
    timeTaken,
    score:          correct,
    totalQuestions: total,
    bandEstimate:   band,
    answers:        { ...answers },
    questionResults
  }).catch(err => console.error("Failed to save result:", err));
}

// ── Helpers ────────────────────────────────────────────────────
function getAllQuestions() {
  const result = [];
  (TEST.sections || []).forEach(sec => {
    (sec.questions || []).forEach(q => result.push(q));
  });
  return result;
}

function getBandScore(correct) {
  // IELTS Listening band score conversion (out of 40)
  if (correct >= 39) return 9.0;
  if (correct >= 37) return 8.5;
  if (correct >= 35) return 8.0;
  if (correct >= 32) return 7.5;
  if (correct >= 30) return 7.0;
  if (correct >= 26) return 6.5;
  if (correct >= 23) return 6.0;
  if (correct >= 18) return 5.5;
  if (correct >= 16) return 5.0;
  if (correct >= 13) return 4.5;
  if (correct >= 10) return 4.0;
  if (correct >= 8)  return 3.5;
  if (correct >= 6)  return 3.0;
  return 2.5;
}

function formatTimeTaken(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60).toString().padStart(2,"0")}:${(s % 60).toString().padStart(2,"0")}`;
}

function escHtml(str) {
  if (str === null || str === undefined) return "";
  return str.toString()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Keyboard shortcuts ─────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    submitModalOverlay.classList.add("hidden");
  }
});

// ── Boot ────────────────────────────────────────────────────────
init();
