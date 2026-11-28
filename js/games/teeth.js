import { PALETTE, ALL_DEFS, svgDoc, svg, stickered, animal, animalFace } from '../art.js';
import { shuffle, el, wait } from '../util.js';
import { sfx } from '../audio.js';
import { pointerMap, sparkle, celebrate, fitAttr, fromBody, toBody, nextPet } from './clinic.js';

// Umy zubky: zvieratko otvori pusinku, na zuboch su flaky. Dieta chyti kefku
// (alebo len prstom kdekolvek) a sucha zuby sem a tam, kym sa neleskne.

const W = 100;
const H = 132;
const TRAY_Y = 120;
const RUB = 6;        // polomer kefky v suradniciach zvieratka
const RUB_NEED = 30;  // kolko drahy kefkou treba na jeden zub
const GRIP = { x: -10, y: -7 }; // hlavicka kefky je kusok vlavo hore od prsta

// hlava zvieratka zvacsena cez celu plochu
const F = { s: 1.7, dx: -35, dy: -5 };

// zuby v suradniciach zvieratka - 4 hore, 4 dole
const TEETH = [
  ...[43, 48, 53, 58].map((x) => ({ x, y: 49.6, top: true })),
  ...[43, 48, 53, 58].map((x) => ({ x, y: 62.4, top: false })),
];

const LEVELS = [{ n: 3 }, { n: 5 }, { n: 8 }];

let clipId = 0;

// otvorena pusinka so zubami; cid = id clipPath pre vnutro pusinky
const openMouth = (cid, dirty) => `
  <defs><clipPath id="${cid}"><ellipse cx="50" cy="56" rx="15" ry="9.5"/></clipPath></defs>
  <ellipse cx="50" cy="56" rx="15" ry="9.5" fill="#7a1f3d"/>
  <g clip-path="url(#${cid})">
    <ellipse cx="50" cy="63" rx="9" ry="4.5" fill="#ff7a9c"/>
    ${TEETH.map((t, i) => `
      <g class="th-tooth" data-i="${i}">
        <rect x="${t.x - 2.2}" y="${t.top ? 44 : 59.6}" width="4.4" height="${t.top ? 8.4 : 8}" rx="1.6" fill="#fffdf6" stroke="#d9cdb8" stroke-width=".4"/>
        ${dirty.includes(i) ? `<g class="th-dirt" data-i="${i}">
          <circle cx="${t.x - 0.6}" cy="${t.y - 0.4}" r="1.5" fill="#c8a24a"/>
          <circle cx="${t.x + 0.9}" cy="${t.y + 0.7}" r="1" fill="#8fae3e"/>
          <circle cx="${t.x + 0.4}" cy="${t.y - 1.3}" r=".6" fill="#a8803a"/></g>` : ''}
      </g>`).join('')}
  </g>
  <ellipse cx="50" cy="56" rx="15" ry="9.5" fill="none" stroke="#2a2258" stroke-width="1.6"/>`;

// kefka - stred hlavicky v 0 0, rukovat ide doprava dole
const brush = () => `
  <path d="M4 1 L24 10" stroke="${PALETTE.blue}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M4 1 L24 10" stroke="#9fdcff" stroke-width="1.4" stroke-linecap="round"/>
  <rect x="-6" y="-2.5" width="11" height="5" rx="1.6" fill="${PALETTE.blue}" stroke="#1f5f8f" stroke-width=".7" transform="rotate(24)"/>
  <g transform="rotate(24)">
    ${[-4.5, -2.5, -0.5, 1.5, 3.5].map((x) => `<rect x="${x}" y="-7" width="1.4" height="4.6" rx=".6" fill="#fff"/>`).join('')}
    <path d="M-5 -7.5 q2 -2.4 5 -1.4 q3 -2 5 1.2 Z" fill="#ffffff" stroke="#bfe9ff" stroke-width=".5"/>
  </g>`;

export default {
  id: 'teeth',
  name: 'Umy zúbky',
  color: PALETTE.blue,
  levels: LEVELS.length,
  icon: () => svg(stickered(`${animal('medved', PALETTE.yellow, true)}
    <g transform="translate(66 74) scale(1.3)">${brush()}</g>`)),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const pet = nextPet();
    const dirty = shuffle(TEETH.map((_, i) => i)).slice(0, L.n);
    const left = new Map(dirty.map((i) => [i, RUB_NEED]));
    const cid = `thclip${++clipId}`;
    const brushHome = { x: 70, y: TRAY_Y - 2 };
    let cleaned = 0;
    let over = false;

    // tvar bez pusinky + otvorena pusinka so zubami
    const body = animal(pet.kind, pet.color)
      .replace(animalFace(false), animalFace(false, false) + openMouth(cid, dirty));

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fitAttr(F)}"><g class="th-pet">
            <g filter="url(#sticker)">${body}</g>
          </g></g>
          <g class="th-brush cl-drag" transform="translate(${brushHome.x} ${brushHome.y})">
            <circle cx="10" cy="5" r="13" fill="transparent"/>${brush()}
          </g>
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const pet$ = wrap.querySelector('.th-pet');
    const brushNode = wrap.querySelector('.th-brush');
    const fx = wrap.querySelector('.vet-fx');
    const toSvg = pointerMap(svgEl, W, H);
    api.setProgress(L.n, 0);

    const place = (x, y, s = 1) => brushNode.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`);
    let last = null; // posledna poloha hlavicky kefky (suradnice zvieratka)

    function foam(p) {
      const b = el(`<svg><circle class="vet-bubble" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${(1.4 + Math.random() * 2).toFixed(1)}"
        fill="#ffffff" fill-opacity=".7" stroke="#bfe9ff" stroke-width=".5"/></svg>`).firstElementChild;
      fx.appendChild(b);
      setTimeout(() => b.remove(), 800);
    }

    async function shiny(i) {
      cleaned++;
      api.setProgress(L.n, cleaned);
      sfx.found();
      const q = fromBody(F, TEETH[i].x, TEETH[i].y);
      sparkle(fx, q.x, q.y, '#ffffff');
      if (cleaned < L.n) return;
      over = true;
      last = null;
      place(brushHome.x, brushHome.y);
      await wait(400);
      await celebrate(pet$, pet$, fx);
      api.win(3);
    }

    function brushAt(ev) {
      const p = toSvg(ev);
      const head = { x: p.x + GRIP.x, y: p.y + GRIP.y };
      place(head.x, head.y, 1.15);
      const b = toBody(F, head);
      if (last) {
        const d = Math.hypot(b.x - last.x, b.y - last.y);
        for (const [i, need] of left) {
          const t = TEETH[i];
          if (Math.hypot(b.x - t.x, b.y - t.y) > RUB) continue;
          const now = need - d;
          left.set(i, now);
          const node = wrap.querySelector(`.th-dirt[data-i="${i}"]`);
          node.style.opacity = Math.max(0, now / RUB_NEED).toFixed(2);
          if (now <= 0) { left.delete(i); node.remove(); shiny(i); }
        }
        // pena len pri pusinke
        if (d > 0.8 && Math.abs(b.x - 50) < 18 && Math.abs(b.y - 56) < 13 && Math.random() < 0.6) foam(head);
      }
      last = b;
    }

    // kefku netreba presne chytit - kde sa dieta dotkne, tam kefka skoci
    function onDown(ev) {
      if (over) return;
      brushNode.classList.add('dragging');
      sfx.tap();
      svgEl.setPointerCapture?.(ev.pointerId);
      last = null;
      brushAt(ev);
      ev.preventDefault();
    }

    function onMove(ev) {
      if (over || !last) return;
      brushAt(ev);
    }

    function onUp() {
      if (!last) return;
      last = null;
      brushNode.classList.remove('dragging');
      if (!over) place(brushHome.x, brushHome.y);
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { over = true; } };
  },
};
