// Pozadie: hmlovina + tri vrstvy hviezd s roznou rychlostou (hlbka)
// + obcas preleti padajuca hviezda. Hmlovina sa kresli raz do offscreen platna.
const LAYERS = [
  { n: 0.00022, r: [0.6, 1.2], speed: 0.05, alpha: 0.5 },
  { n: 0.00012, r: [1.1, 1.9], speed: 0.13, alpha: 0.75 },
  { n: 0.00004, r: [1.8, 2.8], speed: 0.26, alpha: 1 },
];

const BLOBS = [
  { x: 0.18, y: 0.22, r: 0.55, c: '120,72,220' },
  { x: 0.82, y: 0.34, r: 0.5, c: '30,120,200' },
  { x: 0.55, y: 0.85, r: 0.6, c: '190,60,140' },
  { x: 0.05, y: 0.75, r: 0.4, c: '40,170,190' },
];

export function startStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  const neb = document.createElement('canvas');
  const nctx = neb.getContext('2d');
  let stars = [];
  let shooter = null;
  let nextShot = 260;
  let w = 0;
  let h = 0;
  let raf = null;
  let t = 0;

  function paintNebula() {
    neb.width = w;
    neb.height = h;
    const bg = nctx.createLinearGradient(0, 0, w * 0.3, h);
    bg.addColorStop(0, '#0a0e2c');
    bg.addColorStop(0.55, '#131447');
    bg.addColorStop(1, '#1d1252');
    nctx.fillStyle = bg;
    nctx.fillRect(0, 0, w, h);

    const d = Math.max(w, h);
    for (const b of BLOBS) {
      const g = nctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * d);
      g.addColorStop(0, `rgba(${b.c},0.30)`);
      g.addColorStop(0.45, `rgba(${b.c},0.11)`);
      g.addColorStop(1, `rgba(${b.c},0)`);
      nctx.fillStyle = g;
      nctx.fillRect(0, 0, w, h);
    }

    // dve vzdialene planety, aby pozadie nebolo prazdne
    const far = [
      { x: 0.86, y: 0.16, r: d * 0.055, c: '#ffb36b' },
      { x: 0.12, y: 0.88, r: d * 0.09, c: '#7f6bd8' },
    ];
    for (const p of far) {
      const g = nctx.createRadialGradient(p.x * w - p.r * 0.35, p.y * h - p.r * 0.35, p.r * 0.1, p.x * w, p.y * h, p.r);
      g.addColorStop(0, p.c);
      g.addColorStop(1, 'rgba(10,14,44,0.15)');
      nctx.globalAlpha = 0.22;
      nctx.fillStyle = g;
      nctx.beginPath();
      nctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      nctx.fill();
      nctx.globalAlpha = 1;
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = [];
    for (const L of LAYERS) {
      const count = Math.max(12, Math.round(w * h * L.n));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: L.r[0] + Math.random() * (L.r[1] - L.r[0]),
          s: L.speed,
          a: L.alpha,
          tw: Math.random() * Math.PI * 2,
          big: L.speed > 0.2 && Math.random() < 0.35,
        });
      }
    }
    paintNebula();
  }

  // styri lucove hviezdicky - vyzeraju kreslene, nie ako bodky
  function spark(x, y, r, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff3dd';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.4);
    ctx.quadraticCurveTo(x + r * 0.35, y - r * 0.35, x + r * 2.4, y);
    ctx.quadraticCurveTo(x + r * 0.35, y + r * 0.35, x, y + r * 2.4);
    ctx.quadraticCurveTo(x - r * 0.35, y + r * 0.35, x - r * 2.4, y);
    ctx.quadraticCurveTo(x - r * 0.35, y - r * 0.35, x, y - r * 2.4);
    ctx.fill();
  }

  function frame() {
    t++;
    ctx.drawImage(neb, 0, 0, w, h);

    for (const st of stars) {
      st.tw += 0.025;
      st.y += st.s;
      if (st.y > h + 3) { st.y = -3; st.x = Math.random() * w; }
      const a = st.a * (0.5 + Math.sin(st.tw) * 0.42);
      if (st.big) {
        spark(st.x, st.y, st.r, a * 0.9);
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = st.r > 1.6 ? '#ffe9a8' : '#ffffff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (!shooter && t > nextShot) {
      shooter = { x: Math.random() * w * 0.6, y: -20, len: 90 + Math.random() * 70, v: 7 + Math.random() * 4, life: 0 };
      nextShot = t + 420 + Math.random() * 700;
    }
    if (shooter) {
      shooter.x += shooter.v;
      shooter.y += shooter.v * 0.72;
      shooter.life++;
      const g = ctx.createLinearGradient(shooter.x, shooter.y, shooter.x - shooter.len, shooter.y - shooter.len * 0.72);
      g.addColorStop(0, 'rgba(255,243,221,0.9)');
      g.addColorStop(1, 'rgba(255,243,221,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shooter.x, shooter.y);
      ctx.lineTo(shooter.x - shooter.len, shooter.y - shooter.len * 0.72);
      ctx.stroke();
      if (shooter.x > w + shooter.len || shooter.y > h + shooter.len) shooter = null;
    }

    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (!raf) frame();
  });
  frame();
}
