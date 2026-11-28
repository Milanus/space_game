import { PALETTE, ALL_DEFS, svgDoc, relink, svg, stickered, animal } from '../art.js';
import { el, wait } from '../util.js';
import { sfx } from '../audio.js';
import { pointerMap, sparkle, shake, setFace, celebrate, starsFor, trayRect, FIT_TOP, fitAttr, fromBody, MOUTH, nextPet } from './clinic.js';

// Horucka: zvieratko je cervene a spotene. Najprv mu teplomerom zmeria teplotu
// (potiahne teplomer k pusinke), potom mu na celo da ladovy obklad a horucka zmizne.

const W = 100;
const H = 132;
const TRAY_Y = 117;
const REACH = 14;     // ako blizko k pusinke / celu treba vec pustit
const FOREHEAD = { x: 50, y: 24 }; // celo v suradniciach zvieratka

const LEVELS = [{ rounds: 2 }, { rounds: 3 }, { rounds: 4 }];

// teplomer - stred v 0 0, banka dole na (0, 12)
const thermo = () => `
  <rect x="-3.2" y="-15" width="6.4" height="26" rx="3.2" fill="#f4f8ff" stroke="#8a8fb8" stroke-width="1"/>
  <circle cy="12" r="4.4" fill="#ff4d5e" stroke="#b3203a" stroke-width="1"/>
  <rect class="fv-column" x="-1.2" y="5" width="2.4" height="7" rx="1.2" fill="#ff4d5e"/>
  ${[-10, -6, -2, 2].map((y) => `<path d="M1.6 ${y} h1.6" stroke="#8a8fb8" stroke-width=".6"/>`).join('')}`;

// ladovy obklad - stred v 0 0
const icepack = () => `
  <path d="M-12 -5 q0 -5 5 -5 h14 q5 0 5 5 v9 q0 6 -6 6 h-12 q-6 0 -6 -6 Z" fill="#9fdcff" stroke="#3a7bbf" stroke-width="1.1"/>
  <rect x="-3" y="-13" width="6" height="4" rx="1.4" fill="${PALETTE.blue}" stroke="#1f5f8f" stroke-width=".8"/>
  <rect x="-8" y="-4" width="6" height="6" rx="1.2" fill="#ffffff" opacity=".85" transform="rotate(-12 -5 -1)"/>
  <rect x="1" y="-2" width="6" height="6" rx="1.2" fill="#ffffff" opacity=".85" transform="rotate(10 4 1)"/>
  <path d="M-9 -6 q4 -2 8 -1" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>`;

// cervene lica a kvapky potu nad zvieratkom (suradnice zvieratka)
const flush = () => `
  <g class="fv-flush">
    <ellipse cx="50" cy="40" rx="25" ry="22" fill="#ff3b4f" opacity=".28"/>
    <ellipse cx="31" cy="47" rx="6" ry="3.6" fill="#ff3b4f" opacity=".7"/>
    <ellipse cx="69" cy="47" rx="6" ry="3.6" fill="#ff3b4f" opacity=".7"/>
    <path d="M72 22 q-3 5 0 7 q3 -2 0 -7 Z" fill="#7fd0ff" stroke="#3a7bbf" stroke-width=".7"/>
    <path d="M27 18 q-2.4 4 0 5.6 q2.4 -1.6 0 -5.6 Z" fill="#7fd0ff" stroke="#3a7bbf" stroke-width=".7"/>
  </g>`;

export default {
  id: 'fever',
  name: 'Horúčka',
  color: PALETTE.pink,
  levels: LEVELS.length,
  icon: () => svg(stickered(`${animal('zajac', PALETTE.mint, true)}
    <g transform="translate(50 26) scale(1.1)">${icepack()}</g>
    <g transform="translate(76 78) rotate(25) scale(1.3)">${thermo()}</g>`)),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const mouth = fromBody(FIT_TOP, MOUTH.x, MOUTH.y);
    const brow = fromBody(FIT_TOP, FOREHEAD.x, FOREHEAD.y);
    const homes = { thermo: { x: 34, y: TRAY_Y }, ice: { x: 66, y: TRAY_Y + 1 } };
    let round = 0;
    let misses = 0;
    let measured = false; // v tomto kole uz bola zmerana teplota
    let busy = false;
    let over = false;

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fitAttr(FIT_TOP)}"><g class="fv-pet"></g></g>
          ${trayRect(TRAY_Y, 28)}
          <g class="fv-tool fv-ice cl-drag" data-tool="ice" transform="translate(${homes.ice.x} ${homes.ice.y})">
            <g class="fv-inner"><circle r="14" fill="transparent"/>${icepack()}</g></g>
          <g class="fv-tool fv-thermo cl-drag" data-tool="thermo" transform="translate(${homes.thermo.x} ${homes.thermo.y}) rotate(-70)">
            <g class="fv-inner"><circle r="14" fill="transparent"/>${thermo()}</g></g>
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const pet = wrap.querySelector('.fv-pet');
    const fx = wrap.querySelector('.vet-fx');
    const tools = { thermo: wrap.querySelector('.fv-thermo'), ice: wrap.querySelector('.fv-ice') };
    const column = wrap.querySelector('.fv-column');
    const toSvg = pointerMap(svgEl, W, H);
    const homeAttr = { thermo: `translate(${homes.thermo.x} ${homes.thermo.y}) rotate(-70)`, ice: `translate(${homes.ice.x} ${homes.ice.y})` };

    function setColumn(h) {
      column.setAttribute('y', (12 - h).toFixed(1));
      column.setAttribute('height', h.toFixed(1));
    }

    // novy chory pacient
    function renderRound() {
      const p = nextPet();
      measured = false;
      setColumn(7);
      tools.thermo.classList.add('fv-next');
      tools.ice.classList.remove('fv-next');
      pet.innerHTML = relink(`<g filter="url(#sticker)">${animal(p.kind, p.color)}</g>${flush()}`, svgEl);
      pet.classList.remove('feed-in');
      void pet.getBoundingClientRect();
      pet.classList.add('feed-in');
    }

    api.setProgress(L.rounds, 0);
    renderRound();

    let drag = null;

    function onDown(ev) {
      if (busy || over) return;
      const node = ev.target.closest?.('.fv-tool');
      if (!node) return;
      drag = { node, tool: node.dataset.tool };
      node.parentNode.insertBefore(node, fx);
      node.classList.add('dragging');
      sfx.tap();
      svgEl.setPointerCapture?.(ev.pointerId);
      onMove(ev);
      ev.preventDefault();
    }

    function onMove(ev) {
      if (!drag) return;
      const p = toSvg(ev);
      drag.at = p;
      const rot = drag.tool === 'thermo' ? ' rotate(-35)' : '';
      drag.node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})${rot} scale(1.15)`);
    }

    async function onUp() {
      if (!drag) return;
      const { node, tool, at } = drag;
      drag = null;
      node.classList.remove('dragging');
      const goHome = () => node.setAttribute('transform', homeAttr[tool]);
      const target = tool === 'thermo' ? mouth : brow;
      // teplomer drzi prst v strede, banka je o 12 nizsie a natocena
      const tip = tool === 'thermo' && at ? { x: at.x + 7, y: at.y + 10 } : at;
      if (!tip || Math.hypot(tip.x - target.x, tip.y - target.y) > REACH) { goHome(); return; }

      if (tool === 'thermo') {
        if (measured) { goHome(); return; }
        busy = true;
        // banka v pusinke, stlpec vystupi az hore
        node.setAttribute('transform', `translate(${(mouth.x - 7).toFixed(2)} ${(mouth.y - 10).toFixed(2)}) rotate(-35)`);
        for (let h = 7; h <= 24; h += 1.5) { setColumn(h); await wait(40); }
        sfx.wrong(); // "jaj, je horuci" - nizky ton
        shake(pet);
        await wait(500);
        goHome();
        measured = true;
        tools.thermo.classList.remove('fv-next');
        tools.ice.classList.add('fv-next');
        busy = false;
        return;
      }

      // ladovy obklad bez merania - najprv teplomer
      if (!measured) {
        misses++;
        shake(tools.thermo.firstElementChild);
        goHome();
        return;
      }
      busy = true;
      node.setAttribute('transform', `translate(${brow.x.toFixed(2)} ${brow.y.toFixed(2)}) scale(.9)`);
      pet.querySelector('.fv-flush').classList.add('fv-cool');
      sfx.good();
      sparkle(fx, brow.x - 12, brow.y + 6, '#bfe9ff');
      sparkle(fx, brow.x + 12, brow.y + 4, '#bfe9ff');
      setFace(pet, true);
      round++;
      api.setProgress(L.rounds, round);
      await wait(1100);
      if (over) return;
      goHome();
      if (round >= L.rounds) {
        over = true;
        await celebrate(pet, pet, fx);
        api.win(starsFor(misses));
        return;
      }
      await wait(300);
      renderRound();
      busy = false;
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { over = true; drag = null; } };
  },
};
