// EMBERFALL card catalogue. Every card is one plain object: an id, a type
// (attack / guard / spark / heal), an energy cost, and the numbers its text
// promises. Effects are resolved in battle.js; this file only describes.

export const CARD_DEFS = {
  strike: {
    id: 'strike', name: 'Strike', type: 'attack', cost: 1,
    text: 'Deal 6 damage.',
    damage: 6,
  },
  heavy: {
    id: 'heavy', name: 'Heavy Blow', type: 'attack', cost: 2,
    text: 'Deal 11 damage.',
    damage: 11,
  },
  cleave: {
    id: 'cleave', name: 'Cleave', type: 'attack', cost: 1,
    text: 'Deal 4 damage. If the foe is Kindled, deal 4 more.',
    damage: 4, kindleBonus: 4,
  },
  guard: {
    id: 'guard', name: 'Guard', type: 'guard', cost: 1,
    text: 'Gain 5 Block.',
    block: 5,
  },
  bulwark: {
    id: 'bulwark', name: 'Bulwark', type: 'guard', cost: 2,
    text: 'Gain 10 Block.',
    block: 10,
  },
  ward: {
    id: 'ward', name: 'Ward', type: 'guard', cost: 1,
    text: 'Gain 3 Block. Draw a card.',
    block: 3, draw: 1,
  },
  spark: {
    id: 'spark', name: 'Spark', type: 'spark', cost: 1,
    text: 'Deal 4 damage. Kindle the foe.',
    damage: 4, kindle: true,
  },
  ember: {
    id: 'ember', name: 'Ember Lance', type: 'spark', cost: 2,
    text: 'Deal 8 damage. Kindle the foe.',
    damage: 8, kindle: true,
  },
  scout: {
    id: 'scout', name: 'Scout', type: 'spark', cost: 0,
    text: 'Draw 2 cards.',
    draw: 2,
  },
  mend: {
    id: 'mend', name: 'Mend', type: 'heal', cost: 1,
    text: 'Restore 4 HP.',
    heal: 4,
  },
  renew: {
    id: 'renew', name: 'Renew', type: 'heal', cost: 2,
    text: 'Restore 9 HP.',
    heal: 9,
  },
  rally: {
    id: 'rally', name: 'Rally', type: 'heal', cost: 1,
    text: 'Restore 3 HP. Gain 1 Energy.',
    heal: 3, energy: 1,
  },
};

// The deck every run starts with: 12 cards, weighted to attacks.
export function startingDeck() {
  return [
    'strike', 'strike', 'strike', 'strike', 'strike',
    'guard', 'guard', 'guard',
    'spark', 'spark',
    'mend', 'mend',
  ];
}

// Cards that can appear as post-battle rewards (never the plain starters).
export const REWARD_POOL = [
  'heavy', 'cleave', 'bulwark', 'ward', 'ember', 'scout', 'renew', 'rally',
];

// Three distinct reward offers, drawn with the run's rng.
export function drawRewards(rng) {
  const pool = [...REWARD_POOL];
  const offers = [];
  while (offers.length < 3 && pool.length > 0) {
    const at = Math.floor(rng() * pool.length);
    offers.push(pool.splice(at, 1)[0]);
  }
  return offers;
}

export function cardDef(id) {
  return CARD_DEFS[id];
}

// One-line summary used by the log and the defeat screen.
export function deckSummary(deck) {
  const counts = {};
  for (const id of deck) counts[id] = (counts[id] || 0) + 1;
  return Object.entries(counts)
    .map(([id, n]) => `${CARD_DEFS[id].name}${n > 1 ? ` x${n}` : ''}`)
    .join(', ');
}
