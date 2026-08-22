// =====================================================================
// Civil Engineering Quiz Hub — multi-app version.
// Categories are grouped into "apps" (e.g. Technical / Non-Technical);
// the home screen has a switcher to move between them.
// =====================================================================

// ---------------- APP GROUP REGISTRY ----------------
// Each category below is tagged with the "app" (group) it belongs to.
// To add a new app group: add its metadata here, then tag any category
// object below with matching group id.
const APP_GROUPS = [
  {
    id: "civil1",
    label: "Civil Engineering 1",
    icon: "🏗️",
    blurb: "Construction planning, estimating & costing, and surveying.",
  },
  {
    id: "civil2",
    label: "Civil Engineering 2",
    icon: "🧱",
    blurb:
      "Building materials, construction technology, and further civil engineering subjects.",
  },
  {
    id: "nontechnical",
    label: "Non-Technical / General Studies",
    icon: "📘",
    blurb:
      "English, quantitative aptitude and reasoning — the general sections common to most exams.",
  },
];

// ---------------- CATEGORY REGISTRY ----------------
// RAW_CATEGORIES holds the original, unmodified data loaded from the data/*.js
// files. CATEGORIES holds the "effective" version — raw data with any
// user edits/additions/deletions (stored in P.overrides) applied on top.
// CATEGORIES is rebuilt (in place) via rebuildCategories() on load and
// after every add/edit/delete, so all existing code that reads CATEGORIES
// automatically sees current data without needing to know overrides exist.
const RAW_CATEGORIES = [
  Object.assign({ icon: "💻", group: "civil1" }, window.QUIZ_CATEGORY_CPM),
  Object.assign({ icon: "🧮", group: "civil1" }, window.QUIZ_CATEGORY_ECV),
  Object.assign({ icon: "⚙️", group: "civil1" }, window.QUIZ_CATEGORY_BUIC),
  Object.assign({ icon: "🧱", group: "civil1" }, window.QUIZ_CATEGORY_BUILDM),
  Object.assign({ icon: "📏", group: "civil1" }, window.QUIZ_CATEGORY_SUR),
  Object.assign({ icon: "🚉", group: "civil1" }, window.QUIZ_CATEGORY_RAI),
  Object.assign({ icon: "📐", group: "civil1" }, window.QUIZ_CATEGORY_HIG),
  Object.assign({ icon: "🏞", group: "civil1" }, window.QUIZ_CATEGORY_IRRIGATION_ENGINEERING),
  Object.assign({ icon: "🦺", group: "civil1" }, window.QUIZ_CATEGORY_CONCRETE_TECHNOLOGY),
  Object.assign({ icon: "🚽", group: "civil1" }, window.QUIZ_CATEGORY_SEWA),
  Object.assign({ icon: "🚿", group: "civil1" }, window.QUIZ_CATEGORY_WATER_SUPPLY),
  Object.assign({ icon: "💧", group: "civil1" }, window.QUIZ_CATEGORY_HYD),
  Object.assign({ icon: "🏢", group: "civil1" }, window.QUIZ_CATEGORY_RCC),
  Object.assign({ icon: "🌉", group: "civil1" }, window.QUIZ_CATEGORY_STEEL),

  Object.assign({ icon: "🖋", group: "civil2" }, window.QUIZ_CATEGORY_ENGG_DRAWING),
  Object.assign({ icon: "🌇", group: "civil2" }, window.QUIZ_CATEGORY_CMRM),
  Object.assign(
    { icon: "🔤", group: "nontechnical" },
    window.QUIZ_CATEGORY_PUNJAB_GK,
  ),
];
// Maps a category id to the exact global variable name + source file path it
// was loaded from, so "Export Data File" can regenerate a drop-in replacement.
const CATEGORY_SOURCE_INFO = {
  cpm: {
    varName: "QUIZ_CATEGORY_CPM",
    path: "data/civil-engineering-1/construction-planning-management.js",
  },
  ecv: {
    varName: "QUIZ_CATEGORY_ECV",
    path: "data/civil-engineering-1/estimation-and-costing.js",
  },
  surveying: {
    varName: "QUIZ_CATEGORY_SURVEYING",
    path: "data/civil-engineering-1/surveying.js",
  },
  "building-materials-construction": {
    varName: "QUIZ_CATEGORY_BMCT",
    path: "data/civil-engineering-2/building-materials-construction.js",
  },
  "gen-eng": {
    varName: "QUIZ_CATEGORY_GENENG",
    path: "data/non-technical/general-english.js",
  },
  "quant-apt": {
    varName: "QUIZ_CATEGORY_APTITUDE",
    path: "data/non-technical/quantitative-aptitude.js",
  },
  reasoning: {
    varName: "QUIZ_CATEGORY_REASONING",
    path: "data/non-technical/reasoning-ability.js",
  },
};
const CATEGORIES = []; // filled in by rebuildCategories() below — grows to include uploaded subjects too
let CATEGORY_INDEX = {}; // id -> effective category, INCLUDING hidden ones (used for the hidden-subjects panel)
function getCategory(catId) {
  return CATEGORIES.find((c) => c.id === catId);
}
function letterOf(i) {
  return ["A", "B", "C", "D"][i];
}
function getGroup(groupId) {
  return APP_GROUPS.find((g) => g.id === groupId);
}
function categoriesInGroup(groupId) {
  return CATEGORIES.filter((c) => c.group === groupId);
}

// ---------------- PERSISTENCE ----------------
const STORAGE_KEY = "ceQuizHub_v1";
function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultPersisted(), parsed);
  } catch (e) {
    return defaultPersisted();
  }
}
function defaultPersisted() {
  return {
    theme: null, // 'dark' | 'light' | null(auto)
    activeApp: "civil1", // last-selected app group, remembered across visits
    bestScores: {}, // catId -> key -> {correct,total,pct,date}
    mastery: {}, // catId -> subName -> {masteredUnique,totalUnique}
    bookmarks: {}, // catId -> [ "subIdx-num", ... ]
    missCounts: {}, // catId -> "subIdx-num" -> timesMissed
    overrides: {}, // catId -> {edits:{"subIdx-num":{...}}, deletes:["subIdx-num",...], added:{subIdx:[{...}]}, nextNum}
    customCategories: {}, // catId -> full category object for subjects imported from an uploaded file
    hiddenCategories: [], // [catId, ...] — removed-from-view subjects (built-in or uploaded); reversible
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      streak: 0,
      bestStreak: 0,
      sessionsCompleted: 0,
    },
  };
}
let P = loadPersisted();
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(P));
  } catch (e) {
    /* ignore */
  }
}

// ---------------- QUESTION OVERRIDES (add / edit / delete, per category) ----------------
// Works identically for built-in categories (from data/*.js) and categories
// imported from an uploaded file (stored in P.customCategories) — both are
// just "raw sources" that overrides get layered on top of.
function getOverrides(catId) {
  P.overrides = P.overrides || {};
  if (!P.overrides[catId])
    P.overrides[catId] = { edits: {}, deletes: [], added: {}, nextNum: 9001 };
  const ov = P.overrides[catId];
  ov.edits = ov.edits || {};
  ov.deletes = ov.deletes || [];
  ov.added = ov.added || {};
  if (!ov.nextNum) ov.nextNum = 9001;
  return ov;
}
function buildEffectiveCategory(rawCat) {
  const clone = JSON.parse(JSON.stringify(rawCat));
  const ov = P.overrides && P.overrides[clone.id];
  if (!ov) return clone;
  clone.subcats.forEach((sc, sIdx) => {
    sc.questions = sc.questions
      .filter((q) => !(ov.deletes || []).includes(sIdx + "-" + q.num))
      .map((q) => {
        const edit = ov.edits && ov.edits[sIdx + "-" + q.num];
        return edit ? Object.assign({}, q, edit) : q;
      });
    const added = (ov.added && ov.added[sIdx]) || [];
    if (added.length) sc.questions = sc.questions.concat(added);
  });
  return clone;
}
function getAllRawSources() {
  const uploaded = Object.values(P.customCategories || {});
  return RAW_CATEGORIES.concat(uploaded);
}
function rebuildCategories() {
  const built = getAllRawSources().map(buildEffectiveCategory);
  CATEGORY_INDEX = {};
  built.forEach((c) => {
    CATEGORY_INDEX[c.id] = c;
  });
  const hidden = new Set(P.hiddenCategories || []);
  CATEGORIES.length = 0;
  built.forEach((c) => {
    if (!hidden.has(c.id)) CATEGORIES.push(c);
  });
}
rebuildCategories();

function addQuestion(catId, subIdx, data) {
  const ov = getOverrides(catId);
  const num = ov.nextNum++;
  ov.added[subIdx] = ov.added[subIdx] || [];
  ov.added[subIdx].push({
    num,
    text: data.text,
    options: data.options.slice(),
    correct: data.correct,
    expl: data.expl,
  });
  persist();
  rebuildCategories();
  return num;
}
function editQuestion(catId, subIdx, num, data) {
  const ov = getOverrides(catId);
  const addedArr = ov.added[subIdx] || [];
  const addedIdx = addedArr.findIndex((q) => q.num === num);
  const payload = {
    text: data.text,
    options: data.options.slice(),
    correct: data.correct,
    expl: data.expl,
  };
  if (addedIdx !== -1) {
    addedArr[addedIdx] = Object.assign({ num }, payload);
  } else {
    ov.edits[subIdx + "-" + num] = payload;
  }
  persist();
  rebuildCategories();
}
function deleteQuestion(catId, subIdx, num) {
  const ov = getOverrides(catId);
  const addedArr = ov.added[subIdx] || [];
  const addedIdx = addedArr.findIndex((q) => q.num === num);
  if (addedIdx !== -1) {
    addedArr.splice(addedIdx, 1);
  } else {
    const key = subIdx + "-" + num;
    if (!ov.deletes.includes(key)) ov.deletes.push(key);
    delete ov.edits[key];
  }
  persist();
  rebuildCategories();
}
function isCustomQuestion(catId, subIdx, num) {
  const ov = P.overrides && P.overrides[catId];
  if (!ov || !ov.added || !ov.added[subIdx]) return false;
  return ov.added[subIdx].some((q) => q.num === num);
}
function isEditedQuestion(catId, subIdx, num) {
  const ov = P.overrides && P.overrides[catId];
  return !!(ov && ov.edits && ov.edits[subIdx + "-" + num]);
}
function resetCategoryOverrides(catId) {
  if (P.overrides) delete P.overrides[catId];
  persist();
  rebuildCategories();
}

// ---------------- SUBJECT-LEVEL REMOVE / RESTORE / DELETE ----------------
// "Remove" hides a subject (built-in or uploaded) but keeps its data, so it
// can always be restored. "Permanently delete" (uploaded subjects only)
// actually erases the data — built-in subjects can never be permanently
// deleted since they ship with the app, only hidden.
function isUploadedCategory(catId) {
  return !!(P.customCategories && P.customCategories[catId]);
}
function hideCategory(catId) {
  P.hiddenCategories = P.hiddenCategories || [];
  if (!P.hiddenCategories.includes(catId)) P.hiddenCategories.push(catId);
  persist();
  rebuildCategories();
}
function restoreCategory(catId) {
  P.hiddenCategories = (P.hiddenCategories || []).filter((id) => id !== catId);
  persist();
  rebuildCategories();
}
function handleRestoreClick(catId) {
  restoreCategory(catId);
  showToast("Subject restored.");
  render();
}
function hiddenCategoryInfos() {
  return (P.hiddenCategories || [])
    .map((id) => CATEGORY_INDEX[id])
    .filter(Boolean);
}
function permanentlyDeleteCategory(catId) {
  if (!isUploadedCategory(catId)) return;
  if (P.customCategories) delete P.customCategories[catId];
  if (P.overrides) delete P.overrides[catId];
  if (P.bestScores) delete P.bestScores[catId];
  if (P.bookmarks) delete P.bookmarks[catId];
  if (P.missCounts) delete P.missCounts[catId];
  if (P.mastery) delete P.mastery[catId];
  P.hiddenCategories = (P.hiddenCategories || []).filter((id) => id !== catId);
  persist();
  rebuildCategories();
}
function confirmRemoveCategory() {
  const cat = getCategory(state.catId);
  if (!cat) return;
  if (
    !confirm(
      'Remove "' +
        cat.title +
        '" from your subject list? It will be hidden, not deleted — you can restore it anytime from the home page.',
    )
  )
    return;
  hideCategory(cat.id);
  showToast("Subject removed. Restore it anytime from the home page.");
  goHome();
}
function confirmPermanentDelete(catId) {
  const c = CATEGORY_INDEX[catId];
  if (
    !confirm(
      'Permanently delete "' +
        (c ? c.title : catId) +
        '" and all its questions? This cannot be undone.',
    )
  )
    return;
  permanentlyDeleteCategory(catId);
  showToast("Subject permanently deleted.");
  render();
}

// ---------------- IMPORT A SUBJECT FROM AN UPLOADED FILE ----------------
// Accepts either:
//  - a "window.QUIZ_CATEGORY_XYZ = {...};" style file (same as data/*.js), or
//  - a plain JSON / JS object literal: { id, title, description, subcats:[...] }
function parseUploadedCategoryText(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The file is empty.");
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      try {
        return new Function("return (" + trimmed.replace(/;\s*$/, "") + ");")();
      } catch (e2) {
        throw new Error("Could not parse this file as JSON or a JS object.");
      }
    }
  }
  // Otherwise expect one or more "window.NAME = {...};" style assignments.
  const sandbox = {};
  let result;
  try {
    result = new Function("window", trimmed + "\nreturn window;")(sandbox);
  } catch (e) {
    throw new Error(
      "Could not run this file as JS — check it matches the expected format.",
    );
  }
  const keys = Object.keys(result);
  if (keys.length === 0)
    throw new Error(
      'No "window.QUIZ_CATEGORY_..." assignment found in this file.',
    );
  const key = keys.find((k) => /QUIZ_CATEGORY/i.test(k)) || keys[0];
  return result[key];
}
function validateCategoryShape(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") {
    errors.push("File does not contain a valid object.");
    return errors;
  }
  if (!obj.title || typeof obj.title !== "string")
    errors.push('Missing a "title" field.');
  if (!Array.isArray(obj.subcats) || obj.subcats.length === 0) {
    errors.push('Missing or empty "subcats" array.');
    return errors;
  }
  obj.subcats.forEach((sc, i) => {
    const label = sc && sc.name ? sc.name : "Subtopic " + (i + 1);
    if (!sc || !sc.name) errors.push(`Subtopic ${i + 1} is missing a "name".`);
    if (!sc || !Array.isArray(sc.questions) || sc.questions.length === 0) {
      errors.push(`"${label}" has no questions.`);
      return;
    }
    sc.questions.forEach((q, qi) => {
      const qLabel = `Question ${qi + 1} in "${label}"`;
      if (!q || !q.text) errors.push(`${qLabel} is missing "text".`);
      if (!q || !Array.isArray(q.options) || q.options.length !== 4)
        errors.push(`${qLabel} needs exactly 4 options.`);
      const correctNum = q ? Number(q.correct) : NaN;
      if (isNaN(correctNum) || correctNum < 0 || correctNum > 3)
        errors.push(`${qLabel} needs a valid "correct" index (0-3).`);
    });
  });
  return errors;
}
function allKnownCategoryIds() {
  const ids = RAW_CATEGORIES.map((c) => c.id);
  Object.keys(P.customCategories || {}).forEach((id) => ids.push(id));
  return ids;
}
function slugify(s) {
  return (
    (s || "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "subject"
  );
}
function confirmImportCategory() {
  const preview = state.importPreview;
  if (!preview || !preview.obj || (preview.errors && preview.errors.length))
    return;
  const obj = preview.obj;

  let baseId = slugify(obj.id || obj.title);
  const existing = allKnownCategoryIds();
  let id = baseId,
    n = 2;
  while (existing.includes(id)) {
    id = baseId + "-" + n;
    n++;
  }

  const subcats = obj.subcats.map((sc) => ({
    name: sc.name,
    questions: sc.questions.map((q, i) => ({
      num: typeof q.num === "number" && !isNaN(q.num) ? q.num : i + 1,
      text: q.text,
      options: q.options.slice(0, 4),
      correct: Number(q.correct),
      expl: q.expl || "",
    })),
  }));

  P.customCategories = P.customCategories || {};
  P.customCategories[id] = {
    id,
    title: obj.title,
    description: obj.description || "",
    icon: "📄",
    group: state.importTargetGroup,
    subcats,
  };
  persist();
  rebuildCategories();
  showToast("Subject imported: " + obj.title);
  state.showImport = false;
  state.importPreview = null;
  openCategory(id);
}
function openImportPanel() {
  state.showImport = true;
  state.importPreview = null;
  state.importTargetGroup = state.activeApp;
  render();
}
function closeImportPanel() {
  state.showImport = false;
  state.importPreview = null;
  render();
}
function setImportTargetGroup(v) {
  state.importTargetGroup = v;
}
function handleImportFileSelect(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) {
    state.importPreview = {
      obj: null,
      errors: ["File is too large (max 3MB)."],
      fileName: file.name,
    };
    render();
    return;
  }
  file
    .text()
    .then((text) => {
      let obj = null,
        errors = [];
      try {
        obj = parseUploadedCategoryText(text);
        errors = validateCategoryShape(obj);
      } catch (e) {
        errors = [e.message];
      }
      state.importPreview = {
        obj: errors.length ? null : obj,
        errors,
        fileName: file.name,
      };
      render();
    })
    .catch((e) => {
      state.importPreview = {
        obj: null,
        errors: ["Could not read the file: " + e.message],
        fileName: file.name,
      };
      render();
    });
}

// ---------------- THEME ----------------
// Two real print processes for reproducing technical drawings:
// cyanotype (white lines on blue paper) vs diazo/whiteprint (blue lines on cream paper).
function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  const label = document.getElementById("theme-label");
  if (label) label.textContent = dark ? "DIAZO" : "CYANOTYPE";
}
let isDark = P.theme
  ? P.theme === "dark"
  : window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(isDark);
function toggleTheme() {
  isDark = !isDark;
  P.theme = isDark ? "dark" : "light";
  persist();
  applyTheme(isDark);
}

// ---------------- APP STATE (session, non-persisted) ----------------
// Guard against a stale/renamed group id left over in localStorage from an
// older version of this app (e.g. group ids were renamed) — always fall
// back to the first known group rather than crashing.
function validGroupId(id) {
  return APP_GROUPS.some((g) => g.id === id) ? id : APP_GROUPS[0].id;
}

const state = {
  view: "home", // home | catHome | quiz | result | practiceResult | manage
  catId: null,
  mode: "test",
  search: "",
  homeSearch: "",
  homeFilter: "all", // all | new | progress | done
  activeApp: validGroupId(P.activeApp),
  manageForm: null,
  showImport: false,
  importPreview: null,
  importTargetGroup: null,
  showHiddenPanel: false,
  quiz: null,
};
// Persist the corrected value immediately if the saved one was invalid/stale.
if (P.activeApp !== state.activeApp) {
  P.activeApp = state.activeApp;
  persist();
}

function setActiveApp(groupId) {
  state.activeApp = validGroupId(groupId);
  state.homeSearch = "";
  state.homeFilter = "all";
  P.activeApp = state.activeApp;
  persist();
  render();
}

// ---------------- QUEUE BUILDERS ----------------
function buildFullQueue(cat) {
  let q = [];
  cat.subcats.forEach((sc, sIdx) => {
    sc.questions.forEach((qq) =>
      q.push({ subIdx: sIdx, subName: sc.name, q: qq }),
    );
  });
  return q;
}
function buildSubQueue(cat, sIdx) {
  const sc = cat.subcats[sIdx];
  return sc.questions.map((qq) => ({ subIdx: sIdx, subName: sc.name, q: qq }));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildRandomQueue(cat, n) {
  return shuffle(buildFullQueue(cat)).slice(
    0,
    Math.min(n, buildFullQueue(cat).length),
  );
}
function bookmarkKey(catId, subIdx, num) {
  return subIdx + "-" + num;
}
function buildBookmarkedQueue(cat) {
  const keys = new Set(P.bookmarks[cat.id] || []);
  let out = [];
  cat.subcats.forEach((sc, sIdx) => {
    sc.questions.forEach((qq) => {
      if (keys.has(bookmarkKey(cat.id, sIdx, qq.num)))
        out.push({ subIdx: sIdx, subName: sc.name, q: qq });
    });
  });
  return out;
}
function buildMissedQueue(cat) {
  const miss = P.missCounts[cat.id] || {};
  const keys = Object.keys(miss).filter((k) => miss[k] > 0);
  let out = [];
  cat.subcats.forEach((sc, sIdx) => {
    sc.questions.forEach((qq) => {
      if (keys.includes(bookmarkKey(cat.id, sIdx, qq.num)))
        out.push({ subIdx: sIdx, subName: sc.name, q: qq });
    });
  });
  return shuffle(out);
}

// ---------------- NAVIGATION ----------------
function goHome() {
  state.view = "home";
  state.quiz = null;
  state.catId = null;
  render();
}
function openCategory(catId) {
  state.view = "catHome";
  state.catId = catId;
  state.search = "";
  render();
}
function setSearch(v) {
  state.search = v;
  render();
}
function setHomeSearch(v) {
  state.homeSearch = v;
  render();
}
function setHomeFilter(v) {
  state.homeFilter = v;
  render();
}

// ---------------- MANAGE QUESTIONS (add / edit / delete) ----------------
function openManage(catId) {
  state.view = "manage";
  state.catId = catId;
  state.manageForm = null;
  state.manageSubIdx = 0;
  render();
}
function closeManageToCategory() {
  state.view = "catHome";
  state.manageForm = null;
  render();
}
function openAddForm(subIdx) {
  state.manageForm = {
    mode: "add",
    subIdx: subIdx,
    num: null,
    text: "",
    options: ["", "", "", ""],
    correct: 0,
    expl: "",
  };
  render();
}
function openEditForm(subIdx, num) {
  const cat = getCategory(state.catId);
  const q = cat.subcats[subIdx].questions.find((qq) => qq.num === num);
  if (!q) return;
  state.manageForm = {
    mode: "edit",
    subIdx: subIdx,
    num: num,
    text: q.text,
    options: q.options.slice(),
    correct: q.correct,
    expl: q.expl,
  };
  render();
}
function closeManageForm() {
  state.manageForm = null;
  render();
}
function setFormField(field, value) {
  if (state.manageForm) state.manageForm[field] = value;
}
function setFormOption(i, value) {
  if (state.manageForm) state.manageForm.options[i] = value;
}
function setFormCorrect(i) {
  if (state.manageForm) state.manageForm.correct = i;
}
function setFormSubIdx(i) {
  if (state.manageForm) state.manageForm.subIdx = parseInt(i);
}

function submitManageForm() {
  const f = state.manageForm;
  if (!f) return;
  const text = f.text.trim();
  const options = f.options.map((o) => o.trim());
  const expl = f.expl.trim();
  if (!text) {
    showToast("Question text can't be empty.");
    return;
  }
  if (options.some((o) => !o)) {
    showToast("All 4 options must be filled in.");
    return;
  }
  if (f.correct < 0 || f.correct > 3) {
    showToast("Pick which option is correct.");
    return;
  }
  if (!expl) {
    showToast("Add a short explanation.");
    return;
  }

  const catId = state.catId;
  if (f.mode === "add") {
    addQuestion(catId, f.subIdx, { text, options, correct: f.correct, expl });
    showToast("Question added.");
  } else {
    editQuestion(catId, f.subIdx, f.num, {
      text,
      options,
      correct: f.correct,
      expl,
    });
    showToast("Question updated.");
  }
  state.manageForm = null;
  render();
}
function confirmDeleteQuestion(subIdx, num) {
  if (!confirm("Delete this question? This can't be undone.")) return;
  deleteQuestion(state.catId, subIdx, num);
  showToast("Question deleted.");
  render();
}
function confirmResetOverrides() {
  if (
    !confirm(
      "Discard all added/edited/deleted questions for this subject and restore the original set? This can't be undone.",
    )
  )
    return;
  resetCategoryOverrides(state.catId);
  showToast("Subject reset to original questions.");
  render();
}

// sIdx: -1 = full run, -2 = random 30, -3 = bookmarked, -4 = missed/smart-review, else = subIdx
function startQuiz(sIdx, mode) {
  const cat = getCategory(state.catId);
  let queue, kindLabel;
  if (sIdx === -1) {
    queue = buildFullQueue(cat);
    kindLabel = "full";
  } else if (sIdx === -2) {
    queue = buildRandomQueue(cat, 30);
    kindLabel = "random";
  } else if (sIdx === -3) {
    queue = buildBookmarkedQueue(cat);
    kindLabel = "bookmarked";
  } else if (sIdx === -4) {
    queue = buildMissedQueue(cat);
    kindLabel = "missed";
  } else {
    queue = buildSubQueue(cat, sIdx);
    kindLabel = "sub";
  }

  if (queue.length === 0) {
    showToast("Nothing to practice here yet.");
    return;
  }

  state.mode = mode;
  state.quiz = {
    catId: cat.id,
    subIdx: sIdx,
    kindLabel: kindLabel,
    mode: mode,
    order: queue,
    pos: 0,
    answered: false,
    selected: null,
    score: 0,
    total: queue.length,
    missed: [],
    remaining: mode === "practice" ? queue.slice() : null,
    mastered: 0,
    totalUnique: queue.length,
    attempts: 0,
    firstTryCorrect: 0,
    retryCounts: {},
    practiceCurrent: null,
    startTime: Date.now(),
  };
  if (mode === "practice") {
    state.quiz.practiceCurrent = state.quiz.remaining.shift();
  }
  state.view = "quiz";
  render();
}
function retrySame() {
  const qz = state.quiz;
  startQuiz(qz.subIdx, qz.mode);
}

function currentItem() {
  const qz = state.quiz;
  return qz.mode === "test" ? qz.order[qz.pos] : qz.practiceCurrent;
}

// ---------------- ANSWERING ----------------
function selectOption(idx) {
  const qz = state.quiz;
  if (qz.answered) return;
  qz.answered = true;
  qz.selected = idx;
  const item = currentItem();
  const correct = idx === item.q.correct;
  const key = bookmarkKey(qz.catId, item.subIdx, item.q.num);

  // global stats
  P.stats.totalAnswered++;
  if (correct) {
    P.stats.totalCorrect++;
    P.stats.streak++;
    if (P.stats.streak > P.stats.bestStreak)
      P.stats.bestStreak = P.stats.streak;
    if (P.missCounts[qz.catId] && P.missCounts[qz.catId][key]) {
      // answered correctly after a previous miss — decay it, don't fully clear (keeps history meaningful)
    }
  } else {
    P.stats.streak = 0;
    P.missCounts[qz.catId] = P.missCounts[qz.catId] || {};
    P.missCounts[qz.catId][key] = (P.missCounts[qz.catId][key] || 0) + 1;
  }
  persist();

  if (qz.mode === "test") {
    if (correct) qz.score++;
    else qz.missed.push({ item, selected: idx });
  } else {
    qz.attempts++;
    const rkey = item.subIdx + "-" + item.q.num;
    if (correct) {
      if (!(rkey in qz.retryCounts)) qz.firstTryCorrect++;
      qz.mastered++;
    } else {
      qz.retryCounts[rkey] = (qz.retryCounts[rkey] || 0) + 1;
      const insertPos =
        qz.remaining.length === 0
          ? 0
          : 1 + Math.floor(Math.random() * qz.remaining.length);
      qz.remaining.splice(insertPos, 0, item);
    }
  }
  render();
}

function toggleBookmark(subIdx, num) {
  const catId = state.catId || state.quiz.catId;
  P.bookmarks[catId] = P.bookmarks[catId] || [];
  const key = bookmarkKey(catId, subIdx, num);
  const i = P.bookmarks[catId].indexOf(key);
  if (i === -1) {
    P.bookmarks[catId].push(key);
    showToast("Bookmarked for review");
  } else {
    P.bookmarks[catId].splice(i, 1);
    showToast("Bookmark removed");
  }
  persist();
  render();
}
function isBookmarked(catId, subIdx, num) {
  return (P.bookmarks[catId] || []).includes(bookmarkKey(catId, subIdx, num));
}

function nextQuestion() {
  const qz = state.quiz;
  if (qz.mode === "test") {
    qz.pos++;
    qz.answered = false;
    qz.selected = null;
    if (qz.pos >= qz.order.length) {
      recordBest(qz);
      P.stats.sessionsCompleted++;
      persist();
      state.view = "result";
      maybeConfetti(qz);
    }
  } else {
    if (qz.remaining.length === 0) {
      recordMastery(qz);
      P.stats.sessionsCompleted++;
      persist();
      state.view = "practiceResult";
      maybeConfetti(qz);
    } else {
      qz.practiceCurrent = qz.remaining.shift();
      qz.answered = false;
      qz.selected = null;
    }
  }
  render();
}

function keyForBest(qz) {
  if (qz.subIdx === -1) return "FULL";
  if (qz.subIdx === -2) return "RANDOM";
  if (qz.subIdx === -3) return "BOOKMARKED";
  if (qz.subIdx === -4) return "MISSED";
  return String(qz.subIdx);
}
function recordBest(qz) {
  if (qz.mode !== "test") return;
  const pct = Math.round((qz.score / qz.total) * 100);
  P.bestScores[qz.catId] = P.bestScores[qz.catId] || {};
  const key = keyForBest(qz);
  const prev = P.bestScores[qz.catId][key];
  if (!prev || pct > prev.pct)
    P.bestScores[qz.catId][key] = {
      correct: qz.score,
      total: qz.total,
      pct: pct,
      date: Date.now(),
    };
}
function recordMastery(qz) {
  const cat = getCategory(qz.catId);
  P.mastery[qz.catId] = P.mastery[qz.catId] || {};
  // attribute mastery per-subcategory touched in this run
  const bySub = {};
  qz.order.forEach((item) => {
    bySub[item.subName] = (bySub[item.subName] || 0) + 1;
  });
  Object.keys(bySub).forEach((name) => {
    P.mastery[qz.catId][name] = {
      masteredUnique: bySub[name],
      totalUnique: bySub[name],
      date: Date.now(),
    };
  });
}

// ---------------- TOAST / CONFETTI ----------------
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}
function maybeConfetti(qz) {
  let pct;
  if (qz.mode === "test") pct = Math.round((qz.score / qz.total) * 100);
  else
    pct =
      qz.attempts > 0
        ? Math.round((qz.firstTryCorrect / qz.totalUnique) * 100)
        : 100;
  if (pct >= 90) launchConfetti();
}
function launchConfetti() {
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);
  const colors = ["#C6742A", "#3D7A55", "#2E6E8E", "#A83A32", "#D9A441"];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    p.style.animationDelay = Math.random() * 0.4 + "s";
    layer.appendChild(p);
  }
  setTimeout(() => layer.remove(), 3200);
}

// ---------------- KEYBOARD NAVIGATION ----------------
document.addEventListener("keydown", (e) => {
  if (state.view === "quiz") {
    const qz = state.quiz;
    const key = e.key.toUpperCase();
    if (!qz.answered) {
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, A: 0, B: 1, C: 2, D: 3 };
      if (key in map) {
        e.preventDefault();
        selectOption(map[key]);
        return;
      }
    } else {
      if (key === "ENTER" || key === " " || key === "N") {
        e.preventDefault();
        nextQuestion();
        return;
      }
    }
    if (key === "ESCAPE") {
      e.preventDefault();
      goHome();
      return;
    }
  }
});

// ---------------- RENDER ----------------
let lastRenderedView = null;
function render() {
  const app = document.getElementById("app");

  // Full re-render replaces innerHTML wholesale, which would normally drop
  // focus/cursor position out of any input the user is actively typing in
  // (search boxes, the add/edit question form). Preserve and restore it.
  const active = document.activeElement;
  let focusInfo = null;
  if (
    active &&
    app.contains(active) &&
    (active.tagName === "INPUT" || active.tagName === "TEXTAREA") &&
    active.id
  ) {
    focusInfo = {
      id: active.id,
      start: active.selectionStart,
      end: active.selectionEnd,
    };
  }

  if (state.view === "home") app.innerHTML = renderAppHome();
  else if (state.view === "catHome") app.innerHTML = renderCatHome();
  else if (state.view === "quiz") app.innerHTML = renderQuiz();
  else if (state.view === "result") app.innerHTML = renderResult();
  else if (state.view === "practiceResult")
    app.innerHTML = renderPracticeResult();
  else if (state.view === "manage") app.innerHTML = renderManage();
  updateTitleBlock();

  if (focusInfo) {
    const el = document.getElementById(focusInfo.id);
    if (el) {
      el.focus();
      if (typeof focusInfo.start === "number" && el.setSelectionRange) {
        try {
          el.setSelectionRange(focusInfo.start, focusInfo.end);
        } catch (e) {}
      }
    }
  }
  // Only jump to top on an actual view change, not on every keystroke re-render.
  if (state.view !== lastRenderedView) {
    window.scrollTo(0, 0);
    lastRenderedView = state.view;
  }
}

// ---------------- TITLE BLOCK (signature element) ----------------
function todayStamp() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function setTB(project, sheet, scale, rev) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set("tb-project", project);
  set("tb-sheet", sheet);
  set("tb-scale", scale);
  set("tb-rev", rev);
  set("tb-date", todayStamp());
}
function updateTitleBlock() {
  if (state.view === "home") {
    const groupCats = categoriesInGroup(state.activeApp);
    const total = groupCats.reduce((a, c) => a + catTotalQuestions(c), 0);
    const g = getGroup(state.activeApp);
    setTB(g ? g.id.toUpperCase() : "ALL", total + " QUESTIONS", "—", "—");
    return;
  }
  const cat = getCategory(state.catId || (state.quiz && state.quiz.catId));
  if (!cat) {
    setTB("—", "—", "—", "—");
    return;
  }
  const code = cat.id.toUpperCase();

  if (state.view === "catHome") {
    setTB(code, cat.subcats.length + " SHEETS", state.mode.toUpperCase(), "—");
  } else if (state.view === "quiz") {
    const qz = state.quiz;
    const sheet =
      qz.mode === "test"
        ? `${qz.pos + 1}/${qz.total}`
        : `${qz.mastered}/${qz.totalUnique}`;
    const rev = qz.mode === "test" ? `${qz.score} OK` : `${qz.attempts} ATT`;
    setTB(code, sheet, qz.mode.toUpperCase(), rev);
  } else if (state.view === "result") {
    const qz = state.quiz;
    const pct = Math.round((qz.score / qz.total) * 100);
    setTB(code, "FINAL", "TEST", pct + "%");
  } else if (state.view === "practiceResult") {
    const qz = state.quiz;
    setTB(code, "FINAL", "PRACTICE", qz.totalUnique + " MASTERED");
  } else if (state.view === "manage") {
    const totalQ = catTotalQuestions(cat);
    setTB(code, totalQ + " QUESTIONS", "EDIT", "—");
  }
}

// ---- global helpers for progress ----
function catTotalQuestions(cat) {
  return cat.subcats.reduce((a, sc) => a + sc.questions.length, 0);
}
function catBestFull(cat) {
  return (P.bestScores[cat.id] || {})["FULL"];
}
function catAttemptedSubCount(cat) {
  const scores = P.bestScores[cat.id] || {};
  return cat.subcats.filter((sc, i) => scores[String(i)]).length;
}
function overallAccuracy() {
  if (P.stats.totalAnswered === 0) return null;
  return Math.round((P.stats.totalCorrect / P.stats.totalAnswered) * 100);
}
function weakestSubcat(groupId) {
  // within a given app group: subcat with lowest best % among attempted
  let worst = null;
  categoriesInGroup(groupId).forEach((cat) => {
    const scores = P.bestScores[cat.id] || {};
    cat.subcats.forEach((sc, i) => {
      const s = scores[String(i)];
      if (s && (!worst || s.pct < worst.pct))
        worst = { name: sc.name, pct: s.pct, catTitle: cat.title };
    });
  });
  return worst;
}

function categoryStatus(cat) {
  const attemptedSubs = catAttemptedSubCount(cat);
  if (attemptedSubs === 0) return "new";
  if (attemptedSubs >= cat.subcats.length) return "done";
  return "progress";
}

function renderImportPanel() {
  const preview = state.importPreview;
  let previewHtml = "";
  if (preview) {
    if (preview.errors && preview.errors.length) {
      previewHtml = `
        <div class="explain-box" style="border-left-color:var(--wrong);">
          <span class="label mono" style="color:var(--wrong);">Couldn't import "${escapeHtml(preview.fileName || "")}"</span>
          <ul style="margin:6px 0 0;padding-left:18px;">
            ${preview.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}
          </ul>
        </div>
      `;
    } else if (preview.obj) {
      const obj = preview.obj;
      const qCount = obj.subcats.reduce((a, s) => a + s.questions.length, 0);
      previewHtml = `
        <div class="explain-box">
          <span class="label mono">Ready to import</span>
          <strong>${escapeHtml(obj.title)}</strong><br>
          ${obj.subcats.length} subtopic${obj.subcats.length === 1 ? "" : "s"} &middot; ${qCount} questions
        </div>
      `;
    }
  }
  const groupOptionsHtml = APP_GROUPS.map(
    (g) =>
      `<option value="${g.id}" ${g.id === state.importTargetGroup ? "selected" : ""}>${escapeHtml(g.label)}</option>`,
  ).join("");
  const canImport =
    preview && preview.obj && !(preview.errors && preview.errors.length);

  return `
    <div class="dwg-card">
      <span class="dwg-tag mono">IMPORT &middot; ADD A NEW SUBJECT FROM A FILE</span>
      <p style="font-family:'Spectral',Georgia,serif;font-size:14px;color:var(--muted);margin:6px 0 16px;">
        Upload a file shaped like this app's own data files — a <code>window.QUIZ_CATEGORY_...</code> assignment, or plain JSON with <code>title</code>/<code>description</code>/<code>subcats</code> — to add a whole new subject to any section below.
      </p>
      <div class="mf-field">
        <label class="mf-label mono">Add to section</label>
        <select id="import-group" class="mf-select" onchange="setImportTargetGroup(this.value)">${groupOptionsHtml}</select>
      </div>
      <div class="mf-field">
        <label class="mf-label mono">File (.js, .json, or .txt)</label>
        <input type="file" id="import-file-input" accept=".js,.json,.txt" onchange="handleImportFileSelect(this)">
      </div>
      ${previewHtml}
      <div class="btn-row">
        <button class="btn" id="import-submit-btn" onclick="confirmImportCategory()" ${canImport ? "" : "disabled"}>Import Subject</button>
        <button class="btn secondary" onclick="closeImportPanel()">Cancel</button>
      </div>
    </div>
  `;
}

function renderHiddenSubjectsPanel() {
  const hidden = hiddenCategoryInfos();
  if (hidden.length === 0) return "";
  const itemsHtml = hidden
    .map((c) => {
      const g = getGroup(c.group);
      return `
      <div class="manage-q-row">
        <div class="manage-q-text">
          <span class="manage-q-num mono">${g ? g.icon : ""}</span>
          <span>${escapeHtml(c.title)}</span>
          ${g ? `<span class="manage-badge edited">${escapeHtml(g.label)}</span>` : ""}
        </div>
        <div class="manage-q-actions">
          <button class="btn secondary small" onclick="handleRestoreClick('${c.id}')">Restore</button>
          ${isUploadedCategory(c.id) ? `<button class="btn secondary small danger" onclick="confirmPermanentDelete('${c.id}')">Delete Permanently</button>` : ""}
        </div>
      </div>
    `;
    })
    .join("");
  return `
    <div class="dwg-card">
      <span class="dwg-tag mono">${hidden.length} HIDDEN SUBJECT${hidden.length > 1 ? "S" : ""}</span>
      <div class="manage-q-list" style="margin-top:10px;">${itemsHtml}</div>
    </div>
  `;
}

function renderAppHome() {
  const groupCats = categoriesInGroup(state.activeApp);
  const totalQGroup = groupCats.reduce((a, c) => a + catTotalQuestions(c), 0);
  const acc = overallAccuracy();
  const weak = weakestSubcat(state.activeApp);

  const q = state.homeSearch.trim().toLowerCase();
  const filtered = groupCats.filter((cat) => {
    if (
      q &&
      !(
        cat.title.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q)
      )
    )
      return false;
    if (state.homeFilter !== "all" && categoryStatus(cat) !== state.homeFilter)
      return false;
    return true;
  });

  const counts = { all: groupCats.length, new: 0, progress: 0, done: 0 };
  groupCats.forEach((cat) => counts[categoryStatus(cat)]++);

  const activeGroupMeta = getGroup(state.activeApp) || APP_GROUPS[0];

  let switcherHtml = `<div class="app-switcher">`;
  APP_GROUPS.forEach((g) => {
    const gCats = categoriesInGroup(g.id);
    const gTotal = gCats.reduce((a, c) => a + catTotalQuestions(c), 0);
    switcherHtml += `
      <button class="app-tab ${state.activeApp === g.id ? "active" : ""}" onclick="setActiveApp('${g.id}')">
        <span class="app-tab-icon">${g.icon}</span>
        <span class="app-tab-text">
          <span class="app-tab-label">${g.label}</span>
          <span class="app-tab-meta">${gCats.length} subjects &middot; ${gTotal} Qs</span>
        </span>
      </button>
    `;
  });
  switcherHtml += `</div>`;

  let html = `
    <div class="app-header">
      <span class="dwg-tag mono">DWG-INDEX &middot; CIVIL ENGINEERING QUIZ HUB</span>
      <h1 class="serif">Civil Engineering Objective Practice Questions</h1>
      <p>Switch between question-bank apps below. Progress, bookmarks, and mistake history are saved automatically on this device, per subject.</p>
    </div>
    ${switcherHtml}
    <div class="btn-row" style="margin:4px 0 6px;">
      <button class="btn secondary" onclick="openImportPanel()">&#8679; Import Subject From File</button>
      ${hiddenCategoryInfos().length ? `<button class="btn secondary" onclick="state.showHiddenPanel = !state.showHiddenPanel; render();">&#128193; Hidden Subjects (${hiddenCategoryInfos().length})</button>` : ""}
    </div>
    ${state.showImport ? renderImportPanel() : ""}
    ${state.showHiddenPanel ? renderHiddenSubjectsPanel() : ""}
    <div class="app-header" style="margin:22px 0 20px;">
      <span class="dwg-tag mono">${activeGroupMeta.icon} &middot; ${activeGroupMeta.label.toUpperCase()}</span>
      <p style="margin-top:2px;">${activeGroupMeta.blurb}</p>
    </div>
    <div class="stat-strip">
      <div class="stat-chip"><div class="num serif">${totalQGroup}</div><div class="lab mono">Questions In This App</div></div>
      <div class="stat-chip"><div class="num serif">${acc === null ? "—" : acc + "%"}</div><div class="lab mono">Overall Accuracy</div></div>
      <div class="stat-chip"><div class="num serif">${P.stats.bestStreak}</div><div class="lab mono">Best Streak</div></div>
      <div class="stat-chip"><div class="num serif">${P.stats.sessionsCompleted}</div><div class="lab mono">Sessions Done</div></div>
    </div>
    ${weak ? `<div class="empty-note" style="text-align:left;margin-bottom:18px;">🎯 <strong>Suggested focus:</strong> "${weak.name}" (${weak.catTitle}) &mdash; best score so far ${weak.pct}%.</div>` : ""}
    <div class="searchbar">
      <span class="icon mono">SEARCH</span>
      <input type="text" id="home-search-input" placeholder="Filter subjects by name or topic..." value="${escapeAttr(state.homeSearch)}" oninput="setHomeSearch(this.value)">
    </div>
    <div class="filter-chips mono">
      <button class="${state.homeFilter === "all" ? "active" : ""}" onclick="setHomeFilter('all')">All (${counts.all})</button>
      <button class="${state.homeFilter === "new" ? "active" : ""}" onclick="setHomeFilter('new')">Not Started (${counts.new})</button>
      <button class="${state.homeFilter === "progress" ? "active" : ""}" onclick="setHomeFilter('progress')">In Progress (${counts.progress})</button>
      <button class="${state.homeFilter === "done" ? "active" : ""}" onclick="setHomeFilter('done')">Attempted All (${counts.done})</button>
    </div>
    <div class="category-grid">
  `;
  if (filtered.length === 0) {
    html += `<div class="empty-note">No subjects match your filters.</div>`;
  } else {
    filtered.forEach((cat) => {
      const total = catTotalQuestions(cat);
      const attemptedSubs = catAttemptedSubCount(cat);
      const pct = Math.round((attemptedSubs / cat.subcats.length) * 100);
      const full = catBestFull(cat);
      html += `
        <div class="category-card" onclick="openCategory('${cat.id}')">
          <span class="cat-icon">${cat.icon}</span>
          <h2 class="serif">${cat.title}</h2>
          <p>${cat.description}</p>
          <div class="cat-progress-row"><span>${cat.subcats.length} topics &middot; ${total} Qs</span><span>${full ? `Best: ${full.pct}%` : "Not started"}</span></div>
          <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:${pct}%;"></div></div>
        </div>
      `;
    });
  }
  html += `</div>`;
  return html;
}

function renderCatHome() {
  const cat = getCategory(state.catId);
  const totalQ = catTotalQuestions(cat);
  const fullBest = (P.bestScores[cat.id] || {})["FULL"];
  const randomBest = (P.bestScores[cat.id] || {})["RANDOM"];
  const bookCount = (P.bookmarks[cat.id] || []).length;
  const missCount = Object.values(P.missCounts[cat.id] || {}).filter(
    (v) => v > 0,
  ).length;

  const q = state.search.trim().toLowerCase();
  const subcatsFiltered = cat.subcats
    .map((sc, i) => ({ sc, i }))
    .filter(
      ({ sc }) =>
        !q ||
        sc.name.toLowerCase().includes(q) ||
        sc.questions.some((qq) => qq.text.toLowerCase().includes(q)),
    );

  let html = `
    <div class="top-bar">
      <span class="back-link" onclick="goHome()">&larr; All Categories</span>
      <span class="back-link" onclick="openManage('${cat.id}')">&#9998; Manage Questions</span>
    </div>
    <div class="app-header">
      <span class="dwg-tag mono">${cat.icon} &middot; CATEGORY OVERVIEW</span>
      <h1 class="serif">${cat.title}</h1>
      <p>${cat.description}</p>
    </div>
    <div class="mode-toggle mono">
      <button class="${state.mode === "test" ? "active" : ""}" onclick="state.mode='test';render();">Test Mode</button>
      <button class="${state.mode === "practice" ? "active" : ""}" onclick="state.mode='practice';render();">Practice Mode</button>
    </div>
    <div class="dwg-card full-run-card" onclick="startQuiz(-1, state.mode)">
      <span class="dwg-tag mono">DWG-00 &middot; FULL CATEGORY RUN</span>
      <h2 class="serif">Full Category Run — All ${totalQ} Questions</h2>
      <div class="meta mono">${cat.subcats.length} subtopics, in original source order${fullBest ? ` &middot; Best: ${fullBest.correct}/${fullBest.total} (${fullBest.pct}%)` : ""}</div>
    </div>
    <div class="dwg-card full-run-card alt" onclick="startQuiz(-2, state.mode)">
      <span class="dwg-tag mono">DWG-R0 &middot; RANDOM DRAW</span>
      <h2 class="serif">Random 30 Questions</h2>
      <div class="meta mono">A fresh shuffled mix pulled from all ${totalQ} questions${randomBest ? ` &middot; Best: ${randomBest.correct}/${randomBest.total} (${randomBest.pct}%)` : ""}</div>
    </div>
    <div class="btn-row" style="margin-bottom:26px;">
      <button class="btn secondary" onclick="startQuiz(-3, state.mode)" ${bookCount === 0 ? "disabled" : ""}>&#9733; Review Bookmarked (${bookCount})</button>
      <button class="btn secondary" onclick="startQuiz(-4, state.mode)" ${missCount === 0 ? "disabled" : ""}>&#8635; Smart Review — Past Misses (${missCount})</button>
    </div>
    <div class="searchbar">
      <span class="icon mono">SEARCH</span>
      <input type="text" id="cat-search-input" placeholder="Filter subtopics or question text..." value="${escapeAttr(state.search)}" oninput="setSearch(this.value)">
    </div>
    <div class="subcat-grid">
  `;
  if (subcatsFiltered.length === 0) {
    html += `<div class="empty-note">No subtopics match "${escapeHtml(state.search)}".</div>`;
  } else {
    subcatsFiltered.forEach(({ sc, i }) => {
      const best = (P.bestScores[cat.id] || {})[String(i)];
      const pct = best ? best.pct : 0;
      html += `
        <div class="subcat-card" onclick="startQuiz(${i}, state.mode)">
          <span class="dwg-tag mono">DWG-0${i + 1}</span>
          <h3 class="serif">${sc.name}</h3>
          <div class="row">
            <span>${sc.questions.length} questions</span>
            ${best ? `<span class="best">${best.correct}/${best.total} (${best.pct}%)</span>` : "<span>Not attempted</span>"}
          </div>
          <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%;"></div></div>
        </div>
      `;
    });
  }
  html += `</div>`;
  return html;
}

function renderManage() {
  const cat = getCategory(state.catId);
  if (!cat) return `<div class="empty-note">Subject not found.</div>`;
  if (state.manageForm) return renderManageForm(cat);

  let html = `
    <div class="top-bar">
      <span class="back-link" onclick="closeManageToCategory()">&larr; ${escapeHtml(cat.title)}</span>
      <span class="back-link" onclick="exportCategoryData('${cat.id}')">&#8681; Export Data File</span>
    </div>
    <div class="app-header">
      <span class="dwg-tag mono">${cat.icon} &middot; MANAGE QUESTIONS</span>
      <h1 class="serif">${cat.title}</h1>
      <p>Add, edit or delete questions below. Changes save automatically in this browser. Use "Export Data File" to turn them into a real file you can drop into the project — that's the only way to make them permanent and visible on other devices.</p>
    </div>
  `;

  cat.subcats.forEach((sc, sIdx) => {
    html += `
      <div class="dwg-card">
        <div class="manage-subcat-head">
          <span class="dwg-tag mono">DWG-0${sIdx + 1} &middot; ${sc.questions.length} QUESTIONS</span>
          <button class="btn" onclick="openAddForm(${sIdx})">+ Add Question</button>
        </div>
        <h3 class="serif" style="margin:0 0 14px;text-transform:uppercase;">${escapeHtml(sc.name)}</h3>
        <div class="manage-q-list">
    `;
    if (sc.questions.length === 0) {
      html += `<div class="empty-note">No questions in this subtopic yet — add the first one above.</div>`;
    } else {
      sc.questions.forEach((q) => {
        const custom = isCustomQuestion(cat.id, sIdx, q.num);
        const edited = isEditedQuestion(cat.id, sIdx, q.num);
        html += `
          <div class="manage-q-row">
            <div class="manage-q-text">
              <span class="manage-q-num mono">#${q.num}</span>
              <span>${escapeHtml(q.text)}</span>
              ${custom ? '<span class="manage-badge new">NEW</span>' : ""}
              ${edited ? '<span class="manage-badge edited">EDITED</span>' : ""}
            </div>
            <div class="manage-q-actions">
              <button class="btn secondary small" onclick="openEditForm(${sIdx}, ${q.num})">Edit</button>
              <button class="btn secondary small danger" onclick="confirmDeleteQuestion(${sIdx}, ${q.num})">Delete</button>
            </div>
          </div>
        `;
      });
    }
    html += `</div></div>`;
  });

  html += `
    <div class="btn-row" style="margin-top:6px;">
      <button class="btn secondary" onclick="confirmResetOverrides()">Reset This Subject To Original</button>
      <button class="btn secondary danger" onclick="confirmRemoveCategory()">Remove This Subject</button>
    </div>
  `;
  return html;
}

function renderManageForm(cat) {
  const f = state.manageForm;
  const isEdit = f.mode === "edit";

  const subcatOptionsHtml = cat.subcats
    .map(
      (sc, i) =>
        `<option value="${i}" ${i === f.subIdx ? "selected" : ""}>${escapeHtml(sc.name)}</option>`,
    )
    .join("");

  let optionsHtml = "";
  for (let i = 0; i < 4; i++) {
    optionsHtml += `
      <div class="mf-option-row">
        <label class="mf-radio" title="Mark as the correct answer">
          <input type="radio" name="mf-correct" ${f.correct === i ? "checked" : ""} onchange="setFormCorrect(${i})">
          <span class="option-letter">${letterOf(i)}</span>
        </label>
        <input type="text" id="mf-opt-${i}" class="mf-input" placeholder="Option ${letterOf(i)} text" value="${escapeAttr(f.options[i])}" oninput="setFormOption(${i}, this.value)">
      </div>
    `;
  }

  return `
    <div class="top-bar">
      <span class="back-link" onclick="closeManageForm()">&larr; Cancel</span>
    </div>
    <div class="dwg-card">
      <span class="dwg-tag mono">${isEdit ? "EDIT QUESTION #" + f.num : "ADD NEW QUESTION"}</span>
      <div class="mf-field">
        <label class="mf-label mono">Subtopic</label>
        <select id="mf-subidx" class="mf-select" onchange="setFormSubIdx(this.value)" ${isEdit ? 'disabled title="Subtopic can\'t be changed when editing — delete and re-add under a different subtopic if needed."' : ""}>${subcatOptionsHtml}</select>
      </div>
      <div class="mf-field">
        <label class="mf-label mono">Question text</label>
        <textarea id="mf-text" class="mf-textarea" rows="3" placeholder="Type the question..." oninput="setFormField('text', this.value)">${escapeHtml(f.text)}</textarea>
      </div>
      <div class="mf-field">
        <label class="mf-label mono">Options — tap the letter to mark the correct one</label>
        ${optionsHtml}
      </div>
      <div class="mf-field">
        <label class="mf-label mono">Explanation (shown after answering)</label>
        <textarea id="mf-expl" class="mf-textarea" rows="2" placeholder="Why is the correct answer correct?" oninput="setFormField('expl', this.value)">${escapeHtml(f.expl)}</textarea>
      </div>
      <div class="btn-row">
        <button class="btn" onclick="submitManageForm()">${isEdit ? "Save Changes" : "Add Question"}</button>
        <button class="btn secondary" onclick="closeManageForm()">Cancel</button>
      </div>
    </div>
  `;
}

function specialLabel(sIdx) {
  if (sIdx === -1) return "Full Category Run";
  if (sIdx === -2) return "Random 30";
  if (sIdx === -3) return "Bookmarked Review";
  if (sIdx === -4) return "Smart Review";
  return null;
}

function renderQuiz() {
  const qz = state.quiz;
  const cat = getCategory(qz.catId);
  const item = currentItem();
  const q = item.q;
  const spec = specialLabel(qz.subIdx);
  const topicLabel = spec ? item.subName : cat.subcats[qz.subIdx].name;

  let progressLabel,
    scoreBadge = "",
    progressPct = 0;
  if (qz.mode === "test") {
    progressLabel = `Question ${qz.pos + 1} of ${qz.total}`;
    scoreBadge = `<span class="score-badge">Score: ${qz.score}/${qz.pos + (qz.answered ? 1 : 0)}</span>`;
    progressPct = Math.round(
      ((qz.pos + (qz.answered ? 1 : 0)) / qz.total) * 100,
    );
  } else {
    progressLabel = `Mastered ${qz.mastered} of ${qz.totalUnique}`;
    scoreBadge = `<span class="score-badge">Attempts: ${qz.attempts}</span>`;
    progressPct = Math.round((qz.mastered / qz.totalUnique) * 100);
  }

  let optsHtml = "";
  q.options.forEach((opt, idx) => {
    let cls = "option-row";
    let stamp = "";
    if (qz.answered) {
      if (idx === q.correct) {
        cls += " correct";
        stamp = '<span class="stamp stamp-ok">&#10003; VERIFIED</span>';
      } else if (idx === qz.selected) {
        cls += " wrong";
        stamp = '<span class="stamp stamp-no">&#10007; REVISE</span>';
      } else cls += " dim";
    }
    optsHtml += `
      <div class="${cls}" onclick="selectOption(${idx})">
        ${stamp}
        <span class="option-letter">${letterOf(idx)}</span>
        <span>${opt}</span>
      </div>
    `;
  });

  let explainHtml = "";
  if (qz.answered) {
    const wasCorrect = qz.selected === q.correct;
    explainHtml = `
      <div class="explain-box">
        <span class="label mono">${wasCorrect ? "Correct" : "Explanation"} &middot; Answer: ${letterOf(q.correct)}</span>
        ${q.expl}
        ${qz.mode === "practice" && !wasCorrect ? '<div class="practice-note">This question will resurface later in the queue.</div>' : ""}
      </div>
    `;
  }

  const bookmarked = isBookmarked(cat.id, item.subIdx, q.num);

  return `
    <div class="top-bar">
      <span class="back-link" onclick="goHome()">&larr; Home</span>
      ${scoreBadge}
    </div>
    <div class="eyebrow">
      <span>${topicLabel} &middot; ${progressLabel}</span>
      <span>Source #${q.num} &middot; ${qz.mode === "test" ? "TEST" : "PRACTICE"} MODE</span>
    </div>
    <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progressPct}%;"></div></div>
    <div class="dwg-card">
      <div class="q-head-row">
        <p class="question-text">${q.text}</p>
        <button class="bookmark-btn ${bookmarked ? "active" : ""}" title="Bookmark this question" onclick="toggleBookmark(${item.subIdx}, ${q.num})">&#9733;</button>
      </div>
      <div class="options ${qz.answered ? "answered" : ""}">${optsHtml}</div>
      <div class="kbd-hint mono">Tip: press <kbd>1</kbd>-<kbd>4</kbd> or <kbd>A</kbd>-<kbd>D</kbd> to answer, <kbd>Enter</kbd> for next.</div>
      ${explainHtml}
      <div class="btn-row end">
        <button class="btn" onclick="nextQuestion()" ${qz.answered ? "" : "disabled"}>Next &rarr;</button>
      </div>
    </div>
  `;
}

function renderResult() {
  const qz = state.quiz;
  const pct = Math.round((qz.score / qz.total) * 100);
  let verdict;
  if (pct >= 85) verdict = "Excellent command of this material.";
  else if (pct >= 65)
    verdict = "Solid grasp — a bit more review will sharpen the gaps.";
  else if (pct >= 40)
    verdict = "Foundations are forming — revisit the missed concepts below.";
  else
    verdict =
      "This topic needs focused revision — work through the review list below.";

  let reviewHtml = "";
  if (qz.missed.length === 0) {
    reviewHtml = `<p class="mono" style="color:var(--correct);">No missed questions — perfect run.</p>`;
  } else {
    qz.missed.forEach((m) => {
      reviewHtml += `
        <div class="review-item">
          <div class="rq serif">${m.item.q.text}</div>
          <div class="ra wrong-ans mono">Your answer: ${letterOf(m.selected)}) ${m.item.q.options[m.selected]}</div>
          <div class="ra right-ans mono">Correct: ${letterOf(m.item.q.correct)}) ${m.item.q.options[m.item.q.correct]}</div>
        </div>
      `;
    });
  }

  const elapsed = Math.max(1, Math.round((Date.now() - qz.startTime) / 1000));
  const mins = Math.floor(elapsed / 60),
    secs = elapsed % 60;

  return `
    <div class="top-bar">
      <span class="back-link" onclick="goHome()">&larr; Home</span>
    </div>
    <div class="dwg-card">
      <span class="dwg-tag mono">RESULT &middot; TEST MODE</span>
      <p class="result-score serif">${qz.score}/${qz.total}</p>
      <p class="result-pct mono">${pct}% &middot; ${mins}m ${secs}s</p>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div>
      <p class="verdict">${verdict}</p>
      <div class="btn-row">
        <button class="btn" onclick="retrySame()">Retry</button>
        <button class="btn secondary" onclick="exportResult('test')">Export Summary</button>
        <button class="btn secondary" onclick="goHome()">Home</button>
      </div>
    </div>
    <div class="review-list">
      <span class="dwg-tag mono">MISSED QUESTIONS (${qz.missed.length})</span>
      ${reviewHtml}
    </div>
  `;
}

function renderPracticeResult() {
  const qz = state.quiz;
  const retryEntries = Object.entries(qz.retryCounts);
  const cat = getCategory(qz.catId);
  let retryHtml = "";
  if (retryEntries.length === 0) {
    retryHtml = `<p class="mono" style="color:var(--correct);">Every question was answered correctly on the first try.</p>`;
  } else {
    retryEntries.forEach(([key, count]) => {
      const [sIdx, qNum] = key.split("-");
      const sc = cat.subcats[parseInt(sIdx)];
      const q = sc ? sc.questions.find((qq) => qq.num == qNum) : null;
      retryHtml += `<div class="retry-item"><span>${sc ? sc.name : "—"} &middot; Source #${qNum}</span><span>${count} ${count === 1 ? "retry" : "retries"}</span></div>`;
    });
  }
  return `
    <div class="top-bar">
      <span class="back-link" onclick="goHome()">&larr; Home</span>
    </div>
    <div class="dwg-card">
      <span class="dwg-tag mono">RESULT &middot; PRACTICE MODE</span>
      <p class="result-score serif">Mastered</p>
      <div class="stat-grid">
        <div class="stat-box"><div class="num serif">${qz.totalUnique}</div><div class="lab mono">Questions Mastered</div></div>
        <div class="stat-box"><div class="num serif">${qz.attempts}</div><div class="lab mono">Total Attempts</div></div>
        <div class="stat-box"><div class="num serif">${qz.firstTryCorrect}</div><div class="lab mono">Correct First Try</div></div>
      </div>
      <div class="btn-row">
        <button class="btn" onclick="retrySame()">Retry</button>
        <button class="btn secondary" onclick="exportResult('practice')">Export Summary</button>
        <button class="btn secondary" onclick="goHome()">Home</button>
      </div>
    </div>
    <div class="review-list">
      <span class="dwg-tag mono">QUESTIONS THAT NEEDED REPEATS</span>
      ${retryHtml}
    </div>
  `;
}

// ---------------- EXPORT ----------------
function exportResult(kind) {
  const qz = state.quiz;
  const cat = getCategory(qz.catId);
  let lines = [];
  lines.push(`${cat.title} — ${kind === "test" ? "Test" : "Practice"} Result`);
  lines.push(new Date().toLocaleString());
  lines.push("");
  if (kind === "test") {
    const pct = Math.round((qz.score / qz.total) * 100);
    lines.push(`Score: ${qz.score}/${qz.total} (${pct}%)`);
    lines.push("");
    if (qz.missed.length) {
      lines.push("Missed questions:");
      qz.missed.forEach((m) => {
        lines.push(`- ${m.item.q.text}`);
        lines.push(
          `  Your answer: ${letterOf(m.selected)}) ${m.item.q.options[m.selected]}`,
        );
        lines.push(
          `  Correct: ${letterOf(m.item.q.correct)}) ${m.item.q.options[m.item.q.correct]}`,
        );
      });
    } else {
      lines.push("No missed questions — perfect run.");
    }
  } else {
    lines.push(`Mastered: ${qz.totalUnique}`);
    lines.push(`Total attempts: ${qz.attempts}`);
    lines.push(`Correct on first try: ${qz.firstTryCorrect}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cat.id}-${kind}-result.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Regenerates a complete data/*.js file for a category (original questions
// plus any adds/edits, minus any deletes) so changes made in "Manage
// Questions" can be saved permanently and shared across devices — since
// everything else lives only in this browser's localStorage.
function exportCategoryData(catId) {
  const cat = getCategory(catId);
  if (!cat) return;
  const info = CATEGORY_SOURCE_INFO[catId];
  const varName = info
    ? info.varName
    : "QUIZ_CATEGORY_" + catId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const path = info ? info.path : `data/${catId}.js`;

  // Strip the "icon"/"group" fields we attach at runtime — the source files
  // only contain id/title/description/subcats.
  const exportable = {
    id: cat.id,
    title: cat.title,
    description: cat.description,
    subcats: cat.subcats,
  };

  const lines = [];
  lines.push(
    `// ${cat.title} — exported from the in-app question manager on ${new Date().toLocaleString()}`,
  );
  lines.push(`// This file replaces: ${path}`);
  lines.push(`window.${varName} = ${JSON.stringify(exportable)};`);
  lines.push("");

  const blob = new Blob([lines.join("\n")], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = path.split("/").pop();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(
    "Downloaded — replace " + path + " in your project with this file.",
  );
}

// ---------------- MISC UTIL ----------------
function escapeHtml(s) {
  return (s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function escapeAttr(s) {
  return escapeHtml(s);
}

render();
