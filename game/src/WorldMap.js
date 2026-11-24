// WorldMap: the city of Cinderport, generated once from a seed. A grid of avenues and
// streets, blocks of industrial buildings between them, a rail line, the pier and its
// water, the bayou along the south edge, and the mission landmarks (safehouse, Pay &
// Spray, foundry, pier, rail yard, downtown). Everything else in the game asks this
// module where the roads, the buildings and the districts are.

import { DISTRICTS, PALETTE, WORLD } from './config.js';
import { randomPick, randomRange } from './random.js';

export const ROAD_WIDTH = 150;
export const AVENUES = [400, 1000, 1600, 2200, 2800];
export const STREETS = [400, 900, 1400, 1900];
export const RAIL_Y = 1150;

const ROOF_COLORS = [PALETTE.rust, PALETTE.steelBlue, PALETTE.swampGreen, '#6b4a2f', '#54606e', '#7d2f24'];

export function buildWorldMap(random) {
  const buildings = [];
  const containers = [];
  // One building (or a pair) per city block, kept off the roads and off the landmarks.
  const keepOut = [
    { x: 2250, y: 1500, w: 420, h: 380 }, // foundry
    { x: 380, y: 1580, w: 320, h: 300 }, // safehouse block
    { x: 1450, y: 180, w: 320, h: 260 }, // pay & spray block
    { x: 2700, y: 150, w: 500, h: 500 }, // pier
    { x: 900, y: 1000, w: 1400, h: 220 }, // rail yard
  ];
  // City blocks sit strictly BETWEEN the roads: each block starts just past one
  // road's far edge and ends just before the next road's near edge, so no
  // building ever overlaps a road (roads are 150 wide, centred on the avenues
  // and streets). Starts are road centre + 75; ends are next road centre - 75.
  const blocksX = [0, 475, 1075, 1675, 2275, 2875];
  const endsX = [325, 925, 1525, 2125, 2725, 3200];
  const blocksY = [0, 475, 975, 1475, 1975];
  const endsY = [325, 825, 1325, 1825, 2400];
  for (let bx = 0; bx < blocksX.length; bx += 1) {
    for (let by = 0; by < blocksY.length; by += 1) {
      const x0 = blocksX[bx] + 30;
      const y0 = blocksY[by] + 30;
      const w0 = endsX[bx] - blocksX[bx] - 60;
      const h0 = endsY[by] - blocksY[by] - 60;
      if (w0 < 90 || h0 < 90) continue;
      const count = random() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const w = randomRange(random, 90, Math.max(100, w0 / count - 20));
        const h = randomRange(random, 80, Math.max(90, h0 - 20));
        const x = x0 + (count === 1 ? (w0 - w) / 2 : i * (w0 / count) + 10);
        const y = y0 + randomRange(random, 0, Math.max(1, h0 - h));
        const rect = { x, y, w, h, roof: randomPick(random, ROOF_COLORS) };
        if (keepOut.some((k) => rect.x < k.x + k.w && rect.x + rect.w > k.x && rect.y < k.y + k.h && rect.y + rect.h > k.y)) continue;
        if (rect.y + rect.h > 2180) continue; // keep the bayou clear
        buildings.push(rect);
      }
    }
  }
  // Shipping containers stacked near the pier and the rail yard.
  for (let i = 0; i < 26; i += 1) {
    containers.push({
      x: randomRange(random, 2720, 3000),
      y: randomRange(random, 180, 700),
      w: 74, h: 30,
      color: randomPick(random, [PALETTE.rust, PALETTE.steelBlue, PALETTE.hazard, '#8a8f96']),
    });
  }
  for (let i = 0; i < 14; i += 1) {
    containers.push({
      x: randomRange(random, 950, 2300),
      y: randomRange(random, 1010, 1260),
      w: 74, h: 30,
      color: randomPick(random, [PALETTE.rust, PALETTE.steelBlue, '#8a8f96']),
    });
  }
  return {
    buildings,
    containers,
    water: { x: 3050, y: 0, w: 150, h: 820 },
    bayou: { x: 0, y: 2200, w: WORLD.width, h: 200 },
    railY: RAIL_Y,
    landmarks: {
      safehouse: { x: 520, y: 1720, w: 130, h: 100 },
      paySpray: { x: 1620, y: 320, w: 140, h: 90 },
      foundry: { x: 2380, y: 1620, w: 280, h: 200 },
      foundryGate: { x: 2380, y: 1580, w: 90, h: 40 },
      pier: { x: 2920, y: 520 },
      railYard: { x: 1600, y: 1150 },
      downtown: { x: 1600, y: 1400 },
      start: { x: 1000, y: 1400 },
    },
  };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return 'SLAGTOWN';
}

export function isOnRoad(x, y) {
  if (AVENUES.some((ax) => Math.abs(x - ax) < ROAD_WIDTH / 2)) return true;
  if (STREETS.some((sy) => Math.abs(y - sy) < ROAD_WIDTH / 2)) return true;
  return false;
}

export function isInWater(world, x, y) {
  return (x >= world.water.x && x < world.water.x + world.water.w && y >= world.water.y && y < world.water.y + world.water.h)
    || (y >= world.bayou.y && x >= world.bayou.x && x < world.bayou.x + world.bayou.w);
}

export function buildingAt(world, x, y, pad = 0) {
  for (const b of world.buildings) {
    if (x >= b.x - pad && x < b.x + b.w + pad && y >= b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

/** Push a circle out of buildings and water; returns true when a wall was hit. */
export function collideCircle(world, entity, radius) {
  let hit = false;
  const b = buildingAt(world, entity.x, entity.y, radius);
  if (b) {
    const cx = Math.max(b.x, Math.min(entity.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(entity.y, b.y + b.h));
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    if (d < radius) {
      entity.x = cx + (dx / d) * radius;
      entity.y = cy + (dy / d) * radius;
      hit = true;
    }
  }
  if (isInWater(world, entity.x, entity.y)) {
    entity.x = Math.min(entity.x, world.water.x - radius);
    hit = true;
  }
  entity.x = Math.max(radius, Math.min(WORLD.width - radius, entity.x));
  entity.y = Math.max(radius, Math.min(WORLD.height - radius, entity.y));
  return hit;
}

export function randomRoadPoint(random) {
  if (random() < 0.5) {
    return { x: AVENUES[Math.floor(random() * AVENUES.length)] + (random() < 0.5 ? -35 : 35), y: randomRange(random, 100, WORLD.height - 100), axis: 'v' };
  }
  return { x: randomRange(random, 100, WORLD.width - 100), y: STREETS[Math.floor(random() * STREETS.length)] + (random() < 0.5 ? -35 : 35), axis: 'h' };
}
