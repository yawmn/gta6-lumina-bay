// MissionManager: the three-mission story of IRON BAYOU: RUSTLINE. Missions run in
// order; each has stages with a map marker, an objective line for the HUD, and a
// completion that pays out, shows a MISSION PASSED banner and saves the game. The
// manager only reads and writes the shared state — it never draws anything.

import { MISSIONS } from './config.js';
import { spawnGuard, spawnExplosion } from './CombatSystem.js';
import { addWanted, clearWanted } from './WantedSystem.js';
import { writeSave } from './SaveSystem.js';

export function createMissions() {
  return {
    index: 0,
    stage: 'pier',
    banner: '',
    bannerTimer: 0,
    bannerSub: '',
    killsLeft: 0,
    caseTaken: false,
    gateBlown: false,
    bossSpawned: false,
    allDone: false,
    guardsSpawned: false,
  };
}

function showBanner(missions, text, sub) {
  missions.banner = text;
  missions.bannerSub = sub;
  missions.bannerTimer = 3.2;
}

function completeMission(state) {
  const mission = MISSIONS[state.missions.index];
  state.money += mission.reward;
  showBanner(state.missions, 'MISSION PASSED!', `+$${mission.reward.toLocaleString('en-US')}  ·  ${mission.title}`);
  state.sound.missionPass();
  state.missions.index += 1;
  if (state.missions.index >= MISSIONS.length) {
    state.missions.allDone = true;
    state.missions.stage = 'done';
    showBanner(state.missions, 'CINDERPORT IS YOURS', 'All three missions complete — the city is a free sandbox now.');
  } else {
    state.missions.stage = firstStage(state.missions.index);
    state.missions.guardsSpawned = false;
    state.missions.caseTaken = false;
    state.missions.gateBlown = false;
    state.missions.bossSpawned = false;
  }
  writeSave(state);
}

function firstStage(index) {
  return index === 0 ? 'pier' : index === 1 ? 'yard' : 'gate';
}

function near(state, x, y, dist) {
  const px = state.player.car ? state.player.car.x : state.player.x;
  const py = state.player.car ? state.player.car.y : state.player.y;
  return Math.hypot(px - x, py - y) < dist;
}

export function currentObjective(state) {
  const m = state.missions;
  if (m.allDone) return { text: 'Free roam — Cinderport is yours. Cause trouble or lie low.', x: null, y: null };
  const L = state.world.landmarks;
  if (m.index === 0) {
    if (m.stage === 'pier') return { text: 'Go to PIER 9 and find the syndicate cargo truck', x: L.pier.x, y: L.pier.y };
    if (m.stage === 'steal') return { text: 'Steal the cargo truck — press E next to it', x: L.pier.x, y: L.pier.y };
    return { text: 'Drive the truck to the SAFEHOUSE', x: L.safehouse.x, y: L.safehouse.y };
  }
  if (m.index === 1) {
    if (m.stage === 'yard') return { text: 'Reach the RAIL YARD ambush point', x: L.railYard.x, y: L.railYard.y };
    if (m.stage === 'fight') return { text: `Take out the syndicate guards (${m.killsLeft} left)`, x: L.railYard.x, y: L.railYard.y };
    if (m.stage === 'case') return { text: 'Grab the cash case', x: L.railYard.x, y: L.railYard.y };
    return { text: 'Lose the heat at PAY & SPRAY', x: L.paySpray.x, y: L.paySpray.y };
  }
  if (m.stage === 'gate') return { text: 'Reach the FOUNDRY gate — press E to plant the charge', x: L.foundryGate.x, y: L.foundryGate.y };
  if (m.stage === 'boss') return { text: 'Defeat the IRONCLAD BOSS', x: L.foundry.x + 140, y: L.foundry.y + 100 };
  return { text: 'Take DOWNTOWN to finish the heist', x: L.downtown.x, y: L.downtown.y };
}

export function updateMissions(state, dt) {
  const m = state.missions;
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  if (m.allDone) return;
  const L = state.world.landmarks;
  if (m.index === 0) {
    if (m.stage === 'pier' && near(state, L.pier.x, L.pier.y, 170)) {
      m.stage = 'steal';
      if (!state.cars.some((c) => c.missionTruck)) {
        state.cars.push({
          id: 8001, type: 'truck', x: L.pier.x - 60, y: L.pier.y + 40, angle: 0,
          speed: 0, targetSpeed: 0, color: '#a63a2b',
          isTraffic: false, isPolice: false, isPlayer: false, hp: 200, missionTruck: true,
        });
      }
    } else if (m.stage === 'steal' && state.player.car && state.player.car.missionTruck) {
      m.stage = 'drive';
      addWanted(state, 2);
      showBanner(m, 'TRUCK STOLEN', 'Wanted ★2 — get to the Safehouse');
    } else if (m.stage === 'drive' && near(state, L.safehouse.x, L.safehouse.y, 190)) {
      completeMission(state);
    }
    return;
  }
  if (m.index === 1) {
    if (m.stage === 'yard' && near(state, L.railYard.x, L.railYard.y, 200)) {
      m.stage = 'fight';
      if (!m.guardsSpawned) {
        m.guardsSpawned = true;
        m.killsLeft = 5;
        for (let i = 0; i < 5; i += 1) {
          spawnGuard(state, L.railYard.x - 160 + i * 80, L.railYard.y - 60 + (i % 2) * 120);
        }
      }
    } else if (m.stage === 'fight') {
      const alive = state.guards.filter((g) => g.alive).length;
      m.killsLeft = alive;
      if (m.guardsSpawned && alive === 0) {
        m.stage = 'case';
        state.pickups.push({ kind: 'case', x: L.railYard.x, y: L.railYard.y, value: 2000 });
      }
    } else if (m.stage === 'case' && m.caseTaken) {
      m.stage = 'spray';
      addWanted(state, 3);
      showBanner(m, 'CASH SECURED', 'Wanted ★3 — lose it at Pay & Spray');
    } else if (m.stage === 'spray' && near(state, L.paySpray.x, L.paySpray.y, 170)) {
      clearWanted(state);
      completeMission(state);
    }
    return;
  }
  // Mission 3.
  if (m.stage === 'gate') {
    if (near(state, L.foundryGate.x, L.foundryGate.y, 110) && state.player.interactGate) {
      m.gateBlown = true;
      state.player.interactGate = false;
      spawnExplosion(state, L.foundryGate.x, L.foundryGate.y);
      addWanted(state, 2);
      m.stage = 'boss';
      if (!m.bossSpawned) {
        m.bossSpawned = true;
        spawnGuard(state, L.foundry.x + 140, L.foundry.y + 100, true);
        for (let i = 0; i < 3; i += 1) spawnGuard(state, L.foundry.x + 60 + i * 90, L.foundry.y + 40);
      }
      showBanner(m, 'GATE DOWN', 'The Ironclad boss is coming');
    }
  } else if (m.stage === 'boss') {
    const bossAlive = state.guards.some((g) => g.alive && g.boss);
    const minions = state.guards.filter((g) => g.alive && !g.boss).length;
    if (m.bossSpawned && !bossAlive && minions === 0) {
      m.stage = 'downtown';
    }
  } else if (m.stage === 'downtown' && near(state, L.downtown.x, L.downtown.y, 170)) {
    completeMission(state);
  }
}
