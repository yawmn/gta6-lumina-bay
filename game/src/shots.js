// The screenshot scenes behind ?shot=start|steal|chase|mission (3D). Each one
// starts from a fresh seeded game and stages one real moment of it — the same
// rules, the same city, a fixed scripted setup — so the frame is what the game
// really looks like and the same seed always gives the same frame. Gemini's
// pre-submit fixes are baked in: money $250 → $250 → $5,250, wanted ★2 → ★4 →
// ★0, a combat tracer with reduced ammo in the steal scene, and a LOAD SAVE
// line on the title screen.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render3d.js';
import { enterNearestCar, updateGame } from './update.js';
import { addWanted } from './WantedSystem.js';
import { spawnGuard } from './CombatSystem.js';

const IDLE_INPUT = { axes: { forward: 0, strafe: 0, sprint: false, handbrake: false }, mouse: { x: 640, y: 360, down: false } };

function simulate(state, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) updateGame(state, input ?? IDLE_INPUT, STEP);
}

function placePlayerCar(state, type, x, y, angle, speed) {
  const car = {
    id: 7000 + state.cars.length, type, x, y, angle, speed,
    targetSpeed: 0, color: type === 'police' ? '#1d2f45' : '#c23b2e',
    isTraffic: false, isPolice: type === 'police', isPlayer: type !== 'police',
    hp: 500, missionTruck: false,
  };
  state.cars.push(car);
  if (type !== 'police') {
    state.player.car = car;
    state.player.onFoot = false;
    state.player.x = x;
    state.player.y = y;
    state.player.angle = angle;
  }
  return car;
}

function placePoliceChase(state, px, py, angle) {
  const spots = [
    { x: px - 330, y: py + 175, a: angle },
    { x: px - 390, y: py - 165, a: angle },
    { x: px + 240, y: py + 170, a: angle + Math.PI },
  ];
  for (const s of spots) placePlayerCar(state, 'police', s.x, s.y, s.a, 380);
}

export function stageShot(name, state) {
  const L = state.world.landmarks;
  if (name === 'steal') {
    // On foot beside a red sedan in downtown traffic, firing at a police car
    // (tracer + muzzle flash visible, ammo down to 8/96), peds fleeing. The
    // camera sits behind-left so the player, the sedan and the police car are
    // all in frame and no traffic car blocks the view.
    state.player.x = 1560;
    state.player.y = 1330;
    state.player.angle = -0.18;
    state.camYaw = 0.27;
    state.cars.push({
      id: 7101, type: 'sedan', x: 1620, y: 1400, angle: 0, speed: 0, targetSpeed: 0,
      color: '#c23b2e', isTraffic: false, isPolice: false, isPlayer: false, hp: 100,
    });
    const cop = {
      id: 7103, type: 'police', x: 1780, y: 1290, angle: Math.PI, speed: 0, targetSpeed: 0,
      color: '#1d2f45', isTraffic: false, isPolice: true, isPlayer: false, hp: 500,
    };
    state.cars.push(cop);
    for (const ped of state.peds.slice(0, 4)) {
      ped.x = 1500 + state.random() * 200;
      ped.y = 1300 + state.random() * 120;
      ped.flee = 2.5;
    }
    state.wanted.level = 2;
    state.money = 250;
    state.interactPrompt = '[E] STEAL CAR';
    // Hold the trigger for a moment so shots are actually fired (ammo 12 -> 8).
    simulate(state, 1.2, { axes: { forward: 0, strafe: 0, sprint: false, handbrake: false }, mouse: { x: 900, y: 360, down: true } });
    // Leave two fresh tracers in the air for the frame. Shots fired along
    // the camera's view axis foreshorten to a dot, so send one bullet
    // sideways first (pushed first, the muzzle flash still lands on the
    // near bullet below): its tracer crosses the road as a visible line.
    const la = state.player.angle + Math.PI / 2.3;
    state.bullets.push({
      x: state.player.x + Math.cos(la) * 120,
      y: state.player.y + Math.sin(la) * 120,
      vx: Math.cos(la) * 900, vy: Math.sin(la) * 900,
      damage: 34, fromPlayer: true, life: 0.4,
    });
    const a = state.player.angle;
    for (const dist of [60, 150]) {
      state.bullets.push({
        x: state.player.x + Math.cos(a) * dist,
        y: state.player.y + Math.sin(a) * dist,
        vx: Math.cos(a) * 900, vy: Math.sin(a) * 900,
        damage: 34, fromPlayer: true, life: 0.4,
      });
    }
    state.player.weapons.pistol.ammo = 8;
    state.player.weapons.pistol.reserve = 96;
    return { screen: SCREEN_PLAY, camYaw: 0.27 };
  }
  if (name === 'chase') {
    // Driving east down a downtown avenue at speed, three police cars on the tail,
    // Wanted 4, skid marks behind, a roadblock ahead. Money still $250: the
    // mission reward only lands when the mission passes.
    state.player.x = 1600;
    state.player.y = 1400;
    const car = placePlayerCar(state, 'sedan', 1600, 1400, 0, 430);
    state.skids.push(
      { x: 1520, y: 1400, angle: 0, life: 6 },
      { x: 1470, y: 1402, angle: 0.1, life: 6 },
      { x: 1420, y: 1398, angle: -0.08, life: 6 },
    );
    placePoliceChase(state, 1600, 1400, 0);
    state.cars.push({
      id: 7201, type: 'police', x: 2400, y: 1330, angle: Math.PI / 2, speed: 0, targetSpeed: 0,
      color: '#1d2f45', isTraffic: false, isPolice: true, isPlayer: false, hp: 500, roadblock: true,
    });
    state.cars.push({
      id: 7202, type: 'police', x: 2400, y: 1470, angle: Math.PI / 2, speed: 0, targetSpeed: 0,
      color: '#1d2f45', isTraffic: false, isPolice: true, isPlayer: false, hp: 500, roadblock: true,
    });
    state.wanted.level = 4;
    state.money = 250;
    state.camYaw = 0;
    simulate(state, 1.0, { axes: { forward: 1, strafe: 0, sprint: false, handbrake: false }, mouse: { x: 900, y: 360, down: false } });
    state.player.car = car;
    return { screen: SCREEN_PLAY, camYaw: 0 };
  }
  if (name === 'mission') {
    // Mission passed at the safehouse: banner up, game saved, next marker on the map.
    state.player.x = L.safehouse.x + 40;
    state.player.y = L.safehouse.y + 130;
    state.player.angle = -Math.PI / 2;
    state.camYaw = -Math.PI / 2;
    state.money = 5250;
    state.missions.index = 1;
    state.missions.stage = 'yard';
    state.missions.banner = 'MISSION PASSED!';
    state.missions.bannerSub = '+$5,000  ·  M1 · HOTWIRE AT PIER 9';
    state.missions.bannerTimer = 3.2;
    state.saveNotice = 2.5;
    state.wanted.level = 0;
    simulate(state, 1.0);
    state.missions.banner = 'MISSION PASSED!';
    state.missions.bannerSub = '+$5,000  ·  M1 · HOTWIRE AT PIER 9';
    state.missions.bannerTimer = 3.2;
    state.saveNotice = 2.5;
    // Cinematic three-quarter view: player small at the safehouse, sign and
    // street behind him, instead of the follow camera right on his back.
    // Camera panned slightly left so the neon SAFEHOUSE sign sits clear of
    // the MISSION PASSED banner's right edge.
    return {
      screen: SCREEN_PLAY,
      cinematic: { pos: { x: -860, y: 75, z: 740 }, look: { x: -1060, y: 45, z: 658 } },
    };
  }
  // start (default): the title screen over a living city, wide sunset shot.
  state.hasSave = true; // stage a save so the LOAD SAVE line shows on the title
  simulate(state, 8);
  return {
    screen: SCREEN_TITLE,
    cinematic: { pos: { x: 760, y: 330, z: 620 }, look: { x: -350, y: 50, z: -260 } },
  };
}
