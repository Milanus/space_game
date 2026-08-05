import { PALETTE, shapeSvg, lighten, darken } from '../art.js';
import { shuffle, rand, el, wait } from '../util.js';
import { sfx } from '../audio.js';

// obrazok -> slovo, z ktoreho berieme prvu hlasku
const WORDS = [
  ['raketa', 'raketa'],
  ['ufo', 'ufo'],
  ['mimon', 'mimoň'],
  ['planeta', 'planéta'],
  ['hviezda', 'hviezda'],
  ['mesiac', 'mesiac'],
  ['kometa', 'kométa'],
  ['satelit', 'satelit'],
  ['astronaut', 'astronaut'],
  ['robot', 'robot'],
];
const ABC = 'ABCDEFGHIJKLMNOPRSTUVZ'.split('');
const COLORS = [PALETTE.mint, PALETTE.orange, PALETTE.blue, PALETTE.yellow, PALETTE.violet, PALETTE.pink];
const LEVELS = [2, 3, 3, 4]; // kolko pismen na vyber
const ROUNDS = 5;

export function makeRound(optionCount) {
  const [key, word] = WORDS[rand(WORDS.length)];
  const correct = word[0].toUpperCase();
  const options = new Set([correct]);
  while (options.size < optionCount) {
    const l = ABC[rand(ABC.length)];
    if (l !== correct) options.add(l);
  }
  return { key, word, correct, options: shuffle([...options]) };
}

export default {
  id: 'letters',
  name: 'Prvé písmeno',
  color: PALETTE.pink,
  levels: LEVELS.length,
  icon: () => shapeSvg('hviezda', PALETTE.yellow),

  start(stage, api) {
    const optionCount = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const wrap = el(`
      <div class="quiz-wrap">
        <div class="letter-hero"></div>
        <div class="quiz-answers"></div>
      </div>`);
    stage.appendChild(wrap);

    const hero = wrap.querySelector('.letter-hero');
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
      const r = makeRound(optionCount);
      hero.innerHTML = shapeSvg(r.key, COLORS[rand(COLORS.length)]);
      answers.innerHTML = '';
      r.options.forEach((letter, i) => {
        const btn = el(`<button class="answer letter" style="background:linear-gradient(160deg, ${lighten(COLORS[i % COLORS.length], .3)}, ${darken(COLORS[i % COLORS.length], .14)})">${letter}</button>`);
        btn.addEventListener('click', () => choose(btn, letter === r.correct));
        answers.appendChild(btn);
      });
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
