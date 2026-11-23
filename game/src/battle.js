// EMBERFALL battle logic: turns, energy, cards, block, Kindle and the
// Ember combo, and the enemy's revealed intent cards. This module owns no
// pixels — every action returns a list of events (damage, block, heal,
// kindle, ember, draw) that main.js turns into animation and sound.

import { cardDef } from './cards.js';
import { enemyDef } from './enemies.js';
import { makeDeck, drawCards, discardHand, playCardToDiscard } from './deck.js';
import { shuffleInPlace } from './random.js';
import {
  PLAYER_START_ENERGY, CARDS_DRAWN_PER_TURN,
} from './config.js';

const ENEMY_ACTION_GAP = 0.75;

export function createBattle(opts) {
  const def = enemyDef(opts.stageIndex);
  const battle = {
    stageIndex: opts.stageIndex,
    rng: opts.rng,
    enemy: {
      def,
      hp: def.hp,
      maxHp: def.hp,
      block: 0,
      kindled: false,
      intentDeck: shuffleInPlace(def.intents.map((i) => ({ ...i })), opts.rng),
      intentDiscard: [],
      intents: [],
    },
    player: {
      hp: opts.hp,
      maxHp: opts.maxHp,
      block: 0,
      energy: PLAYER_START_ENERGY,
      maxEnergy: PLAYER_START_ENERGY,
    },
    piles: {
      draw: shuffleInPlace(makeDeck(opts.deck), opts.rng),
      hand: [],
      discard: [],
    },
    turn: 1,
    phase: 'player',
    result: null,
    sparksThisTurn: 0,
    log: [],
    enemyQueue: [],
    enemyTimer: 0,
    damageDealt: 0,
  };
  revealIntents(battle);
  drawCards(battle.piles, CARDS_DRAWN_PER_TURN, battle.rng);
  battle.log.push(`${def.name} blocks the way — ${def.title}.`);
  return battle;
}

function revealIntents(battle) {
  const e = battle.enemy;
  e.intentDiscard.push(...e.intents);
  e.intents = [];
  for (let i = 0; i < 2; i += 1) {
    if (e.intentDeck.length === 0) {
      if (e.intentDiscard.length === 0) break;
      e.intentDeck = shuffleInPlace(e.intentDiscard, battle.rng);
      e.intentDiscard = [];
    }
    e.intents.push(e.intentDeck.pop());
  }
}

function hurtEnemy(battle, amount, events) {
  const e = battle.enemy;
  let left = amount;
  if (e.block > 0) {
    const absorbed = Math.min(e.block, left);
    e.block -= absorbed;
    left -= absorbed;
    events.push({ kind: 'blockHit', target: 'enemy', amount: absorbed });
  }
  if (left > 0) {
    e.hp = Math.max(0, e.hp - left);
    battle.damageDealt += left;
    events.push({ kind: 'damage', target: 'enemy', amount: left });
  }
  if (e.hp <= 0) {
    battle.phase = 'over';
    battle.result = 'win';
    events.push({ kind: 'enemyDown' });
  }
}

function hurtPlayer(battle, amount, events) {
  const p = battle.player;
  let left = amount;
  if (p.block > 0) {
    const absorbed = Math.min(p.block, left);
    p.block -= absorbed;
    left -= absorbed;
    events.push({ kind: 'blockHit', target: 'player', amount: absorbed });
  }
  if (left > 0) {
    p.hp = Math.max(0, p.hp - left);
    events.push({ kind: 'damage', target: 'player', amount: left });
  }
  if (p.hp <= 0) {
    battle.phase = 'over';
    battle.result = 'lose';
    events.push({ kind: 'playerDown' });
  }
}

// Play one card from the hand. Returns { ok, events, reason? }.
export function playCard(battle, uid) {
  const events = [];
  if (battle.phase !== 'player') return { ok: false, events, reason: 'Not your turn.' };
  const card = battle.piles.hand.find((c) => c.uid === uid);
  if (!card) return { ok: false, events, reason: 'Card not in hand.' };
  const def = cardDef(card.id);
  if (def.cost > battle.player.energy) {
    return { ok: false, events, reason: 'Not enough energy.' };
  }
  battle.player.energy -= def.cost;
  playCardToDiscard(battle.piles, uid);
  events.push({ kind: 'played', card: def.name, cost: def.cost });

  if (def.damage) {
    let amount = def.damage;
    if (battle.enemy.kindled) {
      amount += def.kindleBonus !== undefined ? def.kindleBonus : 2;
      battle.enemy.kindled = false;
      events.push({ kind: 'kindleSpent', amount: def.kindleBonus !== undefined ? def.kindleBonus : 2 });
    }
    hurtEnemy(battle, amount, events);
  }
  if (def.block) {
    battle.player.block += def.block;
    events.push({ kind: 'block', target: 'player', amount: def.block });
  }
  if (def.heal) {
    const before = battle.player.hp;
    battle.player.hp = Math.min(battle.player.maxHp, battle.player.hp + def.heal);
    events.push({ kind: 'heal', target: 'player', amount: battle.player.hp - before });
  }
  if (def.draw) {
    const drawn = drawCards(battle.piles, def.draw, battle.rng);
    events.push({ kind: 'draw', amount: drawn });
  }
  if (def.energy) {
    battle.player.energy += def.energy;
    events.push({ kind: 'energy', amount: def.energy });
  }
  if (def.kindle && battle.result !== 'win') {
    battle.enemy.kindled = true;
    events.push({ kind: 'kindle' });
  }
  // Ember combo: a second Spark card in one turn bursts for 8 damage.
  if (def.type === 'spark' && battle.result !== 'win') {
    battle.sparksThisTurn += 1;
    if (battle.sparksThisTurn >= 2) {
      battle.sparksThisTurn = 0;
      events.push({ kind: 'ember' });
      hurtEnemy(battle, 8, events);
    }
  }
  battle.log.push(`You play ${def.name}.`);
  return { ok: true, events };
}

export function endTurn(battle) {
  if (battle.phase !== 'player') return [];
  const events = [{ kind: 'turnEnd' }];
  discardHand(battle.piles);
  battle.enemy.block = 0;
  battle.phase = 'enemy';
  battle.enemyQueue = [...battle.enemy.intents];
  battle.enemyTimer = 0.45;
  return events;
}

function resolveIntent(battle, intent, events) {
  const e = battle.enemy;
  events.push({ kind: 'intentPlayed', intent });
  if (intent.kind === 'attack') {
    hurtPlayer(battle, intent.value, events);
  } else if (intent.kind === 'guard') {
    e.block += intent.value;
    events.push({ kind: 'block', target: 'enemy', amount: intent.value });
  } else if (intent.kind === 'drain') {
    hurtPlayer(battle, intent.value, events);
    if (battle.result !== 'lose') {
      const before = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + intent.value);
      events.push({ kind: 'heal', target: 'enemy', amount: e.hp - before });
    }
  }
  battle.log.push(`${e.def.name} plays ${intent.name}.`);
}

function startPlayerTurn(battle) {
  battle.turn += 1;
  battle.player.block = 0;
  battle.player.energy = battle.player.maxEnergy;
  battle.sparksThisTurn = 0;
  revealIntents(battle);
  drawCards(battle.piles, CARDS_DRAWN_PER_TURN, battle.rng);
  battle.phase = 'player';
  battle.log.push(`Turn ${battle.turn} — your move.`);
}

// Advance the enemy phase. Returns the events that fired this tick.
export function updateBattle(battle, dt) {
  const events = [];
  if (battle.phase !== 'enemy' || battle.result) return events;
  battle.enemyTimer -= dt;
  if (battle.enemyTimer > 0) return events;
  if (battle.enemyQueue.length === 0) {
    startPlayerTurn(battle);
    events.push({ kind: 'turnStart', turn: battle.turn });
    return events;
  }
  const intent = battle.enemyQueue.shift();
  resolveIntent(battle, intent, events);
  battle.enemyTimer = ENEMY_ACTION_GAP;
  return events;
}

export function canPlay(battle, uid) {
  if (battle.phase !== 'player') return false;
  const card = battle.piles.hand.find((c) => c.uid === uid);
  if (!card) return false;
  return cardDef(card.id).cost <= battle.player.energy;
}
