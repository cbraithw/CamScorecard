const $ = (id) => document.getElementById(id);

function median(nums) {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/**
 * Placeholder course + history.
 * Next step: load this from a course config + real saved rounds.
 */
const course = {
  holes: Array.from({ length: 18 }, (_, i) => {
    const n = i + 1;
    const par = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5][i] ?? 4;
    const yards = [410, 395, 165, 520, 405, 372, 185, 410, 535, 402, 415, 175, 510, 390, 420, 160, 405, 525][i] ?? 400;
    const hcp = [7, 11, 15, 3, 1, 13, 17, 9, 5, 8, 2, 16, 4, 12, 6, 18, 10, 14][i] ?? n;
    return { n, par, yards, hcp };
  }),
  historyByHole: {
    1: [5, 4, 6, 4, 5, 4, 7, 5],
    2: [4, 5, 4, 6, 5, 4],
    3: [3, 4, 3, 5, 4],
  },
};

function keyForHole(holeNumber) {
  return `round:v1:hole:${holeNumber}`;
}

function getHoleNumber() {
  const url = new URL(window.location.href);
  const n = Number(url.searchParams.get("hole") || "1");
  return Number.isFinite(n) && n >= 1 && n <= 18 ? n : 1;
}

function setHoleNumber(n) {
  const url = new URL(window.location.href);
  url.searchParams.set("hole", String(n));
  window.history.replaceState({}, "", url.toString());
  $("holeNumber").textContent = String(n);
}

function computeRoundTotals() {
  let total = 0;
  let totalPar = 0;

  for (const hole of course.holes) {
    totalPar += hole.par;
    const raw = localStorage.getItem(keyForHole(hole.n));
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const s = Number(data.score);
      if (Number.isFinite(s) && s > 0) total += s;
    } catch {}
  }
  return { total, totalPar, toPar: total - totalPar };
}

function formatToPar(x) {
  if (!Number.isFinite(x) || x === 0) return "(E)";
  return x > 0 ? `(+${x})` : `(${x})`;
}

function holeToParText(holePar, score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return "E";
  const rel = s - holePar;
  if (rel === 0) return "E";
  return rel > 0 ? `+${rel}` : `${rel}`;
}

function updateHoleToParPill(holePar, score) {
  const pill = $("holeToParPill");
  if (!pill) return;
  pill.textContent = holeToParText(holePar, score);
}

function computeNearGirSuggestion(holePar, score, putts) {
  // Defaulted unchecked unless score - putts <= par - 2
  const s = Number(score);
  const p = Number(putts);
  if (!Number.isFinite(s) || !Number.isFinite(p)) return false;
  return s - p <= holePar - 2;
}

function setReadonlyMeta(hole) {
  $("parValue").textContent = String(hole.par);
  $("yardsValue").textContent = String(hole.yards);
  $("hcpValue").textContent = String(hole.hcp);
}

function setPreviousStats(holeNumber) {
  const scores = course.historyByHole[holeNumber] || [];
  if (!scores.length) {
    for (const id of ["prevLow", "prevMed", "prevHigh", "prevLow2", "prevMed2", "prevHigh2"]) {
      const el = $(id);
      if (el) el.textContent = "—";
    }
    return;
  }

  const low = Math.min(...scores);
  const med = median(scores);
  const high = Math.max(...scores);

  const medText = med == null ? "—" : Number.isInteger(med) ? String(med) : med.toFixed(1);

  $("prevLow").textContent = String(low);
  $("prevMed").textContent = medText;
  $("prevHigh").textContent = String(high);

  $("prevLow2").textContent = String(low);
  $("prevMed2").textContent = medText;
  $("prevHigh2").textContent = String(high);
}

function setRoundSummary() {
  const { total, toPar } = computeRoundTotals();
  $("roundTotal").textContent = String(total);
  $("roundToPar").textContent = formatToPar(toPar);
}

function updateScoreHint(holePar, score) {
  const el = $("scoreHint");
  if (!el) return;

  const s = Number(score);
  if (!Number.isFinite(s)) {
    el.textContent = "";
    return;
  }

  const rel = s - holePar;
  el.textContent = rel === 0 ? "E on this hole" : rel > 0 ? `+${rel} on this hole` : `${rel} on this hole`;
}

function defaultsForHole(holePar) {
  return {
    score: holePar,
    putts: 2,
    penalties: 0,
    fairway: "",

    nearGir: false,
    badThreePutt: false,
    terribleTee: false,

    scrambling: "none",

    lostDriver: 0,
    lostIrons: 0,
    lostChipping: 0,
    lostBunkers: 0,
    lostPutting: 0,

    nearGirTouched: false,
  };
}

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Pills (segmented buttons) **/
function setPillActive(group, value) {
  const buttons = document.querySelectorAll(`.pillBtn[data-seg="${group}"]`);
  buttons.forEach((b) => b.classList.toggle("active", b.dataset.value === value));
}

function getPillValue(group) {
  return document.querySelector(`.pillBtn.active[data-seg="${group}"]`)?.dataset.value;
}

function ensureDefaultPills() {
  // Ensure defaults exist if nothing active yet
  if (getPillValue("scrambling") == null) setPillActive("scrambling", "none");
  if (getPillValue("fairway") == null) setPillActive("fairway", "");
}

function readFormState() {
  const fairwayHidden = $("fairway")?.value ?? "";
  const fairwayPill = getPillValue("fairway");
  const fairway = fairwayPill != null ? fairwayPill : fairwayHidden;

  const scrambling = getPillValue("scrambling") ?? "none";

  return {
    score: Number($("score").value),
    putts: Number($("putts").value),
    penalties: Number($("penalties").value),

    fairway,

    nearGir: $("nearGir").checked,
    badThreePutt: $("badThreePutt").checked,
    terribleTee: $("terribleTee").checked,

    scrambling,

    lostDriver: Number($("lostDriver").value),
    lostIrons: Number($("lostIrons").value),
    lostChipping: Number($("lostChipping").value),
    lostBunkers: Number($("lostBunkers").value),
    lostPutting: Number($("lostPutting").value),

    nearGirTouched: window.__nearGirTouched === true,
  };
}

function writeFormState(state) {
  $("score").value = String(state.score);
  $("putts").value = String(state.putts);
  $("penalties").value = String(state.penalties);

  // Fairway pills + hidden input
  const fairway = state.fairway ?? "";
  if ($("fairway")) $("fairway").value = fairway;
  setPillActive("fairway", fairway);

  $("nearGir").checked = !!state.nearGir;
  $("badThreePutt").checked = !!state.badThreePutt;
  $("terribleTee").checked = !!state.terribleTee;

  setPillActive("scrambling", state.scrambling ?? "none");

  $("lostDriver").value = String(state.lostDriver ?? 0);
  $("lostIrons").value = String(state.lostIrons ?? 0);
  $("lostChipping").value = String(state.lostChipping ?? 0);
  $("lostBunkers").value = String(state.lostBunkers ?? 0);
  $("lostPutting").value = String(state.lostPutting ?? 0);

  window.__nearGirTouched = !!state.nearGirTouched;
}

function updateDerived() {
  const n = getHoleNumber();
  const holePar = course.holes[n - 1].par;

  const score = Number($("score").value);
  const putts = Number($("putts").value);

  updateScoreHint(holePar, score);
  updateHoleToParPill(holePar, score);

  // Auto-set Near GIR until user manually toggles it
  if (!window.__nearGirTouched) {
    $("nearGir").checked = computeNearGirSuggestion(holePar, score, putts);
  }
}

function loadHole(n) {
  setHoleNumber(n);

  const hole = course.holes[n - 1];
  setReadonlyMeta(hole);
  setPreviousStats(n);

  const raw = localStorage.getItem(keyForHole(n));
  const base = defaultsForHole(hole.par);

  let state = base;
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state = { ...base, ...saved };
    } catch {}
  }

  // Ensure numeric defaults if missing
  state.score = Number.isFinite(Number(state.score)) ? Number(state.score) : hole.par;
  state.putts = Number.isFinite(Number(state.putts)) ? Number(state.putts) : 2;
  state.penalties = Number.isFinite(Number(state.penalties)) ? Number(state.penalties) : 0;

  // Near GIR default logic if user hasn't touched it yet
  if (!state.nearGirTouched) {
    state.nearGir = computeNearGirSuggestion(hole.par, state.score, state.putts);
  }

  writeFormState(state);
  ensureDefaultPills();
  updateDerived();
  setRoundSummary();

  const status = $("status");
  if (status) status.textContent = "";
}

function saveHole() {
  const n = getHoleNumber();
  const state = readFormState();
  localStorage.setItem(keyForHole(n), JSON.stringify(state));

  const status = $("status");
  if (status) status.textContent = `Saved hole ${n} ✓`;

  setRoundSummary();
}

function goToHole(n) {
  const next = clamp(n, 1, 18);
  loadHole(next);
}

function nextHole() {
  const n = getHoleNumber();
  goToHole(n === 18 ? 1 : n + 1);
}

function prevHole() {
  const n = getHoleNumber();
  goToHole(n === 1 ? 18 : n - 1);
}

function onStepperClick(e) {
  const btn = e.target.closest(".stepBtn");
  if (!btn) return;

  const id = btn.dataset.stepper;
  const delta = Number(btn.dataset.delta);
  const input = $(id);
  if (!input) return;

  const min = input.min === "" ? -Infinity : Number(input.min);
  const max = input.max === "" ? Infinity : Number(input.max);
  const curr = Number(input.value);

  const next = clamp((Number.isFinite(curr) ? curr : 0) + delta, min, max);
  input.value = String(next);

  updateDerived();
}

function onPillClick(e) {
  const btn = e.target.closest(".pillBtn");
  if (!btn) return;

  const group = btn.dataset.seg;
  const value = btn.dataset.value;

  setPillActive(group, value);

  // keep hidden fairway input in sync
  if (group === "fairway" && $("fairway")) $("fairway").value = value;
}

window.addEventListener("load", () => {
  // If you're versioning sw.js URL, keep your current line here.
  // Example: navigator.serviceWorker.register("./sw.js?v=2").catch(() => {});
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js?v=3").catch(() => {});
  }

  // Stepper (+/-)
  document.addEventListener("click", onStepperClick);

  // Pill buttons
  document.addEventListener("click", onPillClick);

  // Mark Near GIR as "touched" if user manually changes it
  $("nearGir").addEventListener("change", () => {
    window.__nearGirTouched = true;
  });

  // If score/putts edited manually (keyboard), update derived rule + hint
  $("score").addEventListener("input", updateDerived);
  $("putts").addEventListener("input", updateDerived);

  $("saveBtn").addEventListener("click", saveHole);

  // Two "Next" buttons now (top + sticky)
  $("nextHoleBtn")?.addEventListener("click", nextHole);
  $("nextHoleBtn2")?.addEventListener("click", nextHole);

  // New "Prev" button (sticky)
  $("prevHoleBtn")?.addEventListener("click", prevHole);

  loadHole(getHoleNumber());
});
