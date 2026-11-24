// actors3d: the people and cars of Cinderport as low-poly box meshes. Every
// humanoid is built from the same parts (legs, torso, arms, head, gun) and every
// car from a body, a cabin, four wheels and headlights, so the whole city is a
// handful of shared geometries. Effects (tracers, muzzle flashes, explosions,
// skid marks) are pooled, never allocated per shot.

import { VEHICLE_TYPES, to3, angleToRotY } from './config.js';
import { flashTexture, policeLabelTexture } from './textures3d.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
const matCache = new Map();
function mat(color, opts = {}) {
  const key = `${color}|${opts.emissive || ''}|${opts.transparent || ''}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({
      color,
      emissive: opts.emissive || '#000000',
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
    }));
  }
  return matCache.get(key);
}
function basic(color) {
  const key = `basic|${color}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color }));
  return matCache.get(key);
}

function part(parent, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A low-poly person, facing local +X. Height ~34 units. */
export function makeHumanoid({ shirt = '#d8b25a', skin = '#c98d5f', pants = '#2c323d', guard = false, boss = false } = {}) {
  const group = new THREE.Group();
  const scale = boss ? 1.25 : 1;
  const legL = part(group, 6, 14, 6, mat(pants), -3, 7, 3.5);
  const legR = part(group, 6, 14, 6, mat(pants), -3, 7, -3.5);
  const torso = part(group, 12, 13, 16, mat(guard ? '#3a3f46' : shirt), 0, 20, 0);
  const armL = part(group, 5, 12, 5, mat(guard ? '#3a3f46' : shirt), 1, 20, 10);
  const armR = part(group, 5, 12, 5, mat(guard ? '#3a3f46' : shirt), 1, 20, -10);
  const head = part(group, 9, 8, 9, mat(skin), 0, 30, 0);
  // A cap for syndicate guards, a flat cap for the boss.
  if (guard) part(group, 10, 3, 10, mat(boss ? '#ffd60a' : '#1d2f45'), 0, 35, 0);
  // Gun in the right hand, pointing forward.
  const gun = part(group, 10, 2, 2, mat('#11141b'), 8, 16, -10);
  group.scale.setScalar(scale);
  return { group, legL, legR, armL, armR, torso, head, gun };
}

/** A low-poly car, facing local +X. Length is the sim width (66-104 units). */
export function makeCarMesh(car) {
  const spec = VEHICLE_TYPES[car.type];
  const group = new THREE.Group();
  const len = spec.w;
  const wid = spec.h;
  const bodyColor = car.color;
  const body = part(group, len, 12, wid, mat(bodyColor), 0, 8, 0);
  const cabin = part(group, len * 0.45, 9, wid * 0.78, mat('#1c2733'), -len * 0.06, 18, 0);
  // Windows: lighter cabin top.
  part(group, len * 0.42, 1, wid * 0.7, mat('#5a7a94'), -len * 0.06, 22.5, 0);
  const wheels = [];
  for (const [wx, wz] of [[len * 0.32, wid / 2], [len * 0.32, -wid / 2], [-len * 0.32, wid / 2], [-len * 0.32, -wid / 2]]) {
    const wheel = new THREE.Mesh(cylGeo, mat('#0c0e12'));
    wheel.scale.set(7, 5, 7);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 5, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }
  // Headlights (emissive white) and taillights (emissive red).
  for (const wz of [wid / 2 - 5, -wid / 2 + 5]) {
    part(group, 2, 4, 4, basic('#fff2b0'), len / 2, 8, wz);
    part(group, 2, 4, 4, basic('#ff2a3c'), -len / 2, 8, wz);
  }
  let siren = null;
  if (car.type === 'police') {
    // One POLICE label per side, and a red/blue light bar that flashes.
    const labelTex = policeLabelTexture();
    for (const side of [1, -1]) {
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(34, 8),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }),
      );
      label.position.set(0, 9, side * (wid / 2 + 0.6));
      if (side < 0) label.rotation.y = Math.PI;
      group.add(label);
    }
    const red = part(group, 12, 3, 6, basic('#ff2a3c'), 0, 24, 5);
    const blue = part(group, 12, 3, 6, basic('#00a8ff'), 0, 24, -5);
    siren = { red, blue };
  }
  if (car.type === 'truck') {
    // Long cargo box behind the cab.
    part(group, len * 0.55, 22, wid * 0.92, mat('#8a8f96'), -len * 0.2, 17, 0);
  }
  if (car.type === 'taxi') {
    part(group, 16, 3, 10, basic('#ffd60a'), -len * 0.06, 24, 0);
  }
  group.userData.body = body;
  return { group, wheels, siren };
}

export function createEffects(scene) {
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 1 });
  for (let i = 0; i < 24; i += 1) {
    const mesh = new THREE.Mesh(boxGeo, tracerMat);
    mesh.visible = false;
    scene.add(mesh);
    tracers.push({ mesh, life: 0 });
  }
  const flashMat = new THREE.SpriteMaterial({ map: flashTexture(), transparent: true, depthWrite: false });
  const flash = new THREE.Sprite(flashMat);
  flash.scale.set(22, 22, 1);
  flash.visible = false;
  scene.add(flash);
  let flashLife = 0;

  // Explosion particles: one Points cloud, reused.
  const COUNT = 90;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const velocities = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const pointsMat = new THREE.PointsMaterial({ size: 5, vertexColors: true, transparent: true, opacity: 1 });
  const points = new THREE.Points(geo, pointsMat);
  points.visible = false;
  points.frustumCulled = false;
  scene.add(points);
  let boomLife = 0;
  const palette = [[1, 0.16, 0.24], [1, 0.84, 0.04], [1, 0.48, 0.1], [0.5, 0.5, 0.5]];

  const skids = [];
  const skidMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 48; i += 1) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(34, 7), skidMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    skids.push({ mesh, life: 0 });
  }

  return {
    spawnTracer(from, to) {
      const t = tracers.find((x) => x.life <= 0) || tracers[0];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dz = to.z - from.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      t.mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
      t.mesh.scale.set(len, 4.5, 4.5);
      // The tracer box is long on local X: rotate Y so X lies along the shot.
      t.mesh.rotation.set(0, -Math.atan2(dz, dx), 0);
      t.mesh.visible = true;
      t.life = 0.07;
    },
    spawnFlash(pos) {
      flash.position.copy(pos);
      flash.visible = true;
      flashLife = 0.06;
    },
    spawnExplosion(pos) {
      for (let i = 0; i < COUNT; i += 1) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        const a = Math.random() * Math.PI * 2;
        const b = Math.random() * Math.PI - Math.PI / 2;
        const speed = 40 + Math.random() * 160;
        velocities[i] = [Math.cos(a) * Math.cos(b) * speed, Math.abs(Math.sin(b)) * speed + 40, Math.sin(a) * Math.cos(b) * speed];
        const c = palette[i % palette.length];
        colors[i * 3] = c[0];
        colors[i * 3 + 1] = c[1];
        colors[i * 3 + 2] = c[2];
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      points.visible = true;
      boomLife = 0.8;
    },
    addSkid(x2d, y2d, angle) {
      const s = skids.find((x) => x.life <= 0) || skids[0];
      const p = to3(x2d, y2d);
      s.mesh.position.set(p.x, 0.45, p.z);
      s.mesh.rotation.z = -angle;
      s.mesh.visible = true;
      s.life = 6;
    },
    update(dt) {
      for (const t of tracers) {
        if (t.life > 0) {
          t.life -= dt;
          if (t.life <= 0) t.mesh.visible = false;
        }
      }
      if (flashLife > 0) {
        flashLife -= dt;
        if (flashLife <= 0) flash.visible = false;
      }
      if (boomLife > 0) {
        boomLife -= dt;
        for (let i = 0; i < COUNT; i += 1) {
          positions[i * 3] += velocities[i][0] * dt;
          positions[i * 3 + 1] += velocities[i][1] * dt;
          positions[i * 3 + 2] += velocities[i][2] * dt;
          velocities[i][1] -= 220 * dt;
          if (positions[i * 3 + 1] < 1) positions[i * 3 + 1] = 1;
        }
        geo.attributes.position.needsUpdate = true;
        pointsMat.opacity = Math.max(0, boomLife / 0.8);
        if (boomLife <= 0) points.visible = false;
      }
      for (const s of skids) {
        if (s.life > 0) {
          s.life -= dt;
          if (s.life <= 0) s.mesh.visible = false;
        }
      }
    },
  };
}
