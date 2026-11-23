// EMBERFALL foes. Each enemy carries a hit-point pool, a small deck of
// intent cards, and a palette for its procedurally drawn portrait. Every
// turn the enemy reveals two intent cards face up, so the player can read
// the coming turn and counter it — the opponent's hand, on the table.

export const ENEMIES = [
  {
    id: 'imp', name: 'Cinder Imp', title: 'Warden of the Ember Gate',
    hp: 30, palette: { body: '#c65a3a', belly: '#e8a06a', accent: '#ffd166' },
    intents: [
      { id: 'claw', name: 'Claw', kind: 'attack', value: 6, text: 'Claw for 6.' },
      { id: 'claw', name: 'Claw', kind: 'attack', value: 6, text: 'Claw for 6.' },
      { id: 'bite', name: 'Bite', kind: 'attack', value: 8, text: 'Bite for 8.' },
      { id: 'hide', name: 'Hide', kind: 'guard', value: 6, text: 'Gain 6 Block.' },
    ],
  },
  {
    id: 'warden', name: 'Ash Warden', title: 'Keeper of the Ashen Halls',
    hp: 45, palette: { body: '#5b7a99', belly: '#9db8cc', accent: '#d8e6f0' },
    intents: [
      { id: 'slam', name: 'Slam', kind: 'attack', value: 9, text: 'Slam for 9.' },
      { id: 'slam', name: 'Slam', kind: 'attack', value: 9, text: 'Slam for 9.' },
      { id: 'cleave', name: 'Cleave', kind: 'attack', value: 7, text: 'Cleave for 7.' },
      { id: 'wall', name: 'Ash Wall', kind: 'guard', value: 9, text: 'Gain 9 Block.' },
      { id: 'wall', name: 'Ash Wall', kind: 'guard', value: 9, text: 'Gain 9 Block.' },
    ],
  },
  {
    id: 'herald', name: 'Gloom Herald', title: 'Voice of the Gloom Spire',
    hp: 58, palette: { body: '#6b4a8f', belly: '#a98cc9', accent: '#e0c8f7' },
    intents: [
      { id: 'hex', name: 'Hex', kind: 'attack', value: 10, text: 'Hex for 10.' },
      { id: 'hex', name: 'Hex', kind: 'attack', value: 10, text: 'Hex for 10.' },
      { id: 'drain', name: 'Drain', kind: 'drain', value: 6, text: 'Drain 6, heal 6.' },
      { id: 'shroud', name: 'Shroud', kind: 'guard', value: 10, text: 'Gain 10 Block.' },
      { id: 'wail', name: 'Wail', kind: 'attack', value: 12, text: 'Wail for 12.' },
    ],
  },
  {
    id: 'king', name: 'The Hollow King', title: 'Lord of the Hollow Throne',
    hp: 85, palette: { body: '#2f2a33', belly: '#6e6455', accent: '#e8b64c' },
    intents: [
      { id: 'royal', name: 'Royal Strike', kind: 'attack', value: 12, text: 'Strike for 12.' },
      { id: 'royal', name: 'Royal Strike', kind: 'attack', value: 12, text: 'Strike for 12.' },
      { id: 'flame', name: 'Crown Flame', kind: 'attack', value: 9, text: 'Flame for 9.' },
      { id: 'darkguard', name: 'Dark Guard', kind: 'guard', value: 12, text: 'Gain 12 Block.' },
      { id: 'drain', name: 'Soul Drain', kind: 'drain', value: 8, text: 'Drain 8, heal 8.' },
      { id: 'flame', name: 'Crown Flame', kind: 'attack', value: 9, text: 'Flame for 9.' },
    ],
  },
];

export function enemyDef(stageIndex) {
  return ENEMIES[Math.min(stageIndex, ENEMIES.length - 1)];
}

export function isBoss(stageIndex) {
  return stageIndex >= ENEMIES.length - 1;
}
