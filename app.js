const $ = (id) => document.getElementById(id);

const fields = ["par", "score", "putts", "fairway", "gir", "notes"];

function keyForHole(holeNumber) {
  return `hole:${holeNumber}`;
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

function loadHole(n) {
  setHoleNumber(n);
  const raw = localStorage.getItem(keyForHole(n));
  const data = raw ? JSON.parse(raw) : {};
  for (const f of fields) $(f).value = data[f] ?? "";
  $("status").textContent = "";
}

function saveHole() {
  const n = getHoleNumber();
  const data = {};
  for (const f of fields) data[f] = $(f).value;

  localStorage.setItem(keyForHole(n), JSON.stringify(data));
  $("status").textContent = `Saved hole ${n} ✓`;
}

function nextHole() {
  const n = getHoleNumber();
  const next = n === 18 ? 1 : n + 1;
  loadHole(next);
}

window.addEventListener("load", () => {
  loadHole(getHoleNumber());

  $("saveBtn").addEventListener("click", saveHole);
  $("nextHoleBtn").addEventListener("click", nextHole);

  // Register service worker (offline + installability signals)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
