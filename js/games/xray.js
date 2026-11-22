import { PALETTE, ALL_DEFS, svgDoc, svg, stickered, animal, ANIMAL_KINDS } from '../art.js';
import { shuffle, el, wait, pick } from '../util.js';
import { sfx } from '../audio.js';
import { pointerMap, sparkle, celebrate, FIT_FULL, fitAttr, fromBody, nextPet } from './clinic.js';

// Rontgen: zvieratko nieco prehltlo. Dieta posuva rontgenovu lupu po tele -
// v lupe vidno kosti a schovane veci. Vec sa najde, ked na nu lupa chvilu
// mieri alebo ked na nu dieta tukne.

const W = 100;
const H = 132;
const LENS = 17;     // polomer lupy
const HIT = 8;       // ako blizko musi byt stred lupy pri veci
const HOLD = 350;    // ms, kolko treba nad vecou podrzat
const COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.mint, PALETTE.blue, PALETTE.violet, PALETTE.pink];

// schovane veci - v rontgene svietia nabielo, po vytiahnuti su farebne
const ITEMS = {
  lopta: (c) => `<circle r="5.5" fill="${c ? PALETTE.pink : '#eaf6ff'}" stroke="${c ? '#a8336a' : '#9fd3ff'}" stroke-width="1"/>
    <path d="M-5.5 0 h11 M0 -5.5 q-3 5.5 0 11" fill="none" stroke="${c ? '#fff' : '#9fd3ff'}" stroke-width="1"/>`,
  kluc: (c) => `<g fill="${c ? PALETTE.yellow : '#eaf6ff'}" stroke="${c ? '#a07a10' : '#9fd3ff'}" stroke-width=".9">
    <circle cx="-4" cy="0" r="3.4"/><rect x="-1" y="-1.2" width="9" height="2.4" rx="1"/>
    <rect x="5" y="1" width="1.6" height="2.6"/><rect x="2.4" y="1" width="1.6" height="2"/></g>
    <circle cx="-4" cy="0" r="1.3" fill="${c ? '#a07a10' : '#0a2747'}"/>`,
  gombik: (c) => `<circle r="5" fill="${c ? PALETTE.blue : '#eaf6ff'}" stroke="${c ? '#1f5f8f' : '#9fd3ff'}" stroke-width="1"/>
    ${[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r=".9" fill="${c ? '#1f5f8f' : '#0a2747'}"/>`).join('')}`,
  kocka: (c) => `<rect x="-5" y="-5" width="10" height="10" rx="2" fill="${c ? PALETTE.cream : '#eaf6ff'}" stroke="${c ? '#8a7350' : '#9fd3ff'}" stroke-width="1"/>
    ${[[-2.4, -2.4], [0, 0], [2.4, 2.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${c ? '#2a2258' : '#0a2747'}"/>`).join('')}`,
  minca: (c) => `<circle r="5" fill="${c ? PALETTE.yellow : '#eaf6ff'}" stroke="${c ? '#a07a10' : '#9fd3ff'}" stroke-width="1"/>
    <circle r="3.2" fill="none" stroke="${c ? '#a07a10' : '#9fd3ff'}" stroke-width=".7"/>`,
};

// miesta v brusku a hlave, kde moze vec byt (suradnice zvieratka)
const SPOTS = [[40, 80], [60, 80], [50, 92], [38, 96], [62, 96], [50, 72], [42, 30], [58, 30], [50, 104]];

// kostra v suradniciach zvieratka - jednoducha, nech nestrasi
const BONES = `
  <g fill="none" stroke="#dff1ff" stroke-width="1.6" stroke-linecap="round" opacity=".75">
    <ellipse cx="50" cy="38" rx="19" ry="16"/>
    <circle cx="42" cy="36" r="4"/><circle cx="58" cy="36" r="4"/>
    <path d="M44 50 q6 3 12 0"/>
    <path d="M50 62 v40" stroke-dasharray="3 1.6" stroke-width="2.4"/>
    <path d="M50 72 q-14 0 -16 8 M50 72 q14 0 16 8 M50 80 q-14 0 -16 8 M50 80 q14 0 16 8 M50 88 q-12 0 -14 7 M50 88 q12 0 14 7"/>
    <path d="M38 102 v6 M62 102 v6" stroke-width="3"/>
  </g>`;

let clipId = 0;

export default {
  id: 'xray',
  name: 'Röntgen',
  color: PALETTE.blue,
  levels: 3,
  icon: () => svg(stickered(`${animal('medved', PALETTE.orange, true)}
    <circle cx="58" cy="84" r="16" fill="#0a2747" stroke="${PALETTE.mint}" stroke-width="3"/>
    <g transform="translate(58 84)">${ITEMS.lopta(false)}</g>`)),

  start(stage, api) {
    const n = 2 + Math.min(api.level, 2); // 2, 3, 4 veci
    const F = FIT_FULL;
    const sick = nextPet();
    const spots = shuffle(SPOTS).slice(0, n);
    const kinds = shuffle(Object.keys(ITEMS)).slice(0, n);
    const items = spots.map(([bx, by], i) => ({ ...fromBody(F, bx, by), key: kinds[i], found: false, i }));
    const cid = `xrclip${++clipId}`;
    let found = 0;
    let over = false;
    // lupa zacina dole pod zvieratkom, aby bolo jasne, ze sa da chytit
    const lens = { x: 50, y: H - LENS - 2 };

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <defs><clipPath id="${cid}"><circle class="xr-clip" cx="${lens.x}" cy="${lens.y}" r="${LENS}"/></clipPath></defs>
          <g transform="${fitAttr(F)}"><g class="xr-pet">
            <g filter="url(#sticker)">${animal(sick.kind, sick.color)}</g>
          </g></g>
          <g clip-path="url(#${cid})">
            <rect width="${W}" height="${H}" fill="#0a2747" opacity=".94"/>
            <g transform="${fitAttr(F)}">${BONES}</g>
            <g class="xr-items">${items.map((it) => `
              <g class="xr-item" data-i="${it.i}" transform="translate(${it.x.toFixed(2)} ${it.y.toFixed(2)})">${ITEMS[it.key](false)}</g>`).join('')}</g>
          </g>
          <g class="xr-lens" transform="translate(${lens.x} ${lens.y})">
            <circle r="${LENS}" fill="none" stroke="${PALETTE.mint}" stroke-width="2.6"/>
            <circle r="${LENS + 1.6}" fill="none" stroke="#0d1140" stroke-width=".8" opacity=".6"/>
            <path d="M${LENS * 0.7} ${LENS * 0.7} l7 7" stroke="${PALETTE.mint}" stroke-width="4" stroke-linecap="round"/>
          </g>
          <g class="xr-found"></g>
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const clip = wrap.querySelector('.xr-clip');
    const lensNode = wrap.querySelector('.xr-lens');
    const pet = wrap.querySelector('.xr-pet');
    const foundRow = wrap.querySelector('.xr-found');
    const fx = wrap.querySelector('.vet-fx');
    const toSvg = pointerMap(svgEl, W, H);
    api.setProgress(n, 0);
    lensNode.classList.add('xr-hint');

    let aiming = null; // { i, since }
    let down = false;

    function moveLens(p) {
      lens.x = Math.max(4, Math.min(W - 4, p.x));
      lens.y = Math.max(4, Math.min(H - 4, p.y));
      clip.setAttribute('cx', lens.x.toFixed(2));
      clip.setAttribute('cy', lens.y.toFixed(2));
      lensNode.setAttribute('transform', `translate(${lens.x.toFixed(2)} ${lens.y.toFixed(2)})`);
    }

    const near = (p, d) => items.find((it) => !it.found && Math.hypot(it.x - p.x, it.y - p.y) < d);

    async function take(it) {
      it.found = true;
      found++;
      wrap.querySelector(`.xr-item[data-i="${it.i}"]`).remove();
      // vec vyskoci von - farebna, a odlozi sa do radu dole
      const slotX = 50 + (found - 1 - (n - 1) / 2) * 14;
      foundRow.insertAdjacentHTML('beforeend',
        `<g class="xr-out" transform="translate(${slotX.toFixed(1)} ${H - 7})"><g class="xr-pop">${ITEMS[it.key](true)}</g></g>`);
      sparkle(fx, it.x, it.y);
      sfx.found();
      api.setProgress(n, found);
      if (found < n) return;
      over = true;
      await wait(300);
      // lupa odide, zvieratko je zdrave
      lensNode.style.display = 'none';
      moveLens({ x: -50, y: -50 });
      await celebrate(pet, pet, fx);
      api.win(3);
    }

    function check(p, now) {
      const it = near(p, HIT);
      if (!it) { aiming = null; return; }
      if (!aiming || aiming.i !== it.i) aiming = { i: it.i, since: now };
      else if (now - aiming.since >= HOLD) { aiming = null; take(it); }
    }

    function onDown(ev) {
      if (over) return;
      down = true;
      lensNode.classList.remove('xr-hint');
      const p = toSvg(ev);
      moveLens(p);
      svgEl.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
      // tuk priamo na vec = najdene hned
      const it = near(p, HIT + 2);
      if (it) take(it);
      else aiming = null;
    }

    function onMove(ev) {
      if (over) return;
      const p = toSvg(ev);
      // mysou sa lupa hybe aj bez drzania, prstom len pri tahani
      if (!down && ev.pointerType !== 'mouse') return;
      moveLens(p);
      check(p, performance.now());
    }

    // hladanie nema chyby - hviezdy su vzdy plne
    const onUp = () => { down = false; aiming = null; };

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { over = true; } };
  },
};
