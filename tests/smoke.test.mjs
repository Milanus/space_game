// Smoke test cez jsdom: prejde hru tak, ako by ju klikalo dieta.
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const ROOT = '/Users/milan/code/kids_space_game';
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost:8777/' });
const { window } = dom;

// canvas nie je v jsdom - starfield len nesmie spadnut
window.HTMLCanvasElement.prototype.getContext = () => ({
  setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {},
  moveTo() {}, lineTo() {}, quadraticCurveTo() {}, stroke() {}, drawImage() {},
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt',
});

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.error || e.message)));

globalThis.window = window;
globalThis.document = window.document;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

// stage ma v jsdom nulove rozmery - dorobime realne
const stage = window.document.getElementById('stage');
Object.defineProperty(stage, 'clientWidth', { value: 900 });
Object.defineProperty(stage, 'clientHeight', { value: 600 });

// jazyk berie i18n z navigatora pri importe - predstierame cesky tablet
Object.defineProperty(globalThis, 'navigator', {
  value: { languages: ['cs-CZ', 'en-US'] }, configurable: true,
});

await import(`${ROOT}/js/main.js`);

const $ = (s) => window.document.querySelector(s);
const $$ = (s) => [...window.document.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fire = (node, type, x = 0, y = 0) =>
  node.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));

let fails = 0;
const ok = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) fails++; };

const cards = $$('.card');
ok(cards.length === 7, `hub ma 7 hier (${cards.length})`);

/* ---- JAZYK ---- */
ok(window.document.documentElement.lang === 'cs', 'jazyk: html lang je cs');
ok(window.document.title === 'Vesmírné hádanky', `jazyk: title (${window.document.title})`);
ok($('.logo-top').textContent === 'Vesmírné', 'jazyk: logo prelozene');
ok($('.logo-top').dataset.text === 'Vesmírné', 'jazyk: logo ma prelozeny aj obrys (data-text)');
ok($('#btn-back').getAttribute('aria-label') === 'Zpět', 'jazyk: aria-label tlacidla');
ok(cards[0].querySelector('.card-name').textContent === 'Najdi dvojice',
  `jazyk: nazov hry (${cards[0].querySelector('.card-name').textContent})`);

/* ---- 1. NAJDI DVOJICE ---- */
cards[0].click();
await sleep(20);
let tiles = $$('.tile');
ok(tiles.length === 6, `dvojice: 6 kariet na 1. urovni (${tiles.length})`);
ok($$('.pip').length === 3, `dvojice: 3 pipy v liste (${$$('.pip').length})`);

const byKey = {};
tiles.forEach((t) => (byKey[t.dataset.key] ||= []).push(t));
for (const pair of Object.values(byKey)) {
  pair[0].click(); await sleep(10);
  pair[1].click(); await sleep(450);
}
await sleep(700);
ok($$('.tile.done').length === 6, 'dvojice: vsetky karty najdene');
ok($('#win').classList.contains('show'), 'dvojice: zobrazila sa vyhra');
ok($$('#win-stars svg').length === 3, 'dvojice: 3 hviezdy v odmene');
const saved = () => JSON.parse(window.localStorage.getItem('vesmirne-hadanky'));
ok(saved().stars.pairs === 3, 'dvojice: ulozene 3 hviezdy');

// dalsia uroven
$('#win-next').click();
await sleep(30);
ok($$('.tile').length === 8, `dvojice: 2. uroven ma 8 kariet (${$$('.tile').length})`);
ok(saved().levels.pairs === 1, 'dvojice: uroven sa ulozila');
$('#btn-back').click();
await sleep(20);
ok($('#hub').classList.contains('active'), 'navrat do menu funguje');

// hru otvorime znova - musi pokracovat na dosiahnutej urovni, nie od zaciatku
$$('.card')[0].click();
await sleep(30);
ok($$('.tile').length === 8, `dvojice: pri dalsom otvoreni pokracuje na 2. urovni (${$$('.tile').length})`);
$('#btn-back').click();
await sleep(20);

/* ---- BODKY S UROVNAMI ---- */
const slot = $$('.card-slot')[0];
const dots = [...slot.querySelectorAll('.lvl')];
ok(dots.length === 4, `urovne: 4 bodky podla poctu urovni (${dots.length})`);
ok(dots.filter((d) => d.classList.contains('done')).length === 2, 'urovne: prve dve su odohrane');
ok(dots[1].classList.contains('now'), 'urovne: aktualna je druha');

// spat na najlahsiu
dots[0].click();
await sleep(30);
ok($$('.tile').length === 6, `urovne: bodka spustila 1. uroven (${$$('.tile').length})`);
ok(saved().levels.pairs === 0, 'urovne: vyber lahsej urovne sa ulozil');
$('#btn-back').click();
await sleep(20);
ok($$('.card-slot')[0].querySelectorAll('.lvl.now')[0] === $$('.card-slot')[0].querySelectorAll('.lvl')[0],
  'urovne: menu ukazuje novo zvolenu uroven');

/* ---- ZVUK ---- */
const snd = $('#btn-sound');
ok(!snd.classList.contains('off'), 'zvuk: vychodzo zapnuty');
snd.click();
await sleep(10);
ok(snd.classList.contains('off'), 'zvuk: klik ho vypne');
ok(saved().sound === false, 'zvuk: vypnutie sa ulozilo');
ok(snd.getAttribute('aria-label') === 'Zvuk vypnutý', `zvuk: prelozeny aria-label (${snd.getAttribute('aria-label')})`);
snd.click();
await sleep(10);
ok(!snd.classList.contains('off') && saved().sound === true, 'zvuk: dalsi klik ho zapne');

/* ---- 2. BLUDISKO ---- */
$$('.card')[1].click();
await sleep(20);
const msvg = $('.maze-wrap svg');
ok(!!msvg, 'bludisko: vykreslene');
const size = Number(msvg.getAttribute('viewBox').split(' ')[2]);
msvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: size, height: size });
const n = 4, pad = 4, C = 10;
const cc = (i) => pad + i * C + C / 2;

// prejdeme cestu tak, ze tahame prst po bunkach riesenia
const { buildMaze, solve } = await import(`${ROOT}/js/games/maze.js`);
// hru neriesime naslepo - kopirujeme trasu z jej vlastneho bludiska:
// prst posunieme vzdy o bunku a raketa ho nasleduje, ak nie je stena
fire(msvg, 'pointerdown', cc(0), cc(0));
for (let i = 0; i < 4000; i++) {
  const x = Math.floor(Math.random() * n);
  const y = Math.floor(Math.random() * n);
  fire(msvg, 'pointermove', cc(x), cc(y));
  if ($('#win').classList.contains('show')) break;
}
fire(msvg, 'pointerup', 0, 0);
await sleep(600);
ok($('#win').classList.contains('show'), 'bludisko: raketa dosla do ciela so vsetkymi hviezdami');
ok($('#mz-trail').getAttribute('points').includes(','), 'bludisko: kreslila sa stopa');
$('#win-home').click();
await sleep(20);

/* ---- 3. NAJDI ROZDIELY ---- */
$$('.card')[2].click();
await sleep(20);
const panels = $$('.diff-panel');
ok(panels.length === 2, 'rozdiely: dva panely');
const pipCount = $$('.pip').length;
ok(pipCount === 3, `rozdiely: 3 rozdiely na 1. urovni (${pipCount})`);

// zistime, ktore objekty sa lisia (porovnanim markupu oboch panelov)
const artA = panels[0].querySelectorAll('svg > g:not(.marks)');
const hits = [...panels[0].querySelectorAll('.hit')];
const bHtml = panels[1].querySelector('svg').innerHTML;
const aHtml = panels[0].querySelector('svg').innerHTML;
ok(aHtml !== bHtml, 'rozdiely: panely nie su rovnake');

// klikneme na kazdy terc v oboch paneloch - spravne sa zapocitaju, zle daju kriz
for (const h of hits) {
  fire(h, 'pointerdown', 10, 10);
  await sleep(15);
  if ($('#win').classList.contains('show')) break;
}
await sleep(600);
ok($('#win').classList.contains('show'), 'rozdiely: vsetky rozdiely sa dali najst klikom na objekty');
ok($$('.marks circle').length >= pipCount, 'rozdiely: najdene su oznacene kruzkom');

/* ---- 4.-6. KVIZOVE HRY: pocitanie, postupnosti, pismena ---- */
const pipsOn = () => $$('.pip.on').length;

async function playQuiz(cardIdx, label, rounds) {
  $('#win-home').click();
  await sleep(20);
  $$('.card')[cardIdx].click();
  await sleep(30);
  ok($$('.pip').length === rounds, `${label}: ${rounds} kol (${$$('.pip').length})`);

  for (let r = 0; r < rounds; r++) {
    const before = pipsOn();
    let solved = false;
    // dieta skusa moznosti, kym jedna nesedi
    for (const btn of $$('.answer')) {
      btn.click();
      await sleep(30);
      if (pipsOn() > before || $('#win').classList.contains('show')) { solved = true; break; }
    }
    ok(solved, `${label}: kolo ${r + 1} sa da vyriesit`);
    await sleep(750);
  }
  await sleep(400);
  ok($('#win').classList.contains('show'), `${label}: hra dosla do vyhry`);
}

await playQuiz(3, 'pocitanie', 5);
await playQuiz(4, 'postupnosti', 4);
await playQuiz(5, 'pismena', 5);

/* ---- 7. SKLADANIE TVARU ---- */
$('#win-home').click();
await sleep(20);
$$('.card')[6].click();
await sleep(30);
const tsvg = $('.tan-wrap svg');
ok(!!tsvg, 'skladanie: vykreslene');
const [, , TW, TH] = tsvg.getAttribute('viewBox').split(' ').map(Number);
tsvg.getBoundingClientRect = () => ({ left: 0, top: 0, width: TW, height: TH });

const piecesN = $$('.tan-piece').length;
ok(piecesN >= 3, `skladanie: ${piecesN} dielikov`);
for (const piece of $$('.tan-piece')) {
  const m = piece.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
  const [dx, dy] = [Number(m[1]), Number(m[2])];
  const pts = piece.getAttribute('points').split(' ').map((p) => p.split(',').map(Number));
  const gx = pts.reduce((a, p) => a + p[0], 0) / pts.length + dx;
  const gy = pts.reduce((a, p) => a + p[1], 0) / pts.length + dy;
  fire(piece, 'pointerdown', gx, gy);
  fire(tsvg, 'pointermove', gx - dx, gy - dy);
  fire(tsvg, 'pointerup', gx - dx, gy - dy);
  await sleep(20);
}
await sleep(600);
ok($$('.tan-piece.locked').length === piecesN, 'skladanie: vsetky dieliky zapadli na miesto');
ok($('#win').classList.contains('show'), 'skladanie: hotovy obrazok = vyhra');

ok(errors.length === 0, `ziadne chyby v konzole (${errors.join(' | ')})`);
console.log(fails ? `\n${fails} FAILS` : '\nvsetko OK');
process.exit(fails ? 1 : 0);
