import { SHAPE_KEYS, PALETTE, shapeSvg } from '../art.js';
import { shuffle, rand, pick, el, wait } from '../util.js';
import { sfx } from '../audio.js';

// vzor postupnosti podla urovne - od najlahsieho striedania po trojicu
const LEVELS = [
  { pattern: [0, 1], len: 6, gapAtEnd: true },
  { pattern: [0, 0, 1], len: 6, gapAtEnd: true },
  { pattern: [0, 1, 2], len: 6, gapAtEnd: false },
  { pattern: [0, 1, 1, 2], len: 8, gapAtEnd: false },
];
const ROUNDS = 4;
const COLORS = [PALETTE.mint, PALETTE.orange, PALETTE.blue, PALETTE.yellow, PALETTE.violet, PALETTE.pink];

export function makeRound(level) {
  const { pattern, len, gapAtEnd } = level;
  // o jeden tvar navyse - aby bolo vzdy z coho vyberat aj pri striedani dvoch
  const kinds = shuffle(SHAPE_KEYS).slice(0, Math.max(...pattern) + 2);
  const colors = shuffle(COLORS).slice(0, kinds.length);
  const row = Array.from({ length: len }, (_, i) => pattern[i % pattern.length]);
  const gap = gapAtEnd ? len - 1 : pattern.length + rand(len - pattern.length);
  const answer = row[gap];
  const options = shuffle(kinds.map((_, i) => i));
  return { kinds, colors, row, gap, answer, options };
}

export default {
  id: 'seq',
  name: 'Čo nasleduje?',
  color: PALETTE.violet,
  levels: LEVELS.length,
  icon: () => shapeSvg('kometa', PALETTE.orange),

  start(stage, api) {
    const level = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const wrap = el(`
      <div class="quiz-wrap">
        <div class="seq-row"></div>
        <div class="quiz-answers"></div>
      </div>`);
    stage.appendChild(wrap);

    const row = wrap.querySelector('.seq-row');
    const answers = wrap.querySelector('.quiz-answers');
    let round = 0;
    let mistakes = 0;
    let busy = false;
    api.setProgress(ROUNDS, 0);

    async function next() {
      if (round === ROUNDS) {
        await wait(300);
        api.win(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
        return;
      }
      const r = makeRound(level);
      row.innerHTML = r.row.map((k, i) => i === r.gap
        ? `<div class="seq-cell gap" data-gap="1">?</div>`
        : `<div class="seq-cell">${shapeSvg(r.kinds[k], r.colors[k])}</div>`).join('');

      answers.innerHTML = '';
      for (const o of r.options) {
        const btn = el(`<button class="answer">${shapeSvg(r.kinds[o], r.colors[o])}</button>`);
        btn.addEventListener('click', () => choose(btn, o === r.answer, r));
        answers.appendChild(btn);
      }
    }

    async function choose(btn, correct, r) {
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
      // doplnime chybajuci obrazok do radu, nech dieta vidi hotovy vzor
      const cell = row.querySelector('.gap');
      cell.classList.remove('gap');
      cell.innerHTML = shapeSvg(r.kinds[r.answer], r.colors[r.answer]);
      round++;
      api.setProgress(ROUNDS, round);
      await wait(750);
      busy = false;
      next();
    }

    next();
    return { destroy() {} };
  },
};
