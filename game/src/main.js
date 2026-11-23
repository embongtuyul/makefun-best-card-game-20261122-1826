// EMBERFALL entry point: boots the canvas, owns the run state and the
// screen machine, drives the game loop, and turns battle events into
// animation, sound and score. Screens: title, how, map, battle, reward,
// victory, defeat — plus a pause overlay on map and battle.

import { VIEW_W, VIEW_H, PLAYER_MAX_HP, HEAL_AFTER_BATTLE } from './config.js';
import { startingDeck, drawRewards, cardDef } from './cards.js';
import { createBattle, playCard, endTurn, updateBattle } from './battle.js';
import { makeRng } from './random.js';
import { render } from './render.js';
import { makeInput } from './input.js';
import { makeAnim, addTween, addFloater, addShake, updateAnim } from './anim.js';
import { sfx, unlockAudio, setMuted, isMuted } from './audio.js';
import { loadSave, saveRun, clearRun, loadBestScore, saveBestScore } from './save.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(params.get('seed') || '', 10);

const G = {
  screen: 'title',
  paused: false,
  time: 0,
  run: null,
  battle: null,
  rewards: null,
  lastFoeName: '',
  finalStats: null,
  anim: makeAnim(),
  rng: makeRng(Number.isFinite(seedParam) ? seedParam : (Date.now() % 2147483647)),
  display: new Map(),
  flying: [],
  particles: [],
  hits: [],
  hoverUid: null,
  hoverId: null,
  hoverReward: null,
  message: '',
  messageUntil: 0,
  bestScore: loadBestScore(),
  hasSave: false,
  pendingTransition: null,
  particleTimer: 0,
};

function freshRun() {
  return {
    stage: 0,
    deck: startingDeck(),
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    score: 0,
    battlesWon: 0,
    damageDealt: 0,
  };
}

function toast(message, seconds = 2.2) {
  G.message = message;
  G.messageUntil = G.time + seconds;
}

function startBattle() {
  G.battle = createBattle({
    stageIndex: G.run.stage,
    deck: G.run.deck,
    hp: G.run.hp,
    maxHp: G.run.maxHp,
    rng: G.rng,
  });
  G.display.clear();
  G.flying = [];
  G.screen = 'battle';
  G.paused = false;
}

function startNewRun() {
  G.run = freshRun();
  clearRun();
  G.screen = 'map';
  toast('A new run begins. The Ember Gate awaits.');
}

function continueRun() {
  const saved = loadSave();
  if (!saved || !saved.run) return;
  const r = saved.run;
  G.run = {
    stage: r.stage,
    deck: r.deck,
    hp: r.hp,
    maxHp: PLAYER_MAX_HP,
    score: r.score,
    battlesWon: r.battlesWon || 0,
    damageDealt: 0,
  };
  G.screen = 'map';
  toast('Welcome back, Knight. The road remembers you.');
}

// Battle events become floaters, shake, sound and score.
function consumeEvents(events) {
  const b = G.battle;
  for (const ev of events) {
    if (ev.kind === 'damage' && ev.target === 'enemy') {
      addFloater(G.anim, 560, 175, `-${ev.amount}`, '#ff6b5e', ev.amount >= 10 ? 34 : 26);
      addShake(G.anim, ev.amount >= 10 ? 7 : 3);
      if (ev.amount >= 10) sfx.bigHit();
      else sfx.hit();
      G.run.score += ev.amount;
    } else if (ev.kind === 'damage' && ev.target === 'player') {
      addFloater(G.anim, 160, 300, `-${ev.amount}`, '#ff6b5e', 26);
      addShake(G.anim, 5);
      sfx.hit();
    } else if (ev.kind === 'block') {
      addFloater(G.anim, ev.target === 'enemy' ? 560 : 160, ev.target === 'enemy' ? 175 : 300, `+${ev.amount} Block`, '#7fb3d5', 20);
      sfx.block();
    } else if (ev.kind === 'heal') {
      addFloater(G.anim, ev.target === 'enemy' ? 560 : 160, ev.target === 'enemy' ? 175 : 300, `+${ev.amount} HP`, '#58b368', 22);
      sfx.heal();
    } else if (ev.kind === 'kindle') {
      addFloater(G.anim, 560, 150, 'KINDLED!', '#ff9f1c', 24);
      sfx.ember();
    } else if (ev.kind === 'ember') {
      addFloater(G.anim, 560, 140, 'EMBER BURST!', '#ff9f1c', 30);
      addShake(G.anim, 8);
      sfx.ember();
    } else if (ev.kind === 'draw') {
      sfx.draw();
    } else if (ev.kind === 'played') {
      sfx.playCard();
    } else if (ev.kind === 'intentPlayed') {
      toast(`${b.enemy.def.name} plays ${ev.intent.name} — ${ev.intent.text}`, 1.6);
    } else if (ev.kind === 'enemyDown') {
      queueTransition('win');
    } else if (ev.kind === 'playerDown') {
      queueTransition('lose');
    }
  }
}

function queueTransition(kind) {
  if (G.pendingTransition) return;
  G.pendingTransition = { kind, at: G.time + 1.3 };
}

function finishBattleWin() {
  const b = G.battle;
  G.run.damageDealt += b.damageDealt;
  G.run.battlesWon += 1;
  G.run.score += 100 + G.run.stage * 25;
  G.run.hp = Math.min(G.run.maxHp, b.player.hp + HEAL_AFTER_BATTLE);
  G.lastFoeName = b.enemy.def.name;
  saveRun(G.run);
  if (G.run.stage >= 3) {
    // The King is dead: the run is won.
    G.run.score += G.run.hp * 2;
    const newBest = saveBestScore(G.run.score);
    G.bestScore = loadBestScore();
    G.finalStats = {
      damageDealt: G.run.damageDealt,
      battlesWon: G.run.battlesWon,
      hpLeft: G.run.hp,
      score: G.run.score,
      newBest,
    };
    clearRun();
    sfx.victory();
    G.screen = 'victory';
  } else {
    G.rewards = drawRewards(G.rng);
    sfx.reward();
    G.screen = 'reward';
  }
  G.battle = null;
}

function finishBattleLoss() {
  const b = G.battle;
  G.run.damageDealt += b.damageDealt;
  G.lastFoeName = b.enemy.def.name;
  saveBestScore(G.run.score);
  G.bestScore = loadBestScore();
  G.finalStats = {
    damageDealt: G.run.damageDealt,
    battlesWon: G.run.battlesWon,
    hpLeft: 0,
    score: G.run.score,
    bestScore: G.bestScore,
    stageReached: G.run.stage + 1,
  };
  clearRun();
  sfx.defeat();
  G.screen = 'defeat';
  G.battle = null;
}

function tryPlayCard(uid) {
  const b = G.battle;
  if (!b || b.phase !== 'player') return;
  const card = b.piles.hand.find((c) => c.uid === uid);
  if (!card) return;
  const def = cardDef(card.id);
  if (def.cost > b.player.energy) {
    toast('Not enough energy.');
    return;
  }
  // Launch the flying card from its hand position toward its target.
  const disp = G.display.get(uid);
  const target = (def.type === 'heal' || def.type === 'guard')
    ? { x: 160, y: 360 }
    : { x: 560, y: 235 };
  if (disp) {
    G.flying.push({
      cardId: card.id,
      x: disp.x + 66, y: disp.y + 93, rot: disp.rot || 0,
      tx: target.x, ty: target.y, age: 0, dur: 0.32, alpha: 1, scale: 1,
    });
  }
  const result = playCard(b, uid);
  if (!result.ok) {
    toast(result.reason || 'Cannot play that card.');
    return;
  }
  consumeEvents(result.events);
}

function handleClick(hit) {
  unlockAudio();
  if (!hit) return;
  sfx.click();
  if (G.paused) {
    if (hit.id === 'btn-resume') G.paused = false;
    else if (hit.id === 'btn-restart') { G.paused = false; startNewRun(); }
    else if (hit.id === 'btn-quit') { G.paused = false; G.screen = 'title'; G.battle = null; }
    else if (hit.id === 'btn-mute') setMuted(!isMuted());
    return;
  }
  switch (hit.id) {
    case 'btn-new':
      startNewRun();
      break;
    case 'btn-continue':
      continueRun();
      break;
    case 'btn-how':
      G.screen = 'how';
      break;
    case 'btn-close-how':
      G.screen = 'title';
      break;
    case 'btn-map-node':
      startBattle();
      break;
    case 'btn-title':
      G.screen = 'title';
      G.battle = null;
      refreshSaveState();
      break;
    case 'btn-endturn': {
      if (G.battle) consumeEvents(endTurn(G.battle));
      break;
    }
    case 'card':
      tryPlayCard(hit.data.uid);
      break;
    case 'reward': {
      G.run.deck.push(hit.data.cardId);
      G.run.stage += 1;
      saveRun(G.run);
      G.rewards = null;
      G.screen = 'map';
      toast(`Added ${cardDef(hit.data.cardId).name} to your deck.`);
      break;
    }
    case 'btn-skip':
      G.run.stage += 1;
      saveRun(G.run);
      G.rewards = null;
      G.screen = 'map';
      break;
    case 'btn-again':
      startNewRun();
      break;
    case 'btn-mute':
      setMuted(!isMuted());
      break;
    default:
      break;
  }
}

function handleHover(hit) {
  G.hoverUid = null;
  G.hoverId = null;
  G.hoverReward = null;
  if (!hit) return;
  if (hit.id === 'card') G.hoverUid = hit.data.uid;
  else if (hit.id === 'reward') G.hoverReward = hit.data.cardId;
  else G.hoverId = hit.id;
}

function handleKey(key) {
  unlockAudio();
  if (key === 'm') {
    setMuted(!isMuted());
    return;
  }
  if (key === 'escape') {
    if (G.screen === 'battle' || G.screen === 'map') G.paused = !G.paused;
    else if (G.screen === 'how') G.screen = 'title';
    return;
  }
  if (G.paused) return;
  if (G.screen === 'battle' && G.battle) {
    if (key === 'e' || key === ' ') {
      consumeEvents(endTurn(G.battle));
      return;
    }
    const n = parseInt(key, 10);
    if (n >= 1 && n <= G.battle.piles.hand.length) {
      tryPlayCard(G.battle.piles.hand[n - 1].uid);
    }
  } else if (G.screen === 'reward' && G.rewards) {
    const n = parseInt(key, 10);
    if (n >= 1 && n <= G.rewards.length) {
      handleClick({ id: 'reward', data: { cardId: G.rewards[n - 1] } });
    }
  } else if (G.screen === 'title' && key === 'enter') {
    startNewRun();
  } else if (G.screen === 'map' && key === 'enter') {
    startBattle();
  }
}

function refreshSaveState() {
  const saved = loadSave();
  G.hasSave = !!(saved && saved.run);
  G.bestScore = loadBestScore();
}

function spawnParticles(dt) {
  if (G.screen !== 'title' && G.screen !== 'victory') return;
  G.particleTimer -= dt;
  if (G.particleTimer > 0) return;
  G.particleTimer = 0.12;
  if (G.particles.length > 90) return;
  G.particles.push({
    x: 60 + Math.random() * (VIEW_W - 120),
    y: VIEW_H + 8,
    vx: (Math.random() - 0.5) * 14,
    vy: -(24 + Math.random() * 40),
    size: 1.5 + Math.random() * 2.5,
    age: 0,
    life: 4 + Math.random() * 3,
    color: Math.random() < 0.5 ? '#e8b64c' : '#ff9f1c',
  });
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.age += dt;
    p.x += p.vx * dt + Math.sin(G.time * 2 + p.y * 0.01) * 6 * dt;
    p.y += p.vy * dt;
  }
  G.particles = G.particles.filter((p) => p.age < p.life && p.y > -12);
}

function updateFlying(dt) {
  for (const f of G.flying) {
    f.age += dt;
    const t = Math.min(1, f.age / f.dur);
    const e = 1 - (1 - t) * (1 - t);
    f.x += (f.tx - f.x) * e * 0.35;
    f.y += (f.ty - f.y) * e * 0.35;
    f.scale = 1 - t * 0.25;
    if (t >= 1) f.alpha -= dt * 6;
  }
  G.flying = G.flying.filter((f) => f.alpha > 0);
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!G.paused) {
    G.time += dt;
    if (G.message && G.time > G.messageUntil) G.message = '';
    if (G.battle && !G.pendingTransition) {
      consumeEvents(updateBattle(G.battle, dt));
    }
    if (G.pendingTransition && G.time >= G.pendingTransition.at) {
      const kind = G.pendingTransition.kind;
      G.pendingTransition = null;
      if (kind === 'win') finishBattleWin();
      else finishBattleLoss();
    }
    updateAnim(G.anim, dt);
    updateFlying(dt);
    spawnParticles(dt);
    updateParticles(dt);
    // Drop display entries for cards no longer in the hand.
    if (G.battle) {
      const uids = new Set(G.battle.piles.hand.map((c) => c.uid));
      for (const uid of [...G.display.keys()]) {
        if (!uids.has(uid)) G.display.delete(uid);
      }
    }
  }
  render(ctx, G);
  requestAnimationFrame(loop);
}

// Boot.
refreshSaveState();
makeInput(canvas, {
  getHits: () => G.hits,
  onClick: handleClick,
  onHover: handleHover,
  onKey: handleKey,
});
G.run = freshRun();
if (!applyShot(G)) {
  G.screen = 'title';
}
// Observability for playtests: the test harness reads the live game state
// through this handle. It changes nothing about the game itself.
window.__emberfall = G;
requestAnimationFrame(loop);
