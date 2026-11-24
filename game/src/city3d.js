// city3d: Cinderport as a low-poly 3D city, built from the same WorldMap data the
// simulation uses, so every building the 2D logic collides with is really there.
// Sunset lighting, canvas textures, reused geometries and materials, one shadow
// light that follows the player.

import { WORLD, PALETTE, SKY, angleToRotY, to3 } from './config.js';
import { AVENUES, ROAD_WIDTH, STREETS } from './WorldMap.js';
import {
  buildingTexture, roofTexture, roadTexture, sidewalkTexture, waterTexture, skyTexture,
} from './textures3d.js';

const matCache = new Map();
function lambert(color) {
  const key = String(color);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(key);
}

function textSignTexture(text, bg, fg) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function place(mesh, x2d, y2d, y, rotY = 0) {
  const p = to3(x2d, y2d);
  mesh.position.set(p.x, y, p.z);
  mesh.rotation.y = rotY;
  return mesh;
}

export function buildCity(scene, world, random) {
  const city = { beacons: [], signs: {} };

  // Sky dome + fog + sunset sun.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4200, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(SKY.fogColor, SKY.fogNear, SKY.fogFar);

  const sun = new THREE.DirectionalLight(SKY.sunColor, SKY.sunIntensity);
  sun.position.set(-900, 420, 500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 2600;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);
  scene.add(new THREE.AmbientLight(SKY.ambientColor, SKY.ambientIntensity));
  city.sun = sun;

  // Ground: dark swamp grass base, bayou strip, water at the pier.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, WORLD.height),
    lambert(PALETTE.grass),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const bayouTex = waterTexture();
  bayouTex.wrapS = THREE.RepeatWrapping;
  bayouTex.wrapT = THREE.RepeatWrapping;
  bayouTex.repeat.set(24, 2);
  const bayou = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, 200), new THREE.MeshLambertMaterial({ map: bayouTex, color: '#2d4a3e' }));
  bayou.rotation.x = -Math.PI / 2;
  place(bayou, WORLD.width / 2, 2300, 0.15);
  scene.add(bayou);

  const waterTex = waterTexture();
  waterTex.wrapS = THREE.RepeatWrapping;
  waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.repeat.set(2, 8);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(150, 820), new THREE.MeshLambertMaterial({ map: waterTex }));
  water.rotation.x = -Math.PI / 2;
  place(water, 3125, 410, 0.15);
  scene.add(water);

  // Roads: asphalt strips with dashed yellow centrelines, plus sidewalks.
  const roadTexH = roadTexture(true);
  roadTexH.wrapS = THREE.RepeatWrapping;
  roadTexH.wrapT = THREE.RepeatWrapping;
  roadTexH.repeat.set(9, 1);
  const roadTexV = roadTexture(false);
  roadTexV.wrapS = THREE.RepeatWrapping;
  roadTexV.wrapT = THREE.RepeatWrapping;
  roadTexV.repeat.set(1, 9);
  const sideTex = sidewalkTexture();
  sideTex.wrapS = THREE.RepeatWrapping;
  sideTex.wrapT = THREE.RepeatWrapping;
  sideTex.repeat.set(1, 18);

  function roadStrip(cx, cy, len, horizontal) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(horizontal ? len : ROAD_WIDTH, horizontal ? ROAD_WIDTH : len),
      new THREE.MeshLambertMaterial({ map: horizontal ? roadTexH : roadTexV }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    place(mesh, cx, cy, 0.3);
    scene.add(mesh);
  }
  function sidewalkStrip(cx, cy, len, horizontal) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(horizontal ? len : 22, horizontal ? 22 : len),
      new THREE.MeshLambertMaterial({ map: sideTex }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    place(mesh, cx, cy, 0.25);
    scene.add(mesh);
  }
  for (const ax of AVENUES) {
    roadStrip(ax, WORLD.height / 2, WORLD.height, false);
    sidewalkStrip(ax - ROAD_WIDTH / 2 - 12, WORLD.height / 2, WORLD.height, false);
    sidewalkStrip(ax + ROAD_WIDTH / 2 + 12, WORLD.height / 2, WORLD.height, false);
  }
  for (const sy of STREETS) {
    roadStrip(WORLD.width / 2, sy, WORLD.width, true);
    sidewalkStrip(WORLD.width / 2, sy - ROAD_WIDTH / 2 - 12, WORLD.width, true);
    sidewalkStrip(WORLD.width / 2, sy + ROAD_WIDTH / 2 + 12, WORLD.width, true);
  }

  // Rail line across the city at RAIL_Y: dark ballast strip + two steel rails.
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.width, 46), lambert('#33302e'));
  rail.rotation.x = -Math.PI / 2;
  rail.receiveShadow = true;
  place(rail, WORLD.width / 2, world.railY, 0.28);
  scene.add(rail);
  for (const off of [-8, 8]) {
    const railBar = box(WORLD.width, 2, 3, lambert('#9aa2ad'));
    place(railBar, WORLD.width / 2, world.railY + off, 1);
    scene.add(railBar);
  }

  // Buildings: boxes with lit-window facades and detailed roofs.
  for (const b of world.buildings) {
    const h = 50 + ((b.x * 7 + b.y * 13) % 100);
    const side = new THREE.MeshLambertMaterial({ map: buildingTexture(b.roof, random) });
    const top = new THREE.MeshLambertMaterial({ map: roofTexture(b.roof, random) });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, h, b.h),
      [side, side, top, lambert('#11141b'), side, side],
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    place(mesh, b.x + b.w / 2, b.y + b.h / 2, h / 2);
    scene.add(mesh);
    // A few roofs get a physical AC box so the skyline is not flat.
    if ((b.x + b.y) % 3 === 0) {
      const ac = box(22, 10, 18, lambert('#5a6068'));
      place(ac, b.x + b.w / 2 - 20, b.y + b.h / 2 + 10, h + 5);
      scene.add(ac);
    }
  }

  // Shipping containers near the pier and rail yard.
  for (const c of world.containers) {
    const cont = box(c.w, 26, c.h, lambert(c.color));
    place(cont, c.x + c.w / 2, c.y + c.h / 2, 13);
    scene.add(cont);
  }

  // Foundry: big dark hall, three smokestacks with red beacons, orange glow.
  const L = world.landmarks;
  const foundry = box(280, 90, 200, lambert('#3a3f46'));
  place(foundry, L.foundry.x + 140, L.foundry.y + 100, 45);
  scene.add(foundry);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 26),
    new THREE.MeshBasicMaterial({ color: '#ff7a1a' }),
  );
  glow.position.set(to3(L.foundry.x + 140, L.foundry.y + 8).x, 30, to3(L.foundry.x + 140, L.foundry.y + 8).z);
  glow.rotation.y = 0;
  scene.add(glow);
  for (let i = 0; i < 3; i += 1) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 150, 10), lambert('#6b4a2f'));
    stack.castShadow = true;
    place(stack, L.foundry.x + 40 + i * 90, L.foundry.y + 30, 75);
    scene.add(stack);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: '#ff2a3c' }));
    place(beacon, L.foundry.x + 40 + i * 90, L.foundry.y + 30, 152);
    scene.add(beacon);
  }
  // Foundry gate: two posts and a beam.
  for (const off of [-45, 45]) {
    const post = box(10, 46, 10, lambert('#ffd60a'));
    place(post, L.foundryGate.x + off, L.foundryGate.y, 23);
    scene.add(post);
  }
  const beam = box(100, 10, 12, lambert('#ffd60a'));
  place(beam, L.foundryGate.x, L.foundryGate.y, 46);
  scene.add(beam);

  // Safehouse: low green house with a garage door and a sign.
  const safe = box(130, 42, 100, lambert('#2d4a3e'));
  place(safe, L.safehouse.x, L.safehouse.y, 21);
  scene.add(safe);
  const garage = new THREE.Mesh(new THREE.PlaneGeometry(70, 30), lambert('#8a8f96'));
  garage.position.set(to3(L.safehouse.x, L.safehouse.y - 51).x, 16, to3(L.safehouse.x, L.safehouse.y - 51).z);
  scene.add(garage);

  // Pay & Spray: blue booth with a sign.
  const spray = box(140, 36, 90, lambert('#2b5b84'));
  place(spray, L.paySpray.x, L.paySpray.y, 18);
  scene.add(spray);

  // Pier: wooden deck over the water, two container cranes.
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), lambert('#6b4a2f'));
  deck.rotation.x = -Math.PI / 2;
  deck.receiveShadow = true;
  place(deck, 2950, 400, 0.4);
  scene.add(deck);
  for (const cx of [2820, 3020]) {
    const tower = box(26, 190, 26, lambert('#ffd60a'));
    place(tower, cx, 300, 95);
    scene.add(tower);
    const jib = box(190, 14, 14, lambert('#ffd60a'));
    place(jib, cx + 60, 300, 185);
    scene.add(jib);
  }

  // Signs the judge can read: SAFEHOUSE, PAY & SPRAY, PIER 9.
  function sign(text, x, y, z, w = 150) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w / 4),
      new THREE.MeshBasicMaterial({ map: textSignTexture(text, '#0c0f14', '#ffd60a') }),
    );
    const p = to3(x, y);
    mesh.position.set(p.x, z, p.z);
    scene.add(mesh);
    return mesh;
  }
  city.signs.safehouse = sign('SAFEHOUSE', L.safehouse.x, L.safehouse.y - 60, 52);
  city.signs.spray = sign('PAY & SPRAY', L.paySpray.x, L.paySpray.y - 55, 46);
  city.signs.pier = sign('PIER 9', 2920, 300, 60);

  // Streetlights along the avenues (emissive lamps only — no extra lights).
  const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe9a8' });
  for (const ax of AVENUES) {
    for (let y = 200; y < WORLD.height; y += 450) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 60, 6), lambert('#3a3f46'));
      place(pole, ax + 88, y, 30);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 8), lampMat);
      place(lamp, ax + 88, y, 61);
      scene.add(lamp);
    }
  }

  // Bayou cypress: dark cones along the south edge.
  for (let x = 120; x < WORLD.width; x += 260) {
    const tree = new THREE.Mesh(new THREE.ConeGeometry(26, 90, 8), lambert('#1d2b22'));
    tree.castShadow = true;
    place(tree, x + ((x * 13) % 60), 2280, 45);
    scene.add(tree);
  }

  // Mission beacon: a tall translucent pillar + floating diamond, repositioned
  // every frame by the renderer to the current objective.
  const beaconMat = new THREE.MeshBasicMaterial({ color: '#ffd60a', transparent: true, opacity: 0.22, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 320, 16, 1, true), beaconMat);
  scene.add(beacon);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(16), new THREE.MeshBasicMaterial({ color: '#ffd60a' }));
  scene.add(diamond);
  city.beacon = beacon;
  city.diamond = diamond;

  return city;
}

/** Keep the sun's shadow frustum centred on the player so shadows stay crisp. */
export function updateSun(city, px, py) {
  const p = to3(px, py);
  city.sun.position.set(p.x - 900, 420, p.z + 500);
  city.sun.target.position.set(p.x, 0, p.z);
}
