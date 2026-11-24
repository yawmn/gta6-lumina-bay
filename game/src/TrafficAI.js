// TrafficAI: the cars that fill Cinderport's roads. Each traffic car owns one road
// (an avenue or a street), a lane and a direction, and drives along it. At an
// intersection it may turn onto the crossing road; when something is ahead of it —
// another car, or the player on foot — it slows or stops. Cars that leave the city
// wrap around to the far side as a different vehicle, so the streets never empty.

import { VEHICLE_TYPES, WORLD } from './config.js';
import { AVENUES, ROAD_WIDTH, STREETS, randomRoadPoint } from './WorldMap.js';
import { randomPick, randomRange } from './random.js';

const TRAFFIC_TYPES = ['sedan', 'sedan', 'sedan', 'taxi', 'taxi', 'truck'];

let nextCarId = 1;

export function makeTrafficCar(random, point) {
  const type = randomPick(random, TRAFFIC_TYPES);
  const spec = VEHICLE_TYPES[type];
  return {
    id: nextCarId,
    type,
    x: point.x,
    y: point.y,
    angle: point.axis === 'v' ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI),
    speed: 0,
    targetSpeed: randomRange(random, 120, 220),
    color: randomPick(random, spec.colors),
    isTraffic: true,
    isPolice: false,
    isPlayer: false,
    hp: 100,
    axis: point.axis,
    lane: point.axis === 'v' ? point.x : point.y,
    dir: 1,
    stuckTimer: 0,
  };
}

export function spawnTraffic(random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    cars.push(makeTrafficCar(random, randomRoadPoint(random)));
  }
  return cars;
}

function aheadBlocked(car, cars, player) {
  const look = 90;
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  for (const other of cars) {
    if (other === car || other.isPolice) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < look && side < 40) return true;
  }
  if (player.onFoot) {
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const along = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < look && side < 34) return true;
  }
  return false;
}

export function updateTraffic(state, dt) {
  const random = state.random;
  for (const car of state.cars) {
    if (!car.isTraffic) continue;
    const spec = VEHICLE_TYPES[car.type];
    // Maybe turn at an intersection: snap onto the crossing road.
    const onAvenue = AVENUES.some((ax) => Math.abs(car.x - ax) < 12);
    const onStreet = STREETS.some((sy) => Math.abs(car.y - sy) < 12);
    if (onAvenue && onStreet && random() < dt * 0.25) {
      if (car.axis === 'v') {
        car.axis = 'h';
        car.y = STREETS.reduce((best, sy) => (Math.abs(sy - car.y) < Math.abs(best - car.y) ? sy : best), STREETS[0]);
        car.angle = random() < 0.5 ? 0 : Math.PI;
      } else {
        car.axis = 'v';
        car.x = AVENUES.reduce((best, ax) => (Math.abs(ax - car.x) < Math.abs(best - car.x) ? ax : best), AVENUES[0]);
        car.angle = random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    const blocked = aheadBlocked(car, state.cars, state.player);
    const want = blocked ? 0 : car.targetSpeed;
    car.speed += Math.sign(want - car.speed) * spec.accel * dt;
    if (Math.abs(car.speed - want) < 4) car.speed = want;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the far edge as a fresh vehicle so traffic never runs out.
    if (car.x < -120 || car.x > WORLD.width + 120 || car.y < -120 || car.y > WORLD.height + 120) {
      const fresh = makeTrafficCar(random, randomRoadPoint(random));
      fresh.id = car.id;
      Object.assign(car, fresh);
    }
  }
  // Keep the streets busy: top the traffic back up if cars were stolen or wrecked.
  const trafficCount = state.cars.filter((c) => c.isTraffic).length;
  if (trafficCount < 14) {
    const extra = spawnTraffic(random, 14 - trafficCount);
    for (const car of extra) state.cars.push(car);
  }
}

export function nearestTrafficCar(state, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of state.cars) {
    if (!car.isTraffic) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}
