// EMBERFALL pile management: the draw pile, the hand, the discard pile and
// the cards played this turn. A deck is an array of card ids; piles hold
// card objects so each copy can carry its own animation state.

import { shuffleInPlace } from './random.js';
import { HAND_LIMIT } from './config.js';

let nextUid = 1;

export function makeCard(id) {
  return { id, uid: nextUid++ };
}

export function makeDeck(ids) {
  return ids.map(makeCard);
}

// Draw up to n cards into the hand, reshuffling the discard pile when the
// draw pile runs dry. Returns how many cards were actually drawn.
export function drawCards(piles, n, rng) {
  let drawn = 0;
  for (let i = 0; i < n; i += 1) {
    if (piles.hand.length >= HAND_LIMIT) break;
    if (piles.draw.length === 0) {
      if (piles.discard.length === 0) break;
      piles.draw = shuffleInPlace(piles.discard, rng);
      piles.discard = [];
    }
    piles.hand.push(piles.draw.pop());
    drawn += 1;
  }
  return drawn;
}

export function discardHand(piles) {
  piles.discard.push(...piles.hand);
  piles.hand.length = 0;
}

export function playCardToDiscard(piles, uid) {
  const at = piles.hand.findIndex((c) => c.uid === uid);
  if (at < 0) return null;
  const [card] = piles.hand.splice(at, 1);
  piles.discard.push(card);
  return card;
}
