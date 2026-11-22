import { PALETTE, ALL_DEFS, ink, svgDoc, svg, stickered } from '../art.js';
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

const fill = (c) => `url(#g${c.slice(1)})`;
const S = (c, w = 2.4) => `stroke="${ink(c)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/* ---------- zvieratka ---------- */
const EARS = {
  macka: (c) => `
    <path d="M28 30 L30 6 L48 20 Z" fill="${fill(c)}" ${S(c)}/>
    <path d="M72 30 L70 6 L52 20 Z" fill="${fill(c)}" ${S(c)}/>
    <path d="M32 24 L33 13 L41 20 Z" fill="${PALETTE.pink}" opacity=".8"/>
    <path d="M68 24 L67 13 L59 20 Z" fill="${PALETTE.pink}" opacity=".8"/>`,
  pes: (c) => `
    <path d="M30 22 q-16 -4 -18 14 q-2 16 8 20 q6 -12 12 -24 Z" fill="${fill(PALETTE.orange)}" ${S(PALETTE.orange)}/>
    <path d="M70 22 q16 -4 18 14 q2 16 -8 20 q-6 -12 -12 -24 Z" fill="${fill(PALETTE.orange)}" ${S(PALETTE.orange)}/>`,
  zajac: (c) => `
    <path d="M38 22 q-10 -22 -2 -24 q8 -2 10 24 Z" fill="${fill(c)}" ${S(c)}/>
    <path d="M62 22 q10 -22 2 -24 q-8 -2 -10 24 Z" fill="${fill(c)}" ${S(c)}/>
    <path d="M40 18 q-5 -13 -2 -15 q4 0 5 15 Z" fill="${PALETTE.pink}" opacity=".7"/>
    <path d="M60 18 q5 -13 2 -15 q-4 0 -5 15 Z" fill="${PALETTE.pink}" opacity=".7"/>`,
};

const eye = (x, y) => `
  <ellipse cx="${x}" cy="${y}" rx="4.4" ry="4.8" fill="#fff" stroke="#2a2258" stroke-width="1.5"/>
  <circle cx="${x}" cy="${y + 0.8}" r="2.4" fill="#2a2258"/>
  <circle cx="${x - 0.9}" cy="${y - 0.6}" r="0.9" fill="#fff"/>`;

// tvar a tvar tvare zvlast - po vyliecani sa vymeni iba .vet-face
function face(happy) {
  const mouth = happy
    ? '<path d="M42 50 q8 8 16 0" fill="none" stroke="#2a2258" stroke-width="2.2" stroke-linecap="round"/>'
    : '<path d="M43 54 q7 -5 14 0" fill="none" stroke="#2a2258" stroke-width="2.2" stroke-linecap="round"/>';
  const brows = happy ? '' : `
    <path d="M35 31 l8 -3" stroke="#2a2258" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M65 31 l-8 -3" stroke="#2a2258" stroke-width="1.8" stroke-linecap="round"/>`;
  const tear = happy ? '' : '<path d="M36 42 q-2 4 0 6 q2 -2 0 -6 Z" fill="#7fd0ff" stroke="#3a7bbf" stroke-width=".7"/>';
  return `${brows}${eye(40, 37)}${eye(60, 37)}
    <ellipse cx="50" cy="45" rx="3.4" ry="2.4" fill="#2a2258"/>
    ${mouth}${tear}
    <ellipse cx="31" cy="47" rx="4" ry="2.6" fill="#ff7a9c" opacity="${happy ? 0.6 : 0.3}"/>
    <ellipse cx="69" cy="47" rx="4" ry="2.6" fill="#ff7a9c" opacity="${happy ? 0.6 : 0.3}"/>`;
}

export function animal(kind, c, happy = false) {
  return `
    <ellipse cx="50" cy="88" rx="25" ry="22" fill="${fill(c)}" ${S(c)}/>
    <ellipse cx="50" cy="92" rx="14" ry="13" fill="${PALETTE.cream}" opacity=".75"/>
    <ellipse cx="38" cy="108" rx="8" ry="5" fill="${fill(c)}" ${S(c)}/>
    <ellipse cx="62" cy="108" rx="8" ry="5" fill="${fill(c)}" ${S(c)}/>
    ${EARS[kind](c)}
    <ellipse cx="50" cy="40" rx="26" ry="23" fill="${fill(c)}" ${S(c)}/>
    <ellipse cx="50" cy="48" rx="11" ry="8" fill="${PALETTE.cream}" opacity=".8"/>
    <path d="M32 26 q6 -6 14 -6" stroke="#fff" stroke-width="2.4" opacity=".5" fill="none" stroke-linecap="round"/>
    <g class="vet-face">${face(happy)}</g>`;
}

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
  { kind: 'macka', color: PALETTE.orange, task: 'germs', n: 4 },
  { kind: 'pes', color: PALETTE.yellow, task: 'plasters', n: 3 },
  { kind: 'zajac', color: PALETTE.violet, task: 'mud', n: 3 },
  { kind: 'pes', color: PALETTE.blue, task: 'germs', n: 6 },
  { kind: 'macka', color: PALETTE.mint, task: 'plasters', n: 4 },
  { kind: 'zajac', color: PALETTE.pink, task: 'mud', n: 5 },
];

export default {
  id: 'vet',
  name: 'Zvieracia ambulancia',
  color: PALETTE.pink,
  levels: LEVELS.length,
  icon: () => svg(stickered(animal('macka', PALETTE.orange, true))),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
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
      ? `<rect x="2" y="${TRAY_Y - 9}" width="${W - 4}" height="18" rx="6" fill="#0d1140" opacity=".35"/>
         <g class="vet-plasters">${spots.map((_, i) => `
           <g class="vet-plaster" data-i="${i}" transform="translate(${trayX(i)} ${TRAY_Y}) rotate(-25)">
             <rect x="-11" y="-7" width="22" height="14" fill="transparent"/>${plaster()}</g>`).join('')}</g>`
      : '';

    // pri naplastoch sa zvieratko zmensi a posunie hore, aby bolo miesto na pas
    const fit = L.task === 'plasters' ? 'translate(50 4) scale(0.8) translate(-50 0)' : 'translate(0 8)';

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fit}"><g class="vet-body">
            <g class="vet-animal" filter="url(#sticker)">${animal(L.kind, L.color)}</g>
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

    // prevod medzi obrazovkou, celym svg a suradnicami zvieratka (bez fit transformu)
    const toSvg = (ev) => {
      const r = svgEl.getBoundingClientRect();
      return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
    };
    const [fs, fdx, fdy] = L.task === 'plasters' ? [0.8, 10, 4] : [1, 0, 8];
    const toBody = (p) => ({ x: (p.x - fdx) / fs, y: (p.y - fdy) / fs });

    function sparkle(x, y) {
      const s = el(`<svg><g class="vet-spark" transform="translate(${x} ${y})">
        <path d="M0 -6 q1.2 4.8 6 6 q-4.8 1.2 -6 6 q-1.2 -4.8 -6 -6 q4.8 -1.2 6 -6 Z" fill="${PALETTE.yellow}"/></g></svg>`).firstElementChild;
      fx.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }

    async function healed() {
      done++;
      api.setProgress(L.n, done);
      sfx.found();
      if (done < L.n) return;
      over = true;
      await wait(300);
      // zvieratko sa usmeje a poskoci
      wrap.querySelector('.vet-face').innerHTML = face(true);
      body.classList.add('vet-happy');
      for (let k = 0; k < 5; k++) setTimeout(() => sparkle(15 + Math.random() * 70, 10 + Math.random() * 70), k * 120);
      await wait(1100);
      api.win(misses <= 1 ? 3 : misses <= 4 ? 2 : 1);
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
          if (dirt[i] <= 0) { node.remove(); sparkle(x * fs + fdx, y * fs + fdy); healed(); }
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
