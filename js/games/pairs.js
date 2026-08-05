import { SHAPE_KEYS, PALETTE, svg, shapeSvg, ICONS } from '../art.js';
import { shuffle, el, wait } from '../util.js';
import { sfx } from '../audio.js';

// Kolko dvojic na ktorej urovni - zacina sa lahko
const LEVELS = [3, 4, 6, 8];
const COLS = { 3: 3, 4: 4, 6: 4, 8: 4 };

export default {
  id: 'pairs',
  name: 'Nájdi dvojice',
  color: PALETTE.mint,
  levels: LEVELS.length,
  icon: () => shapeSvg('mimon', PALETTE.violet),

  start(stage, api) {
    const pairCount = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const cols = COLS[pairCount];
    const rows = Math.ceil((pairCount * 2) / cols);
    const colors = [PALETTE.mint, PALETTE.orange, PALETTE.blue, PALETTE.yellow, PALETTE.violet, PALETTE.pink];

    const chosen = shuffle(SHAPE_KEYS).slice(0, pairCount).map((key, i) => ({
      key,
      color: colors[i % colors.length],
    }));

    const deck = shuffle([...chosen, ...chosen]);
    const grid = el(`<div class="pairs-grid"></div>`);
    stage.appendChild(grid);

    deck.forEach((card, i) => {
      const tile = el(`
        <button class="tile" data-key="${card.key}" aria-label="karta">
          <div class="tile-inner">
            <div class="face back">${svg(ICONS.questionMark)}</div>
            <div class="face front">${shapeSvg(card.key, card.color)}</div>
          </div>
        </button>`);
      tile.addEventListener('click', () => onPick(tile));
      grid.appendChild(tile);
    });

    let first = null;
    let busy = false;
    let found = 0;
    let mistakes = 0;
    api.setProgress(pairCount, 0);

    async function onPick(tile) {
      if (busy || tile.classList.contains('done') || tile === first) return;
      tile.classList.add('flipped');
      sfx.flip();

      if (!first) { first = tile; return; }

      busy = true;
      if (first.dataset.key === tile.dataset.key) {
        await wait(320);
        first.classList.add('done');
        tile.classList.add('done');
        first = null;
        busy = false;
        found++;
        api.setProgress(pairCount, found);
        sfx.found();
        if (found === pairCount) {
          await wait(500);
          api.win(mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1);
        }
      } else {
        mistakes++;
        sfx.wrong();
        first.classList.add('wrong');
        tile.classList.add('wrong');
        await wait(750);
        [first, tile].forEach((t) => t.classList.remove('flipped', 'wrong'));
        first = null;
        busy = false;
      }
    }

    // dlazdice musia sedieť do plochy aj na uzkom telefone
    function layout() {
      const gap = Math.min(stage.clientHeight, stage.clientWidth) * 0.022;
      const size = Math.floor(Math.min(
        (stage.clientWidth - gap * (cols + 1)) / cols,
        (stage.clientHeight - gap * (rows + 1)) / rows,
      ));
      grid.style.gap = `${gap}px`;
      grid.style.gridTemplateColumns = `repeat(${cols}, ${Math.max(size, 54)}px)`;
    }
    layout();
    window.addEventListener('resize', layout);

    return { destroy: () => window.removeEventListener('resize', layout) };
  },
};
