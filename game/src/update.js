// updateGame (3D): one fixed step of the whole simulation. The simulation still
// runs on the 2D city plane; the 3D layer only presents it. Movement on foot is
// camera-relative: W runs where the camera looks (state.camYaw), D strafes to the
// camera's right, and the player aims along the camera when firing. Driving is
// car-relative and unchanged from the 2D game.

import { PLAYER, VEHICLE_TYPES, WORLD } from './config.js';
import { buildingAt, collideCircle, isInWater } from './WorldMap.js';
import { updateTraffic, nearestTrafficCar } from './TrafficAI.js';
import { updatePedestrians } from './PedestrianAI.js';
import { addWanted, damagePlayer, updateWanted } from './WantedSystem.js';
import { finishReload, fireWeapon, updateBullets, updateGuards, updateParticles, updatePickups } from './CombatSystem.js';
import { updateMissions } from './MissionManager.js';
import { writeSave } from './SaveSystem.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function nearestCarForSteal(state, maxDist = 90) {
  let best = null;
  let bestDist = maxDist;
  for (const car of state.cars) {
    if (car.isPolice || car.isPlayer) continue;
    const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

export function enterNearestCar(state) {
  const car = nearestCarForSteal(state);
  if (!car) return false;
  if (car.isTraffic) {
    car.isTraffic = false;
    car.speed = 0;
    addWanted(state, 1);
    state.stats.steals += 1;
  }
  car.isPlayer = true;
  state.player.car = car;
  state.player.onFoot = false;
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  return true;
}

export function exitCar(state) {
  const car = state.player.car;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  state.player.car = null;
  state.player.onFoot = true;
  state.player.x = car.x - Math.sin(car.angle) * 46;
  state.player.y = car.y + Math.cos(car.angle) * 46;
  state.player.angle = car.angle;
}

export function updateGame(state, input, dt) {
  state.time += dt;
  const player = state.player;
  if (player.fireTimer > 0) player.fireTimer -= dt;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.reloading > 0) {
    player.reloading -= dt;
    if (player.reloading <= 0) finishReload(state);
  }
  if (state.saveNotice > 0) state.saveNotice -= dt;

  const axes = typeof input.axes === 'function' ? input.axes() : input.axes;

  if (player.onFoot) {
    const speed = axes.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    // Camera-relative: forward is where the camera looks, right is the camera's
    // right on the ground plane.
    const fx = Math.cos(state.camYaw);
    const fy = Math.sin(state.camYaw);
    const rx = -Math.sin(state.camYaw);
    const ry = Math.cos(state.camYaw);
    let mx = fx * axes.forward + rx * axes.strafe;
    let my = fy * axes.forward + ry * axes.strafe;
    const ml = Math.hypot(mx, my);
    if (ml > 0.01) {
      mx /= ml;
      my /= ml;
      player.x += mx * speed * dt;
      player.y += my * speed * dt;
      player.angle = Math.atan2(my, mx);
      player.moving = true;
    } else {
      player.moving = false;
    }
    if (input.mouse.down) player.angle = state.camYaw;
    collideCircle(state.world, player, PLAYER.radius);
    if (input.mouse.down) fireWeapon(state);
    for (const car of state.cars) {
      if (!car.isTraffic) continue;
      if (Math.hypot(car.x - player.x, car.y - player.y) < 42 && Math.abs(car.speed) > 40) {
        damagePlayer(state, 18, car);
        car.speed = 0;
      }
    }
  } else if (player.car) {
    const car = player.car;
    const spec = VEHICLE_TYPES[car.type];
    const prevX = car.x;
    const prevY = car.y;
    if (axes.forward !== 0) car.speed += axes.forward * spec.accel * dt;
    else car.speed *= Math.max(0, 1 - 1.4 * dt);
    if (axes.handbrake) {
      car.speed *= Math.max(0, 1 - 3.2 * dt);
      if (Math.abs(car.speed) > 130) {
        state.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 6 });
      }
    }
    car.speed = clamp(car.speed, -spec.topSpeed * 0.45, spec.topSpeed);
    const steerAmount = axes.strafe * spec.grip * dt * Math.min(1, Math.abs(car.speed) / 150);
    car.angle += steerAmount * Math.sign(car.speed || 1);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (buildingAt(state.world, car.x, car.y, 16) || isInWater(state.world, car.x, car.y)) {
      car.x = prevX;
      car.y = prevY;
      car.speed *= -0.25;
    }
    for (const other of state.cars) {
      if (other === car || other.isPlayer) continue;
      const d = Math.hypot(other.x - car.x, other.y - car.y);
      if (d < 56 && d > 0.01) {
        const push = (56 - d) / 2;
        const nx = (other.x - car.x) / d;
        const ny = (other.y - car.y) / d;
        other.x += nx * push;
        other.y += ny * push;
        car.speed *= 0.985;
        if (other.isPolice && Math.abs(car.speed) > 200) damagePlayer(state, 6, other);
      }
    }
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    if (input.mouse.down) fireWeapon(state);
  }

  updateTraffic(state, dt);
  updatePedestrians(state, dt);
  updateWanted(state, dt);
  updateBullets(state, dt);
  updateGuards(state, dt);
  updatePickups(state);
  updateParticles(state, dt);
  updateMissions(state, dt);

  state.camera.x = player.x;
  state.camera.y = player.y;
}

export function interact(state) {
  const player = state.player;
  const L = state.world.landmarks;
  if (player.car) {
    exitCar(state);
    return;
  }
  if (enterNearestCar(state)) return;
  if (Math.hypot(player.x - L.safehouse.x, player.y - L.safehouse.y) < 180) {
    writeSave(state);
    return;
  }
  if (state.missions.index === 2 && state.missions.stage === 'gate'
    && Math.hypot(player.x - L.foundryGate.x, player.y - L.foundryGate.y) < 130) {
    player.interactGate = true;
  }
}

export function refreshInteractPrompt(state) {
  const player = state.player;
  const L = state.world.landmarks;
  state.interactPrompt = '';
  if (player.car) {
    state.interactPrompt = '[E] EXIT CAR';
    return;
  }
  if (nearestCarForSteal(state)) {
    state.interactPrompt = '[E] STEAL CAR';
    return;
  }
  if (Math.hypot(player.x - L.safehouse.x, player.y - L.safehouse.y) < 180) {
    state.interactPrompt = '[E] SAVE GAME';
    return;
  }
  if (state.missions.index === 2 && state.missions.stage === 'gate'
    && Math.hypot(player.x - L.foundryGate.x, player.y - L.foundryGate.y) < 130) {
    state.interactPrompt = '[E] PLANT CHARGE';
  }
}
