// EMBERFALL animation: small tweens, floating combat text, and screen
// shake. Nothing here owns game state — the battle logic only asks for
// effects, and the renderer asks what is happening right now.

export function makeAnim() {
  return {
    tweens: [],
    floaters: [],
    shake: 0,
    time: 0,
  };
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeOutBack(t) {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

// Animate one numeric property of an object over `dur` seconds.
export function addTween(anim, target, prop, to, dur, ease = 'out') {
  anim.tweens.push({
    target, prop, from: target[prop], to, dur, elapsed: 0,
    easeFn: ease === 'back' ? easeOutBack : easeOutCubic,
  });
}

export function addFloater(anim, x, y, text, color, size = 26) {
  anim.floaters.push({ x, y, text, color, size, age: 0, life: 1.1 });
}

export function addShake(anim, amount) {
  anim.shake = Math.max(anim.shake, amount);
}

export function updateAnim(anim, dt) {
  anim.time += dt;
  for (const tw of anim.tweens) {
    tw.elapsed += dt;
    const t = Math.min(1, tw.elapsed / tw.dur);
    tw.target[tw.prop] = tw.from + (tw.to - tw.from) * tw.easeFn(t);
  }
  anim.tweens = anim.tweens.filter((tw) => tw.elapsed < tw.dur);
  for (const f of anim.floaters) f.age += dt;
  anim.floaters = anim.floaters.filter((f) => f.age < f.life);
  anim.shake = Math.max(0, anim.shake - dt * 26);
}

// Current shake offset for the renderer to apply to the whole table.
export function shakeOffset(anim) {
  if (anim.shake <= 0.1) return { x: 0, y: 0 };
  const s = anim.shake;
  return {
    x: (Math.random() * 2 - 1) * s,
    y: (Math.random() * 2 - 1) * s,
  };
}
