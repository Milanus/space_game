export const rand = (n) => Math.floor(Math.random() * n);
export const pick = (arr) => arr[rand(arr.length)];

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// nahodne cislo v rozsahu, vratane min
export const between = (min, max) => min + Math.random() * (max - min);

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const KEY = 'vesmirne-hadanky';

// Ulozeny stav: { stars: {id: 1-3}, levels: {id: index}, sound: bool }.
// Stara verzia mala hviezdy priamo v korenovom objekte ({pairs: 3}) - to este vieme nacitat.
export function loadProgress() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch { /* rozbity zapis - zacneme odznova */ }
  if (typeof raw !== 'object' || raw === null) raw = {};

  const stars = raw.stars && typeof raw.stars === 'object'
    ? raw.stars
    : Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'number'));

  return {
    stars,
    levels: raw.levels && typeof raw.levels === 'object' ? raw.levels : {},
    sound: raw.sound !== false,
  };
}

function save(patch) {
  const p = { ...loadProgress(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* private mode - nevadi, hra bezi dalej */ }
}

export function saveStars(gameId, stars) {
  const p = loadProgress();
  if ((p.stars[gameId] || 0) < stars) save({ stars: { ...p.stars, [gameId]: stars } });
}

// pamatame si naposledy hranu uroven, aby dieta nezacinalo stale od zaciatku;
// bodky v menu ju vedia posunut aj spat na lahsiu
export function saveLevel(gameId, level) {
  save({ levels: { ...loadProgress().levels, [gameId]: level } });
}

export const saveSound = (on) => save({ sound: !!on });
