// Rendering only: the game state and the current screen in, pixels out. The canvas
// is a fixed 1280x720 logical view; a camera follows the player through the 3200x2400
// city. Everything is drawn with plain canvas shapes — buildings with hard drop
// shadows, cars with sirens and skid marks, the HUD with money, health, wanted stars,
// weapon and a minimap. No images, no network.

import { FONT, PALETTE, RADIO_STATION, VEHICLE_TYPES, VIEW, WEAPONS, WORLD } from './config.js';
import { AVENUES, ROAD_WIDTH, STREETS } from './WorldMap.js';
import { currentObjective } from './MissionManager.js';
import { districtAt } from './WorldMap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const MINIMAP = { x: 16, y: VIEW.height - 166, w: 200, h: 150 };

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const fonts = new Map();

  function text(value, x, y, size, color, align = 'left', bold = false) {
    const key = `${size}-${bold}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  function drawGround(state, cam) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const bayou = state.world.bayou;
    ctx.fillStyle = PALETTE.swamp;
    ctx.fillRect(bayou.x - cam.x, bayou.y - cam.y, bayou.w, bayou.h);
    const water = state.world.water;
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(water.x - cam.x, water.y - cam.y, water.w, water.h);
    ctx.strokeStyle = 'rgba(120, 180, 220, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(water.x - cam.x + 20, water.y - cam.y + 90 + i * 140);
      ctx.lineTo(water.x - cam.x + water.w - 20, water.y - cam.y + 90 + i * 140);
      ctx.stroke();
    }
    // Roads.
    for (const ax of AVENUES) {
      ctx.fillStyle = PALETTE.asphalt;
      ctx.fillRect(ax - ROAD_WIDTH / 2 - cam.x, -cam.y, ROAD_WIDTH, WORLD.height);
    }
    for (const sy of STREETS) {
      ctx.fillStyle = PALETTE.asphalt;
      ctx.fillRect(-cam.x, sy - ROAD_WIDTH / 2 - cam.y, WORLD.width, ROAD_WIDTH);
    }
    // Centre dashes: yellow on avenues, white on streets.
    ctx.fillStyle = PALETTE.laneYellow;
    for (const ax of AVENUES) {
      for (let y = 0; y < WORLD.height; y += 64) ctx.fillRect(ax - 3 - cam.x, y - cam.y, 6, 34);
    }
    ctx.fillStyle = PALETTE.laneWhite;
    for (const sy of STREETS) {
      for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x - cam.x, sy - 3 - cam.y, 34, 6);
    }
    // Rail line with ties.
    const railY = state.world.railY;
    ctx.fillStyle = '#101216';
    ctx.fillRect(-cam.x, railY - 14 - cam.y, WORLD.width, 28);
    ctx.fillStyle = '#6b5a3a';
    for (let x = 0; x < WORLD.width; x += 46) ctx.fillRect(x - cam.x, railY - 10 - cam.y, 22, 20);
    ctx.fillStyle = '#c8ccd4';
    ctx.fillRect(-cam.x, railY - 8 - cam.y, WORLD.width, 3);
    ctx.fillRect(-cam.x, railY + 5 - cam.y, WORLD.width, 3);
    // Buildings with hard shadows and roof detail.
    for (const b of state.world.buildings) {
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(b.x + 8 - cam.x, b.y + 10 - cam.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(b.x + 8 - cam.x, b.y + 8 - cam.y, b.w - 16, 10);
    }
    // Containers.
    for (const c of state.world.containers) {
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(c.x + 4 - cam.x, c.y + 5 - cam.y, c.w, c.h);
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x - cam.x, c.y - cam.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeRect(c.x - cam.x, c.y - cam.y, c.w, c.h);
    }
    // Landmarks: safehouse, Pay & Spray, foundry with smokestacks, pier planks.
    const L = state.world.landmarks;
    drawLandmark(state, cam, L.safehouse.x, L.safehouse.y, L.safehouse.w, L.safehouse.h, '#2d4a3e', 'SAFEHOUSE');
    drawLandmark(state, cam, L.paySpray.x, L.paySpray.y, L.paySpray.w, L.paySpray.h, '#2b5b84', 'PAY & SPRAY');
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(L.foundry.x + 8 - cam.x, L.foundry.y + 10 - cam.y, L.foundry.w, L.foundry.h);
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(L.foundry.x - cam.x, L.foundry.y - cam.y, L.foundry.w, L.foundry.h);
    ctx.fillStyle = '#5a3a32';
    ctx.fillRect(L.foundry.x + 20 - cam.x, L.foundry.y - 46 - cam.y, 22, 50);
    ctx.fillRect(L.foundry.x + 60 - cam.x, L.foundry.y - 46 - cam.y, 22, 50);
    ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.beginPath();
    ctx.arc(L.foundry.x + 31 - cam.x, L.foundry.y - 58 - cam.y, 16, 0, Math.PI * 2);
    ctx.fill();
    text('FOUNDRY', L.foundry.x + L.foundry.w / 2 - cam.x, L.foundry.y + L.foundry.h / 2 - cam.y, 20, PALETTE.text, 'center', true);
    if (!state.missions.gateBlown) {
      ctx.fillStyle = PALETTE.hazard;
      ctx.fillRect(L.foundryGate.x - cam.x, L.foundryGate.y - cam.y, L.foundryGate.w, L.foundryGate.h);
      ctx.fillStyle = '#111';
      text('GATE', L.foundryGate.x + 45 - cam.x, L.foundryGate.y + 27 - cam.y, 15, '#111', 'center', true);
    }
    // Pier planks over the water.
    ctx.fillStyle = '#6b5a3a';
    ctx.fillRect(2980 - cam.x, 300 - cam.y, 120, 420);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    for (let y = 300; y < 720; y += 42) {
      ctx.beginPath();
      ctx.moveTo(2980 - cam.x, y - cam.y);
      ctx.lineTo(3100 - cam.x, y - cam.y);
      ctx.stroke();
    }
  }

  function drawLandmark(state, cam, x, y, w, h, color, label) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(x + 8 - cam.x, y + 10 - cam.y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x - cam.x, y - cam.y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - cam.x, y - cam.y, w, h);
    text(label, x + w / 2 - cam.x, y + h / 2 + 6 - cam.y, 15, PALETTE.text, 'center', true);
  }

  function drawCar(car, cam, time) {
    const spec = VEHICLE_TYPES[car.type];
    const x = car.x - cam.x;
    const y = car.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(-spec.w / 2 + 5, -spec.h / 2 + 7, spec.w, spec.h);
    ctx.fillStyle = car.color;
    ctx.fillRect(-spec.w / 2, -spec.h / 2, spec.w, spec.h);
    ctx.fillStyle = 'rgba(20, 30, 40, 0.85)';
    if (car.type === 'truck') {
      ctx.fillRect(spec.w / 2 - 26, -spec.h / 2 + 4, 20, spec.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(-spec.w / 2 + 6, -spec.h / 2 + 4, spec.w - 40, spec.h - 8);
    } else {
      ctx.fillRect(-spec.w / 2 + 12, -spec.h / 2 + 5, 18, spec.h - 10);
      ctx.fillRect(spec.w / 2 - 26, -spec.h / 2 + 5, 16, spec.h - 10);
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(spec.w / 2 - 2, -spec.h / 2 + 4, 3, 6);
    ctx.fillRect(spec.w / 2 - 2, spec.h / 2 - 10, 3, 6);
    if (car.isPolice) {
      const phase = Math.floor(time * 6) % 2 === 0;
      ctx.fillStyle = phase ? PALETTE.sirenRed : PALETTE.policeBlue;
      ctx.fillRect(-8, -spec.h / 2 - 2, 16, 7);
      ctx.fillStyle = phase ? PALETTE.policeBlue : PALETTE.sirenRed;
      ctx.fillRect(-8, spec.h / 2 - 5, 16, 7);
      text('POLICE', 0, -spec.h / 2 - 8, 11, '#ffffff', 'center', true);
    }
    if (car.isPlayer) {
      ctx.strokeStyle = PALETTE.hazard;
      ctx.lineWidth = 3;
      ctx.strokeRect(-spec.w / 2 - 4, -spec.h / 2 - 4, spec.w + 8, spec.h + 8);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, cam, gun) {
    const px = x - cam.x;
    const py = y - cam.y;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath();
    ctx.ellipse(px + 3, py + 4, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(px, py - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    if (gun) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle) * 22, py + Math.sin(angle) * 22);
      ctx.stroke();
    }
  }

  function drawMinimap(state) {
    const sx = MINIMAP.w / WORLD.width;
    const sy = MINIMAP.h / WORLD.height;
    panel(MINIMAP.x - 6, MINIMAP.y - 6, MINIMAP.w + 12, MINIMAP.h + 26);
    ctx.fillStyle = '#141a12';
    ctx.fillRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h);
    ctx.strokeStyle = '#3a4150';
    ctx.lineWidth = 1;
    for (const ax of AVENUES) {
      ctx.beginPath();
      ctx.moveTo(MINIMAP.x + ax * sx, MINIMAP.y);
      ctx.lineTo(MINIMAP.x + ax * sx, MINIMAP.y + MINIMAP.h);
      ctx.stroke();
    }
    for (const sy2 of STREETS) {
      ctx.beginPath();
      ctx.moveTo(MINIMAP.x, MINIMAP.y + sy2 * sy);
      ctx.lineTo(MINIMAP.x + MINIMAP.w, MINIMAP.y + sy2 * sy);
      ctx.stroke();
    }
    const obj = currentObjective(state);
    if (obj.x !== null) {
      ctx.fillStyle = PALETTE.hazard;
      ctx.beginPath();
      ctx.arc(MINIMAP.x + obj.x * sx, MINIMAP.y + obj.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    const L = state.world.landmarks;
    ctx.fillStyle = '#2ec4b6';
    ctx.fillRect(MINIMAP.x + L.safehouse.x * sx - 2, MINIMAP.y + L.safehouse.y * sy - 2, 4, 4);
    for (const car of state.cars) {
      if (!car.isPolice) continue;
      ctx.fillStyle = Math.floor(state.time * 6) % 2 === 0 ? PALETTE.sirenRed : PALETTE.policeBlue;
      ctx.beginPath();
      ctx.arc(MINIMAP.x + car.x * sx, MINIMAP.y + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const px = state.player.car ? state.player.car.x : state.player.x;
    const py = state.player.car ? state.player.car.y : state.player.y;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(MINIMAP.x + px * sx, MINIMAP.y + py * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
    text(districtAt(px, py), MINIMAP.x + MINIMAP.w / 2, MINIMAP.y + MINIMAP.h + 16, 13, PALETTE.text, 'center', true);
  }

  function drawHud(state) {
    // Top-left: money and district.
    panel(16, 14, 250, 62);
    text(`$${Math.floor(state.money).toLocaleString('en-US')}`, 30, 40, 26, PALETTE.money, 'left', true);
    text(districtAt(state.player.x, state.player.y), 30, 62, 14, PALETTE.muted, 'left', true);
    // Top-right: wanted stars, HP and armor.
    panel(VIEW.width - 266, 14, 250, 76);
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < state.wanted.level ? '★' : '☆';
    text(stars, VIEW.width - 30, 42, 26, state.wanted.level > 0 ? PALETTE.sirenRed : PALETTE.muted, 'right', true);
    ctx.fillStyle = '#333';
    ctx.fillRect(VIEW.width - 250, 52, 220, 10);
    ctx.fillStyle = state.player.hp > 30 ? '#3fae5a' : PALETTE.sirenRed;
    ctx.fillRect(VIEW.width - 250, 52, 220 * (state.player.hp / 100), 10);
    ctx.fillStyle = '#333';
    ctx.fillRect(VIEW.width - 250, 68, 220, 8);
    ctx.fillStyle = PALETTE.policeBlue;
    ctx.fillRect(VIEW.width - 250, 68, 220 * (state.player.armor / 100), 8);
    text('HP', VIEW.width - 256, 61, 10, PALETTE.text, 'right');
    // Top-centre: mission objective.
    const obj = currentObjective(state);
    const missionTitle = state.missions.allDone ? 'FREE ROAM' : `MISSION ${state.missions.index + 1} / 3`;
    panel(VIEW.width / 2 - 330, 14, 660, 56);
    text(missionTitle, VIEW.width / 2, 36, 15, PALETTE.hazard, 'center', true);
    text(obj.text, VIEW.width / 2, 60, 17, PALETTE.text, 'center');
    // Radio line while driving.
    if (state.player.car) {
      text(`RADIO  ${RADIO_STATION}`, VIEW.width / 2, 92, 14, PALETTE.muted, 'center', true);
    }
    // Bottom-right: weapon and controls.
    const weapon = WEAPONS[state.player.weapon];
    const slot = state.player.weapons[state.player.weapon];
    panel(VIEW.width - 266, VIEW.height - 92, 250, 76);
    const reloadText = state.player.reloading > 0 ? 'RELOADING…' : `${slot.ammo} / ${slot.reserve}`;
    text(weapon.name, VIEW.width - 250, VIEW.height - 62, 20, PALETTE.text, 'left', true);
    text(reloadText, VIEW.width - 30, VIEW.height - 62, 20, PALETTE.hazard, 'right', true);
    text(state.player.car ? 'W/S drive · A/D steer · SPACE brake · E exit' : 'WASD move · MOUSE aim · CLICK shoot · E steal car · R reload', VIEW.width - 250, VIEW.height - 34, 12, PALETTE.muted, 'left');
    // Interact prompt.
    if (state.interactPrompt) {
      panel(VIEW.width / 2 - 150, VIEW.height - 150, 300, 44);
      text(state.interactPrompt, VIEW.width / 2, VIEW.height - 121, 20, PALETTE.hazard, 'center', true);
    }
    // Mission banner.
    if (state.missions.bannerTimer > 0) {
      const alpha = Math.min(1, state.missions.bannerTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      panel(VIEW.width / 2 - 320, 200, 640, 96);
      text(state.missions.banner, VIEW.width / 2, 248, 40, PALETTE.hazard, 'center', true);
      text(state.missions.bannerSub, VIEW.width / 2, 278, 18, PALETTE.text, 'center');
      ctx.restore();
    }
    // Save notice.
    if (state.saveNotice > 0) {
      panel(VIEW.width - 266, 100, 250, 36);
      text('✓ GAME SAVED', VIEW.width - 141, 124, 17, PALETTE.money, 'center', true);
    }
    drawMinimap(state);
  }

  function drawTitle(state) {
    panel(VIEW.width / 2 - 380, 130, 760, 460);
    text('IRON BAYOU', VIEW.width / 2, 230, 64, PALETTE.hazard, 'center', true);
    text('RUSTLINE', VIEW.width / 2, 292, 64, PALETTE.text, 'center', true);
    text('An open-world crime game in Cinderport', VIEW.width / 2, 330, 20, PALETTE.muted, 'center');
    text('Vance is back. The Ironclad Syndicate took his routes.', VIEW.width / 2, 360, 17, PALETTE.text, 'center');
    text('Take them back — one mission at a time.', VIEW.width / 2, 384, 17, PALETTE.text, 'center');
    const hasSave = state.hasSave;
    text(hasSave ? '▶  ENTER — NEW GAME' : '▶  ENTER — NEW GAME', VIEW.width / 2, 448, 24, PALETTE.money, 'center', true);
    if (hasSave) text('C — CONTINUE SAVED GAME', VIEW.width / 2, 482, 20, PALETTE.text, 'center', true);
    text('WASD move · Mouse aim · Click shoot · E enter / steal car · R reload · M mute · Esc pause', VIEW.width / 2, 540, 14, PALETTE.muted, 'center');
  }

  function drawPanelScreen(title, lines, prompt, color) {
    ctx.fillStyle = 'rgba(8, 10, 14, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    panel(VIEW.width / 2 - 320, 200, 640, 300);
    text(title, VIEW.width / 2, 300, 52, color, 'center', true);
    lines.forEach((line, i) => text(line, VIEW.width / 2, 350 + i * 30, 19, PALETTE.text, 'center'));
    text(prompt, VIEW.width / 2, 460, 20, PALETTE.hazard, 'center', true);
  }

  function draw(state, screen) {
    const cam = state.camera;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    drawGround(state, cam);
    // Skid marks.
    for (const s of state.skids) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life / 6) * 0.55;
      ctx.strokeStyle = '#0c0d10';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(s.x - cam.x, s.y - cam.y);
      ctx.lineTo(s.x - cam.x + Math.cos(s.angle) * 26, s.y - cam.y + Math.sin(s.angle) * 26);
      ctx.stroke();
      ctx.restore();
    }
    // Mission marker.
    const obj = currentObjective(state);
    if (obj.x !== null && screen === SCREEN_PLAY) {
      const pulse = 14 + Math.sin(state.time * 4) * 4;
      ctx.save();
      ctx.translate(obj.x - cam.x, obj.y - cam.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.hazard;
      ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
      ctx.restore();
      ctx.fillStyle = PALETTE.hazard;
      ctx.beginPath();
      ctx.arc(obj.x - cam.x, obj.y - cam.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pickups.
    for (const p of state.pickups) {
      const px = p.x - cam.x;
      const py = p.y - cam.y;
      if (p.kind === 'case') {
        ctx.fillStyle = '#2ec4b6';
        ctx.fillRect(px - 14, py - 10, 28, 20);
        text('$', px, py + 6, 16, '#06281f', 'center', true);
      } else if (p.kind === 'cash') {
        ctx.fillStyle = PALETTE.money;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
        text('$', px, py + 5, 12, '#06281f', 'center', true);
      } else if (p.kind === 'armor') {
        ctx.fillStyle = PALETTE.policeBlue;
        ctx.fillRect(px - 10, py - 10, 20, 20);
        text('A', px, py + 6, 14, '#fff', 'center', true);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 10, py - 10, 20, 20);
        text('+', px, py + 6, 16, '#c23b2e', 'center', true);
      }
    }
    // Cars, pedestrians, guards, player, bullets, particles.
    for (const car of state.cars) drawCar(car, cam, state.time);
    for (const ped of state.peds) {
      if (ped.alive) drawPerson(ped.x, ped.y, ped.angle, ped.color, cam, false);
    }
    for (const guard of state.guards) {
      if (!guard.alive) continue;
      drawPerson(guard.x, guard.y, guard.angle, guard.boss ? '#8f1d12' : '#3a3f47', cam, true);
      if (guard.boss) {
        text('BOSS', guard.x - cam.x, guard.y - 26 - cam.y, 13, PALETTE.sirenRed, 'center', true);
        ctx.fillStyle = '#333';
        ctx.fillRect(guard.x - 30 - cam.x, guard.y - 22 - cam.y, 60, 6);
        ctx.fillStyle = PALETTE.sirenRed;
        ctx.fillRect(guard.x - 30 - cam.x, guard.y - 22 - cam.y, 60 * (guard.hp / 340), 6);
      }
    }
    const player = state.player;
    if (player.onFoot) {
      const blink = player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0;
      if (!blink) drawPerson(player.x, player.y, player.angle, '#e8b23a', cam, true);
    }
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2;
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x - cam.x, b.y - cam.y);
      ctx.lineTo(b.x - b.vx * 0.02 - cam.x, b.y - b.vy * 0.02 - cam.y);
      ctx.stroke();
    }
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state);
    if (screen === SCREEN_TITLE) drawTitle(state);
    else if (screen === SCREEN_PAUSED) {
      drawPanelScreen('PAUSED', ['The city waits for you.'], 'Press P or Esc to resume', PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      drawPanelScreen('WASTED', [`Vance went down in ${districtAt(player.x, player.y)}.`, `Money kept: $${Math.floor(state.money).toLocaleString('en-US')}`], 'Press ENTER to try again', PALETTE.sirenRed);
    }
  }

  return { draw };
}
