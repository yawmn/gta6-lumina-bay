// WantedSystem: the heat. Stealing a car, shooting, or hurting a pedestrian raises
// the wanted level (0–5 stars); police cars spawn and chase the player, ramming the
// player's car or running the player down on foot. At 4 stars a roadblock is thrown
// across the road ahead. Lie low — no crimes, no police nearby — and the heat cools
// one star at a time. Pay & Spray clears it in one visit.

import { VEHICLE_TYPES } from './config.js';
import { randomRoadPoint } from './WorldMap.js';
import { randomRange } from './random.js';

export function addWanted(state, amount) {
  state.wanted.level = Math.max(0, Math.min(5, state.wanted.level + amount));
  state.wanted.quietTimer = 0;
  state.wanted.roadblockDone = state.wanted.level < 4 ? false : state.wanted.roadblockDone;
}

export function clearWanted(state) {
  state.wanted.level = 0;
  state.wanted.quietTimer = 0;
  for (const car of state.cars) {
    if (car.isPolice) car.leaving = true;
  }
}

function spawnPoliceCar(state) {
  const point = randomRoadPoint(state.random);
  // Spawn on a road a good distance from the player so the sirens arrive, not appear.
  const dx = point.x - state.player.x;
  const dy = point.y - state.player.y;
  if (Math.hypot(dx, dy) < 500) {
    point.x = state.player.x + (dx >= 0 ? 750 : -750);
    point.y = state.player.y + (dy >= 0 ? 500 : -500);
  }
  const spec = VEHICLE_TYPES.police;
  state.cars.push({
    id: 9000 + state.cars.length,
    type: 'police',
    x: Math.max(60, Math.min(3140, point.x)),
    y: Math.max(60, Math.min(2340, point.y)),
    angle: 0,
    speed: 0,
    targetSpeed: spec.topSpeed,
    color: spec.colors[0],
    isTraffic: false,
    isPolice: true,
    isPlayer: false,
    hp: 140,
    leaving: false,
  });
}

function spawnRoadblock(state) {
  const px = state.player.x;
  const py = state.player.y;
  const ahead = state.player.car ? state.player.car.angle : state.player.angle;
  for (const offset of [-70, 70]) {
    state.cars.push({
      id: 9500 + state.cars.length,
      type: 'police',
      x: px + Math.cos(ahead) * 420 - Math.sin(ahead) * offset,
      y: py + Math.sin(ahead) * 420 + Math.cos(ahead) * offset,
      angle: ahead + Math.PI / 2,
      speed: 0,
      targetSpeed: 0,
      color: VEHICLE_TYPES.police.colors[0],
      isTraffic: false,
      isPolice: true,
      isPlayer: false,
      hp: 140,
      roadblock: true,
      leaving: false,
    });
  }
  state.wanted.roadblockDone = true;
}

export function updateWanted(state, dt) {
  const wanted = state.wanted;
  const player = state.player;
  // Cool down when quiet: no crime recently and no police close by.
  const policeNear = state.cars.some((c) => c.isPolice && Math.hypot(c.x - player.x, c.y - player.y) < 500);
  if (wanted.level > 0 && !policeNear && state.time - state.lastCrimeAt > 8) {
    wanted.quietTimer += dt;
    if (wanted.quietTimer > 25) {
      wanted.level -= 1;
      wanted.quietTimer = 0;
    }
  } else {
    wanted.quietTimer = 0;
  }
  // Keep the right number of pursuit cars on the road.
  const wantPolice = wanted.level === 0 ? 0 : Math.min(wanted.level + 1, 4);
  const active = state.cars.filter((c) => c.isPolice && !c.leaving && !c.roadblock);
  if (active.length < wantPolice) spawnPoliceCar(state);
  if (wanted.level >= 4 && !wanted.roadblockDone) spawnRoadblock(state);
  // Chase: steer at the player, ram the player's car, run the player down on foot.
  for (const car of state.cars) {
    if (!car.isPolice || car.roadblock) continue;
    if (car.leaving) {
      car.speed = Math.max(0, car.speed - 200 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      continue;
    }
    const targetX = player.car ? player.car.x : player.x;
    const targetY = player.car ? player.car.y : player.y;
    const wantAngle = Math.atan2(targetY - car.y, targetX - car.x);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    const dist = Math.hypot(targetX - car.x, targetY - car.y);
    const spec = VEHICLE_TYPES.police;
    const wantSpeed = dist < 60 ? 0 : spec.topSpeed;
    car.speed += Math.sign(wantSpeed - car.speed) * spec.accel * dt;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ram: hitting the player hurts, on foot or in a car.
    if (dist < 52 && player.invuln <= 0) {
      damagePlayer(state, player.car ? 12 : 22, car);
    }
  }
  // Leaving police drive off and are removed once far away.
  state.cars = state.cars.filter((c) => {
    if (c.isPolice && c.leaving && Math.hypot(c.x - player.x, c.y - player.y) > 1100) return false;
    return true;
  });
}

export function damagePlayer(state, amount, source) {
  const player = state.player;
  if (player.invuln > 0) return;
  player.invuln = 0.6;
  let left = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, left);
    player.armor -= absorbed;
    left -= absorbed;
  }
  player.hp -= left;
  if (source) {
    const dx = player.x - source.x;
    const dy = player.y - source.y;
    const d = Math.hypot(dx, dy) || 1;
    player.x += (dx / d) * 14;
    player.y += (dy / d) * 14;
  }
  if (player.hp <= 0) {
    player.hp = 0;
    state.gameOver = true;
  }
}
