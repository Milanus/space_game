import { PALETTE, ALL_DEFS, svgDoc, svg, stickered, animal, ANIMAL_KINDS } from '../art.js';
import { shuffle, el, wait, pick } from '../util.js';
import { sfx } from '../audio.js';
import { pointerMap, sparkle, shake, setFace, celebrate, starsFor, trayRect, FIT_TOP, fitAttr, fromBody, MOUTH, nextPet } from './clinic.js';

// Daj liek: lyzickou naberie sirup z flasky a da ho zvieratku do pusinky.
// Od 2. urovne je flasiek viac a bublina ukaze, ktoru farbu zvieratko potrebuje.

const W = 100;
const H = 132;
const TRAY_Y = 116;
const REACH = 12;   // ako blizko k flaske / pusinke treba lyzicku pustit
const SYRUPS = [PALETTE.pink, PALETTE.mint, PALETTE.violet];
const COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.blue];

const LEVELS = [
  { bottles: 1, doses: 3 },
  { bottles: 2, doses: 3 },
  { bottles: 3, doses: 4 },
];

// flaska so sirupom, stred 0 0
const bottle = (c) => `
  <rect x="-3" y="-13" width="6" height="4" rx="1" fill="#fff" stroke="#8a8fb8" stroke-width=".8"/>
  <path d="M-3 -9 h6 v2 q5 1 5 6 v9 q0 4 -4 4 h-8 q-4 0 -4 -4 v-9 q0 -5 5 -6 Z" fill="#e9f3ff" fill-opacity=".85" stroke="#8a8fb8" stroke-width="1"/>
  <path d="M-7 -1 h14 v9 q0 3 -3 3 h-8 q-3 0 -3 -3 Z" fill="${c}"/>
  <rect x="-4.5" y="0" width="9" height="7" rx="1.5" fill="#fff" opacity=".92"/>
  <path d="M0 1.5 v4 M-2 3.5 h4" stroke="${PALETTE.orange}" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M-5 -5 q-1 4 0 9" stroke="#fff" stroke-width="1.1" opacity=".7" fill="none" stroke-linecap="round"/>`;

// lyzicka - stred hlavicky je v 0 0, rukovat ide doprava dole k prstu
const spoon = () => `
  <path d="M3 2 L15 11" stroke="#c7cde8" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M3 2 L15 11" stroke="#f4f6ff" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse rx="5.4" ry="3.6" transform="rotate(37)" fill="#f4f6ff" stroke="#8a8fb8" stroke-width="1"/>
  <ellipse class="md-syrup" rx="3.8" ry="2.3" transform="rotate(37)" fill="none"/>`;

export default {
  id: 'medicine',
  name: 'Daj liek',
  color: PALETTE.mint,
  levels: LEVELS.length,
  icon: () => svg(stickered(`${animal('zajac', PALETTE.violet, true)}
    <g transform="translate(72 82) scale(1.5)">${bottle(PALETTE.pink)}</g>`)),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const F = FIT_TOP;
    const sick = nextPet();
    const mouth = fromBody(F, MOUTH.x, MOUTH.y);
    const syrups = shuffle(SYRUPS).slice(0, L.bottles);
    const want = pick(syrups);
    const spoonHome = { x: 80, y: TRAY_Y - 4 };
    let doses = 0;
    let misses = 0;
    let full = null;   // farba sirupu v lyzicke
    let over = false;

    const bottleX = (i) => 18 + i * 20;
    const hint = L.bottles > 1 ? `
      <g transform="translate(86 15)">
        <circle cx="-13" cy="13" r="1.8" fill="#fff" opacity=".9"/>
        <circle cx="-9" cy="9" r="2.8" fill="#fff" opacity=".9"/>
        <circle r="11.5" fill="#fff" stroke="#c9d6ff" stroke-width="1"/>
        <g transform="translate(0 1) scale(.62)">${bottle(want)}</g>
      </g>` : '';

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fitAttr(F)}"><g class="md-pet">
            <g filter="url(#sticker)">${animal(sick.kind, sick.color)}</g>
          </g></g>
          ${hint}
          ${trayRect(TRAY_Y, 28)}
          ${syrups.map((c, i) => `
            <g class="md-bottle" data-c="${c}" transform="translate(${bottleX(i)} ${TRAY_Y})"><g class="md-inner">${bottle(c)}</g></g>`).join('')}
          <g class="md-spoon cl-drag" transform="translate(${spoonHome.x} ${spoonHome.y})">
            <circle cx="6" cy="5" r="11" fill="transparent"/>${spoon()}
          </g>
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const pet = wrap.querySelector('.md-pet');
    const spoonNode = wrap.querySelector('.md-spoon');
    const syrupNode = wrap.querySelector('.md-syrup');
    const fx = wrap.querySelector('.vet-fx');
    const toSvg = pointerMap(svgEl, W, H);
    const bottles = [...wrap.querySelectorAll('.md-bottle')].map((n, i) => ({ n, c: n.dataset.c, x: bottleX(i), y: TRAY_Y - 6 }));
    api.setProgress(L.doses, 0);

    // prst drzi rukovat, hlavicka lyzicky je kusok nad nim
    const GRIP = { x: -9, y: -8 };
    let drag = null;
    const place = (x, y, s = 1) => spoonNode.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s})`);
    const setSyrup = (c) => {
      full = c;
      syrupNode.setAttribute('fill', c || 'none');
    };

    function onDown(ev) {
      if (over || !ev.target.closest?.('.md-spoon')) return;
      drag = {};
      spoonNode.classList.add('dragging');
      sfx.tap();
      svgEl.setPointerCapture?.(ev.pointerId);
      onMove(ev);
      ev.preventDefault();
    }

    function onMove(ev) {
      if (!drag) return;
      const p = toSvg(ev);
      drag.at = { x: p.x + GRIP.x, y: p.y + GRIP.y }; // poloha hlavicky
      place(drag.at.x, drag.at.y, 1.2);
    }

    async function onUp() {
      if (!drag) return;
      const { at } = drag;
      drag = null;
      spoonNode.classList.remove('dragging');
      place(spoonHome.x, spoonHome.y);
      if (!at) return;

      const b = bottles.find((o) => Math.hypot(o.x - at.x, o.y - at.y) < REACH);
      if (b && !full) {
        if (b.c === want) {
          setSyrup(b.c);
          sfx.flip();
        } else {
          // tento liek nie - flaska sa zatrasie
          misses++;
          sfx.wrong();
          shake(b.n.firstElementChild);
        }
        return;
      }

      if (full && Math.hypot(mouth.x - at.x, mouth.y - at.y) < REACH + 4) {
        const color = full;
        setSyrup(null);
        doses++;
        api.setProgress(L.doses, doses);
        sfx.good();
        sparkle(fx, mouth.x + 9, mouth.y - 5, color);
        if (doses >= L.doses) {
          over = true;
          spoonNode.style.display = 'none';
          await celebrate(pet, pet, fx);
          api.win(starsFor(misses));
          return;
        }
        // mnam - na chvilku usmev, potom je este chore
        setFace(pet, true);
        await wait(700);
        if (!over) setFace(pet, false);
      }
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { over = true; drag = null; } };
  },
};
