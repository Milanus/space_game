// Zvuky generujeme cez WebAudio - ziadne subory, ziadne cakanie na nacitanie.
import { loadProgress, saveSound } from './util.js';

let ctx = null;
let muted = !loadProgress().sound;

export const isMuted = () => muted;

export function setMuted(on) {
  muted = !!on;
  saveSound(!muted);
}

function ac() {
  if (muted) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(start, dur, vol = 0.12) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const gain = a.createGain();
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(gain).connect(a.destination);
  src.start(a.currentTime + start);
}

export const sfx = {
  tap: () => tone(520, 0, 0.08, 'triangle', 0.1),
  flip: () => tone(700, 0, 0.1, 'triangle', 0.1),
  good: () => { tone(660, 0, 0.12, 'triangle'); tone(880, 0.09, 0.16, 'triangle'); },
  found: () => { tone(880, 0, 0.1, 'sine'); tone(1180, 0.08, 0.18, 'sine'); },
  wrong: () => { tone(200, 0, 0.14, 'sawtooth', 0.09); tone(150, 0.1, 0.18, 'sawtooth', 0.09); },
  bump: () => noise(0, 0.09, 0.07),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16));
    noise(0.44, 0.5, 0.05);
  },
  // odomkne audio na iOS - musi to byt v ramci dotyku
  unlock: () => { const a = ac(); if (a) tone(1, 0, 0.01, 'sine', 0.001); },
};
