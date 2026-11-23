// EMBERFALL sound: every effect is synthesised with the Web Audio API —
// no audio files, no network. The context is created lazily on the first
// user gesture, and every call is guarded so a missing or suspended context
// never breaks the game.

let ctx = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  } catch (err) {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const ac = ensureContext();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

// One short tone: a triangle wave with a quick decay envelope.
function tone(freq, startAt, duration, volume, type = 'triangle') {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + startAt);
    gain.gain.setValueAtTime(0.0001, ac.currentTime + startAt);
    gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startAt + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime + startAt);
    osc.stop(ac.currentTime + startAt + duration + 0.05);
  } catch (err) {
    // Audio is decoration; a failure here must never stop the game.
  }
}

function noiseBurst(startAt, duration, volume) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  try {
    const len = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(volume, ac.currentTime + startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startAt + duration);
    src.connect(gain).connect(ac.destination);
    src.start(ac.currentTime + startAt);
  } catch (err) {
    // Ignore: see tone().
  }
}

export const sfx = {
  playCard() { tone(520, 0, 0.09, 0.12); tone(780, 0.05, 0.12, 0.1); },
  hit() { noiseBurst(0, 0.12, 0.18); tone(140, 0, 0.14, 0.16, 'sawtooth'); },
  bigHit() { noiseBurst(0, 0.2, 0.24); tone(110, 0, 0.22, 0.2, 'sawtooth'); tone(220, 0.06, 0.16, 0.12, 'sawtooth'); },
  block() { tone(300, 0, 0.1, 0.12, 'square'); },
  heal() { tone(660, 0, 0.14, 0.1); tone(880, 0.1, 0.18, 0.1); },
  draw() { tone(440, 0, 0.06, 0.07); },
  ember() { tone(980, 0, 0.1, 0.12); tone(1470, 0.07, 0.16, 0.1); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.28, 0.12)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, 0.1)); },
  click() { tone(700, 0, 0.05, 0.07); },
  reward() { tone(784, 0, 0.12, 0.1); tone(988, 0.09, 0.2, 0.1); },
};
