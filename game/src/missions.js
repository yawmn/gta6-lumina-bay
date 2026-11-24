// Mission manager: sequential missions with steps, 3D beacon pillars, rewards,
// MISSION PASSED banner and save. Steps are checked against player position
// and combat events, never against timers.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.Missions = function (scene) {
    var C = G.CFG;
    var beaconGeo = new THREE.CylinderGeometry(3.2, 3.2, 60, 16, 1, true);
    var beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    var beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 30; scene.add(beacon);
    var ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd60a, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; scene.add(ring);
    var self = {
      index: 0, step: 0, done: false, beaconPos: null, guardsDown: 0, guardsNeeded: 0,
      cashTaken: false, gateBlown: false, bossDown: false
    };
    self.current = function () { return C.MISSIONS[self.index]; };
    self.stepDef = function () { var m = self.current(); return m ? m.steps[self.step] : null; };
    self.objective = function () {
      if (self.done) return 'ALL MISSIONS COMPLETE — free roam Cinderport';
      var s = self.stepDef();
      return s ? ('M' + self.current().id + ' — ' + s.text) : '';
    };
    function placeBeacon() {
      var s = self.stepDef();
      if (!s) { beacon.visible = false; ring.visible = false; self.beaconPos = null; return; }
      var lm = C.LANDMARKS[s.target];
      beacon.visible = true; ring.visible = true;
      beacon.position.set(lm.x, 30, lm.z); ring.position.set(lm.x, 0.15, lm.z);
      self.beaconPos = { x: lm.x, z: lm.z };
    }
    self.startMission = function (i) {
      self.index = i; self.step = 0; self.guardsDown = 0; self.cashTaken = false; self.gateBlown = false; self.bossDown = false;
      var s = self.stepDef();
      self.guardsNeeded = (s && s.kind === 'combat') ? 3 : 0;
      placeBeacon();
    };
    self.advance = function () {
      var m = self.current();
      self.step++;
      if (self.step >= m.steps.length) {
        var game = window.IB.game;
        game.money += m.reward;
        game.moneyTotal = game.money;
        if (window.IB.hud) window.IB.hud.banner('MISSION PASSED!', '+$' + m.reward.toLocaleString('en-US') + '  ·  GAME SAVED');
        if (window.IB.Audio) window.IB.Audio.jingle();
        if (window.IB.Save) window.IB.Save.write({ mission: self.index + 1, money: game.money });
        self.index++;
        if (self.index >= C.MISSIONS.length) { self.done = true; beacon.visible = false; ring.visible = false; self.beaconPos = null; return; }
        self.startMission(self.index);
      } else {
        var s = self.stepDef();
        self.guardsNeeded = (s && s.kind === 'combat') ? 3 : 0;
        self.guardsDown = 0;
        placeBeacon();
      }
    };
    self.update = function (dt, game) {
      if (self.done) return;
      var s = self.stepDef(); if (!s) return;
      var t = 0; // pulse
      beaconMat.opacity = 0.2 + 0.12 * Math.sin(performance.now() / 300);
      var lm = C.LANDMARKS[s.target];
      var px = game.player.x, pz = game.player.z;
      if (s.kind === 'steal') {
        if (game.car && game.car.type === 'truck') self.advance();
      } else if (s.kind === 'deliver') {
        if (G.dist2d(px, pz, lm.x, lm.z) < 16) self.advance();
      } else if (s.kind === 'combat') {
        if (self.guardsDown >= self.guardsNeeded) self.advance();
      } else if (s.kind === 'pickup') {
        if (G.dist2d(px, pz, lm.x, lm.z) < 8) { self.cashTaken = true; self.advance(); }
      } else if (s.kind === 'clear') {
        if (game.wanted.level === 0 && G.dist2d(px, pz, lm.x, lm.z) < 16) self.advance();
      } else if (s.kind === 'blow') {
        if (self.gateBlown) self.advance();
      } else if (s.kind === 'boss') {
        if (self.bossDown) self.advance();
      }
    };
    self.startMission(0);
    return self;
  };
})();
