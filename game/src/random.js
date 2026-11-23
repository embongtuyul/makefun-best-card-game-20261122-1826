// Seeded random numbers for EMBERFALL. One small generator (mulberry32) plus
// the shuffles and picks the game needs, so a run or a screenshot staging can
// be replayed exactly from a seed.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle, in place, driven by the given rng.
export function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function pickOne(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

// A fresh integer in [min, max].
export function rollInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
