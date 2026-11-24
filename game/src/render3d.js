// render3d: the Three.js presentation of IRON BAYOU: RUSTLINE. The simulation
// runs on the 2D plane; this module turns every car, pedestrian, guard, bullet
// and pickup into a mesh, drives the third-person camera, and paints the HTML
// HUD (money, wanted stars, HP, weapon, objective, radio, minimap) over it.
// Screenshots are staged through the same draw path the live game uses.

import { CAMERA, PALETTE, SKY, WORLD, angleToRotY, to3 } from './config.js';
import { districtAt } from './WorldMap.js';
import { buildCity, updateSun } from './city3d.js';
import { makeCarMesh, makeHumanoid, createEffects } from './actors3d.js';
import { currentObjective } from './MissionManager.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function $(id) {
  return document.getElementById(id);
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(VIEW_W(), VIEW_H());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, VIEW_W() / VIEW_H(), CAMERA.near, CAMERA.far);
  // The city is built on the first draw, when the real world exists.
  let city = {};
  const effects = createEffects(scene);

  // HUD elements.
  const hud = {
    money: $('hud-money'), district: $('hud-district'), objective: $('hud-objective'),
    missionLabel: $('hud-mission-label'), stars: $('hud-stars'), hp: $('hud-hp'),
    armor: $('hud-armor'), weapon: $('hud-weapon'), ammo: $('hud-ammo'),
    controls: $('hud-controls'), prompt: $('hud-prompt'), banner: $('hud-banner'),
    bannerBig: $('hud-banner-big'),
    bannerSub: $('hud-banner-sub'), save: $('hud-save'), radio: $('hud-radio'),
    crosshair: $('hud-crosshair'), minimap: $('minimap'), minimapDistrict: $('minimap-district'),
    title: $('screen-title'), pause: $('screen-pause'), over: $('screen-over'),
    loadSave: $('title-loadsave'),
  };
  const mapCtx = hud.minimap ? hud.minimap.getContext('2d') : null;

  const carMeshes = new Map();
  const humanMeshes = new Map();
  const pickupMeshes = new Map();
  const particleSprites = [];
  const particleMat = new THREE.SpriteMaterial({ color: '#ffffff', transparent: true, depthWrite: false });
  const particleGeo = null;
  const seenSkids = new Set();
  const seenParticles = new Set();
  const lastHud = {};
  let cityBuiltFor = null;
  let camPos = new THREE.Vector3(0, 300, 600);
  let cinematic = null;
  let orbitAngle = 0.6;

  function ensureCity(state) {
    if (cityBuiltFor === state.world) return;
    const built = buildCity(scene, state.world, state.random);
    Object.assign(city, built);
    cityBuiltFor = state.world;
  }

  function carMeshFor(car) {
    let rec = carMeshes.get(car);
    if (!rec) {
      rec = makeCarMesh(car);
      scene.add(rec.group);
      carMeshes.set(car, rec);
    }
    return rec;
  }

  function humanMeshFor(entity, opts) {
    let rec = humanMeshes.get(entity);
    if (!rec) {
      rec = makeHumanoid(opts);
      scene.add(rec.group);
      humanMeshes.set(entity, rec);
    }
    return rec;
  }

  function syncActors(state, dt, time) {
    // Player humanoid (hidden while driving — Vance is inside the car).
    const player = state.player;
    if (player.onFoot) {
      const rec = humanMeshFor(player, { shirt: '#2ec4b6', skin: '#c98d5f', pants: '#22262e' });
      const p = to3(player.x, player.y);
      rec.group.position.set(p.x, 0, p.z);
      rec.group.rotation.y = angleToRotY(player.angle);
      rec.group.visible = true;
      const swing = player.moving ? Math.sin(time * 11) * 0.55 : 0;
      rec.legL.rotation.x = swing;
      rec.legR.rotation.x = -swing;
      rec.armL.rotation.x = -swing * 0.8;
      rec.armR.rotation.x = swing * 0.8;
      rec.gun.visible = true;
    } else {
      const rec = humanMeshes.get(player);
      if (rec) rec.group.visible = false;
    }
    // Cars.
    const seenCars = new Set();
    for (const car of state.cars) {
      seenCars.add(car);
      const rec = carMeshFor(car);
      const p = to3(car.x, car.y);
      rec.group.position.set(p.x, 0, p.z);
      rec.group.rotation.y = angleToRotY(car.angle);
      const spin = (car.speed || 0) * dt * 0.09;
      for (const wheel of rec.wheels) wheel.rotation.z += spin;
      if (rec.siren) {
        const phase = Math.floor(time * 4) % 2 === 0;
        rec.siren.red.visible = phase;
        rec.siren.blue.visible = !phase;
      }
    }
    for (const [car, rec] of carMeshes) {
      if (!seenCars.has(car)) {
        scene.remove(rec.group);
        carMeshes.delete(car);
      }
    }
    // Pedestrians.
    const seenPeds = new Set();
    for (const ped of state.peds) {
      seenPeds.add(ped);
      const rec = humanMeshFor(ped, { shirt: ped.color, skin: '#c98d5f', pants: '#2c323d' });
      const p = to3(ped.x, ped.y);
      rec.group.position.set(p.x, 0, p.z);
      rec.group.rotation.y = angleToRotY(ped.angle);
      const moving = ped.flee > 0;
      const swing = Math.sin(time * (moving ? 14 : 7)) * (moving ? 0.7 : 0.35);
      rec.legL.rotation.x = swing;
      rec.legR.rotation.x = -swing;
      rec.armL.rotation.x = -swing * 0.7;
      rec.armR.rotation.x = swing * 0.7;
      rec.gun.visible = false;
    }
    for (const [ped, rec] of humanMeshes) {
      if (ped !== player && !state.guards.includes(ped) && !seenPeds.has(ped)) {
        scene.remove(rec.group);
        humanMeshes.delete(ped);
      }
    }
    // Guards and the boss.
    const seenGuards = new Set();
    for (const guard of state.guards) {
      seenGuards.add(guard);
      const rec = humanMeshFor(guard, { shirt: '#3a3f46', skin: '#b98a5e', pants: '#1d2f45', guard: true, boss: !!guard.boss });
      const p = to3(guard.x, guard.y);
      rec.group.position.set(p.x, 0, p.z);
      rec.group.rotation.y = angleToRotY(guard.angle);
      const swing = Math.sin(time * 9) * 0.4;
      rec.legL.rotation.x = swing;
      rec.legR.rotation.x = -swing;
      rec.gun.visible = true;
    }
    for (const [g, rec] of humanMeshes) {
      if (g !== player && state.guards && !seenGuards.has(g) && !seenPeds.has(g)) {
        scene.remove(rec.group);
        humanMeshes.delete(g);
      }
    }
    // Pickups: floating boxes.
    const seenPickups = new Set();
    for (const pickup of state.pickups) {
      seenPickups.add(pickup);
      let mesh = pickupMeshes.get(pickup);
      if (!mesh) {
        const color = pickup.kind === 'case' ? '#ffd60a' : pickup.kind === 'armor' ? '#2ec4b6' : '#ff2a3c';
        mesh = new THREE.Mesh(new THREE.BoxGeometry(18, 12, 12), new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 }));
        mesh.castShadow = true;
        scene.add(mesh);
        pickupMeshes.set(pickup, mesh);
      }
      const p = to3(pickup.x, pickup.y);
      mesh.position.set(p.x, 10 + Math.sin(time * 3) * 3, p.z);
      mesh.rotation.y = time * 1.2;
    }
    for (const [pickup, mesh] of pickupMeshes) {
      if (!seenPickups.has(pickup)) {
        scene.remove(mesh);
        pickupMeshes.delete(pickup);
      }
    }
    // Bullets: a tracer from each bullet back along its path.
    for (const bullet of state.bullets) {
      const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
      const back = 70 / speed; // longer streak — must read at thumbnail size
      const from = new THREE.Vector3(bullet.x - WORLD.width / 2 - bullet.vx * back, 16, bullet.y - WORLD.height / 2 - bullet.vy * back);
      const to = new THREE.Vector3(bullet.x - WORLD.width / 2, 16, bullet.y - WORLD.height / 2);
      effects.spawnTracer(from, to);
      if (bullet.fromPlayer && !bullet._flashed) {
        bullet._flashed = true;
        effects.spawnFlash(new THREE.Vector3(bullet.x - WORLD.width / 2, 18, bullet.y - WORLD.height / 2));
      }
    }
    // Particles (muzzle sparks, explosions) as small sprites.
    for (const pt of state.particles) {
      if (seenParticles.has(pt)) continue;
      seenParticles.add(pt);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: pt.color, transparent: true, depthWrite: false }));
      sprite.scale.set(pt.size * 2, pt.size * 2, 1);
      scene.add(sprite);
      particleSprites.push({ sprite, pt });
    }
    for (let i = particleSprites.length - 1; i >= 0; i -= 1) {
      const rec = particleSprites[i];
      if (rec.pt.life <= 0) {
        scene.remove(rec.sprite);
        particleSprites.splice(i, 1);
        continue;
      }
      const p = to3(rec.pt.x, rec.pt.y);
      rec.sprite.position.set(p.x, 12, p.z);
      rec.sprite.material.opacity = Math.max(0, rec.pt.life / rec.pt.maxLife);
    }
    if (seenParticles.size > 400) seenParticles.clear();
    // Skid marks.
    for (const skid of state.skids) {
      if (!seenSkids.has(skid)) {
        seenSkids.add(skid);
        effects.addSkid(skid.x, skid.y, skid.angle);
      }
    }
    // Mission beacon.
    const objective = currentObjective(state);
    if (objective.x !== null && city.beacon) {
      const p = to3(objective.x, objective.y);
      city.beacon.position.set(p.x, 160, p.z);
      city.beacon.visible = true;
      city.diamond.position.set(p.x, 60 + Math.sin(time * 2) * 6, p.z);
      city.diamond.rotation.y = time * 1.5;
      city.diamond.visible = true;
    } else if (city.beacon) {
      city.beacon.visible = false;
      city.diamond.visible = false;
    }
    effects.update(dt);
  }

  function setText(el, key, value) {
    if (!el) return;
    if (lastHud[key] !== value) {
      lastHud[key] = value;
      el.textContent = value;
    }
  }

  function drawHud(state, screen) {
    const player = state.player;
    const district = districtAt(player.x, player.y);
    setText(hud.money, 'money', `$${Math.floor(state.money).toLocaleString('en-US')}`);
    setText(hud.district, 'district', district);
    const mission = state.missions;
    setText(hud.missionLabel, 'missionLabel', mission.allDone ? 'FREE ROAM' : `MISSION ${mission.index + 1} / 3`);
    setText(hud.objective, 'objective', currentObjective(state).text);
    const starsHtml = [0, 1, 2, 3, 4].map((i) => (i < state.wanted.level
      ? '<span class="star-on">★</span>'
      : '<span class="star-off">☆</span>')).join('');
    if (hud.stars && lastHud.starsHtml !== starsHtml) {
      lastHud.starsHtml = starsHtml;
      hud.stars.innerHTML = starsHtml;
    }
    if (hud.hp) hud.hp.style.width = `${Math.max(0, player.hp)}%`;
    if (hud.armor) hud.armor.style.width = `${Math.max(0, player.armor)}%`;
    const weapon = state.player.weapon;
    setText(hud.weapon, 'weapon', weapon.toUpperCase());
    const slot = player.weapons[weapon];
    setText(hud.ammo, 'ammo', player.reloading > 0 ? 'RELOADING…' : `${slot.ammo} / ${slot.reserve}`);
    setText(hud.controls, 'controls', player.car ? 'W/S drive · A/D steer · SPACE brake · E exit' : 'WASD Move · Click Shoot · E Enter');
    setText(hud.prompt, 'prompt', state.interactPrompt || '');
    if (hud.prompt) hud.prompt.style.display = state.interactPrompt ? 'block' : 'none';
    const bannerOn = mission.bannerTimer > 0 && mission.banner;
    if (hud.banner) hud.banner.style.display = bannerOn ? 'block' : 'none';
    if (bannerOn) {
      setText(hud.bannerBig, 'banner', mission.banner);
      setText(hud.bannerSub, 'bannerSub', mission.bannerSub || '');
    }
    if (hud.save) hud.save.style.display = state.saveNotice > 0 ? 'block' : 'none';
    if (hud.radio) hud.radio.style.display = player.car && screen === SCREEN_PLAY ? 'block' : 'none';
    if (hud.crosshair) hud.crosshair.style.display = player.onFoot && screen === SCREEN_PLAY ? 'block' : 'none';
    if (hud.title) hud.title.style.display = screen === SCREEN_TITLE ? 'flex' : 'none';
    if (hud.pause) hud.pause.style.display = screen === SCREEN_PAUSED ? 'flex' : 'none';
    if (hud.over) hud.over.style.display = screen === SCREEN_OVER ? 'flex' : 'none';
    if (hud.loadSave) {
      hud.loadSave.style.display = state.hasSave ? 'block' : 'none';
      if (state.hasSave) setText(hud.loadSave, 'loadSave', 'L — LOAD SAVE (SLOT 1 · MISSION ' + (state.missions.index + 1) + ')');
    }
    // Minimap: roads, buildings, dots.
    if (mapCtx) {
      const S = 176;
      const scale = S / WORLD.width;
      const ctx = mapCtx;
      ctx.fillStyle = '#0c0f14';
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = '#3a4150';
      ctx.lineWidth = 4;
      for (const ax of [400, 1000, 1600, 2200, 2800]) {
        ctx.beginPath(); ctx.moveTo(ax * scale, 0); ctx.lineTo(ax * scale, S * (WORLD.height / WORLD.width)); ctx.stroke();
      }
      for (const sy of [400, 900, 1400, 1900]) {
        ctx.beginPath(); ctx.moveTo(0, sy * scale); ctx.lineTo(S, sy * scale); ctx.stroke();
      }
      ctx.fillStyle = '#2a2f38';
      for (const b of state.world.buildings) ctx.fillRect(b.x * scale, b.y * scale, Math.max(2, b.w * scale), Math.max(2, b.h * scale));
      const objective2 = currentObjective(state);
      if (objective2.x !== null) {
        ctx.fillStyle = '#ffd60a';
        ctx.beginPath(); ctx.arc(objective2.x * scale, objective2.y * scale, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff2a3c';
      for (const car of state.cars) {
        if (!car.isPolice) continue;
        ctx.fillRect(car.x * scale - 2, car.y * scale - 2, 4, 4);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(player.x * scale, player.y * scale, 4, 0, Math.PI * 2); ctx.fill();
      setText(hud.minimapDistrict, 'minimapDistrict', district);
    }
  }

  function updateCamera(state, screen, dt) {
    const player = state.player;
    const target = to3(player.x, player.y);
    if (cinematic) {
      camera.position.copy(cinematic.pos);
      camera.lookAt(cinematic.look);
      return;
    }
    if (screen === SCREEN_TITLE) {
      orbitAngle += dt * 0.05;
      const cx = Math.cos(orbitAngle) * 800;
      const cz = Math.sin(orbitAngle) * 800;
      camera.position.set(cx, 420, cz);
      camera.lookAt(0, 0, -100);
      return;
    }
    const driving = !!player.car;
    const dist = driving ? CAMERA.driveDistance : CAMERA.footDistance;
    const height = driving ? CAMERA.driveHeight : CAMERA.footHeight;
    const yaw = state.camYaw;
    const desired = new THREE.Vector3(
      target.x - Math.cos(yaw) * dist,
      height,
      target.z - Math.sin(yaw) * dist,
    );
    camPos.lerp(desired, CAMERA.lerp);
    camera.position.copy(camPos);
    const look = new THREE.Vector3(target.x, driving ? 16 : 14, target.z);
    if (driving && player.car) {
      look.x += Math.cos(player.car.angle) * 70;
      look.z += Math.sin(player.car.angle) * 70;
    } else {
      look.x += Math.cos(state.camYaw) * 40;
      look.z += Math.sin(state.camYaw) * 40;
    }
    camera.lookAt(look);
  }

  function VIEW_W() { return canvas.width || 1280; }
  function VIEW_H() { return canvas.height || 720; }

  return {
    scene,
    camera,
    city,
    setCinematic(pos, look) {
      cinematic = { pos: new THREE.Vector3(pos.x, pos.y, pos.z), look: new THREE.Vector3(look.x, look.y, look.z) };
    },
    clearCinematic() {
      cinematic = null;
    },
    snapCamera(state) {
      const target = to3(state.player.x, state.player.y);
      const yaw = state.camYaw;
      const driving = !!state.player.car;
      const dist = driving ? CAMERA.driveDistance : CAMERA.footDistance;
      const height = driving ? CAMERA.driveHeight : CAMERA.footHeight;
      camPos.set(target.x - Math.cos(yaw) * dist, height, target.z - Math.sin(yaw) * dist);
    },
    draw(state, screen, dt = 1 / 60) {
      ensureCity(state);
      const time = state.time;
      syncActors(state, dt, time);
      updateSun(city, state.player.x, state.player.y);
      updateCamera(state, screen, dt);
      drawHud(state, screen);
      renderer.render(scene, camera);
    },
  };
}
