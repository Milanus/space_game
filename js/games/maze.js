import { PALETTE, shapeSvg, shapeGroup, ALL_DEFS, svgDoc } from '../art.js';
import { shuffle, el, wait } from '../util.js';
import { sfx } from '../audio.js';

const LEVELS = [4, 5, 6, 7];
const STARS_TO_COLLECT = 3;
const C = 10; // velkost bunky vo viewBoxe

export function buildMaze(n) {
  const cell = (x, y) => ({ x, y, N: true, E: true, S: true, W: true, seen: false });
  const g = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => cell(x, y)));
  const stack = [g[0][0]];
  g[0][0].seen = true;

  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const options = shuffle(Object.keys(DIR)).filter((d) => {
      const nx = cur.x + DIR[d][0];
      const ny = cur.y + DIR[d][1];
      return nx >= 0 && ny >= 0 && nx < n && ny < n && !g[ny][nx].seen;
    });
    if (!options.length) { stack.pop(); continue; }
    const d = options[0];
    const nxt = g[cur.y + DIR[d][1]][cur.x + DIR[d][0]];
    cur[d] = false;
    nxt[OPP[d]] = false;
    nxt.seen = true;
    stack.push(nxt);
  }
  return g;
}

// najkratsia cesta start -> ciel (v perfektnom bludisku je prave jedna)
export function solve(g, n) {
  const key = (x, y) => `${x},${y}`;
  const prev = new Map();
  const q = [[0, 0]];
  const seen = new Set([key(0, 0)]);
  const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

  while (q.length) {
    const [x, y] = q.shift();
    if (x === n - 1 && y === n - 1) break;
    for (const d of Object.keys(DIR)) {
      if (g[y][x][d]) continue;
      const nx = x + DIR[d][0];
      const ny = y + DIR[d][1];
      if (seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      prev.set(key(nx, ny), [x, y]);
      q.push([nx, ny]);
    }
  }
  const path = [];
  let cur = [n - 1, n - 1];
  while (cur) {
    path.unshift(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  return path;
}

export default {
  id: 'maze',
  name: 'Bludisko',
  color: PALETTE.blue,
  levels: LEVELS.length,
  icon: () => shapeSvg('raketa', PALETTE.mint),

  start(stage, api) {
    const n = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const g = buildMaze(n);
    const path = solve(g, n);

    // hviezdy rozlozime po ceste, aby sa dali vzdy pozbierat
    const inner = path.slice(1, -1);
    const stars = [];
    for (let i = 1; i <= STARS_TO_COLLECT && inner.length; i++) {
      const idx = Math.min(inner.length - 1, Math.floor((inner.length * i) / (STARS_TO_COLLECT + 1)));
      const [sx, sy] = inner[idx];
      if (!stars.some((s) => s.x === sx && s.y === sy)) stars.push({ x: sx, y: sy, got: false });
    }

    const pad = 4;
    const size = n * C + pad * 2;
    const cx = (i) => pad + i * C + C / 2;

    let walls = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const c = g[y][x];
        const x0 = pad + x * C;
        const y0 = pad + y * C;
        if (c.N) walls += `M${x0} ${y0} h${C} `;
        if (c.W) walls += `M${x0} ${y0} v${C} `;
        if (y === n - 1 && c.S) walls += `M${x0} ${y0 + C} h${C} `;
        if (x === n - 1 && c.E) walls += `M${x0 + C} ${y0} v${C} `;
      }
    }

    const starMarks = stars.map((s, i) => `
      <g class="mz-star" data-star="${i}">
        ${shapeGroup('hviezda', PALETTE.yellow, `transform="translate(${cx(s.x) - 3.4} ${cx(s.y) - 3.4}) scale(0.068)"`)}
      </g>`).join('');

    const wrap = el(svgDoc(`
      <div class="maze-wrap">
        <svg viewBox="0 0 ${size} ${size}">
          ${ALL_DEFS}
          <rect x="${pad - 1}" y="${pad - 1}" width="${n * C + 2}" height="${n * C + 2}" rx="3" fill="#141a4d"/>
          ${shapeGroup('planeta', PALETTE.violet, `transform="translate(${cx(n - 1) - 5.5} ${cx(n - 1) - 5.5}) scale(0.11)"`)}
          <polyline id="mz-trail" points="" fill="none" stroke="${PALETTE.orange}" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
          ${starMarks}
          <path d="${walls}" stroke="${PALETTE.mint}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
          ${shapeGroup('raketa', PALETTE.orange, `id="mz-ship" transform="translate(${cx(0) - 5} ${cx(0) - 5}) scale(0.1)"`)}
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const ship = wrap.querySelector('#mz-ship');
    const trail = wrap.querySelector('#mz-trail');

    let pos = { x: 0, y: 0 };
    let trailPts = [[cx(0), cx(0)]];
    let collected = 0;
    let bumps = 0;
    let done = false;
    api.setProgress(STARS_TO_COLLECT, 0);

    function toCell(ev) {
      const r = svgEl.getBoundingClientRect();
      const gx = ((ev.clientX - r.left) / r.width) * size;
      const gy = ((ev.clientY - r.top) / r.height) * size;
      return {
        x: Math.floor((gx - pad) / C),
        y: Math.floor((gy - pad) / C),
      };
    }

    function moveTo(x, y) {
      pos = { x, y };
      ship.setAttribute('transform', `translate(${cx(x) - 5} ${cx(y) - 5}) scale(0.1)`);
      trailPts.push([cx(x), cx(y)]);
      trail.setAttribute('points', trailPts.map((p) => p.join(',')).join(' '));

      const st = stars.find((s) => s.x === x && s.y === y && !s.got);
      if (st) {
        st.got = true;
        collected++;
        api.setProgress(STARS_TO_COLLECT, collected);
        sfx.found();
        const mark = wrap.querySelector(`[data-star="${stars.indexOf(st)}"]`);
        if (mark) { mark.style.transition = 'opacity .3s, transform .3s'; mark.style.opacity = '0'; }
      } else {
        sfx.tap();
      }

      if (x === n - 1 && y === n - 1 && !done) finish();
    }

    async function finish() {
      done = true;
      if (collected < STARS_TO_COLLECT) {
        // ciel bez vsetkych hviezd - necháme dieta dozbierat
        done = false;
        sfx.wrong();
        return;
      }
      sfx.good();
      await wait(400);
      api.win(bumps <= 2 ? 3 : bumps <= 6 ? 2 : 1);
    }

    // jeden krok smerom k prstu, ak nestoji stena
    function step(target) {
      for (let i = 0; i < 12; i++) {
        if (pos.x === target.x && pos.y === target.y) return;
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const tryOrder = Math.abs(dx) >= Math.abs(dy)
          ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
          : [[0, Math.sign(dy)], [Math.sign(dx), 0]];

        let moved = false;
        for (const [sx, sy] of tryOrder) {
          if (!sx && !sy) continue;
          const dir = sx === 1 ? 'E' : sx === -1 ? 'W' : sy === 1 ? 'S' : 'N';
          if (g[pos.y][pos.x][dir]) continue;
          moveTo(pos.x + sx, pos.y + sy);
          moved = true;
          break;
        }
        if (!moved) { bumps++; sfx.bump(); return; }
      }
    }

    let dragging = false;
    function onDown(ev) {
      if (done) return;
      dragging = true;
      svgEl.setPointerCapture?.(ev.pointerId);
      onMove(ev);
    }
    function onMove(ev) {
      if (!dragging || done) return;
      const t = toCell(ev);
      if (t.x < 0 || t.y < 0 || t.x >= n || t.y >= n) return;
      step(t);
    }
    function onUp() { dragging = false; }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { dragging = false; } };
  },
};
