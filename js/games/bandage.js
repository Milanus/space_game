import { PALETTE, ALL_DEFS, svgDoc, svg, stickered, animal } from '../art.js';
import { el, wait } from '../util.js';
import { sfx } from '../audio.js';
import { pointerMap, sparkle, celebrate, trayRect, FIT_TOP, fitAttr, fromBody, nextPet } from './clinic.js';

// Obviaz brusko: zvieratko ma odreninu na brusku. Dieta chyti kotucik obvazu
// a tahom sem a tam cez brusko ho obtaca - kazdy prechod z jednej strany
// na druhu prida jeden pas obvazu.

const W = 100;
const H = 132;
const TRAY_Y = 118;
// brusko v suradniciach zvieratka (ako v animal())
const BELLY = { x: 50, y: 88, rx: 25, ry: 22 };
const TOP = 76;       // prvy pas obvazu (suradnice zvieratka)
const BOTTOM = 100;   // posledny pas
const EDGE = 15;      // ako daleko od stredu (v svg) treba prejst, aby sa ratala strana

const LEVELS = [{ n: 4 }, { n: 6 }, { n: 8 }];

let clipId = 0;

// kotucik obvazu - stred v 0 0
const roll = () => `
  <rect x="-8" y="-7" width="16" height="14" rx="3" fill="#fffaf0" stroke="#c9b48e" stroke-width="1"/>
  <ellipse cx="-8" cy="0" rx="3" ry="7" fill="#f4ead6" stroke="#c9b48e" stroke-width="1"/>
  <ellipse cx="-8" cy="0" rx="1.2" ry="2.8" fill="#c9b48e"/>
  <path d="M-3 -7 v14 M2 -7 v14" stroke="#eadfc8" stroke-width=".8"/>`;

// odrenina (suradnice zvieratka)
const scrape = `
  <g class="bd-wound">
    <ellipse cx="50" cy="88" rx="8" ry="5" fill="#ff5a6e" opacity=".85"/>
    <path d="M44 86 l11 -2 M45 89 l11 -2 M46 92 l9 -1.5" stroke="#b3203a" stroke-width="1" stroke-linecap="round"/>
  </g>`;

// jeden pas obvazu cez brusko (suradnice zvieratka), k = poradie
function band(y, h, k) {
  const tilt = k % 2 ? -5 : 5;
  return `<g class="bd-band" transform="rotate(${tilt} 50 ${y.toFixed(1)})">
    <rect x="18" y="${(y - h / 2).toFixed(1)}" width="64" height="${h.toFixed(1)}" fill="#fffaf0" stroke="#d8c9a8" stroke-width=".7"/>
    <path d="M18 ${(y - h / 4).toFixed(1)} h64 M18 ${(y + h / 4).toFixed(1)} h64" stroke="#efe4cc" stroke-width=".6"/>
  </g>`;
}

export default {
  id: 'bandage',
  name: 'Obviaž bruško',
  color: PALETTE.violet,
  levels: LEVELS.length,
  icon: () => svg(stickered(`${animal('pes', PALETTE.blue, true)}
    <g transform="rotate(-6 50 86)"><rect x="25" y="80" width="50" height="9" fill="#fffaf0" stroke="#d8c9a8" stroke-width="1"/></g>
    <g transform="translate(76 96) scale(1.2)">${roll()}</g>`)),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const pet = nextPet();
    const cid = `bdclip${++clipId}`;
    const step = (BOTTOM - TOP) / (L.n - 1);
    const h = Math.max(7, step + 3); // pasy sa trochu prekryvaju
    const rollHome = { x: 50, y: TRAY_Y };
    const mid = fromBody(FIT_TOP, BELLY.x, BELLY.y);
    let bands = 0;
    let side = 0;      // -1 vlavo, 1 vpravo, 0 este nikde
    let over = false;

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fitAttr(FIT_TOP)}"><g class="bd-pet">
            <g filter="url(#sticker)">${animal(pet.kind, pet.color)}</g>
            ${scrape}
            <defs><clipPath id="${cid}"><ellipse cx="${BELLY.x}" cy="${BELLY.y}" rx="${BELLY.rx + 0.6}" ry="${BELLY.ry + 0.6}"/></clipPath></defs>
            <g class="bd-bands" clip-path="url(#${cid})"></g>
          </g></g>
          ${trayRect(TRAY_Y, 22)}
          <path class="bd-tail" d="" fill="none" stroke="#fffaf0" stroke-width="3.4" stroke-linecap="round" opacity=".95"/>
          <g class="bd-roll cl-drag" transform="translate(${rollHome.x} ${rollHome.y})">
            <circle r="13" fill="transparent"/>${roll()}
          </g>
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const petNode = wrap.querySelector('.bd-pet');
    const bandsLayer = wrap.querySelector('.bd-bands');
    const tail = wrap.querySelector('.bd-tail');
    const rollNode = wrap.querySelector('.bd-roll');
    const fx = wrap.querySelector('.vet-fx');
    const toSvg = pointerMap(svgEl, W, H);
    api.setProgress(L.n, 0);

    const bandY = (k) => TOP + k * step;
    const place = (p, s = 1) => rollNode.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${s})`);

    // pasik obvazu od okraja bruska ku kotuciku
    function drawTail(p) {
      if (!p || !side) { tail.setAttribute('d', ''); return; }
      const from = fromBody(FIT_TOP, BELLY.x + side * BELLY.rx * 0.9, bandY(Math.max(0, bands - 1)));
      tail.setAttribute('d', `M${from.x.toFixed(1)} ${from.y.toFixed(1)} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    }

    async function addBand() {
      bandsLayer.insertAdjacentHTML('beforeend', band(bandY(bands), h, bands));
      bands++;
      api.setProgress(L.n, bands);
      sfx.flip();
      if (bands < L.n) return;
      over = true;
      sfx.found();
      tail.setAttribute('d', '');
      place(rollHome);
      rollNode.style.display = 'none';
      // spinka na konci obvazu
      const pin = fromBody(FIT_TOP, BELLY.x + 15, bandY(L.n - 1));
      petNode.parentNode.parentNode.insertAdjacentHTML('beforeend', `
        <g class="xr-pop" transform="translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})">
          <rect x="-5" y="-2" width="10" height="4" rx="2" fill="none" stroke="#9aa3c7" stroke-width="1.3"/>
          <circle cx="-5" cy="0" r="1.4" fill="${PALETTE.pink}"/></g>`);
      sparkle(fx, pin.x, pin.y);
      await wait(400);
      await celebrate(petNode, petNode, fx);
      api.win(3);
    }

    function wrapAt(p) {
      place(p, 1.15);
      // strana sa rata len vo vyske bruska
      const inBelly = Math.abs(p.y - mid.y) < BELLY.ry * FIT_TOP.s + 16;
      const now = !inBelly ? 0 : p.x < mid.x - EDGE ? -1 : p.x > mid.x + EDGE ? 1 : 0;
      if (now && now !== side) {
        if (side) addBand(); // prechod z jednej strany na druhu
        side = now;
      }
      drawTail(over ? null : p);
    }

    let down = false;

    // kotucik netreba presne chytit - skoci tam, kde sa dieta dotkne
    function onDown(ev) {
      if (over) return;
      down = true;
      rollNode.classList.add('dragging');
      sfx.tap();
      svgEl.setPointerCapture?.(ev.pointerId);
      wrapAt(toSvg(ev));
      ev.preventDefault();
    }

    function onMove(ev) {
      if (over || !down) return;
      wrapAt(toSvg(ev));
    }

    function onUp() {
      if (!down) return;
      down = false;
      rollNode.classList.remove('dragging');
      if (over) return;
      place(rollHome);
      drawTail(null);
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { over = true; } };
  },
};
