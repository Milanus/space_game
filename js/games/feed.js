import { PALETTE, ALL_DEFS, ICONS, svgDoc, relink, svg, stickered, animal, ANIMAL_KINDS, FOODS, FOOD_OF } from '../art.js';
import { shuffle, el, wait, pick } from '../util.js';
import { sfx } from '../audio.js';
import { pointerMap, sparkle, shake, setFace, celebrate, starsFor, trayRect, FIT_TOP, fitAttr, fromBody, MOUTH, nextPet } from './clinic.js';

// Nakrm zvieratko: v bubline je, co chce, dieta mu to potiahne k pusinke.
// Na poslednej urovni bublina ukaze len otaznik - treba vediet, co ktore zvieratko je.

const W = 100;
const H = 132;
const TRAY_Y = 117;
const EAT = 17;        // ako blizko k pusinke treba jedlo pustit
const COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.mint, PALETTE.blue, PALETTE.violet, PALETTE.pink];

const LEVELS = [
  { rounds: 4, choices: 2, hint: true },
  { rounds: 5, choices: 3, hint: true },
  { rounds: 5, choices: 4, hint: false },
];

const bubble = (food) => `
  <g class="feed-bubble" transform="translate(86 15)">
    <circle cx="-13" cy="13" r="1.8" fill="#fff" opacity=".9"/>
    <circle cx="-9" cy="9" r="2.8" fill="#fff" opacity=".9"/>
    <circle r="11.5" fill="#fff" stroke="#c9d6ff" stroke-width="1"/>
    ${food ? `<g transform="scale(.72)">${FOODS[food]}</g>`
    : `<g transform="translate(-10 -10) scale(.2)">${ICONS.questionMark.replaceAll('#fff3dd', PALETTE.violet)}</g>`}
  </g>`;

export default {
  id: 'feed',
  name: 'Nakŕm zvieratko',
  color: PALETTE.orange,
  levels: LEVELS.length,
  icon: () => svg(stickered(`${animal('pes', PALETTE.yellow, true)}<g transform="translate(50 64) scale(1.3)">${FOODS.kost}</g>`)),

  start(stage, api) {
    const L = LEVELS[Math.min(api.level, LEVELS.length - 1)];
    const F = FIT_TOP;
    const mouth = fromBody(F, MOUTH.x, MOUTH.y);
    // poradie zvieratok - kazde raz, pri viac kolach sa zopakuju
    const order = [nextPet().kind];
    while (order.length < L.rounds) order.push(...shuffle(ANIMAL_KINDS.filter((k) => k !== order.at(-1))));
    let round = 0;
    let misses = 0;
    let busy = false;

    const wrap = el(svgDoc(`
      <div class="vet-wrap">
        <svg viewBox="0 0 ${W} ${H}">
          ${ALL_DEFS}
          <g transform="${fitAttr(F)}"><g class="feed-pet"></g></g>
          <g class="feed-bubble-wrap"></g>
          ${trayRect(TRAY_Y, 24)}
          <g class="feed-foods"></g>
          <g class="vet-fx"></g>
        </svg>
      </div>`));
    stage.appendChild(wrap);

    const svgEl = wrap.querySelector('svg');
    const pet = wrap.querySelector('.feed-pet');
    const foodsLayer = wrap.querySelector('.feed-foods');
    const fx = wrap.querySelector('.vet-fx');
    const bubbleWrap = wrap.querySelector('.feed-bubble-wrap');
    const toSvg = pointerMap(svgEl, W, H);
    let want = null;

    function renderRound() {
      const kind = order[round];
      want = FOOD_OF[kind];
      pet.innerHTML = relink(`<g filter="url(#sticker)">${animal(kind, pick(COLORS))}</g>`, svgEl);
      bubbleWrap.innerHTML = relink(bubble(L.hint ? want : null), svgEl);
      svgEl.dataset.want = want; // pre testy

      const others = shuffle(Object.keys(FOODS).filter((f) => f !== want)).slice(0, L.choices - 1);
      const choices = shuffle([want, ...others]);
      const gap = Math.min(24, 90 / choices.length);
      foodsLayer.innerHTML = relink(choices.map((f, i) => {
        const x = 50 + (i - (choices.length - 1) / 2) * gap;
        return `<g class="feed-food cl-drag" data-food="${f}" data-home="${x.toFixed(2)} ${TRAY_Y}"
                  transform="translate(${x.toFixed(2)} ${TRAY_Y})">
                  <g class="feed-inner"><circle r="12" fill="transparent"/>${FOODS[f]}</g></g>`;
      }).join(''), svgEl);
      // nove zvieratko pricupita s malym poskokom
      pet.classList.remove('feed-in');
      void pet.getBoundingClientRect();
      pet.classList.add('feed-in');
    }

    api.setProgress(L.rounds, 0);
    renderRound();

    let drag = null;

    function onDown(ev) {
      if (busy) return;
      const node = ev.target.closest?.('.feed-food');
      if (!node) return;
      drag = { node };
      foodsLayer.appendChild(node);
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
      drag.node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(1.15)`);
    }

    async function onUp() {
      if (!drag) return;
      const { node, at } = drag;
      drag = null;
      node.classList.remove('dragging');
      const goHome = () => node.setAttribute('transform', `translate(${node.dataset.home})`);
      if (!at || Math.hypot(at.x - mouth.x, at.y - mouth.y) > EAT) {
        goHome();
        return;
      }
      if (node.dataset.food !== want) {
        // toto nechce - zatrasie hlavou a jedlo sa vrati
        misses++;
        sfx.wrong();
        shake(pet);
        goHome();
        return;
      }

      busy = true;
      node.setAttribute('transform', `translate(${mouth.x} ${mouth.y})`);
      node.classList.add('feed-eaten');
      sfx.good();
      setFace(pet, true);
      sparkle(fx, mouth.x + 8, mouth.y - 6);
      round++;
      api.setProgress(L.rounds, round);
      await wait(450);
      node.remove();
      if (round >= L.rounds) {
        await celebrate(pet, pet, fx);
        api.win(starsFor(misses));
        return;
      }
      await wait(450);
      renderRound();
      busy = false;
    }

    svgEl.addEventListener('pointerdown', onDown);
    svgEl.addEventListener('pointermove', onMove);
    svgEl.addEventListener('pointerup', onUp);
    svgEl.addEventListener('pointercancel', onUp);

    return { destroy() { busy = true; drag = null; } };
  },
};
