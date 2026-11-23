// EMBERFALL persistence: the run's progress (stage, deck, score, HP) and
// the all-time best score, kept in localStorage. Every access is guarded —
// a blocked or unavailable store just means no Continue button.

import { STORAGE_KEY } from './config.js';

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function writeStore(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // A failed save must never stop the game.
  }
}

export function loadSave() {
  const data = readStore();
  if (!data || typeof data !== 'object') return null;
  if (!Array.isArray(data.deck) || typeof data.stage !== 'number') return null;
  return data;
}

export function saveRun(run) {
  const data = readStore() || {};
  data.run = {
    stage: run.stage,
    deck: run.deck,
    hp: run.hp,
    score: run.score,
    battlesWon: run.battlesWon,
  };
  writeStore(data);
}

export function clearRun() {
  const data = readStore() || {};
  delete data.run;
  writeStore(data);
}

export function loadBestScore() {
  const data = readStore();
  return data && typeof data.bestScore === 'number' ? data.bestScore : 0;
}

export function saveBestScore(score) {
  const data = readStore() || {};
  if (score > (data.bestScore || 0)) {
    data.bestScore = score;
    writeStore(data);
    return true;
  }
  return false;
}
