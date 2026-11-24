// IRON BAYOU: RUSTLINE — config: palette, city layout, missions, weapons.
// Fresh rewrite for the 3D rebuild (recording 01a20c4f), written in this session.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.CFG = {
    // World is in metres. x: -700..700 (west pier to east foundry), z: -500..500.
    WORLD_W: 1400, WORLD_D: 1000,
    ROAD_W: 18, BLOCK: 140,          // avenues every 140 m, roads 18 m wide
    AVENUES_X: [-560, -420, -280, -140, 0, 140, 280, 420, 560],
    AVENUES_Z: [-420, -280, -140, 0, 140, 280, 420],
    PALETTE: {
      asphalt: 0x1e2229, asphalt2: 0x2c323d, sidewalk: 0x3a4048,
      yellow: 0xf5b700, hazard: 0xffd60a, rust: 0xa63a2b, steel: 0x2b5b84,
      swamp: 0x2d4a3e, sirenRed: 0xff2a3c, policeBlue: 0x00a8ff, money: 0x2ec4b6,
      sunset: 0xff9a3c, dusk: 0x2b3a55, fog: 0x3a2f3a
    },
    START_MONEY: 250,
    LANDMARKS: {
      pier:      { x: -640, z: 0,    label: 'PIER 9' },
      safehouse: { x: 140,  z: 420,  label: 'SAFEHOUSE' },
      paynspray: { x: -140, z: 280,  label: 'PAY & SPRAY' },
      railyard:  { x: 0,    z: -350, label: 'RAIL YARD' },
      foundry:   { x: 560,  z: 0,    label: 'FOUNDRY' }
    },
    MISSIONS: [
      { id: 1, name: 'HOTWIRE AT PIER 9', reward: 5000,
        steps: [
          { text: 'Steal the armored cargo truck at Pier 9', target: 'pier', kind: 'steal' },
          { text: 'Drive the truck to the safehouse', target: 'safehouse', kind: 'deliver' }
        ] },
      { id: 2, name: 'RAIL-YARD AMBUSH', reward: 4000,
        steps: [
          { text: 'Go to the Rail Yard and clear the guards', target: 'railyard', kind: 'combat' },
          { text: 'Take the cash case', target: 'railyard', kind: 'pickup' },
          { text: 'Lose the heat at Pay & Spray', target: 'paynspray', kind: 'clear' }
        ] },
      { id: 3, name: 'THE FOUNDRY HEIST', reward: 8000,
        steps: [
          { text: 'Blow the foundry gate', target: 'foundry', kind: 'blow' },
          { text: 'Defeat the boss guard', target: 'foundry', kind: 'boss' }
        ] }
    ],
    WEAPONS: [
      { name: 'PISTOL',  ammo: 12, reserve: 60,  damage: 34, rate: 0.28, spread: 0.012 },
      { name: 'SMG',     ammo: 30, reserve: 120, damage: 18, rate: 0.09, spread: 0.03 },
      { name: 'SHOTGUN', ammo: 6,  reserve: 24,  damage: 26, rate: 0.8,  spread: 0.06, pellets: 5 }
    ],
    DISTRICTS: [
      { name: 'PIER 9',       test: function (x, z) { return x < -560; } },
      { name: 'RAIL YARD',    test: function (x, z) { return z < -280; } },
      { name: 'FOUNDRY',      test: function (x, z) { return x > 420; } },
      { name: 'SAFEHOUSE ROW', test: function (x, z) { return z > 280; } },
      { name: 'DOWNTOWN',     test: function (x, z) { return Math.abs(x) < 280 && Math.abs(z) < 140; } },
      { name: 'CINDERPORT',   test: function () { return true; } }
    ]
  };
  G.districtAt = function (x, z) {
    var ds = G.CFG.DISTRICTS;
    for (var i = 0; i < ds.length; i++) if (ds[i].test(x, z)) return ds[i].name;
    return 'CINDERPORT';
  };
})();
