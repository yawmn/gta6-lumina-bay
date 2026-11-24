// Combat: hitscan shooting with a thick bright tracer, muzzle flash, reload,
// weapon switching, and enemy guards with health bars.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.Combat = function (scene, camera) {
    var tracers = [];
    var flash = new THREE.PointLight(0xffd27a, 0, 14, 2);
    scene.add(flash);
    var raycaster = new THREE.Raycaster();
    function spawnTracer(from, to) {
      var dir = new THREE.Vector3().subVectors(to, from);
      var len = dir.length();
      var outer = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.95 }));
      var inner = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
      var mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      [outer, inner].forEach(function (m) {
        m.position.copy(mid);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        scene.add(m);
      });
      tracers.push({ outer: outer, inner: inner, t: 0.09 });
      flash.position.copy(from); flash.intensity = 6;
    }
    function muzzlePos() {
      var p = new THREE.Vector3();
      camera.getWorldPosition(p);
      var d = new THREE.Vector3(); camera.getWorldDirection(d);
      return p.add(d.clone().multiplyScalar(1.2)).add(new THREE.Vector3(0, -0.25, 0));
    }
    return {
      shoot: function (weapon, fromPlayer, onHit) {
        var origin = muzzlePos();
        var dir = new THREE.Vector3(); camera.getWorldDirection(dir);
        dir.x += (G.RNG.next() - 0.5) * weapon.spread * 2;
        dir.y += (G.RNG.next() - 0.5) * weapon.spread * 2;
        dir.normalize();
        raycaster.set(origin, dir);
        raycaster.far = 220;
        var targets = [];
        if (window.IB.game) {
          window.IB.game.enemies.forEach(function (e) { if (e.alive) targets.push(e.mesh); });
          window.IB.game.trafficCars.forEach(function (c) { targets.push(c.mesh); });
        }
        var hits = raycaster.intersectObjects(targets, true);
        var end = origin.clone().add(dir.clone().multiplyScalar(220));
        var hitEnemy = null;
        if (hits.length) {
          end = hits[0].point.clone();
          var o = hits[0].object;
          while (o && !o.userData.enemy) o = o.parent;
          if (o && o.userData.enemy) hitEnemy = o.userData.enemy;
        }
        spawnTracer(origin, end);
        if (window.IB.Audio) window.IB.Audio.shot();
        if (hitEnemy) {
          hitEnemy.hp -= weapon.damage;
          if (hitEnemy.hp <= 0 && hitEnemy.alive) {
            hitEnemy.alive = false;
            hitEnemy.mesh.rotation.x = -Math.PI / 2; hitEnemy.mesh.position.y = 0.4;
            if (window.IB.game) window.IB.game.onEnemyDown(hitEnemy);
          }
          if (onHit) onHit(hitEnemy);
        }
        return hitEnemy;
      },
      spawnTracer: spawnTracer,
      update: function (dt) {
        for (var i = tracers.length - 1; i >= 0; i--) {
          var t = tracers[i]; t.t -= dt;
          var a = Math.max(0, t.t / 0.09);
          t.outer.material.opacity = 0.95 * a; t.inner.material.opacity = a;
          if (t.t <= 0) { scene.remove(t.outer); scene.remove(t.inner); tracers.splice(i, 1); }
        }
        flash.intensity = Math.max(0, flash.intensity - dt * 60);
      }
    };
  };
  // Enemy guard: a humanoid with health, a patrol point and a simple gun.
  G.makeGuard = function (x, z, boss) {
    var m = G.makeHumanoid({ jacket: boss ? 0x111111 : 0x3a3a3a, pants: 0x1e2229, skin: 0x8a5a3a, cap: boss ? 0xffd60a : 0x222222 });
    m.position.set(x, 0, z);
    m.userData.enemy = { mesh: m, hp: boss ? 300 : 100, alive: true, boss: !!boss, home: { x: x, z: z }, shootCd: 2 };
    return m.userData.enemy;
  };
})();
