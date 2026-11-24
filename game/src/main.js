// IRON BAYOU: RUSTLINE — boot, game loop, player/car control, camera, collisions.
// Third-person open-world crime game in vanilla JS + vendored Three.js.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  function params() {
    var q = {};
    location.search.slice(1).split('&').forEach(function (kv) {
      var p = kv.split('='); if (p[0]) q[p[0]] = decodeURIComponent(p[1] || '');
    });
    return q;
  }
  function angleLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function collideCircle(world, x, z, r) {
    for (var i = 0; i < world.colliders.length; i++) {
      var c = world.colliders[i];
      var cx = G.clamp(x, c.x, c.x2), cz = G.clamp(z, c.z, c.z2);
      var dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        var d = Math.sqrt(d2) || 0.01;
        x = cx + dx / d * r; z = cz + dz / d * r;
      }
    }
    return { x: G.clamp(x, -690, 690), z: G.clamp(z, -490, 490) };
  }
  window.addEventListener('DOMContentLoaded', function () {
    var q = params();
    var seed = parseInt(q.seed || '1', 10) || 1;
    var shot = q.shot || null;
    G.RNG.reseed(seed);
    var canvas = document.getElementById('game');
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { window.__shotError = 'WebGL unavailable: ' + e; document.getElementById('fatal').style.display = 'flex'; return; }
    renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 5000);
    var world = G.buildWorld(seed);
    G.buildCity(scene, world);
    // Player.
    var playerMesh = G.makeHumanoid({ jacket: 0x2b5b84, pants: 0x1e2229, skin: 0xc9a06a, cap: 0xa63a2b });
    scene.add(playerMesh);
    var S = world.spawns;
    // Parked, enterable cars.
    function parkedCar(type, x, z, yaw) {
      var mesh = G.makeCar(type); mesh.position.set(x, 0, z); mesh.rotation.y = yaw;
      scene.add(mesh);
      return { mesh: mesh, type: type, speed: 0, driven: false, parked: true };
    }
    var sedan = parkedCar('sedan', S.sedan.x, S.sedan.z, 0.3);
    var taxi = parkedCar('taxi', S.taxi.x, S.taxi.z, -0.2);
    var truck = parkedCar('truck', S.truck.x, S.truck.z, 0.2);
    // Systems.
    var traffic = G.Traffic(scene, world);
    var peds = G.Pedestrians(scene, world);
    var wanted = G.Wanted(scene);
    var combat = G.Combat(scene, camera);
    var missions = G.Missions(scene);
    var input = G.Input(canvas);
    var hud = G.HUD();
    var game = {
      scene: scene, camera: camera, world: world, renderer: renderer,
      state: 'title', frozen: false, money: G.CFG.START_MONEY, moneyTotal: G.CFG.START_MONEY,
      hp: 100, armor: 50, weaponIndex: 0, ammo: 12, reserve: 60,
      weapons: G.CFG.WEAPONS.map(function (w) { return { ammo: w.ammo, reserve: w.reserve }; }),
      player: { x: S.player.x, z: S.player.z, yaw: 0.6, mesh: playerMesh },
      car: null, parked: { sedan: sedan, taxi: taxi, truck: truck },
      trafficCars: traffic.cars, peds: peds, wanted: wanted, combat: combat,
      missions: missions, hud: hud, input: input,
      enemies: [], guardsSpawned: false, bossSpawned: false,
      camYaw: 0.6, camPitch: 0.3, camDist: 8, stats: { shots: 0, kills: 0 },
      explode: null
    };
    G.game = game;
    window.__game = game;
    playerMesh.position.set(game.player.x, 0, game.player.z);
    playerMesh.rotation.y = game.player.yaw;
    hud.showTitle(G.Save.read());
    // --- helpers ------------------------------------------------------------
    function enterableCars() {
      var list = [sedan, taxi, truck];
      traffic.cars.forEach(function (c) { list.push(c); });
      return list;
    }
    function nearestCar(maxD) {
      var best = null, bd = maxD;
      enterableCars().forEach(function (c) {
        if (c.driven) return;
        var d = G.dist2d(game.player.x, game.player.z, c.mesh.position.x, c.mesh.position.z);
        if (d < bd) { bd = d; best = c; }
      });
      return best;
    }
    game.hurt = function (dmg, src) {
      if (game.state !== 'playing') return;
      var rest = dmg;
      if (game.armor > 0) { var ab = Math.min(game.armor, rest); game.armor -= ab; rest -= ab; }
      game.hp -= rest;
      if (game.hp <= 0) { game.hp = 0; game.state = 'wasted'; hud.showWasted(true); if (G.Audio) G.Audio.siren(false); }
    };
    game.onEnemyDown = function (enemy) {
      game.stats.kills++;
      if (enemy.boss) missions.bossDown = true; else missions.guardsDown++;
      wanted.addHeat(10);
      if (G.Audio) G.Audio.pickup();
    };
    function reload() {
      var w = G.CFG.WEAPONS[game.weaponIndex], st = game.weapons[game.weaponIndex];
      var need = w.ammo - st.ammo;
      if (need <= 0 || st.reserve <= 0) return;
      var take = Math.min(need, st.reserve);
      st.ammo += take; st.reserve -= take; game.ammo = st.ammo; game.reserve = st.reserve;
      if (G.Audio) G.Audio.reload();
    }
    function shoot() {
      var w = G.CFG.WEAPONS[game.weaponIndex], st = game.weapons[game.weaponIndex];
      if (st.ammo <= 0) { reload(); return; }
      var pellets = w.pellets || 1;
      for (var i = 0; i < pellets; i++) combat.shoot(w, game.player, null);
      st.ammo--; game.ammo = st.ammo; game.stats.shots++;
      peds.scare(game.player.x, game.player.z);
      wanted.addHeat(3);
    }
    function enterCar(car) {
      game.car = car; car.driven = true; car.speed = 0;
      playerMesh.visible = false;
      if (G.Audio) { G.Audio.engine(0.2, true); }
      if (car.type === 'truck' && missions.stepDef() && missions.stepDef().kind === 'steal') wanted.addHeat(50);
      else wanted.addHeat(8);
    }
    function exitCar() {
      var car = game.car; if (!car) return;
      car.driven = false; car.speed = 0;
      var rx = Math.cos(car.mesh.rotation.y), rz = -Math.sin(car.mesh.rotation.y);
      game.player.x = car.mesh.position.x + rx * 3; game.player.z = car.mesh.position.z + rz * 3;
      playerMesh.visible = true;
      playerMesh.position.set(game.player.x, 0, game.player.z);
      game.car = null;
      if (G.Audio) G.Audio.engine(0, false);
    }
    function blowGate() {
      var lm = G.CFG.LANDMARKS.foundry;
      var flash = new THREE.PointLight(0xff8a2a, 40, 90, 1.5);
      flash.position.set(lm.x, 6, lm.z); scene.add(flash);
      var ball = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.9 }));
      ball.position.set(lm.x, 4, lm.z); scene.add(ball);
      game.explode = { light: flash, ball: ball, t: 0.8 };
      missions.gateBlown = true;
      wanted.addHeat(50);
      if (G.Audio) G.Audio.boom();
    }
    function updatePlayer(dt) {
      var inp = input, p = game.player;
      var drag = inp.consumeDrag();
      game.camYaw -= drag.dx * 0.005; game.camPitch = G.clamp(game.camPitch + drag.dy * 0.004, 0.08, 0.9);
      game.camDist = G.clamp(game.camDist + inp.consumeWheel() * 0.01, 5, 13);
      var f = { x: -Math.sin(game.camYaw), z: -Math.cos(game.camYaw) };
      var r = { x: -f.z, z: f.x };
      var mx = 0, mz = 0;
      if (inp.down('KeyW') || inp.down('ArrowUp')) { mx += f.x; mz += f.z; }
      if (inp.down('KeyS') || inp.down('ArrowDown')) { mx -= f.x; mz -= f.z; }
      if (inp.down('KeyD') || inp.down('ArrowRight')) { mx += r.x; mz += r.z; }
      if (inp.down('KeyA') || inp.down('ArrowLeft')) { mx -= r.x; mz -= r.z; }
      var moving = (mx !== 0 || mz !== 0);
      if (moving) {
        var len = Math.sqrt(mx * mx + mz * mz); mx /= len; mz /= len;
        var sp = (inp.down('ShiftLeft') || inp.down('ShiftRight')) ? 9 : 5;
        var nx = p.x + mx * sp * dt, nz = p.z + mz * sp * dt;
        var fixed = collideCircle(world, nx, nz, 0.7);
        p.x = fixed.x; p.z = fixed.z;
        p.yaw = Math.atan2(mx, mz);
        var u = playerMesh.userData; u.walkPhase += dt * sp * 1.6;
        var s = Math.sin(u.walkPhase) * 0.55;
        u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
      } else {
        var u2 = playerMesh.userData;
        u2.legL.rotation.x *= 0.8; u2.legR.rotation.x *= 0.8; u2.armL.rotation.x *= 0.8; u2.armR.rotation.x *= 0.8;
      }
      playerMesh.position.set(p.x, 0, p.z);
      playerMesh.rotation.y = p.yaw;
      // Shooting / reload / weapon switch.
      if (inp.consumeClick() && game.state === 'playing') { if (G.Audio) G.Audio.unlock(); shoot(); }
      if (inp.wasPressed('KeyR')) reload();
      var p1 = inp.wasPressed('Digit1'), p2 = inp.wasPressed('Digit2'), p3 = inp.wasPressed('Digit3');
      if (p1 || p2 || p3) {
        var idx = p1 ? 0 : (p2 ? 1 : 2);
        game.weaponIndex = idx; game.ammo = game.weapons[idx].ammo; game.reserve = game.weapons[idx].reserve;
      }
      // Context prompt + interact.
      var near = nearestCar(5);
      var step = missions.stepDef();
      if (step && step.kind === 'blow' && G.dist2d(p.x, p.z, G.CFG.LANDMARKS.foundry.x, G.CFG.LANDMARKS.foundry.z) < 18) {
        hud.setPrompt('[E] BLOW THE GATE');
        if (inp.wasPressed('KeyE')) blowGate();
      } else if (near) {
        hud.setPrompt('[E] STEAL CAR');
        if (inp.wasPressed('KeyE')) enterCar(near);
      } else hud.setPrompt('');
      // Pay & Spray auto-clear.
      if (wanted.level > 0 && G.dist2d(p.x, p.z, S.paynspray.x, S.paynspray.z) < 15) {
        wanted.clear(); game.money = Math.max(0, game.money - 100);
        hud.banner('WANTED CLEARED', 'PAY & SPRAY  ·  -$100');
        if (G.Audio) G.Audio.pickup();
      }
    }
    function updateCar(dt) {
      var car = game.car, inp = input;
      var drag = inp.consumeDrag();
      game.camYaw -= drag.dx * 0.005; game.camPitch = G.clamp(game.camPitch + drag.dy * 0.004, 0.1, 0.7);
      var maxSp = car.type === 'truck' ? 22 : 30;
      if (inp.down('KeyW') || inp.down('ArrowUp')) car.speed += 15 * dt;
      else if (inp.down('KeyS') || inp.down('ArrowDown')) car.speed -= (car.speed > 0.5 ? 22 : 8) * dt;
      else car.speed -= Math.sign(car.speed) * 6 * dt;
      if (inp.down('Space')) car.speed -= Math.sign(car.speed) * 26 * dt;
      car.speed = G.clamp(car.speed, -9, maxSp);
      if (Math.abs(car.speed) < 0.2 && !inp.down('KeyW')) car.speed = 0;
      var steer = 0;
      if (inp.down('KeyA') || inp.down('ArrowLeft')) steer = 0.6;
      if (inp.down('KeyD') || inp.down('ArrowRight')) steer = -0.6;
      car.mesh.rotation.y += steer * car.speed * dt * 0.032;
      var fx = Math.sin(car.mesh.rotation.y), fz = Math.cos(car.mesh.rotation.y);
      var nx = car.mesh.position.x + fx * car.speed * dt, nz = car.mesh.position.z + fz * car.speed * dt;
      var before = { x: nx, z: nz };
      var fixed = collideCircle(world, nx, nz, 2.3);
      if (Math.abs(fixed.x - before.x) > 0.01 || Math.abs(fixed.z - before.z) > 0.01) car.speed *= 0.45;
      car.mesh.position.x = fixed.x; car.mesh.position.z = fixed.z;
      game.player.x = fixed.x; game.player.z = fixed.z; game.player.yaw = car.mesh.rotation.y;
      car.mesh.userData.wheels.forEach(function (w) { w.rotation.x += car.speed * dt * 2.4; });
      if (G.Audio) G.Audio.engine(Math.abs(car.speed) / maxSp, true);
      hud.setPrompt('[E] EXIT CAR');
      if (inp.wasPressed('KeyE')) exitCar();
      if (wanted.level > 0 && G.dist2d(fixed.x, fixed.z, S.paynspray.x, S.paynspray.z) < 15) {
        wanted.clear(); game.money = Math.max(0, game.money - 100);
        hud.banner('WANTED CLEARED', 'PAY & SPRAY  ·  -$100');
        if (G.Audio) G.Audio.pickup();
      }
    }
    function updateGuards(dt) {
      game.enemies.forEach(function (e) {
        if (!e.alive) return;
        var dx = game.player.x - e.mesh.position.x, dz = game.player.z - e.mesh.position.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < 45 && game.state === 'playing') {
          e.mesh.rotation.y = Math.atan2(dx, dz);
          e.shootCd -= dt;
          if (e.shootCd <= 0) {
            e.shootCd = 2.4 + G.RNG.next();
            var from = new THREE.Vector3(e.mesh.position.x, 1.5, e.mesh.position.z);
            var to = new THREE.Vector3(game.player.x + (G.RNG.next() - 0.5) * 4, 1.2, game.player.z + (G.RNG.next() - 0.5) * 4);
            combat.spawnTracer(from, to);
            if (G.RNG.chance(0.35)) game.hurt(6, 'guard');
          }
        }
      });
    }
    function updateCamera(dt) {
      var target;
      if (game.car) {
        var cy = game.car.mesh.rotation.y;
        game.camYaw = angleLerp(game.camYaw, cy + Math.PI, 1 - Math.pow(0.002, dt));
        target = new THREE.Vector3(game.car.mesh.position.x, 2.2, game.car.mesh.position.z);
        var d = 11;
        camera.position.set(
          target.x + Math.sin(game.camYaw) * Math.cos(game.camPitch) * d,
          target.y + Math.sin(game.camPitch) * d + 1.2,
          target.z + Math.cos(game.camYaw) * Math.cos(game.camPitch) * d);
        camera.lookAt(target.x, target.y, target.z - 4);
      } else {
        target = new THREE.Vector3(game.player.x, 1.7, game.player.z);
        var d2 = game.camDist;
        camera.position.set(
          target.x + Math.sin(game.camYaw) * Math.cos(game.camPitch) * d2,
          target.y + Math.sin(game.camPitch) * d2 + 0.6,
          target.z + Math.cos(game.camYaw) * Math.cos(game.camPitch) * d2);
        camera.lookAt(target);
      }
    }
    function spawnMissionGuards() {
      if (missions.index === 1 && !game.guardsSpawned) {
        game.guardsSpawned = true;
        S.guards.forEach(function (gp) {
          var g = G.makeGuard(gp.x, gp.z, false);
          game.enemies.push(g); scene.add(g.mesh);
        });
      }
      if (missions.index === 2 && missions.stepDef() && missions.stepDef().kind === 'boss' && !game.bossSpawned) {
        game.bossSpawned = true;
        var b = G.makeGuard(S.boss.x, S.boss.z, true);
        game.enemies.push(b); scene.add(b.mesh);
      }
    }
    // --- main loop ----------------------------------------------------------
    var last = performance.now(), frames = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!game.frozen) {
        if (game.state === 'playing') {
          if (game.car) updateCar(dt); else updatePlayer(dt);
          traffic.update(dt, game.car);
          peds.update(dt, game.player);
          wanted.update(dt, game.player, !!game.car);
          combat.update(dt);
          missions.update(dt, game);
          updateGuards(dt);
          spawnMissionGuards();
          if (game.explode) {
            var ex = game.explode; ex.t -= dt;
            var k = Math.max(0, ex.t / 0.8);
            ex.ball.scale.setScalar(1 + (1 - k) * 4); ex.ball.material.opacity = 0.9 * k;
            ex.light.intensity = 40 * k;
            if (ex.t <= 0) { scene.remove(ex.light); scene.remove(ex.ball); game.explode = null; }
          }
          if (G.Audio) G.Audio.siren(wanted.level >= 2);
        }
        hud.update(game);
        hud.drawMinimap(game);
      }
      // In shot mode the camera stays exactly where staging put it.
      if (!game.frozen) updateCamera(dt);
      renderer.render(scene, camera);
      if (shot) {
        frames++;
        if (frames === 3 && !window.__shotError) window.__shotReady = true;
      }
    }
    // --- state keys ---------------------------------------------------------
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Enter' && game.state === 'title') {
        game.state = 'playing'; hud.hideTitle();
        if (G.Audio) G.Audio.unlock();
      } else if (e.code === 'KeyL' && game.state === 'title') {
        var s = G.Save.read();
        if (s) { game.money = s.money; missions.startMission(Math.min(s.mission, 2)); game.state = 'playing'; hud.hideTitle(); }
      } else if (e.code === 'Escape' && game.state === 'playing') {
        game.state = 'paused'; hud.showPause(true);
      } else if (e.code === 'Escape' && game.state === 'paused') {
        game.state = 'playing'; hud.showPause(false);
      } else if (e.code === 'Enter' && game.state === 'wasted') {
        game.hp = 100; game.armor = 50; game.player.x = S.player.x; game.player.z = S.player.z;
        playerMesh.position.set(game.player.x, 0, game.player.z);
        game.state = 'playing'; hud.showWasted(false);
      }
    });
    // --- shot staging -------------------------------------------------------
    if (shot) { try { G.stageShot(game, shot); } catch (e) { window.__shotError = String(e && e.stack || e); } }
    requestAnimationFrame(loop);
  });
})();
