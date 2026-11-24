// CombatSystem: shooting, bullets, syndicate guards and the boss. The player fires
// with the mouse; guards fire back when the player is close. Bullets hit guards,
// cars and pedestrians, sparks fly, wrecked cars explode, and a dead guard drops a
// cash pickup. Everything a bullet can hit is checked in one place.

import { WEAPONS } from './config.js';
import { addWanted, damagePlayer } from './WantedSystem.js';
import { randomRange } from './random.js';

export function spawnGuard(state, x, y, boss = false) {
  const guard = {
    x, y,
    hp: boss ? 340 : 100,
    angle: randomRange(state.random, 0, Math.PI * 2),
    shootTimer: randomRange(state.random, 0.4, 1.2),
    speed: boss ? 95 : 70,
    boss,
    alive: true,
  };
  state.guards.push(guard);
  return guard;
}

export function fireWeapon(state) {
  const player = state.player;
  if (!player.onFoot || player.fireTimer > 0 || player.reloading > 0) return;
  const weapon = WEAPONS[player.weapon];
  const slot = player.weapons[player.weapon];
  if (slot.ammo <= 0) {
    startReload(state);
    return;
  }
  const pellets = weapon.pellets ?? 1;
  for (let i = 0; i < pellets; i += 1) {
    const spread = (state.random() - 0.5) * weapon.spread * 2;
    const a = player.angle + spread;
    state.bullets.push({
      x: player.x + Math.cos(a) * 22,
      y: player.y + Math.sin(a) * 22,
      vx: Math.cos(a) * weapon.bulletSpeed,
      vy: Math.sin(a) * weapon.bulletSpeed,
      damage: weapon.damage,
      fromPlayer: true,
      life: weapon.range / weapon.bulletSpeed,
    });
  }
  slot.ammo -= 1;
  player.fireTimer = weapon.fireRate;
  state.lastShotAt = state.time;
  state.lastCrimeAt = state.time;
  state.stats.shots += 1;
  state.sound.gunshot();
  addWanted(state, 0); // firing alone is noise; hitting someone is the crime
  spawnMuzzle(state, player.x + Math.cos(player.angle) * 26, player.y + Math.sin(player.angle) * 26);
}

export function startReload(state) {
  const player = state.player;
  const weapon = WEAPONS[player.weapon];
  const slot = player.weapons[player.weapon];
  if (slot.ammo >= weapon.mag || slot.reserve <= 0 || player.reloading > 0) return;
  player.reloading = weapon.reload;
}

export function finishReload(state) {
  const player = state.player;
  const weapon = WEAPONS[player.weapon];
  const slot = player.weapons[player.weapon];
  const need = weapon.mag - slot.ammo;
  const take = Math.min(need, slot.reserve);
  slot.ammo += take;
  slot.reserve -= take;
  player.reloading = 0;
}

export function spawnMuzzle(state, x, y) {
  state.particles.push({ x, y, vx: 0, vy: 0, life: 0.08, maxLife: 0.08, color: '#ffd60a', size: 7 });
}

export function spawnExplosion(state, x, y) {
  for (let i = 0; i < 26; i += 1) {
    const a = state.random() * Math.PI * 2;
    const speed = randomRange(state.random, 60, 420);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: randomRange(state.random, 0.3, 0.8),
      maxLife: 0.8,
      color: ['#ff2a3c', '#ffd60a', '#ff7a1a', '#888888'][i % 4],
      size: randomRange(state.random, 3, 9),
    });
  }
  state.sound.explosion();
}

function damageCar(state, car, amount) {
  car.hp -= amount;
  if (car.hp > 0) return;
  spawnExplosion(state, car.x, car.y);
  state.cars = state.cars.filter((c) => c !== car);
  if (car.isPlayer) {
    state.player.car = null;
    state.player.onFoot = true;
    state.player.x = car.x + 40;
    state.player.y = car.y;
  }
  if (car.isTraffic || car.isPolice) addWanted(state, 1);
}

export function updateBullets(state, dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    let hit = false;
    if (bullet.fromPlayer) {
      for (const guard of state.guards) {
        if (!guard.alive) continue;
        if (Math.hypot(guard.x - bullet.x, guard.y - bullet.y) < 20) {
          guard.hp -= bullet.damage;
          hit = true;
          if (guard.hp <= 0) {
            guard.alive = false;
            state.stats.kills += 1;
            state.money += guard.boss ? 1500 : 150;
            state.pickups.push({ kind: 'cash', x: guard.x, y: guard.y, value: guard.boss ? 500 : 100 });
            spawnExplosion(state, guard.x, guard.y);
          }
          break;
        }
      }
      if (!hit) {
        for (const car of state.cars) {
          if (car.isPlayer) continue;
          const dx = bullet.x - car.x;
          const dy = bullet.y - car.y;
          const along = Math.abs(dx * Math.cos(car.angle) + dy * Math.sin(car.angle));
          const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
          if (along < 52 && side < 24) {
            damageCar(state, car, bullet.damage);
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const ped of state.peds) {
          if (!ped.alive) continue;
          if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < 14) {
            ped.alive = false;
            state.lastCrimeAt = state.time;
            addWanted(state, 1);
            hit = true;
            break;
          }
        }
      }
    } else {
      const player = state.player;
      const target = player.car ?? player;
      if (Math.hypot(target.x - bullet.x, target.y - bullet.y) < (player.car ? 40 : 16)) {
        // Guard bullets hurt the player (or the car, via the player).
        damagePlayer(state, bullet.damage, null);
        hit = true;
      }
    }
    if (hit) bullet.life = 0;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.guards = state.guards.filter((g) => g.alive);
}

export function updateGuards(state, dt) {
  const player = state.player;
  for (const guard of state.guards) {
    if (!guard.alive) continue;
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    guard.angle = Math.atan2(dy, dx);
    if (dist < 460) {
      guard.shootTimer -= dt;
      if (guard.shootTimer <= 0) {
        guard.shootTimer = guard.boss ? 0.55 : 1.1;
        const spread = (state.random() - 0.5) * 0.14;
        const a = guard.angle + spread;
        state.bullets.push({
          x: guard.x + Math.cos(a) * 20,
          y: guard.y + Math.sin(a) * 20,
          vx: Math.cos(a) * 620,
          vy: Math.sin(a) * 620,
          damage: guard.boss ? 14 : 8,
          fromPlayer: false,
          life: 1.1,
        });
        state.lastShotAt = state.time;
      }
      if (dist > 260) {
        guard.x += Math.cos(guard.angle) * guard.speed * dt;
        guard.y += Math.sin(guard.angle) * guard.speed * dt;
      }
    } else if (dist > 500) {
      // Drift back toward the post they guard.
      guard.x += Math.cos(guard.angle) * guard.speed * 0.4 * dt;
      guard.y += Math.sin(guard.angle) * guard.speed * 0.4 * dt;
    }
  }
}

export function updatePickups(state) {
  const player = state.player;
  for (const pickup of state.pickups) {
    if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < 34) {
      pickup.taken = true;
      state.money += pickup.value;
      state.sound.pickup();
      if (pickup.kind === 'case') state.missions.caseTaken = true;
      if (pickup.kind === 'armor') player.armor = Math.min(100, player.armor + 50);
      if (pickup.kind === 'health') player.hp = Math.min(100, player.hp + 40);
    }
  }
  state.pickups = state.pickups.filter((p) => !p.taken);
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const s of state.skids) s.life -= dt;
  state.skids = state.skids.filter((s) => s.life > 0);
}
