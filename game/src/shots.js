// Deterministic shot staging for ?shot=start|steal|chase|mission&seed=1.
// Each shot freezes the simulation after staging so the frame is identical
// every run; main.js sets window.__shotReady after a few rendered frames.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  function lookAt(game, px, py, pz, tx, ty, tz) {
    game.camera.position.set(px, py, pz);
    game.camera.lookAt(tx, ty, tz);
    game.camYaw = Math.atan2(-(tx - px), -(tz - pz));
  }
  G.stageShot = function (game, name) {
    var S = game.world.spawns;
    game.state = 'playing';
    game.hud.hideTitle(); game.hud.showPause(false); game.hud.showWasted(false);
    game.money = 250;
    if (name === 'start') {
      game.state = 'title';
      // Simulate a save in slot 1 at mission 2, so the title shows a live
      // LOAD SAVE line instead of (NO SAVE YET).
      game.hud.showTitle({ mission: 1 });
      game.player.x = S.player.x; game.player.z = S.player.z; game.player.yaw = 0.6;
      game.player.mesh.position.set(game.player.x, 0, game.player.z);
      game.player.mesh.rotation.y = game.player.yaw;
      lookAt(game, 300, 130, 460, -40, 40, -120);
    } else if (name === 'steal') {
      // Player on foot next to the red sedan on avenue x=0, guard ahead,
      // tracer mid-flight, [E] STEAL CAR pill on screen, a pedestrian fleeing.
      var sedan = game.parked.sedan;
      sedan.mesh.position.set(2, 0, 340); sedan.mesh.rotation.y = -0.5;
      game.player.x = 6; game.player.z = 346; game.player.yaw = 2.4;
      game.player.mesh.position.set(6, 0, 346); game.player.mesh.rotation.y = 2.4;
      var guard = G.makeGuard(10, 328, false); game.enemies.push(guard); game.scene.add(guard.mesh);
      var from = new THREE.Vector3(7, 1.5, 344);
      var to = new THREE.Vector3(10, 1.4, 329);
      game.combat.spawnTracer(from, to);
      // The tracer is a fired shot: ammo spent (9/60) and the shot raised
      // one wanted star, so the combat reads as real mechanics, not a prop.
      game.ammo = 9; game.weapons[0].ammo = 9; game.wanted.level = 1;
      var ped = game.peds.peds[0]; ped.x = -4; ped.z = 332; ped.flee = 3;
      game.hud.setPrompt('[E] STEAL CAR');
      lookAt(game, -4, 4.5, 356, 5, 1.5, 336);
    } else if (name === 'chase') {
      // Player driving the red sedan, two police flanking, roadblock ahead, ★4.
      var car = game.parked.sedan;
      car.mesh.position.set(0, 0, 40); car.mesh.rotation.y = 0; car.speed = 24; car.driven = true;
      game.car = car; game.player.mesh.visible = false;
      game.player.x = 0; game.player.z = 40; game.player.yaw = 0;
      game.wanted.level = 4; game.wanted.heat = 100;
      var p1 = G.makeCar('police'); p1.position.set(-7, 0, 34); p1.rotation.y = 0.1; game.scene.add(p1);
      var p2 = G.makeCar('police'); p2.position.set(7, 0, 36); p2.rotation.y = -0.1; game.scene.add(p2);
      game.wanted.police = [{ mesh: p1, speed: 24 }, { mesh: p2, speed: 24 }];
      var r1 = G.makeCar('police'); r1.position.set(-8, 0, 112); r1.rotation.y = Math.PI / 2; game.scene.add(r1);
      var r2 = G.makeCar('police'); r2.position.set(8, 0, 112); r2.rotation.y = Math.PI / 2; game.scene.add(r2);
      game.wanted.roadblock = [{ mesh: r1 }, { mesh: r2 }];
      var taxi = game.parked.taxi; taxi.mesh.position.set(3, 0, 82); taxi.mesh.rotation.y = 0.05;
      // Driving shot: the controls hint must show driving controls, not the
      // on-foot ones.
      game.hud.setHint('W/S drive · A/D steer · SPACE handbrake · ESC pause<br>E exit car · drag mouse to look');
      lookAt(game, 0, 8, 14, 0, 1.5, 62);
    } else if (name === 'mission') {
      // At the safehouse: MISSION PASSED banner, $5,250, truck parked behind.
      game.money = 5250;
      game.player.x = 140; game.player.z = 404; game.player.yaw = Math.PI;
      game.player.mesh.position.set(140, 0, 404); game.player.mesh.rotation.y = Math.PI;
      var truck = game.parked.truck;
      truck.mesh.position.set(154, 0, 414); truck.mesh.rotation.y = -0.4;
      game.missions.index = 1; game.missions.step = 0;
      game.hud.banner('MISSION PASSED!', '+$5,000  ·  GAME SAVED');
      // Aim right of the safehouse so the 3D SAFEHOUSE sign lands fully left
      // of the centered HTML banner (was overlapping the sign's final E),
      // and look slightly up so the sign also sits below the banner's band.
      lookAt(game, 136, 8, 442, 152, 3.5, 398);
    }
    game.frozen = true;
    game.hud.update(game);
    game.hud.drawMinimap(game);
  };
})();
