import { SHAPE_KEYS, PALETTE, svg, shapeSvg, shapeGroup, ALL_DEFS, svgDoc } from '../art.js';
import { shuffle, rand, pick, between, el, wait } from '../util.js';
import { sfx } from '../audio.js';

const LEVELS = [3, 4, 6, 8]; // najvyssi mozny pocet
const ROUNDS = 5;
const COLORS = [PALETTE.mint, PALETTE.orange, PALETTE.blue, PALETTE.yellow, PALETTE.violet, PALETTE.pink];

// bodky ako na kocke - deti to poznaju skor ako cislice
const DICE = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
  7: [[30, 25], [70, 25], [30, 50], [50, 50], [70, 50], [30, 75], [70, 75]],
  8: [[30, 22], [70, 22], [30, 43], [70, 43], [30, 64], [70, 64], [30, 85], [70, 85]],
  9: [[28, 25], [50, 25], [72, 25], [28, 50], [50, 50], [72, 50], [28, 75], [50, 75], [72, 75]],
};

function diceFace(n) {
  const dots = (DICE[n] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#22265c"/>`).join('');
  return svg(`<rect width="100" height="100" rx="18" fill="#fff8e7"/>${dots}`);
}

export function makeRound(max) {
  const count = 1 + rand(max);
  const options = new Set([count]);
  while (options.size < 3) {
    const alt = 1 + rand(Math.max(max, 3));
    if (alt !== count) options.add(alt);
  }
  return { count, options: shuffle([...options]) };
}

export default {
  id: 'count',
  name: 'Koľko ich je?',
  color: PALETTE.yellow,
  levels: LEVELS.length,
  icon: () => shapeSvg('satelit', PALETTE.blue),

  start(stage, api) {
    const max = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const wrap = el(`
      <div class="quiz-wrap">
        <div class="quiz-scene"><svg viewBox="0 0 100 100"></svg></div>
        <div class="quiz-answers"></div>
      </div>`);
    stage.appendChild(wrap);

    const scene = wrap.querySelector('.quiz-scene svg');
    const answers = wrap.querySelector('.quiz-answers');
    let round = 0;
    let mistakes = 0;
    let busy = false;
    api.setProgress(ROUNDS, 0);

    // mriezka sa prisposobi poctu - pri dvoch objektoch su velke, pri osmich mensie
    function gridFor(count) {
      if (count <= 2) return [2, 1];
      if (count <= 4) return [2, 2];
      if (count <= 6) return [3, 2];
      return [4, 2 + Math.ceil((count - 8) / 4)];
    }

    function drawScene(key, color, count) {
      const [cols, rows] = gridFor(count);
      const cw = 100 / cols;
      const ch = 100 / rows;
      const size = Math.min(cw, ch) * 0.82;
      const jitter = Math.min(cw, ch) * 0.09;
      const slots = shuffle([...Array(cols * rows).keys()]).slice(0, count);
      scene.innerHTML = svgDoc(ALL_DEFS + slots.map((s) => {
        const x = (s % cols) * cw + cw / 2 + between(-jitter, jitter);
        const y = Math.floor(s / cols) * ch + ch / 2 + between(-jitter, jitter);
        return shapeGroup(key, color,
          `transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})"`);
      }).join(''));
    }

    async function next() {
      if (round === ROUNDS) {
        await wait(300);
        api.win(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
        return;
      }
      const { count, options } = makeRound(max);
      drawScene(pick(SHAPE_KEYS), COLORS[rand(COLORS.length)], count);
      answers.innerHTML = '';
      for (const o of options) {
        const btn = el(`<button class="answer" data-n="${o}">${diceFace(o)}<span class="answer-num">${o}</span></button>`);
        btn.addEventListener('click', () => choose(btn, o === count));
        answers.appendChild(btn);
      }
    }

    async function choose(btn, correct) {
      if (busy) return;
      if (!correct) {
        mistakes++;
        sfx.wrong();
        btn.classList.add('bad');
        setTimeout(() => btn.classList.remove('bad'), 500);
        return;
      }
      busy = true;
      btn.classList.add('good');
      sfx.found();
      round++;
      api.setProgress(ROUNDS, round);
      await wait(600);
      busy = false;
      next();
    }

    next();
    return { destroy() {} };
  },
};
