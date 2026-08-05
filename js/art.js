// Vlastna vesmirna grafika. Kazdy tvar kresli do viewBoxu 0 0 100 100.
// Vracia iba vnutorne markup, obal <svg> doplna svg() - ten zaroven
// dogeneruje pouzite gradienty a filtre, takze tvary si o ne nemusia riesit.

export const PALETTE = {
  orange: '#ff6b3d',
  yellow: '#ffcf3f',
  mint: '#5fdcc0',
  blue: '#4bb8f0',
  violet: '#a175e6',
  pink: '#ff86b8',
  cream: '#fff3dd',
  ink: '#2a2258',
};

/* ---------- praca s farbou ---------- */
const rgb = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));

const lighten = (c, t = 0.35) => mix(c, '#ffffff', t);
const darken = (c, t = 0.28) => mix(c, '#1b1440', t);
// obrysova farba drzi odtien tvaru - kresba potom nevyzera vystrihnuta z jednej sablony
export const ink = (c) => mix(c, '#241c52', 0.72);

const fill = (c) => `url(#g${c.slice(1)})`;
const S = (c, w = 2.6) => `stroke="${ink(c)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/* ---------- opakujuce sa detaily ---------- */
function eyes(cx, cy, r = 8, opt = {}) {
  const { look = 0, lid = 0, lash = false } = opt;
  const one = (x) => `
    <ellipse cx="${x}" cy="${cy}" rx="${r}" ry="${r * 1.06}" fill="#ffffff" stroke="#2a2258" stroke-width="1.8"/>
    <circle cx="${x + look}" cy="${cy + r * 0.12}" r="${r * 0.46}" fill="#2a2258"/>
    <circle cx="${x + look - r * 0.22}" cy="${cy - r * 0.26}" r="${r * 0.19}" fill="#ffffff"/>
    <circle cx="${x + look + r * 0.2}" cy="${cy + r * 0.3}" r="${r * 0.1}" fill="#ffffff" opacity=".8"/>
    ${lid ? `<path d="M${x - r} ${cy - r * 0.55} a${r} ${r} 0 0 1 ${r * 2} 0 Z" fill="#2a2258" opacity=".9"/>` : ''}
    ${lash ? `<path d="M${x - r * 0.9} ${cy - r * 0.8} l-${r * 0.5} -${r * 0.45}" stroke="#2a2258" stroke-width="1.6" stroke-linecap="round" fill="none"/>` : ''}`;
  return one(cx - r * 1.15) + one(cx + r * 1.15);
}

const smile = (cx, cy, w = 12, deep = 0.85) =>
  `<path d="M${cx - w} ${cy} q${w} ${w * deep} ${w * 2} 0" fill="none" stroke="#2a2258" stroke-width="2.4" stroke-linecap="round"/>`;

const openSmile = (cx, cy, w = 11) => `
  <path d="M${cx - w} ${cy} q${w} ${w * 1.25} ${w * 2} 0 q-${w} ${w * 0.35} -${w * 2} 0 Z" fill="#7b2a4d" stroke="#2a2258" stroke-width="2" stroke-linejoin="round"/>
  <path d="M${cx - w * 0.4} ${cy + w * 0.62} q${w * 0.4} ${w * 0.4} ${w * 0.8} 0 q-${w * 0.4} -${w * 0.2} -${w * 0.8} 0 Z" fill="#ff8fae"/>`;

const blush = (cx, cy, dx = 22, r = 5) => `
  <ellipse cx="${cx - dx}" cy="${cy}" rx="${r}" ry="${r * 0.7}" fill="#ff7a9c" opacity=".45"/>
  <ellipse cx="${cx + dx}" cy="${cy}" rx="${r}" ry="${r * 0.7}" fill="#ff7a9c" opacity=".45"/>`;

// lesk - jeden mekky pruh cez horny okraj tela
const gloss = (d, o = 0.3) => `<path d="${d}" fill="#ffffff" opacity="${o}"/>`;

const sparkle = (x, y, r, o = 0.9) =>
  `<path d="M${x} ${y - r} q${r * 0.22} ${r * 0.78} ${r} ${r} q-${r * 0.78} ${r * 0.22} -${r} ${r} q-${r * 0.22} -${r * 0.78} -${r} -${r} q${r * 0.78} -${r * 0.22} ${r} -${r} Z" fill="#fff3dd" opacity="${o}"/>`;


// 5-cipa hviezda so zaoblenymi rohmi - rovny mnohouholnik vyzera ostro a strojovo
export function starPath(cx, cy, R, r, tips = 5, round = 0.38) {
  const v = [];
  for (let i = 0; i < tips * 2; i++) {
    const a = (-90 + (180 / tips) * i) * Math.PI / 180;
    const rad = i % 2 ? r : R;
    v.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  let d = '';
  for (let i = 0; i < v.length; i++) {
    const prev = v[(i - 1 + v.length) % v.length];
    const next = v[(i + 1) % v.length];
    const t = i % 2 ? round * 1.15 : round;
    const inP = lerp(v[i], prev, t);
    const outP = lerp(v[i], next, t);
    d += `${i === 0 ? 'M' : 'L'}${inP[0].toFixed(2)} ${inP[1].toFixed(2)} Q${v[i][0].toFixed(2)} ${v[i][1].toFixed(2)} ${outP[0].toFixed(2)} ${outP[1].toFixed(2)} `;
  }
  return d + 'Z';
}

/* ---------- postavicky ---------- */
export const SHAPES = {
  raketa: (c = PALETTE.mint) => `
    <g filter="url(#soft)">
      <path d="M43 76 q-9 14 -1 24 q2-9 6-12 q0 9 4 12 q9-9 5-24 Z" fill="#ff8b2e"/>
      <path d="M46 78 q-5 10 1 17 q6-6 3-17 Z" fill="${PALETTE.yellow}"/>
    </g>
    <path d="M34 54 L17 72 q-2 3 1 4 l16 -3 Z" fill="${fill(PALETTE.blue)}" ${S(PALETTE.blue)}/>
    <path d="M66 54 L83 72 q2 3 -1 4 l-16 -3 Z" fill="${fill(PALETTE.blue)}" ${S(PALETTE.blue)}/>
    <path d="M50 6 q17 17 17 42 q0 17 -3 28 q-14 4 -28 0 q-3 -11 -3 -28 q0 -25 17 -42 Z" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M42 20 q-5 16 -5 34 q0 12 2 20 q-4 -1 -5 -3 q-3 -11 -3 -25 q0 -18 11 -26 Z', 0.35)}
    <circle cx="50" cy="38" r="15" fill="${darken(c, 0.45)}"/>
    <circle cx="50" cy="38" r="12.6" fill="${fill(PALETTE.pink)}" ${S(PALETTE.pink, 2)}/>
    ${eyes(50, 37, 5)}
    ${smile(50, 46, 4.5)}
    <path d="M39 40 a12 12 0 0 1 6 -10" stroke="#ffffff" stroke-width="2.6" opacity=".55" fill="none" stroke-linecap="round"/>
    <path d="M36 62 q14 4 28 0" fill="none" ${S(c, 2)}/>
    <circle cx="40" cy="68" r="1.6" fill="${ink(c)}" opacity=".5"/>
    <circle cx="60" cy="68" r="1.6" fill="${ink(c)}" opacity=".5"/>`,

  ufo: (c = PALETTE.blue) => `
    <path d="M36 60 L26 92 M64 60 L74 92 M50 62 L50 94" stroke="${PALETTE.yellow}" stroke-width="5" opacity=".35" stroke-linecap="round"/>
    <ellipse cx="50" cy="40" rx="21" ry="19" fill="${lighten(PALETTE.violet, 0.55)}" opacity=".5"/>
    <path d="M30 41 q0-20 20-20 q20 0 20 20 Z" fill="${fill(PALETTE.mint)}" ${S(PALETTE.mint)}/>
    <path d="M36 30 q6-6 13-6" stroke="#ffffff" stroke-width="3" opacity=".6" fill="none" stroke-linecap="round"/>
    ${eyes(50, 33, 6)}
    ${smile(50, 41, 5)}
    <ellipse cx="50" cy="52" rx="38" ry="13" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M18 48 q14 -6 32 -6 q18 0 32 6 q-14 -9 -32 -9 q-18 0 -32 9 Z', 0.35)}
    <circle cx="26" cy="55" r="4.6" fill="${PALETTE.yellow}" stroke="${ink(c)}" stroke-width="1.6"/>
    <circle cx="42" cy="58" r="4.6" fill="${PALETTE.orange}" stroke="${ink(c)}" stroke-width="1.6"/>
    <circle cx="58" cy="58" r="4.6" fill="${PALETTE.pink}" stroke="${ink(c)}" stroke-width="1.6"/>
    <circle cx="74" cy="55" r="4.6" fill="${PALETTE.yellow}" stroke="${ink(c)}" stroke-width="1.6"/>
    ${sparkle(84, 26, 5)}`,

  mimon: (c = PALETTE.mint) => `
    <path d="M32 30 q-6 -12 -12 -18" fill="none" ${S(c, 3)}/>
    <path d="M68 30 q6 -12 12 -18" fill="none" ${S(c, 3)}/>
    <circle cx="19" cy="11" r="5.5" fill="${fill(PALETTE.pink)}" ${S(PALETTE.pink, 2)}/>
    <circle cx="81" cy="11" r="5.5" fill="${fill(PALETTE.pink)}" ${S(PALETTE.pink, 2)}/>
    <path d="M50 22 q27 0 27 31 q0 33 -27 33 q-27 0 -27 -33 q0 -31 27 -31 Z" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M34 34 q-7 10 -7 22 q0 14 5 22 q-9 -8 -9 -24 q0 -14 11 -20 Z', 0.3)}
    <ellipse cx="50" cy="66" rx="17" ry="13" fill="${lighten(c, 0.5)}" opacity=".6"/>
    ${eyes(50, 45, 11)}
    ${openSmile(50, 63, 9)}
    ${blush(50, 58, 24, 6)}`,

  planeta: (c = PALETTE.violet) => `
    <ellipse cx="50" cy="54" rx="45" ry="13" fill="none" stroke="${darken(PALETTE.yellow, 0.35)}" stroke-width="6.5" transform="rotate(-16 50 54)"/>
    <circle cx="50" cy="48" r="30" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M28 34 q-8 10 -8 22 q0 8 3 14 q-9 -9 -9 -20 q0 -12 14 -16 Z', 0.25)}
    <ellipse cx="36" cy="34" rx="8" ry="6" fill="${lighten(c, 0.45)}" opacity=".75"/>
    <ellipse cx="64" cy="60" rx="11" ry="7" fill="${darken(c, 0.22)}" opacity=".55"/>
    <ellipse cx="66" cy="36" rx="5" ry="4" fill="${darken(c, 0.22)}" opacity=".45"/>
    ${eyes(50, 45, 7)}
    ${smile(50, 58, 9)}
    ${blush(50, 55, 18, 5)}
    <path d="M8 56 q20 10 42 10 q22 0 42 -10" fill="none" stroke="${PALETTE.yellow}" stroke-width="6.5" stroke-linecap="round" transform="rotate(-16 50 54)"/>
    ${sparkle(88, 20, 6, 0.8)}`,

  hviezda: (c = PALETTE.yellow) => `
    <g filter="url(#glow)" transform="rotate(-4 50 50)">
      <path d="${starPath(50, 50, 46, 21)}" fill="${fill(c)}" ${S(c)}/>
    </g>
    ${gloss('M38 26 q-8 6 -10 15 q-1 5 1 8 q-6 -4 -5 -12 q1 -9 14 -11 Z', 0.35)}
    ${eyes(50, 47, 7.5)}
    ${smile(50, 61, 7)}
    ${blush(50, 58, 18, 4.5)}`,

  mesiac: (c = PALETTE.cream) => `
    <path d="M64 10 a38 38 0 1 0 22 58 a30 30 0 1 1 -22 -58 Z" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M52 18 q-16 6 -20 22 q-3 12 2 22 q-12 -12 -8 -28 q4 -14 26 -16 Z', 0.45)}
    <circle cx="46" cy="70" r="7" fill="${darken(c, 0.12)}" opacity=".8"/>
    <circle cx="30" cy="46" r="5" fill="${darken(c, 0.12)}" opacity=".8"/>
    <circle cx="52" cy="52" r="3.4" fill="${darken(c, 0.12)}" opacity=".7"/>
    ${eyes(44, 34, 6, { lid: 1 })}
    ${smile(44, 47, 7)}
    ${blush(44, 44, 16, 4.5)}
    ${sparkle(84, 78, 6)}`,

  kometa: (c = PALETTE.orange) => `
    <path d="M10 84 q26 -14 46 -38" stroke="${PALETTE.blue}" stroke-width="9" fill="none" stroke-linecap="round" opacity=".5"/>
    <path d="M8 66 q28 -8 48 -26" stroke="${PALETTE.yellow}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M20 88 q20 -10 34 -26" stroke="${PALETTE.pink}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/>
    <circle cx="68" cy="34" r="23" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M54 22 q-8 8 -8 18 q0 7 3 12 q-9 -7 -9 -17 q0 -10 14 -13 Z', 0.3)}
    ${eyes(68, 30, 7, { look: 1 })}
    ${openSmile(68, 43, 7)}
    ${blush(68, 40, 16, 4.5)}
    ${sparkle(90, 12, 6)}`,

  satelit: (c = PALETTE.blue) => `
    <rect x="6" y="37" width="30" height="26" rx="4" fill="${fill(c)}" ${S(c, 2.2)}/>
    <rect x="64" y="37" width="30" height="26" rx="4" fill="${fill(c)}" ${S(c, 2.2)}/>
    <path d="M16 37 v26 M26 37 v26 M74 37 v26 M84 37 v26" stroke="${ink(c)}" stroke-width="1.6" opacity=".45"/>
    <path d="M6 44 h30 M6 56 h30 M64 44 h30 M64 56 h30" stroke="${ink(c)}" stroke-width="1.2" opacity=".3"/>
    <path d="M52 34 L52 16" fill="none" ${S(PALETTE.cream, 2.4)}/>
    <circle cx="52" cy="12" r="6" fill="${fill(PALETTE.orange)}" ${S(PALETTE.orange, 2)}/>
    <rect x="37" y="33" width="30" height="34" rx="9" fill="${fill(PALETTE.cream)}" ${S(PALETTE.cream, 2.4)}/>
    ${gloss('M41 38 q-1 12 0 24 q-3 -2 -3 -12 q0 -10 3 -12 Z', 0.5)}
    ${eyes(52, 46, 5.5)}
    ${smile(52, 55, 5)}
    <rect x="44" y="70" width="16" height="7" rx="3" fill="${fill(PALETTE.yellow)}" ${S(PALETTE.yellow, 2)}/>
    ${sparkle(88, 20, 5, 0.7)}`,

  astronaut: (c = PALETTE.cream) => `
    <rect x="6" y="54" width="26" height="15" rx="7.5" fill="${fill(c)}" ${S(c, 2.4)}/>
    <rect x="68" y="54" width="26" height="15" rx="7.5" fill="${fill(c)}" ${S(c, 2.4)}/>
    <rect x="29" y="50" width="42" height="40" rx="15" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M36 56 q-3 14 -1 28 q-5 -3 -5 -14 q0 -11 6 -14 Z', 0.45)}
    <circle cx="50" cy="36" r="27" fill="${fill(c)}" ${S(c)}/>
    <path d="M30 34 q20 -16 40 0 q0 20 -20 20 q-20 0 -20 -20 Z" fill="${fill(PALETTE.blue)}" ${S(PALETTE.blue, 2.2)}/>
    <path d="M36 30 q7 -7 16 -7" stroke="#ffffff" stroke-width="3.4" opacity=".65" fill="none" stroke-linecap="round"/>
    ${eyes(50, 34, 6)}
    ${smile(50, 44, 5)}
    <rect x="41" y="60" width="18" height="13" rx="4" fill="${fill(PALETTE.orange)}" ${S(PALETTE.orange, 2)}/>
    <circle cx="46" cy="66" r="2.2" fill="${PALETTE.yellow}"/>
    <circle cx="54" cy="66" r="2.2" fill="${PALETTE.mint}"/>`,

  robot: (c = PALETTE.pink) => `
    <path d="M50 20 V7" fill="none" ${S(c, 2.6)}/>
    <circle cx="50" cy="5" r="5" fill="${fill(PALETTE.yellow)}" ${S(PALETTE.yellow, 2)}/>
    <rect x="12" y="60" width="20" height="11" rx="5.5" fill="${fill(c)}" ${S(c, 2.2)}/>
    <rect x="68" y="60" width="20" height="11" rx="5.5" fill="${fill(c)}" ${S(c, 2.2)}/>
    <rect x="33" y="56" width="34" height="32" rx="9" fill="${fill(PALETTE.blue)}" ${S(PALETTE.blue)}/>
    <circle cx="50" cy="72" r="6.5" fill="${fill(PALETTE.yellow)}" ${S(PALETTE.yellow, 2)}/>
    <rect x="25" y="19" width="50" height="36" rx="13" fill="${fill(c)}" ${S(c)}/>
    ${gloss('M32 25 q-4 12 -2 24 q-6 -4 -6 -13 q0 -9 8 -11 Z', 0.35)}
    <rect x="31" y="26" width="38" height="22" rx="9" fill="${darken(c, 0.5)}"/>
    ${eyes(50, 37, 7.5)}
    <path d="M42 46 q8 5 16 0" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`,
};

export const SHAPE_KEYS = Object.keys(SHAPES);

export const ICONS = {
  starPlain: `<path d="${starPath(12, 12.4, 10.6, 4.8, 5, 0.34)}" fill="currentColor"/>`,
  // reproduktor; vlny/skrtnutie sa prepinaju cez CSS triedu .off na tlacidle
  speaker: `
    <path d="M4 9.5h3.6L12 5.5v13l-4.4-4H4z" fill="currentColor"/>
    <g class="snd-on" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M15.4 9.2a4 4 0 0 1 0 5.6"/>
      <path d="M18.2 6.6a8 8 0 0 1 0 10.8"/>
    </g>
    <path class="snd-off" d="M16 9.5l6 5M22 9.5l-6 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,
  questionMark: `
    <path d="M34 36 q0-17 16-17 q17 0 17 16 q0 12-14 15 v7" fill="none" stroke="#fff3dd" stroke-width="10" stroke-linecap="round" opacity=".9"/>
    <circle cx="50" cy="74" r="7" fill="#fff3dd" opacity=".9"/>`,
};

/* ---------- obal ---------- */
// samolepkovy vzhlad: biely obrys + jemny tien, presne ako nalepky v knizke
const DEFS = `
  <filter id="sticker" x="-25%" y="-25%" width="150%" height="150%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="dil"/>
    <feFlood flood-color="#fff3dd"/>
    <feComposite in2="dil" operator="in" result="border"/>
    <feMerge result="all">
      <feMergeNode in="border"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
    <feDropShadow in="all" dx="0" dy="2.4" stdDeviation="1.8" flood-color="#0b1030" flood-opacity=".45"/>
  </filter>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="1.4"/>
  </filter>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feFlood flood-color="#ffcf3f" flood-opacity=".55"/>
    <feComposite in2="b" operator="in" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

// gradienty sa generuju iba pre farby, ktore sa v kresbe naozaj pouzili
function gradsFor(markup) {
  const used = [...new Set([...markup.matchAll(/url\(#g([0-9a-fA-F]{6})\)/g)].map((m) => m[1]))];
  return used.map((h) => {
    const c = `#${h}`;
    return `<linearGradient id="g${h}" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="${lighten(c, 0.32)}"/>
        <stop offset="0.55" stop-color="${c}"/>
        <stop offset="1" stop-color="${darken(c, 0.2)}"/>
      </linearGradient>`;
  }).join('');
}

// Kazde <svg> dostane vlastne id-cka. Prehliadac inak sparuje odkaz s prvym
// rovnakym id v dokumente a v 3D otocenej karte to prestane kreslit.
let uid = 0;
const ID_RE = /(#)(sticker|soft|glow|g[0-9a-fA-F]{6})(\)|")/g;
export function uniquify(markup) {
  const n = ++uid;
  return markup
    .replace(ID_RE, (_, h, id, tail) => `${h}${id}_${n}${tail}`)
    .replace(/ id="(sticker|soft|glow|g[0-9a-fA-F]{6})"/g, ` id="$1_${n}"`);
}

// gradienty pre celu paletu - to staci pre vsetky tvary v hrach
const ALL_DEFS_RAW = `<defs>${gradsFor(
  Object.values(PALETTE).map((c) => `url(#g${c.slice(1)})`).join(''),
)}${DEFS}</defs>`;
// pozor: v hrach sa ALL_DEFS a tvary skladaju do jedneho <svg>, preto sa
// prefix riesi az na urovni celeho suboru cez svgDoc()
export const ALL_DEFS = ALL_DEFS_RAW;

// kresba sa trochu zmensi, aby sa biely obrys a tien zmestili do ramu
const stickered = (inner) =>
  `<g transform="translate(50 50) scale(0.9) translate(-50 -50)" filter="url(#sticker)">${inner}</g>`;

export function svg(inner, cls = '', vb = '0 0 100 100') {
  return uniquify(`<svg viewBox="${vb}" class="${cls}" aria-hidden="true">
    <defs>${gradsFor(inner)}${DEFS}</defs>${inner}</svg>`);
}

// cele <svg> hry aj s tvarmi - id-cka sa prefixuju naraz, aby sedeli odkazy
export const svgDoc = (markup) => uniquify(markup);

// tvar ako samolepka - do vlastneho <svg>
export function shapeSvg(key, color, cls = '') {
  return svg(stickered(SHAPES[key](color)), cls);
}

// tvar do cudzieho <svg> (scena, bludisko, panely) - rodic musi mat ALL_DEFS
export function shapeGroup(key, color, attrs = '') {
  return `<g ${attrs}>${stickered(SHAPES[key](color))}</g>`;
}

export { lighten, darken, mix, DEFS, gradsFor, stickered };
