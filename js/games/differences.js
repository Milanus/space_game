import { SHAPE_KEYS, PALETTE, shapeSvg, stickered, SHAPES, ALL_DEFS, svgDoc } from '../art.js';
import { shuffle, rand, pick, between, el, wait } from '../util.js';
import { sfx } from '../audio.js';

const LEVELS = [3, 4, 5, 5];
const COLORS = [PALETTE.mint, PALETTE.orange, PALETTE.blue, PALETTE.yellow, PALETTE.violet, PALETTE.pink];
const VB = 100;

// scena = objekty v mriezke 3x3 s malym rozhodenim, aby sa neprekryvali
export function makeScene(count) {
  const slots = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, count);
  const keys = shuffle(SHAPE_KEYS);
  return slots.map((slot, i) => ({
    key: keys[i % keys.length],
    color: COLORS[rand(COLORS.length)],
    x: (slot % 3) * 33.3 + 16.6 + between(-4, 4),
    y: Math.floor(slot / 3) * 33.3 + 16.6 + between(-4, 4),
    size: between(20, 26),
    flip: false,
  }));
}

export function applyDiffs(scene, howMany) {
  const idx = shuffle(scene.map((_, i) => i)).slice(0, howMany);
  const b = scene.map((it) => ({ ...it }));
  for (const i of idx) {
    const kind = pick(['remove', 'color', 'size', 'flip']);
    if (kind === 'remove') {
      b[i].hidden = true;
    } else if (kind === 'color') {
      const others = COLORS.filter((c) => c !== scene[i].color);
      b[i].color = pick(others);
    } else if (kind === 'size') {
      b[i].size = scene[i].size * (Math.random() < 0.5 ? 0.55 : 1.35);
    } else {
      b[i].flip = true;
    }
  }
  return { b, diffs: idx };
}

// pozadie musi byt v oboch paneloch rovnake, inak by hviezdy mýlili
function makeBackdrop() {
  return Array.from({ length: 18 }, () => {
    const x = between(2, 98).toFixed(1);
    const y = between(2, 98).toFixed(1);
    const r = between(0.5, 1.3).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.35"/>`;
  }).join('');
}

function renderPanel(items, backdrop) {
  const art = items.map((it) => {
    if (it.hidden) return '';
    const half = it.size / 2;
    const scale = it.size / 100;
    const mirror = it.flip ? `translate(${it.size} 0) scale(-1 1)` : '';
    return `<g transform="translate(${it.x - half} ${it.y - half})">
        <g transform="${mirror}"><g transform="scale(${scale})">${stickered(SHAPES[it.key](it.color))}</g></g>
      </g>`;
  }).join('');

  // terce su az navrchu, aby ich neprekryla kresba susedneho objektu
  const hits = items.map((it, i) =>
    `<circle class="hit" data-i="${i}" cx="${it.x}" cy="${it.y}"
             r="${Math.max(it.size, 16) / 1.7}" fill="transparent"/>`).join('');

  return svgDoc(`<svg viewBox="0 0 ${VB} ${VB}">
      ${ALL_DEFS}
      <rect width="${VB}" height="${VB}" fill="#17205c"/>
      ${backdrop}
      ${art}
      <g class="marks"></g>
      ${hits}
    </svg>`);
}

export default {
  id: 'diffs',
  name: 'Nájdi rozdiely',
  color: PALETTE.orange,
  levels: LEVELS.length,
  icon: () => shapeSvg('mesiac', PALETTE.cream),

  start(stage, api) {
    const count = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const scene = makeScene(Math.max(6, count + 3));
    const { b, diffs } = applyDiffs(scene, count);

    const backdrop = makeBackdrop();
    const panelA = renderPanel(scene, backdrop);
    const panelB = renderPanel(b, backdrop);

    const wrap = el(`
      <div class="diff-wrap">
        <div class="diff-panel" data-panel="a">${panelA}</div>
        <div class="diff-panel" data-panel="b">${panelB}</div>
      </div>`);
    stage.appendChild(wrap);

    const panels = [...wrap.querySelectorAll('.diff-panel')];
    let found = new Set();
    let mistakes = 0;
    api.setProgress(count, 0);

    function markAll(i) {
      for (const p of panels) {
        const hit = p.querySelector(`.hit[data-i="${i}"]`);
        const marks = p.querySelector('.marks');
        if (!hit || !marks) continue;
        const cx = hit.getAttribute('cx');
        const cy = hit.getAttribute('cy');
        const r = Number(hit.getAttribute('r')) + 1.5;
        marks.insertAdjacentHTML('beforeend',
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${PALETTE.yellow}" stroke-width="1.6">
             <animate attributeName="r" from="${r * 1.9}" to="${r}" dur="0.35s" fill="freeze"/>
           </circle>`);
      }
    }

    function missAt(panel, x, y) {
      const marks = panel.querySelector('.marks');
      marks.insertAdjacentHTML('beforeend',
        `<g class="miss-x" transform="translate(${x} ${y})">
           <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="${PALETTE.orange}" stroke-width="2" stroke-linecap="round"/>
         </g>`);
      setTimeout(() => marks.lastElementChild?.remove(), 700);
    }

    async function onTap(ev) {
      const panel = ev.currentTarget;
      const svgEl = panel.querySelector('svg');
      const r = svgEl.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * VB;
      const y = ((ev.clientY - r.top) / r.height) * VB;

      const hit = ev.target.closest?.('.hit');
      const i = hit ? Number(hit.dataset.i) : -1;

      if (i >= 0 && diffs.includes(i) && !found.has(i)) {
        found.add(i);
        markAll(i);
        api.setProgress(count, found.size);
        sfx.found();
        if (found.size === count) {
          await wait(450);
          api.win(mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1);
        }
        return;
      }
      if (i >= 0 && found.has(i)) return;

      mistakes++;
      sfx.wrong();
      missAt(panel, x, y);
    }

    panels.forEach((p) => p.addEventListener('pointerdown', onTap));

    function layout() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const side = w / h > 1.25;
      wrap.classList.toggle('stacked', !side);
      const gap = 12;
      const s = side
        ? Math.min((w - gap) / 2, h)
        : Math.min(w, (h - gap) / 2);
      panels.forEach((p) => { p.style.width = `${s}px`; p.style.height = `${s}px`; });
    }
    layout();
    window.addEventListener('resize', layout);

    return { destroy: () => window.removeEventListener('resize', layout) };
  },
};
