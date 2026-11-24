// Actor factories: low-poly box humanoids and box cars (sedan, taxi, truck,
// police). Cars share geometries; each car keeps its wheel refs for spin.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  var boxGeo = null, cylGeo = null;
  function geos() {
    if (!boxGeo) { boxGeo = new THREE.BoxGeometry(1, 1, 1); cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12); }
  }
  function lam(color) { return new THREE.MeshLambertMaterial({ color: color }); }
  G.makeHumanoid = function (opt) {
    geos();
    var g = new THREE.Group();
    var skin = lam(opt.skin || 0xc9a06a), jacket = lam(opt.jacket || 0x2b5b84), pants = lam(opt.pants || 0x1e2229);
    var torso = new THREE.Mesh(boxGeo, jacket); torso.scale.set(0.62, 0.72, 0.34); torso.position.y = 1.12; g.add(torso);
    var head = new THREE.Mesh(boxGeo, skin); head.scale.set(0.34, 0.36, 0.34); head.position.y = 1.68; g.add(head);
    var cap = new THREE.Mesh(boxGeo, lam(opt.cap || 0xa63a2b)); cap.scale.set(0.38, 0.12, 0.38); cap.position.y = 1.88; g.add(cap);
    var legL = new THREE.Mesh(boxGeo, pants); legL.scale.set(0.24, 0.72, 0.28); legL.position.set(-0.16, 0.36, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.16; g.add(legR);
    var armL = new THREE.Mesh(boxGeo, jacket); armL.scale.set(0.18, 0.66, 0.22); armL.position.set(-0.42, 1.12, 0); g.add(armL);
    var armR = armL.clone(); armR.position.x = 0.42; g.add(armR);
    // Gun in right hand (visible when armed).
    var gun = new THREE.Mesh(boxGeo, lam(0x111111)); gun.scale.set(0.08, 0.1, 0.42); gun.position.set(0.42, 0.86, 0.2); g.add(gun);
    g.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    g.userData = { legL: legL, legR: legR, armL: armL, armR: armR, gun: gun, walkPhase: 0 };
    return g;
  };
  G.makeCar = function (type) {
    geos();
    var g = new THREE.Group();
    var wheels = [];
    function wheel(x, z) {
      var w = new THREE.Mesh(cylGeo, lam(0x0c0d10));
      w.rotation.z = Math.PI / 2; w.scale.set(0.42, 0.3, 0.42); w.position.set(x, 0.42, z);
      w.castShadow = true; g.add(w); wheels.push(w);
    }
    function headlight(x, z, color) {
      var h = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: color }));
      h.scale.set(0.3, 0.16, 0.08); h.position.set(x, 0.62, z); g.add(h);
    }
    var body, cabin;
    if (type === 'truck') {
      body = new THREE.Mesh(boxGeo, lam(0x5a6a7a)); body.scale.set(2.3, 1.5, 6.4); body.position.y = 1.15; g.add(body);
      var cargo = new THREE.Mesh(boxGeo, lam(0x8a7a5a)); cargo.scale.set(2.2, 1.9, 3.6); cargo.position.set(0, 1.9, -1.2); g.add(cargo);
      cabin = new THREE.Mesh(boxGeo, lam(0x2b5b84)); cabin.scale.set(2.1, 1.0, 1.6); cabin.position.set(0, 2.2, 1.9); g.add(cabin);
      wheel(-1.1, 2.2); wheel(1.1, 2.2); wheel(-1.1, -2.2); wheel(1.1, -2.2);
      headlight(-0.8, 3.22, 0xfff2b0); headlight(0.8, 3.22, 0xfff2b0);
    } else {
      var paint = type === 'taxi' ? 0xf5b700 : (type === 'police' ? 0xf2f4f6 : 0xa63a2b);
      body = new THREE.Mesh(boxGeo, lam(paint)); body.scale.set(2.0, 0.75, 4.6); body.position.y = 0.72; g.add(body);
      cabin = new THREE.Mesh(boxGeo, lam(0x1a2530)); cabin.scale.set(1.7, 0.62, 2.2); cabin.position.set(0, 1.35, -0.2); g.add(cabin);
      wheel(-0.95, 1.55); wheel(0.95, 1.55); wheel(-0.95, -1.55); wheel(0.95, -1.55);
      headlight(-0.65, 2.32, 0xfff2b0); headlight(0.65, 2.32, 0xfff2b0);
      var tl = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff2a3c }));
      tl.scale.set(0.4, 0.14, 0.08); tl.position.set(-0.65, 0.72, -2.32); g.add(tl);
      var tr = tl.clone(); tr.position.x = 0.65; g.add(tr);
      if (type === 'police') {
        var bar = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xff2a3c }));
        bar.scale.set(1.2, 0.18, 0.3); bar.position.set(0, 1.78, 0.1); g.add(bar);
        var barB = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0x00a8ff }));
        barB.scale.set(0.5, 0.18, 0.3); barB.position.set(0.45, 1.78, 0.1); g.add(barB);
        // ONE POLICE label per car, on the driver's door.
        var door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.55),
          new THREE.MeshBasicMaterial({ map: G.Textures.policeDoor() }));
        door.position.set(1.02, 0.72, 0.1); door.rotation.y = Math.PI / 2; g.add(door);
        var door2 = door.clone(); door2.position.x = -1.02; door2.rotation.y = -Math.PI / 2; g.add(door2);
      }
      if (type === 'taxi') {
        var sign = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
        sign.scale.set(0.7, 0.22, 0.4); sign.position.set(0, 1.78, -0.2); g.add(sign);
      }
    }
    g.traverse(function (m) { if (m.isMesh) m.castShadow = true; });
    g.userData = { type: type, wheels: wheels };
    return g;
  };
})();
