import { PALETTE, shapeSvg, ALL_DEFS, ink, svgDoc } from '../art.js';
import { shuffle, el, wait } from '../util.js';
import { sfx } from '../audio.js';

const W = 100;   // sirka viewBoxu
const H = 138;   // + spodny pas, kde cakaju dieliky
const TRAY_Y = 116;
const FIT = 0.76; // obrazok zmensime, nech sa dieliky zmestia aj do pasu
const SNAP = 9;  // ako blizko musi dielik byt, aby zapadol

const COLORS = [PALETTE.mint, PALETTE.orange, PALETTE.blue, PALETTE.yellow, PALETTE.violet, PALETTE.pink];

function star() {
  const cx = 50;
  const cy = 46;
  const inner = 17;
  const outer = 40;
  const pt = (r, i) => {
    const a = (-90 + i * 72) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const core = [0, 1, 2, 3, 4].map((i) => pt(inner, i));
  const spikes = [0, 1, 2, 3, 4].map((i) => {
    const a = (-90 + i * 72 + 36) * Math.PI / 180;
    return [core[i], [cx + outer * Math.cos(a), cy + outer * Math.sin(a)], core[(i + 1) % 5]];
  });
  return [core, ...spikes];
}

// kazdy obrazok = zoznam mnohouholnikov, ktore sa neprekryvaju
export const FIGURES = [
  { name: 'raketa', parts: [
    [[50, 8], [34, 36], [66, 36]],
    [[34, 36], [66, 36], [66, 74], [34, 74]],
    [[34, 74], [66, 74], [50, 98]],
  ] },
  { name: 'raketa s krídlami', parts: [
    [[50, 8], [34, 36], [66, 36]],
    [[34, 36], [66, 36], [66, 74], [34, 74]],
    [[34, 52], [34, 80], [16, 80]],
    [[66, 52], [66, 80], [84, 80]],
    [[38, 74], [62, 74], [50, 98]],
  ] },
  { name: 'ufo', parts: [
    [[38, 26], [62, 26], [50, 8]],
    [[38, 26], [62, 26], [72, 44], [28, 44]],
    [[28, 44], [72, 44], [92, 58], [8, 58]],
    [[34, 58], [66, 58], [76, 96], [24, 96]],
  ] },
  { name: 'hviezda', parts: star() },
];

const bbox = (pts) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

const toPoints = (pts) => pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ');

export default {
  id: 'tangram',
  name: 'Poskladaj tvar',
  color: PALETTE.blue,
  levels: FIGURES.length,
  icon: () => shapeSvg('planeta', PALETTE.violet),

  start(stage, api) {
    const fig = FIGURES[Math.min(api.level, FIGURES.length - 1)];
    const parts = fig.parts.map((pts) => pts.map(([x, y]) => [50 + (x - 50) * FIT, 48 + (y - 50) * FIT]));
    const colors = shuffle(COLORS).slice(0, parts.length);
    const order = shuffle(parts.map((_, i) => i));

    // dieliky cakaju v spodnom pase - ukladame ich podla skutocnej sirky,
    // aby sa neprekryvali ani pri velkych kusoch
    const boxes = parts.map(bbox);
    const gap = 2;
    const totalW = order.reduce((a, i) => a + boxes[i].w + gap, -gap);
    const scaleRow = Math.min(1, (W - 6) / totalW);
    const starts = [];
    let cursor = (W - totalW * scaleRow) / 2;
    for (const i of order) {
      const b = boxes[i];
      starts[i] = {
        dx: cursor + b.w / 2 - (b.x + b.w / 2),
        dy: TRAY_Y - (b.y + b.h / 2),
      };
      cursor += (b.w + gap) * scaleRow;
    }

    const silhouette = parts.map((pts) =>
      `<polygon points="${toPoints(pts)}" fill="#0d1140" opacity="0.55" stroke="${PALETTE.cream}"
                stroke-width="0.9" stroke-dasharray="3 2.5" stroke-linejoin="round" opacity="0.75"/>`).join('');

    const pieces = parts.map((pts, i) =>
      `<polygon class="tan-piece" data-i="${i}" points="${toPoints(pts)}" fill="url(#g${colors[i].slice(1)})"
                stroke="${ink(colors[i])}" stroke-width="1.6" stroke-linejoin="round"
                transform="translate(${starts[i].dx.toFixed(2)} ${starts[i].dy.toFixed(2)})"/>`).join('');

    const wrap = el(svgDoc(`
      <div class="tan-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g class="tan-target">${silhouette}</g>
          <rect x="1" y="${TRAY_Y - 20}" width="${W - 2}" height="${H - TRAY_Y + 18}" rx="6"
                fill="#0d1140" opacity="0.35"/>
          <g class="tan-pieces">${pieces}</g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const layer = wrap.querySelector('.tan-pieces');
    const offsets = starts.map((s) => ({ ...s }));
    const locked = new Set();
    let placed = 0;
    let misses = 0;
    api.setProgress(parts.length, 0);

    let drag = null; // { node, i, grabX, grabY }

    const toSvg = (ev) => {
      const r = svgEl.getBoundingClientRect();
      return {
        x: ((ev.clientX - r.left) / r.width) * W,
        y: ((ev.clientY - r.top) / r.height) * H,
      };
    };

    const setT = (node, i) =>
      node.setAttribute('transform', `translate(${offsets[i].dx.toFixed(2)} ${offsets[i].dy.toFixed(2)})`);

    function onDown(ev) {
      const node = ev.target.closest?.('.tan-piece');
      if (!node) return;
      const i = Number(node.dataset.i);
      if (locked.has(i)) return;
      const p = toSvg(ev);
      drag = { node, i, grabX: p.x - offsets[i].dx, grabY: p.y - offsets[i].dy };
      layer.appendChild(node); // tahany dielik navrch
      node.classList.add('dragging');
      svgEl.setPointerCapture?.(ev.pointerId);
      sfx.tap();
      ev.preventDefault();
    }

    function onMove(ev) {
      if (!drag) return;
      const p = toSvg(ev);
      offsets[drag.i].dx = p.x - drag.grabX;
      offsets[drag.i].dy = p.y - drag.grabY;
      setT(drag.node, drag.i);
    }

    async function onUp() {
      if (!drag) return;
      const { node, i } = drag;
      drag = null;
      node.classList.remove('dragging');

      if (Math.hypot(offsets[i].dx, offsets[i].dy) < SNAP) {
        offsets[i] = { dx: 0, dy: 0 };
        setT(node, i);
        node.classList.add('locked');
        node.style.pointerEvents = 'none';
        locked.add(i);
        placed++;
        api.setProgress(parts.length, placed);
        sfx.found();
        if (placed === parts.length) {
          await wait(450);
          api.win(misses <= 2 ? 3 : misses <= 6 ? 2 : 1);
        }
      } else {
        misses++;
        sfx.bump();
      }
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { drag = null; } };
  },
};
