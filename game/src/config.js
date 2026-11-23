// EMBERFALL shared constants: canvas size, table layout, colours, and the
// per-type look of every card. Suits are told apart by colour AND shape,
// never by text alone (judge criterion 4).

export const VIEW_W = 1280;
export const VIEW_H = 720;

// Card geometry on the table.
export const CARD_W = 132;
export const CARD_H = 186;
export const CARD_SMALL_W = 104;
export const CARD_SMALL_H = 146;

export const COLORS = {
  felt: '#1d4a2f',
  feltDark: '#143521',
  feltLight: '#27603c',
  tableEdge: '#3a2a18',
  gold: '#e8b64c',
  goldDark: '#b98a2e',
  parchment: '#f4ead3',
  parchmentDark: '#ddd0ae',
  ink: '#241a10',
  inkSoft: '#5a4a33',
  hpRed: '#c0392b',
  hpGreen: '#58b368',
  energyBlue: '#4aa3df',
  blockBlue: '#7fb3d5',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

// One entry per card type: the colour, the drawn shape, and the label.
export const CARD_TYPES = {
  attack: { color: '#b3372c', dark: '#7e231b', shape: 'sword', label: 'ATTACK' },
  guard: { color: '#2e6da4', dark: '#1d4769', shape: 'shield', label: 'GUARD' },
  spark: { color: '#c9931a', dark: '#8a6410', shape: 'star', label: 'SPARK' },
  heal: { color: '#3d8b4f', dark: '#256633', shape: 'plus', label: 'HEAL' },
};

export const PLAYER_MAX_HP = 60;
export const PLAYER_START_ENERGY = 3;
export const CARDS_DRAWN_PER_TURN = 5;
export const HAND_LIMIT = 10;
export const HEAL_AFTER_BATTLE = 6;

export const STAGE_NAMES = ['Ember Gate', 'Ashen Halls', 'Gloom Spire', "The Hollow Throne"];

export const STORAGE_KEY = 'emberfall-save-v1';
