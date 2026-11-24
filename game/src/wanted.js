// Wanted system: heat level 0-5, police pursuit cars that chase and ram, and
// roadblocks at 4 stars. Pay & Spray clears the heat.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.Wanted = function (scene) {
    var self = { level: 0, heat: 0, quiet: 0, police: [], roadblock: [] };
    var flashT = 0;
    self.addHeat = function (n) {
      self.heat += n; self.quiet = 0;
      var lvl = Math.min(5, Math.floor(self.heat / 25));
      if (lvl > self.level) { self.level = lvl; if (window.IB && window.IB.hud) window.IB.hud.flashStars(); }
    };
    self.clear = function () { self.level = 0; self.heat = 0; self.quiet = 0; self.removePolice(); };
    self.removePolice = function () {
      self.police.forEach(function (p) { scene.remove(p.mesh); });
      self.roadblock.forEach(function (p) { scene.remove(p.mesh); });
      self.police = []; self.roadblock = [];
    };
    function spawnPoliceNear(x, z) {
      var m = G.makeCar('police');
      var a = G.RNG.range(0, Math.PI * 2), d = G.RNG.range(45, 70);
      m.position.set(G.clamp(x + Math.cos(a) * d, -680, 680), 0, G.clamp(z + Math.sin(a) * d, -480, 480));
      scene.add(m);
      return { mesh: m, speed: 0 };
    }
    self.update = function (dt, player, driving) {
      if (self.level > 0) {
        self.quiet += dt;
        if (self.quiet > 9) { self.level = Math.max(0, self.level - 1); self.heat = self.level * 25; self.quiet = 0; }
        var want = Math.min(self.level + 1, 5);
        while (self.police.length < want) self.police.push(spawnPoliceNear(player.x, player.z));
        while (self.police.length > want) { var p = self.police.pop(); scene.remove(p.mesh); }
        if (self.level >= 4 && self.roadblock.length === 0) {
          for (var i = 0; i < 2; i++) {
            var rb = G.makeCar('police');
            rb.position.set(player.x + (i === 0 ? -14 : 14), 0, player.z + 60);
            rb.rotation.y = Math.PI / 2; scene.add(rb);
            self.roadblock.push({ mesh: rb });
          }
        }
        if (self.level < 4 && self.roadblock.length) {
          self.roadblock.forEach(function (rb) { scene.remove(rb.mesh); }); self.roadblock = [];
        }
        // Chase: steer toward the player, ram on contact.
        self.police.forEach(function (car) {
          var dx = player.x - car.mesh.position.x, dz = player.z - car.mesh.position.z;
          var d = Math.sqrt(dx * dx + dz * dz);
          if (d < 0.5) return;
          var wantYaw = Math.atan2(dx, dz);
          var dy = wantYaw - car.mesh.rotation.y;
          while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
          car.mesh.rotation.y += G.clamp(dy, -2.4 * dt, 2.4 * dt);
          car.speed = Math.min(car.speed + 16 * dt, 26);
          car.mesh.position.x += Math.sin(car.mesh.rotation.y) * car.speed * dt;
          car.mesh.position.z += Math.cos(car.mesh.rotation.y) * car.speed * dt;
          car.mesh.userData.wheels.forEach(function (w) { w.rotation.x += car.speed * dt * 2.4; });
          if (d < 4.2) {
            // Ram: shove the player and damage.
            var px = player.x, pz = player.z;
            var nx = (px - car.mesh.position.x) / d, nz = (pz - car.mesh.position.z) / d;
            if (driving && window.IB.game && window.IB.game.car) {
              var c = window.IB.game.car;
              c.x += nx * 6 * dt * 10; c.z += nz * 6 * dt * 10;
            } else if (window.IB.game) {
              window.IB.game.hurt(6 * dt, 'police');
            }
          }
        });
        // Siren light bar flash.
        flashT += dt;
        var on = Math.sin(flashT * 10) > 0;
        self.police.forEach(function (car) {
          car.mesh.children.forEach(function (ch) {
            if (ch.material && ch.material.color) {
              if (ch.position.y > 1.7 && Math.abs(ch.position.x) < 0.7) ch.material.color.setHex(on ? 0xff2a3c : 0x00a8ff);
            }
          });
        });
      } else if (self.police.length) self.removePolice();
    };
    return self;
  };
})();
