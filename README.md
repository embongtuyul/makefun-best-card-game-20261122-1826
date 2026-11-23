# EMBERFALL — A Roguelike Deck-Builder

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/embongtuyul/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/embongtuyul/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**EMBERFALL** is an original roguelike deck-builder card game, built for the
[best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826)
bounty on make.fun. You are the last Ember Knight: fight through four stages
to the Hollow King, growing your deck after every victory.

## How it plays

- **Turn-based card battles**: 3 Energy a turn, draw 5 cards, play them
  against a foe whose next two moves are revealed face up — read them and
  counter.
- **Four card types, told apart by colour AND shape**: Attack (red, sword),
  Guard (blue, shield), Spark (gold, star), Heal (green, plus).
- **Kindle + Ember combo**: Spark cards Kindle the foe (+2 on your next
  attack); two Sparks in one turn trigger an Ember Burst for 8 damage.
- **Four original foes** with their own intent decks: Cinder Imp, Ash
  Warden, Gloom Herald, and the boss, The Hollow King.
- **A full run**: title, map, battles, card rewards, victory and defeat
  screens, pause, localStorage save + Continue, and a best score.
- **Feel**: cards slide, lift and fly; floating damage numbers; screen
  shake on heavy hits; synthesised WebAudio sound effects (no audio files).

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Mouse + keyboard: click a card (or press 1-5) to play it, E to end turn,
Esc to pause, M to mute. No network requests — every asset is procedural
code under `game/`.

## Layout

- `game/index.html` + `game/style.css` — the page and the canvas.
- `game/src/main.js` — boot, screen machine, game loop.
- `game/src/battle.js` — turns, energy, cards, Kindle/Ember, enemy intents.
- `game/src/cards.js` — the card catalogue and reward pool.
- `game/src/enemies.js` — the four foes and their intent decks.
- `game/src/deck.js` — draw pile, hand, discard.
- `game/src/render.js` — all canvas drawing (table, cards, portraits, HUD).
- `game/src/input.js` — mouse + keyboard hit-testing.
- `game/src/anim.js` — tweens, floating text, screen shake.
- `game/src/audio.js` — synthesised sound effects.
- `game/src/save.js` — localStorage save + best score.
- `game/src/shots.js` — `?shot=` staging for reproducible screenshots.
- `game/src/random.js` — seeded RNG.
- `main.ts` — the hand-in: copies `game/` + `screenshots/` to the output
  directory and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — 4 real renders of the game's own code.

## License

MIT — see `LICENSE`.
