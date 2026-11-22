import { PALETTE, ALL_DEFS, svgDoc, svg, stickered, animal } from '../art.js';
import { pointerMap, sparkle as spark, celebrate, starsFor, trayRect, FIT_TOP, FIT_FULL, fitAttr, fromBody, toBody as bodyOf, nextPet } from './clinic.js';
import { shuffle, el, wait } from '../util.js';
import { sfx } from '../audio.js';

// Zvieracia ambulancia: zvieratko je chore a dieta ho osetri.
// Kazda uroven = iny pacient a iny sposob osetrenia (tuk, tahanie, sucanie).

const W = 100;
const H = 132;
const TRAY_Y = 117;   // spodny pas s naplastami
const SNAP = 11;      // ako blizko ku rane musi naplast pustit
const RUB = 9;        // polomer blatovej skvrny pre sucanie
const RUB_NEED = 60;  // kolko "prejdenej drahy" prstom treba na jednu skvrnu


/* ---------- veci na osetrenie ---------- */
const germ = (x, y, i) => `
  <g class="vet-germ" data-i="${i}" transform="translate(${x} ${y})">
    <g class="vet-wobble" style="animation-delay:-${(i * 0.37).toFixed(2)}s">
      <circle r="10" fill="transparent"/>
      ${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${(6.2 * Math.cos(a * Math.PI / 180)).toFixed(2)}"
         cy="${(6.2 * Math.sin(a * Math.PI / 180)).toFixed(2)}" r="1.8" fill="#4caf50" stroke="#1e5a2a" stroke-width=".6"/>`).join('')}
      <circle r="5.4" fill="#7ed957" stroke="#1e5a2a" stroke-width="1"/>
      <circle cx="-1.8" cy="-0.8" r="1.4" fill="#fff"/><circle cx="1.8" cy="-0.8" r="1.4" fill="#fff"/>
      <circle cx="-1.6" cy="-0.6" r=".7" fill="#1e2a20"/><circle cx="2" cy="-0.6" r=".7" fill="#1e2a20"/>
      <path d="M-1.6 2 q1.6 -1 3.2 0" stroke="#1e5a2a" stroke-width=".8" fill="none" stroke-linecap="round"/>
    </g>
  </g>`;

const wound = (x, y, i) => `
  <g class="vet-wound" data-i="${i}" transform="translate(${x} ${y})">
    <ellipse rx="5" ry="3.4" fill="#ff5a6e" opacity=".85"/>
    <path d="M-3 0 h6 M-1.5 -1.5 l3 3" stroke="#b3203a" stroke-width=".9" stroke-linecap="round"/>
  </g>`;

const plaster = () => `
  <rect x="-9" y="-3.6" width="18" height="7.2" rx="3.6" fill="#ffd9b0" stroke="#c9875a" stroke-width=".9"/>
  <rect x="-3.4" y="-2.6" width="6.8" height="5.2" rx="1" fill="#fff3e3" stroke="#e0b08a" stroke-width=".5"/>
  <circle cx="-6" cy="-1" r=".5" fill="#c9875a"/><circle cx="-6" cy="1.2" r=".5" fill="#c9875a"/>
  <circle cx="6" cy="-1" r=".5" fill="#c9875a"/><circle cx="6" cy="1.2" r=".5" fill="#c9875a"/>`;

const mud = (x, y, i) => `
  <g class="vet-mud" data-i="${i}" transform="translate(${x} ${y})">
    <path d="M-7 -2 q1 -6 7 -5 q6 -2 7 4 q3 5 -2 7 q-3 4 -8 2 q-6 0 -4 -8 Z" fill="#8a5a33" opacity=".9"/>
    <circle cx="-3" cy="-2" r="1.6" fill="#a87447"/><circle cx="3" cy="2" r="1.1" fill="#6e4426"/>
  </g>`;

// miesta na tele, kam sa da nieco dat (hlava aj brusko, mimo oci)
const SPOTS = [
  [30, 30], [70, 30], [32, 52], [68, 52], [50, 24],
  [34, 82], [66, 82], [50, 100], [38, 96], [62, 96], [50, 76],
];

const LEVELS = [
  { task: 'germs', n: 4 },
  { task: 'plasters', n: 3 },
  { task: 'mud', n: 3 },
  { task: 'germs', n: 6 },
  { task: 'plasters', n: 4 },
  { task: 'mud', n: 5 },
];

export default {
  id: 'vet',
  name: 'Zvieracia ambulancia',
  color: PALETTE.pink,
  levels: LEVELS.length,
  icon: () => svg(stickered(animal('macka', PALETTE.orange, true))),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const pet = nextPet();
    const spots = shuffle(SPOTS).slice(0, L.n);
    let done = 0;
    let misses = 0;
    let over = false;

    const items = spots.map(([x, y], i) => ({
      germs: germ, plasters: wound, mud,
    })[L.task](x, y, i)).join('');

    // naplasty cakaju v pase pod zvieratkom
    const trayX = (i) => 50 + (i - (L.n - 1) / 2) * Math.min(22, 92 / L.n);
    const tray = L.task === 'plasters'
      ? `${trayRect(TRAY_Y)}
         <g class="vet-plasters">${spots.map((_, i) => `
           <g class="vet-plaster" data-i="${i}" transform="translate(${trayX(i)} ${TRAY_Y}) rotate(-25)">
             <rect x="-11" y="-7" width="22" height="14" fill="transparent"/>${plaster()}</g>`).join('')}</g>`
      : '';

    // pri naplastoch sa zvieratko zmensi a posunie hore, aby bolo miesto na pas
    const F = L.task === 'plasters' ? FIT_TOP : FIT_FULL;

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fitAttr(F)}"><g class="vet-body">
            <g class="vet-animal" filter="url(#sticker)">${animal(pet.kind, pet.color)}</g>
            <g class="vet-items">${items}</g>
          </g></g>
          ${tray}
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const body = wrap.querySelector('.vet-body');
    const fx = wrap.querySelector('.vet-fx');
    api.setProgress(L.n, 0);

    // prevod medzi obrazovkou, celym svg a suradnicami zvieratka
    const toSvg = pointerMap(svgEl, W, H);
    const toBody = (p) => bodyOf(F, p);
    const sparkle = (x, y) => spark(fx, x, y);

    async function healed() {
      done++;
      api.setProgress(L.n, done);
      sfx.found();
      if (done < L.n) return;
      over = true;
      await wait(300);
      await celebrate(wrap, body, fx);
      api.win(starsFor(misses));
    }

    /* --- baktérie: tukni --- */
    function tapGerm(ev) {
      const g = ev.target.closest?.('.vet-germ');
      if (!g || g.classList.contains('gone')) return false;
      g.classList.add('gone');
      const p = toSvg(ev);
      sparkle(p.x, p.y);
      setTimeout(() => g.remove(), 350);
      healed();
      return true;
    }

    /* --- naplasti: potiahni na ranu --- */
    let drag = null;
    const wounds = [...wrap.querySelectorAll('.vet-wound')].map((n) => ({ n, x: spots[n.dataset.i][0], y: spots[n.dataset.i][1], covered: false }));

    /* --- blato: sucaj prstom --- */
    const dirt = spots.map(() => RUB_NEED);
    let rubbing = null;

    function rubAt(ev) {
      const p = toBody(toSvg(ev));
      if (rubbing) {
        const d = Math.hypot(p.x - rubbing.x, p.y - rubbing.y);
        spots.forEach(([x, y], i) => {
          if (dirt[i] <= 0 || Math.hypot(p.x - x, p.y - y) > RUB + 4) return;
          dirt[i] -= d;
          const node = wrap.querySelector(`.vet-mud[data-i="${i}"]`);
          node.style.opacity = Math.max(0, dirt[i] / RUB_NEED).toFixed(2);
          if (dirt[i] <= 0) { node.remove(); { const q = fromBody(F, x, y); sparkle(q.x, q.y); } healed(); }
        });
        // bublinky za prstom
        if (d > 2 && Math.random() < 0.5) {
          const q = toSvg(ev);
          const b = el(`<svg><circle class="vet-bubble" cx="${q.x}" cy="${q.y}" r="${(1.5 + Math.random() * 2).toFixed(1)}"
            fill="#ffffff" fill-opacity=".35" stroke="#bfe9ff" stroke-width=".5"/></svg>`).firstElementChild;
          fx.appendChild(b);
          setTimeout(() => b.remove(), 800);
        }
      }
      rubbing = p;
    }

    function onDown(ev) {
      if (over) return;
      if (L.task === 'germs') {
        if (!tapGerm(ev)) sfx.tap();
      } else if (L.task === 'plasters') {
        const node = ev.target.closest?.('.vet-plaster');
        if (!node || node.classList.contains('stuck')) return;
        drag = { node, home: node.getAttribute('transform') };
        node.parentNode.appendChild(node);
        node.classList.add('dragging');
        sfx.tap();
        onMove(ev);
      } else {
        rubbing = null;
        rubAt(ev);
      }
      svgEl.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
    }

    function onMove(ev) {
      if (over) return;
      if (drag) {
        const p = toSvg(ev);
        drag.node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${(p.y - 4).toFixed(2)}) rotate(-25) scale(1.15)`);
        drag.at = p;
      } else if (rubbing) {
        rubAt(ev);
      }
    }

    function onUp() {
      rubbing = null;
      if (!drag) return;
      const { node, home, at } = drag;
      drag = null;
      node.classList.remove('dragging');
      const b = at && toBody({ x: at.x, y: at.y - 4 });
      const target = b && wounds.find((w) => !w.covered && Math.hypot(w.x - b.x, w.y - b.y) < SNAP);
      if (target) {
        target.covered = true;
        node.classList.add('stuck');
        node.style.pointerEvents = 'none';
        // naplast sa prilepi do vrstvy zvieratka, aby sedela aj pri poskoceni
        target.n.innerHTML = `<g class="vet-stuck" transform="rotate(-25) scale(0.9)">${plaster()}</g>`;
        node.remove();
        healed();
      } else {
        if (at && at.y < TRAY_Y - 12) { misses++; sfx.bump(); }
        node.setAttribute('transform', home);
      }
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { over = true; drag = null; } };
  },
};
