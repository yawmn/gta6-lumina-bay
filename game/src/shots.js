// The screenshot scenes behind ?shot=start|steal|chase|mission. Each one starts from
// a fresh seeded game and stages one real moment of it — the same rules, the same
// city, a fixed scripted setup — so the frame is what the game really looks like and
// the same seed always gives the same frame. No input is needed: the scene is painted
// twice and window.__shotReady is set by main.js.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { enterNearestCar, updateGame } from './update.js';
import { addWanted } from './WantedSystem.js';
import { spawnGuard } from './CombatSystem.js';
import { writeSave } from './SaveSystem.js';

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
    hp: 200, missionTruck: false,
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
    { x: px - 260, y: py + 130, a: angle },
    { x: px - 320, y: py - 120, a: angle },
    { x: px + 240, y: py + 170, a: angle + Math.PI },
  ];
  for (const s of spots) placePlayerCar(state, 'police', s.x, s.y, s.a, 380);
}

export function stageShot(name, state) {
  const L = state.world.landmarks;
  if (name === 'steal') {
    // On foot beside a red sedan in downtown traffic, peds fleeing, prompt up.
    state.player.x = 1560;
    state.player.y = 1330;
    state.player.angle = -0.4;
    state.cars.push({
      id: 7101, type: 'sedan', x: 1620, y: 1400, angle: 0, speed: 0, targetSpeed: 0,
      color: '#c23b2e', isTraffic: false, isPolice: false, isPlayer: false, hp: 100,
    });
    state.cars.push({
      id: 7102, type: 'taxi', x: 1500, y: 1400, angle: Math.PI, speed: 0, targetSpeed: 0,
      color: '#f5b700', isTraffic: true, isPolice: false, isPlayer: false, hp: 100,
    });
    for (const ped of state.peds.slice(0, 4)) {
      ped.x = 1500 + state.random() * 200;
      ped.y = 1300 + state.random() * 120;
      ped.flee = 2.5;
    }
    state.wanted.level = 1;
    state.interactPrompt = '[E] STEAL CAR';
    simulate(state, 1.2);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Driving east down a downtown avenue at speed, three police cars on the tail,
    // Wanted 4, skid marks behind, a roadblock ahead.
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
      id: 7201, type: 'police', x: 2050, y: 1330, angle: Math.PI / 2, speed: 0, targetSpeed: 0,
      color: '#1d2f45', isTraffic: false, isPolice: true, isPlayer: false, hp: 140, roadblock: true,
    });
    state.cars.push({
      id: 7202, type: 'police', x: 2050, y: 1470, angle: Math.PI / 2, speed: 0, targetSpeed: 0,
      color: '#1d2f45', isTraffic: false, isPolice: true, isPlayer: false, hp: 140, roadblock: true,
    });
    state.wanted.level = 4;
    state.money = 12450;
    simulate(state, 1.0, { axes: { forward: 1, strafe: 0, sprint: false, handbrake: false }, mouse: { x: 900, y: 360, down: false } });
    state.player.car = car;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission passed at the safehouse: banner up, game saved, next marker on the map.
    state.player.x = L.safehouse.x + 40;
    state.player.y = L.safehouse.y + 130;
    state.player.angle = -Math.PI / 2;
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
    return { screen: SCREEN_PLAY };
  }
  // start (default): the title screen over a living city.
  simulate(state, 8);
  return { screen: SCREEN_TITLE };
}
