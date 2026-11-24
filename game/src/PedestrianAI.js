// PedestrianAI: the people on Cinderport's sidewalks. They stroll along the roads,
// turn at intersections, and sprint away from gunfire and from a car bearing down on
// them. A pedestrian hit by a bullet or a car counts as a crime the police notice.

import { WORLD } from './config.js';
import { AVENUES, ROAD_WIDTH, STREETS } from './WorldMap.js';
import { randomPick, randomRange } from './random.js';

const SHIRT_COLORS = ['#d8b25a', '#7fb069', '#c65b7c', '#5b8dc6', '#e07a3f', '#9b7ede', '#e8e8e8', '#3f8f7a'];

export function spawnPedestrians(random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const avenue = randomPick(random, AVENUES);
    const street = randomPick(random, STREETS);
    const onAvenue = random() < 0.5;
    peds.push({
      x: onAvenue ? avenue + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + 14) : randomRange(random, 120, WORLD.width - 120),
      y: onAvenue ? randomRange(random, 120, WORLD.height - 120) : street + (random() < 0.5 ? -1 : 1) * (ROAD_WIDTH / 2 + 14),
      angle: randomRange(random, 0, Math.PI * 2),
      speed: randomRange(random, 45, 80),
      color: randomPick(random, SHIRT_COLORS),
      flee: 0,
      alive: true,
      axis: onAvenue ? 'v' : 'h',
      dir: random() < 0.5 ? 1 : -1,
    });
  }
  return peds;
}

export function updatePedestrians(state, dt) {
  const player = state.player;
  const scared = state.time - state.lastShotAt < 2.5;
  for (const ped of state.peds) {
    if (!ped.alive) continue;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    const dist = Math.hypot(dx, dy);
    const carNear = state.player.car && Math.hypot(ped.x - state.player.car.x, ped.y - state.player.car.y) < 90;
    if ((scared && dist < 380) || carNear) ped.flee = 2.5;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const away = Math.atan2(dy, dx);
      ped.angle = away;
      ped.x += Math.cos(away) * 260 * dt;
      ped.y += Math.sin(away) * 260 * dt;
    } else {
      // Stroll along the sidewalk; turn at an intersection now and then.
      if (ped.axis === 'v') {
        ped.y += ped.dir * ped.speed * dt;
        if (state.random() < dt * 0.05) {
          ped.axis = 'h';
          ped.dir = state.random() < 0.5 ? 1 : -1;
        }
      } else {
        ped.x += ped.dir * ped.speed * dt;
        if (state.random() < dt * 0.05) {
          ped.axis = 'v';
          ped.dir = state.random() < 0.5 ? 1 : -1;
        }
      }
      if (ped.x < 60 || ped.x > WORLD.width - 60) ped.dir *= -1;
      if (ped.y < 60 || ped.y > WORLD.height - 60) ped.dir *= -1;
    }
    ped.x = Math.max(30, Math.min(WORLD.width - 30, ped.x));
    ped.y = Math.max(30, Math.min(WORLD.height - 30, ped.y));
  }
  state.peds = state.peds.filter((p) => p.alive);
  while (state.peds.length < 22) {
    state.peds.push(...spawnPedestrians(state.random, 1));
  }
}
