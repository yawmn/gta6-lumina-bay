// IRON BAYOU: RUSTLINE — every tuning number and colour in one place.
// The world is a fixed 3200x2400 industrial port city; the renderer shows a 1280x720
// window of it through a camera that follows the player. No rule below depends on the
// size of the browser window, so a screenshot always frames the same game.

export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3200, height: 2400 };
export const STEP = 1 / 60;

export const PALETTE = {
  grass: '#20261f',
  swamp: '#1d2b22',
  water: '#16324a',
  asphalt: '#1e2229',
  asphaltDark: '#262b34',
  roadEdge: '#3a4150',
  laneYellow: '#f5b700',
  laneWhite: '#c8ccd4',
  sidewalk: '#4a4f58',
  rust: '#a63a2b',
  steelBlue: '#2b5b84',
  swampGreen: '#2d4a3e',
  hazard: '#ffd60a',
  sirenRed: '#ff2a3c',
  policeBlue: '#00a8ff',
  money: '#2ec4b6',
  text: '#f2f4f6',
  muted: '#9aa3b0',
  panel: 'rgba(12, 15, 20, 0.78)',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export const DISTRICTS = [
  { name: 'PIER 9', x0: 2600, y0: 0, x1: 3200, y1: 800 },
  { name: 'RAIL YARD', x0: 800, y0: 950, x1: 2400, y1: 1300 },
  { name: 'FOUNDRY', x0: 2050, y0: 1450, x1: 2750, y1: 2050 },
  { name: 'DOWNTOWN', x0: 1250, y0: 1200, x1: 1950, y1: 1750 },
  { name: 'BAYOU', x0: 0, y0: 2200, x1: 3200, y1: 2400 },
  { name: 'SLAGTOWN', x0: 0, y0: 0, x1: 3200, y1: 2400 },
];

export const WEAPONS = {
  pistol: { name: 'PISTOL', damage: 34, fireRate: 0.28, mag: 12, reload: 0.9, spread: 0.05, bulletSpeed: 900, range: 520 },
  shotgun: { name: 'SHOTGUN', damage: 22, pellets: 5, fireRate: 0.8, mag: 6, reload: 1.6, spread: 0.22, bulletSpeed: 780, range: 340 },
  rifle: { name: 'RIFLE', damage: 26, fireRate: 0.11, mag: 30, reload: 1.4, spread: 0.03, bulletSpeed: 1200, range: 700 },
};

export const VEHICLE_TYPES = {
  sedan: { name: 'SEDAN', w: 66, h: 32, topSpeed: 460, accel: 320, grip: 2.6, colors: ['#c23b2e', '#3e6b8f', '#c9c9c9', '#7a4a8f'] },
  taxi: { name: 'TAXI', w: 66, h: 32, topSpeed: 440, accel: 300, grip: 2.6, colors: ['#f5b700'] },
  truck: { name: 'CARGO TRUCK', w: 104, h: 38, topSpeed: 360, accel: 220, grip: 2.0, colors: ['#8a8f96', '#a63a2b'] },
  police: { name: 'POLICE', w: 68, h: 32, topSpeed: 520, accel: 380, grip: 3.0, colors: ['#1d2f45'] },
};

export const PLAYER = { radius: 14, walkSpeed: 230, sprintSpeed: 340, maxHp: 100, maxArmor: 100 };

export const MISSIONS = [
  {
    title: 'M1 · HOTWIRE AT PIER 9',
    reward: 5000,
    briefing: 'Steal the syndicate cargo truck at Pier 9 and drive it to the Safehouse.',
  },
  {
    title: 'M2 · RAIL-YARD AMBUSH',
    reward: 8000,
    briefing: 'Take out 5 syndicate guards, grab the cash case, then lose the heat at Pay & Spray.',
  },
  {
    title: 'M3 · THE FOUNDRY HEIST',
    reward: 15000,
    briefing: 'Blow the foundry gate, defeat the Ironclad boss, and take Downtown.',
  },
];

export const SAVE_KEY = 'iron-bayou-save-v1';
export const RADIO_STATION = 'RUST FM 94.2';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
