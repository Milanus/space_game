import { buildMaze, solve } from '/Users/milan/code/kids_space_game/js/games/maze.js';
import { makeScene, applyDiffs } from '/Users/milan/code/kids_space_game/js/games/differences.js';
import { detectLang, DICT, LANGS } from '/Users/milan/code/kids_space_game/js/i18n.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

for (const n of [4,5,6,7]) {
  for (let t = 0; t < 300; t++) {
    const g = buildMaze(n);
    const p = solve(g, n);
    ok(p[0][0] === 0 && p[0][1] === 0, `start ${n}`);
    ok(p.at(-1)[0] === n-1 && p.at(-1)[1] === n-1, `goal ${n}`);
    for (let i = 1; i < p.length; i++) {
      const [x0,y0] = p[i-1], [x1,y1] = p[i];
      const d = Math.abs(x1-x0)+Math.abs(y1-y0);
      ok(d === 1, `krok ${n}`);
      const dir = x1>x0?'E':x1<x0?'W':y1>y0?'S':'N';
      ok(g[y0][x0][dir] === false, `stena v ceste ${n}`);
    }
    // hviezdy podla rovnakej logiky ako v hre
    const inner = p.slice(1,-1);
    const stars = [];
    for (let i=1;i<=3 && inner.length;i++){
      const idx = Math.min(inner.length-1, Math.floor((inner.length*i)/4));
      const [sx,sy]=inner[idx];
      if(!stars.some(s=>s.x===sx&&s.y===sy)) stars.push({x:sx,y:sy});
    }
    ok(stars.length >= 1, `aspon 1 hviezda ${n}`);
    ok(stars.every(s => p.some(([x,y]) => x===s.x && y===s.y)), `hviezda na ceste ${n}`);
  }
}

for (const count of [3,4,5]) {
  for (let t=0;t<300;t++){
    const scene = makeScene(Math.max(6, count+3));
    const { b, diffs } = applyDiffs(scene, count);
    ok(new Set(diffs).size === count, 'pocet rozdielov');
    ok(scene.length === b.length, 'rovnaky pocet objektov');
    for (let i=0;i<scene.length;i++){
      const changed = b[i].hidden || b[i].color!==scene[i].color || b[i].size!==scene[i].size || b[i].flip!==scene[i].flip;
      ok(diffs.includes(i) ? changed : !changed, `objekt ${i} zmena sedi`);
    }
    // objekty sa neprekryvaju natolko, aby sa nedali klepnut
    for (let i=0;i<scene.length;i++) for (let j=i+1;j<scene.length;j++){
      const d = Math.hypot(scene[i].x-scene[j].x, scene[i].y-scene[j].y);
      ok(d > 12, `odstup objektov ${d.toFixed(1)}`);
    }
  }
}
console.log(fails ? `${fails} FAILS` : 'vsetko OK');

/* ---- pribudnute minihry ---- */
const R = '/Users/milan/code/kids_space_game/js/games';
const { makeRound: countRound } = await import(`${R}/counting.js`);
const { makeRound: seqRound } = await import(`${R}/sequence.js`);
const { makeRound: letterRound } = await import(`${R}/letters.js`);
const { FIGURES } = await import(`${R}/tangram.js`);

for (const max of [3, 4, 6, 8]) {
  for (let t = 0; t < 300; t++) {
    const { count, options } = countRound(max);
    ok(count >= 1 && count <= max, `pocitanie: pocet v rozsahu (${count}/${max})`);
    ok(options.includes(count), 'pocitanie: spravna odpoved je medzi moznostami');
    ok(new Set(options).size === 3, 'pocitanie: 3 rozne moznosti');
  }
}

const SEQ_LEVELS = [
  { pattern: [0, 1], len: 6, gapAtEnd: true },
  { pattern: [0, 0, 1], len: 6, gapAtEnd: true },
  { pattern: [0, 1, 2], len: 6, gapAtEnd: false },
  { pattern: [0, 1, 1, 2], len: 8, gapAtEnd: false },
];
for (const lvl of SEQ_LEVELS) {
  for (let t = 0; t < 300; t++) {
    const r = seqRound(lvl);
    ok(r.row.length === lvl.len, 'postupnost: dlzka radu');
    ok(r.row.every((v, i) => v === lvl.pattern[i % lvl.pattern.length]), 'postupnost: rad sedi so vzorom');
    ok(r.gap >= lvl.pattern.length && r.gap < lvl.len, `postupnost: medzera az po prvom opakovani (${r.gap})`);
    ok(r.answer === r.row[r.gap], 'postupnost: odpoved je to, co v medzere chyba');
    ok(r.options.includes(r.answer), 'postupnost: odpoved je medzi moznostami');
    ok(r.options.length >= 3, `postupnost: aspon 3 moznosti (${r.options.length})`);
    ok(new Set(r.kinds).size === r.kinds.length, 'postupnost: kazdy tvar iny');
  }
}

for (const n of [2, 3, 4]) {
  for (let t = 0; t < 300; t++) {
    const r = letterRound(n);
    ok(r.correct === r.word[0].toUpperCase(), `pismena: prve pismeno slova ${r.word}`);
    ok(r.options.includes(r.correct), 'pismena: spravne pismeno je medzi moznostami');
    ok(new Set(r.options).size === n, `pismena: ${n} roznych moznosti`);
  }
}

ok(FIGURES.length === 4, 'skladanie: 4 obrazky');
for (const f of FIGURES) {
  ok(f.parts.length >= 3, `skladanie: ${f.name} ma aspon 3 dieliky`);
  for (const p of f.parts) {
    ok(p.length >= 3, `skladanie: ${f.name} - dielik je mnohouholnik`);
    ok(p.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100), `skladanie: ${f.name} - dielik v ploche`);
  }
}
// --- jazyky ---
ok(detectLang({ languages: ['sk-SK', 'en'] }) === 'sk', 'jazyk: sk-SK -> sk');
ok(detectLang({ languages: ['cs-CZ'] }) === 'cs', 'jazyk: cs-CZ -> cs');
ok(detectLang({ languages: ['en-GB'] }) === 'en', 'jazyk: en-GB -> en');
ok(detectLang({ languages: ['de-DE', 'pl'] }) === 'sk', 'jazyk: neznamy -> slovencina');
ok(detectLang({ languages: ['de', 'cs'] }) === 'cs', 'jazyk: prvy znamy zo zoznamu');
ok(detectLang({ language: 'cs-CZ' }) === 'cs', 'jazyk: aj bez pola languages');
ok(detectLang({}) === 'sk', 'jazyk: bez udaju -> slovencina');

const sk = Object.keys(DICT.sk);
for (const l of LANGS) {
  ok(Object.keys(DICT[l]).length === sk.length, `jazyk ${l}: rovnaky pocet klucov`);
  for (const k of sk) ok(DICT[l][k], `jazyk ${l}: chyba preklad ${k}`);
}

/* ---- ULOZENY POSTUP (hviezdy, urovne, zvuk) ---- */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
};
const KEY = 'vesmirne-hadanky';
const { loadProgress, saveStars, saveLevel, saveSound } =
  await import('/Users/milan/code/kids_space_game/js/util.js');

ok(loadProgress().sound === true, 'ulozenie: zvuk je vychodzo zapnuty');
ok(Object.keys(loadProgress().levels).length === 0, 'ulozenie: bez uloh ziadne urovne');

saveStars('pairs', 2);
saveStars('pairs', 1);
ok(loadProgress().stars.pairs === 2, 'ulozenie: horsi vysledok neprepise lepsi');
saveStars('pairs', 3);
ok(loadProgress().stars.pairs === 3, 'ulozenie: lepsi vysledok sa zapise');

saveLevel('maze', 2);
ok(loadProgress().levels.maze === 2, 'ulozenie: uroven sa zapise');
saveLevel('maze', 1);
ok(loadProgress().levels.maze === 1, 'ulozenie: uroven sa da vratit na lahsiu');

saveSound(false);
ok(loadProgress().sound === false, 'ulozenie: vypnuty zvuk sa pamata');
ok(loadProgress().stars.pairs === 3, 'ulozenie: zvuk neprepise hviezdy');

// stary format (hviezdy priamo v korenovom objekte) musi ostat citatelny
store.set(KEY, JSON.stringify({ pairs: 3, maze: 1 }));
const old = loadProgress();
ok(old.stars.pairs === 3 && old.stars.maze === 1, 'ulozenie: stary format sa nacita ako hviezdy');
ok(old.sound === true, 'ulozenie: stary format ma zvuk zapnuty');

store.set(KEY, 'nie je json');
ok(loadProgress().stars.pairs === undefined, 'ulozenie: rozbity zapis nezhodi hru');

console.log(fails ? `${fails} FAILS` : 'vsetko OK (aj nove hry)');
process.exit(fails ? 1 : 0);
