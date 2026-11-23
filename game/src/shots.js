// EMBERFALL screenshot staging: ?shot=start|battle|boss|victory&seed=1
// puts the game into a chosen, fully real state so screenshots are renders
// of the game's own code, reproducible from the seed. No autopilot plays
// the game — the state is built with the same constructors the game uses.

import { createBattle } from './battle.js';
import { drawRewards, startingDeck } from './cards.js';
import { makeRng } from './random.js';

export function parseShot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = parseInt(params.get('seed') || '1', 10) || 1;
  return { shot, seed };
}

// Build a battle in the middle of a fight, with a fixed hand.
function stageBattle(G, stageIndex, opts) {
  const rng = makeRng(G.shotSeed);
  // The staged hand may name cards the starting deck lacks (Heavy Blow,
  // Ember Lance...), so the run deck is enriched with them first.
  G.run.deck = [...opts.hand, ...startingDeck()];
  G.run.stage = stageIndex;
  G.run.hp = opts.hp;
  G.run.maxHp = 60;
  G.run.score = opts.score;
  G.battle = createBattle({
    stageIndex,
    deck: G.run.deck,
    hp: opts.hp,
    maxHp: 60,
    rng,
  });
  const b = G.battle;
  b.enemy.hp = opts.enemyHp;
  b.player.energy = opts.energy;
  b.player.block = opts.playerBlock || 0;
  b.enemy.block = opts.enemyBlock || 0;
  b.enemy.kindled = !!opts.kindled;
  b.turn = opts.turn || 2;
  // Force the exact hand the shot wants.
  const wanted = opts.hand;
  const byId = {};
  for (const pile of [b.piles.draw, b.piles.hand, b.piles.discard]) {
    for (const card of pile) {
      byId[card.id] = byId[card.id] || [];
      byId[card.id].push(card);
    }
  }
  const hand = [];
  const used = new Set();
  for (const id of wanted) {
    const pool = byId[id] || [];
    const card = pool.find((c) => !used.has(c.uid));
    if (card) {
      used.add(card.uid);
      hand.push(card);
    }
  }
  b.piles.hand = hand;
  b.piles.draw = b.piles.draw.filter((c) => !used.has(c.uid));
  b.piles.discard = b.piles.discard.filter((c) => !used.has(c.uid));
  G.screen = 'battle';
}

export function applyShot(G) {
  const parsed = parseShot();
  if (!parsed) return false;
  G.shotSeed = parsed.seed;
  const rng = makeRng(parsed.seed);
  if (parsed.shot === 'start') {
    G.screen = 'title';
    return true;
  }
  if (parsed.shot === 'battle') {
    // Stage 2, mid-fight: a full hand, a kindled foe, real numbers.
    stageBattle(G, 1, {
      hp: 41, score: 350, enemyHp: 26, energy: 2,
      playerBlock: 5, enemyBlock: 0, kindled: true, turn: 3,
      hand: ['strike', 'heavy', 'spark', 'guard', 'mend'],
    });
    return true;
  }
  if (parsed.shot === 'boss') {
    // The final fight, low HP on both sides — the dramatic shot.
    stageBattle(G, 3, {
      hp: 22, score: 890, enemyHp: 38, energy: 1,
      playerBlock: 0, enemyBlock: 6, kindled: false, turn: 5,
      hand: ['cleave', 'ember', 'bulwark', 'renew', 'scout'],
    });
    return true;
  }
  if (parsed.shot === 'victory') {
    G.finalStats = {
      damageDealt: 412, battlesWon: 4, hpLeft: 18,
      score: 1240, newBest: true,
    };
    G.screen = 'victory';
    return true;
  }
  if (parsed.shot === 'defeat') {
    G.finalStats = {
      damageDealt: 188, battlesWon: 2, hpLeft: 0,
      score: 540, bestScore: 1240, stageReached: 3,
    };
    G.lastFoeName = 'Gloom Herald';
    G.screen = 'defeat';
    return true;
  }
  if (parsed.shot === 'reward') {
    G.run.stage = 1;
    G.run.score = 350;
    G.lastFoeName = 'Cinder Imp';
    G.rewards = drawRewards(rng);
    G.screen = 'reward';
    return true;
  }
  return false;
}
