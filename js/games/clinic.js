// Spolocne kusky pre zvieracie hry (ambulancia, krmenie, rontgen, liek).
// Nie je to minihra - nema default export a v GAMES nie je.
import { PALETTE, animalFace, ANIMAL_KINDS } from '../art.js';
import { el, wait } from '../util.js';

// zvieratko zmensene hore, aby pod nim bol pas s vecami (naplasti, jedlo, lieky)
export const FIT_TOP = { s: 0.8, dx: 10, dy: 4 };
// zvieratko cez celu plochu, len posunute dole
export const FIT_FULL = { s: 1, dx: 0, dy: 8 };
export const fitAttr = (f) => `translate(${f.dx} ${f.dy}) scale(${f.s})`;
// suradnice zvieratka (viewBox 0 0 100 100) -> suradnice celeho svg a naspat
export const fromBody = (f, x, y) => ({ x: x * f.s + f.dx, y: y * f.s + f.dy });
export const toBody = (f, p) => ({ x: (p.x - f.dx) / f.s, y: (p.y - f.dy) / f.s });
// pusinka zvieratka v jeho vlastnych suradniciach
export const MOUTH = { x: 50, y: 50 };

// prevod pointer eventu na suradnice viewBoxu
export function pointerMap(svgEl, W, H) {
  return (ev) => {
    const r = svgEl.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  };
}

// hviezdicka, ktora vyskoci a zmizne; fx = <g> vrstva navrchu svg
export function sparkle(fx, x, y, color = PALETTE.yellow) {
  const s = el(`<svg><g class="cl-spark" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <path d="M0 -6 q1.2 4.8 6 6 q-4.8 1.2 -6 6 q-1.2 -4.8 -6 -6 q4.8 -1.2 6 -6 Z" fill="${color}"/></g></svg>`).firstElementChild;
  fx.appendChild(s);
  setTimeout(() => s.remove(), 700);
}

// docasne zatriasie prvkom (zle jedlo, zla flaska)
export function shake(node) {
  node.classList.remove('cl-shake');
  void node.getBoundingClientRect();
  node.classList.add('cl-shake');
  setTimeout(() => node.classList.remove('cl-shake'), 450);
}

// tvar tvare: true = usmev, false = smutna so slzou
export function setFace(root, happy) {
  const f = root.querySelector('.pet-face');
  if (f) f.innerHTML = animalFace(happy);
}

// vyliecene zvieratko: usmeje sa, poskoci, okolo hviezdicky
export async function celebrate(root, hopNode, fx) {
  setFace(root, true);
  hopNode.classList.remove('cl-hop');
  void hopNode.getBoundingClientRect();
  hopNode.classList.add('cl-hop');
  for (let k = 0; k < 5; k++) {
    setTimeout(() => sparkle(fx, 15 + Math.random() * 70, 10 + Math.random() * 70), k * 120);
  }
  await wait(1100);
}

// hviezdy podla chyb - rovnako vo vsetkych zvieracich hrach
export const starsFor = (misses) => (misses <= 1 ? 3 : misses <= 4 ? 2 : 1);

// pas dole, kde caka nastroj alebo jedlo
export const trayRect = (y, h = 18) =>
  `<rect x="2" y="${y - h / 2}" width="96" height="${h}" rx="6" fill="#0d1140" opacity=".35"/>`;

// nahodne zvieratko a farba - nikdy nie to iste zvieratko dvakrat po sebe
// (pamata si to cez vsetky zvieracie hry, aby nebol stale zajac)
const PET_COLORS = [PALETTE.orange, PALETTE.yellow, PALETTE.mint, PALETTE.blue, PALETTE.violet, PALETTE.pink];
let lastKind = null;
export function nextPet() {
  const kinds = ANIMAL_KINDS.filter((k) => k !== lastKind);
  lastKind = kinds[Math.floor(Math.random() * kinds.length)];
  return { kind: lastKind, color: PET_COLORS[Math.floor(Math.random() * PET_COLORS.length)] };
}
