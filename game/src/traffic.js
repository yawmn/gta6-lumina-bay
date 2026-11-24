// Traffic AI (cars on avenue loops) and Pedestrian AI (sidewalk walkers who flee
// gunfire). Both are simple waypoint followers with no pathfinding.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.Traffic = function (scene, world) {
    var R = G.RNG, C = G.CFG;
    var cars = [];
    var types = ['sedan', 'taxi', 'sedan', 'truck', 'taxi', 'sedan'];
    // Loops: rectangles along two avenues each (one north-south, one east-west).
    function loopPath() {
      var ax = R.pick(C.AVENUES_X), az = R.pick(C.AVENUES_Z);
      var dir = R.chance(0.5) ? 1 : -1;
      return [
        { x: ax, z: -480 }, { x: ax, z: 480 }, { x: ax + dir * 140, z: 480 },
        { x: ax + dir * 140, z: -480 }, { x: ax, z: -480 }
      ].map(function (p) { return { x: G.clamp(p.x, -690, 690), z: G.clamp(p.z, -490, 490) }; });
    }
    for (var i = 0; i < 10; i++) {
      var car = { mesh: G.makeCar(types[i % types.length]), path: loopPath(), wp: 0, speed: G.RNG.range(7, 11), stopped: 0 };
      car.mesh.position.set(car.path[0].x, 0, car.path[0].z);
      scene.add(car.mesh); cars.push(car);
    }
    function blockedAhead(car, others, playerCar) {
      var fx = Math.sin(car.mesh.rotation.y), fz = Math.cos(car.mesh.rotation.y);
      var px = car.mesh.position.x, pz = car.mesh.position.z;
      var list = others.concat(playerCar ? [playerCar] : []);
      for (var i = 0; i < list.length; i++) {
        var o = list[i]; if (o === car) continue;
        var m = o.mesh || o;
        var dx = m.position.x - px, dz = m.position.z - pz;
        var d = Math.sqrt(dx * dx + dz * dz);
        if (d < 11 && dx * fx + dz * fz > 0) return true;
      }
      return false;
    }
    return {
      cars: cars,
      update: function (dt, playerCar) {
        cars.forEach(function (car) {
          var target = car.path[car.wp];
          var dx = target.x - car.mesh.position.x, dz = target.z - car.mesh.position.z;
          var d = Math.sqrt(dx * dx + dz * dz);
          if (d < 6) { car.wp = (car.wp + 1) % car.path.length; return; }
          var wantYaw = Math.atan2(dx, dz);
          var dy = wantYaw - car.mesh.rotation.y;
          while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          car.mesh.rotation.y += G.clamp(dy, -1.6 * dt, 1.6 * dt);
          if (blockedAhead(car, cars, playerCar)) { car.stopped += dt; return; }
          car.stopped = 0;
          var sp = car.speed * dt;
          car.mesh.position.x += Math.sin(car.mesh.rotation.y) * sp;
          car.mesh.position.z += Math.cos(car.mesh.rotation.y) * sp;
          car.mesh.userData.wheels.forEach(function (w) { w.rotation.x += sp * 2.4; });
        });
      }
    };
  };
  G.Pedestrians = function (scene, world) {
    var R = G.RNG, C = G.CFG;
    var jackets = [0xa63a2b, 0x2b5b84, 0x2d4a3e, 0xd8a03c, 0x6a4a7a, 0xc9c9c9];
    var peds = [];
    for (var i = 0; i < 12; i++) {
      var m = G.makeHumanoid({ jacket: jackets[i % jackets.length], skin: [0xc9a06a, 0x8a5a3a, 0xe8c39a][i % 3], cap: jackets[(i + 2) % jackets.length] });
      var p = { mesh: m, x: R.range(-560, 560), z: R.range(-420, 420), tx: 0, tz: 0, speed: R.range(1.2, 2), flee: 0 };
      p.tx = p.x; p.tz = p.z;
      m.position.set(p.x, 0, p.z);
      scene.add(m); peds.push(p);
    }
    return {
      peds: peds,
      scare: function (x, z) {
        peds.forEach(function (p) { if (G.dist2d(p.x, p.z, x, z) < 40) p.flee = 3; });
      },
      update: function (dt, playerPos) {
        peds.forEach(function (p) {
          if (p.flee > 0) {
            p.flee -= dt;
            var dx = p.x - playerPos.x, dz = p.z - playerPos.z;
            var d = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
            p.x += dx / d * 4.5 * dt; p.z += dz / d * 4.5 * dt;
            p.mesh.rotation.y = Math.atan2(dx, dz);
          } else {
            if (G.dist2d(p.x, p.z, p.tx, p.tz) < 3) {
              p.tx = G.clamp(p.x + G.RNG.range(-120, 120), -680, 680);
              p.tz = G.clamp(p.z + G.RNG.range(-120, 120), -480, 480);
            }
            var dx2 = p.tx - p.x, dz2 = p.tz - p.z, d2 = Math.max(0.1, Math.sqrt(dx2 * dx2 + dz2 * dz2));
            p.x += dx2 / d2 * p.speed * dt; p.z += dz2 / d2 * p.speed * dt;
            p.mesh.rotation.y = Math.atan2(dx2, dz2);
          }
          p.x = G.clamp(p.x, -690, 690); p.z = G.clamp(p.z, -490, 490);
          p.mesh.position.x = p.x; p.mesh.position.z = p.z;
          var u = p.mesh.userData; u.walkPhase += dt * (p.flee > 0 ? 11 : 6);
          var s = Math.sin(u.walkPhase) * 0.5;
          u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
        });
      }
    };
  };
})();
