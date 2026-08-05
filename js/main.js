import { startStarfield } from './starfield.js';
import { shapeSvg, ICONS, PALETTE, lighten, darken } from './art.js';
import { el, loadProgress, saveStars, saveLevel, pick } from './util.js';
import { t, applyStaticText } from './i18n.js';
import { sfx, isMuted, setMuted } from './audio.js';

import pairs from './games/pairs.js';
import maze from './games/maze.js';
import diffs from './games/differences.js';
import counting from './games/counting.js';
import sequence from './games/sequence.js';
import letters from './games/letters.js';
import tangram from './games/tangram.js';

const GAMES = [pairs, maze, diffs, counting, sequence, letters, tangram];

const hub = document.getElementById('hub');
const gameScreen = document.getElementById('game');
const stage = document.getElementById('stage');
const progressBar = document.getElementById('progress');
const winOverlay = document.getElementById('win');

startStarfield(document.getElementById('starfield'));

const state = {
  game: null,
  instance: null,
  level: 0,
};

/* ---------- HUB ---------- */
function star(on) {
  return `<svg viewBox="0 0 24 24" style="color:${on ? PALETTE.yellow : 'rgba(0,0,0,.18)'}">${ICONS.starPlain}</svg>`;
}

function renderHub() {
  const { stars: saved, levels } = loadProgress();
  const wrap = document.getElementById('game-cards');
  wrap.innerHTML = '';
  for (const g of GAMES) {
    const earned = saved[g.id] || 0;
    const at = Math.min(levels[g.id] || 0, g.levels - 1);
    // bodky = obtiaznost; plne su tie, ktore uz dieta hralo, kruzok je aktualna
    const dots = Array.from({ length: g.levels }, (_, i) => `
      <button class="lvl${i <= at ? ' done' : ''}${i === at ? ' now' : ''}"
        aria-label="${t('btn.level')} ${i + 1}" aria-current="${i === at}"></button>`).join('');
    const slot = el(`
      <div class="card-slot">
        <button class="card" style="background:linear-gradient(160deg, ${lighten(g.color, .3)}, ${darken(g.color, .14)})">
          ${g.icon()}
          <span class="card-name">${t(`game.${g.id}`)}</span>
          <span class="card-stars">${[1, 2, 3].map((i) => star(i <= earned)).join('')}</span>
        </button>
        <div class="card-levels">${dots}</div>
      </div>`);
    slot.querySelector('.card').addEventListener('click', () => { sfx.unlock(); sfx.tap(); openGame(g); });
    [...slot.querySelectorAll('.lvl')].forEach((dot, i) => {
      dot.addEventListener('click', () => { sfx.unlock(); sfx.tap(); openGame(g, i); });
    });
    wrap.appendChild(slot);
  }
}

function show(screen) {
  [hub, gameScreen].forEach((s) => s.classList.toggle('active', s === screen));
}

/* ---------- BEH HRY ---------- */
function setProgress(total, done) {
  if (progressBar.childElementCount !== total) {
    progressBar.innerHTML = Array.from({ length: total },
      () => `<svg class="pip" viewBox="0 0 24 24">${ICONS.starPlain}</svg>`).join('');
  }
  [...progressBar.children].forEach((p, i) => p.classList.toggle('on', i < done));
}

function openGame(game, level = loadProgress().levels[game.id] || 0) {
  state.game = game;
  state.level = Math.min(level, game.levels - 1);
  saveLevel(game.id, state.level);
  show(gameScreen);
  restart();
}

function restart() {
  state.instance?.destroy?.();
  stage.innerHTML = '';
  progressBar.innerHTML = '';
  state.instance = state.game.start(stage, {
    level: state.level,
    setProgress,
    win: onWin,
  });
}

function onWin(stars = 3) {
  sfx.win();
  saveStars(state.game.id, stars);

  document.getElementById('win-stars').innerHTML =
    [1, 2, 3].map((i) => `<svg viewBox="0 0 24 24" style="opacity:${i <= stars ? 1 : 0.22}">${ICONS.starPlain}</svg>`).join('');
  const hero = pick(['raketa', 'ufo', 'mimon', 'astronaut', 'robot']);
  document.getElementById('win-hero').innerHTML = shapeSvg(hero, state.game.color);

  winOverlay.classList.add('show');
}

function closeWin() {
  winOverlay.classList.remove('show');
}

/* ---------- ZVUK ---------- */
const soundBtn = document.getElementById('btn-sound');
soundBtn.innerHTML = `<svg viewBox="0 0 24 24">${ICONS.speaker}</svg>`;

function renderSound() {
  soundBtn.classList.toggle('off', isMuted());
  soundBtn.setAttribute('aria-label', t(isMuted() ? 'btn.soundOff' : 'btn.sound'));
  soundBtn.setAttribute('aria-pressed', String(!isMuted()));
}

soundBtn.addEventListener('click', () => {
  setMuted(!isMuted());
  renderSound();
  sfx.unlock();
  sfx.tap(); // po zapnuti hned pocut, ze zvuk ide
});

/* ---------- OVLADANIE ---------- */
document.getElementById('btn-back').addEventListener('click', () => {
  sfx.tap();
  state.instance?.destroy?.();
  stage.innerHTML = '';
  renderHub();
  show(hub);
});

document.getElementById('btn-again').addEventListener('click', () => { sfx.tap(); restart(); });

document.getElementById('win-home').addEventListener('click', () => {
  sfx.tap();
  closeWin();
  state.instance?.destroy?.();
  stage.innerHTML = '';
  renderHub();
  show(hub);
});

document.getElementById('win-next').addEventListener('click', () => {
  sfx.tap();
  closeWin();
  // dalsia uroven, na konci sa tazkost drzi na maxime
  const next = Math.min(state.level + 1, state.game.levels - 1);
  openGame(state.game, next);
});

applyStaticText();
renderSound();
renderHub();
