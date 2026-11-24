// Builds the Three.js scene for Cinderport: sky, sun, lights, ground, roads,
// buildings, water, pier, props and landmark signs. Meshes share geometries.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.buildCity = function (scene, world) {
    var C = G.CFG, T = G.Textures;
    var boxGeo = new THREE.BoxGeometry(1, 1, 1);
    var cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    var facadeMats = {};
    function facadeMat(b) {
      var key = b.base + '|' + b.floors + '|' + b.cols + '|' + b.seed;
      if (!facadeMats[key]) {
        var tex = T.facade(b.base, b.floors, b.cols, b.seed);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        facadeMats[key] = new THREE.MeshLambertMaterial({ map: tex });
      }
      return facadeMats[key];
    }
    // Sky dome + low sun + fog.
    var sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 24, 16),
      new THREE.MeshBasicMaterial({ map: T.sky(), side: THREE.BackSide, fog: false }));
    scene.add(sky);
    var sun = new THREE.Mesh(new THREE.PlaneGeometry(520, 520),
      new THREE.MeshBasicMaterial({ map: T.sun(), transparent: true, depthWrite: false, fog: false }));
    sun.position.set(-1500, 130, -900); sun.lookAt(0, 60, 0); scene.add(sun);
    scene.fog = new THREE.Fog(0x3a2f3a, 420, 1900);
    var hemi = new THREE.HemisphereLight(0xffb070, 0x1a222c, 0.55); scene.add(hemi);
    var dir = new THREE.DirectionalLight(0xff9a3c, 1.5);
    dir.position.set(-700, 420, -500); dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -450; dir.shadow.camera.right = 450;
    dir.shadow.camera.top = 450; dir.shadow.camera.bottom = -450;
    dir.shadow.camera.far = 2600; dir.shadow.bias = -0.0006;
    scene.add(dir); scene.add(dir.target);
    // Ground + water (west bay) + pier deck.
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1100),
      new THREE.MeshLambertMaterial({ color: 0x232830 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    var waterTex = T.water(); waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(4, 2);
    var water = new THREE.Mesh(new THREE.PlaneGeometry(420, 1100),
      new THREE.MeshLambertMaterial({ map: waterTex }));
    water.rotation.x = -Math.PI / 2; water.position.set(-910, 0.15, 0); scene.add(water);
    var pier = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x4a3b2e }));
    pier.scale.set(180, 1.2, 260); pier.position.set(-660, 0.6, 0); pier.receiveShadow = true; scene.add(pier);
    // Roads (textured strips) + sidewalk strips.
    var roadTex = T.road(); roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    var roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
    var walkTex = T.sidewalk(); walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
    var walkMat = new THREE.MeshLambertMaterial({ map: walkTex });
    world.roadsX.forEach(function (r) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(C.ROAD_W, 1000), roadMat);
      m.rotation.x = -Math.PI / 2; m.position.set(r.x, 0.05, 0); m.receiveShadow = true; scene.add(m);
      var t = roadTex.clone(); t.needsUpdate = true; t.repeat.set(1, 8); m.material = roadMat;
      var s1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 1000), walkMat);
      s1.rotation.x = -Math.PI / 2; s1.position.set(r.x - C.ROAD_W / 2 - 3, 0.06, 0); scene.add(s1);
      var s2 = s1.clone(); s2.position.x = r.x + C.ROAD_W / 2 + 3; scene.add(s2);
    });
    world.roadsZ.forEach(function (r) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(1400, C.ROAD_W), roadMat);
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.05, r.z); m.receiveShadow = true; scene.add(m);
      var s1 = new THREE.Mesh(new THREE.PlaneGeometry(1400, 6), walkMat);
      s1.rotation.x = -Math.PI / 2; s1.position.set(0, 0.06, r.z - C.ROAD_W / 2 - 3); scene.add(s1);
      var s2 = s1.clone(); s2.position.z = r.z + C.ROAD_W / 2 + 3; scene.add(s2);
    });
    // Buildings.
    world.buildings.forEach(function (b) {
      var m = new THREE.Mesh(boxGeo, facadeMat(b));
      m.scale.set(b.w, b.h, b.d); m.position.set(b.x, b.h / 2, b.z);
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
      var roof = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xa63a2b }));
      roof.scale.set(b.w * 0.96, 1.2, b.d * 0.96); roof.position.set(b.x, b.h + 0.6, b.z); scene.add(roof);
    });
    // Props.
    world.props.forEach(function (p) {
      var m;
      if (p.kind === 'container') {
        var tex = T.container(p.color); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: tex }));
        m.scale.set(12, 3.4, 3.4); m.position.set(p.x, 1.7, p.z); m.rotation.y = p.ry || 0;
      } else if (p.kind === 'crane') {
        var g = new THREE.Group();
        var leg = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xf5b700 }));
        leg.scale.set(4, 60, 4); leg.position.y = 30; g.add(leg);
        var arm = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xf5b700 }));
        arm.scale.set(46, 3, 3); arm.position.set(14, 58, 0); g.add(arm);
        var cable = new THREE.Mesh(cylGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
        cable.scale.set(0.25, 26, 0.25); cable.position.set(30, 44, 0); g.add(cable);
        var hook = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xa63a2b }));
        hook.scale.set(6, 4, 4); hook.position.set(30, 30, 0); g.add(hook);
        g.position.set(p.x, 0, p.z); scene.add(g); return;
      } else if (p.kind === 'stack') {
        m = new THREE.Mesh(cylGeo, new THREE.MeshLambertMaterial({ color: 0x5a4a44 }));
        m.scale.set(4, p.h, 4); m.position.set(p.x, p.h / 2, p.z);
        var band = new THREE.Mesh(cylGeo, new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
        band.scale.set(4.2, 3, 4.2); band.position.set(p.x, p.h - 4, p.z); scene.add(band);
      } else { // barrel
        m = new THREE.Mesh(cylGeo, new THREE.MeshLambertMaterial({ color: new THREE.Color(p.color) }));
        m.scale.set(1.1, 2.2, 1.1); m.position.set(p.x, 1.1, p.z);
      }
      m.castShadow = true; m.receiveShadow = true; scene.add(m);
    });
    // Landmark signs.
    function addSign(text, sub, x, z, y, ry, w) {
      var ww = w || 26;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(ww, ww * 0.25),
        new THREE.MeshBasicMaterial({ map: T.sign(text, '#14161a', '#ffd60a', sub), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry || 0; scene.add(m);
      var post = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x333333 }));
      post.scale.set(0.6, y, 0.6); post.position.set(x, y / 2, z); scene.add(post);
    }
    addSign('PIER 9', 'CARGO TERMINAL', -600, -90, 14, 0.4);
    addSign('SAFEHOUSE', null, 124, 398, 10, 0, 16);
    addSign('PAY & SPRAY', 'WANTED CLEAR', -140, 256, 11, Math.PI);
    addSign('RAIL YARD', null, 0, -322, 13, 0);
    addSign('FOUNDRY', 'IRONCLAD STEEL', 560, -40, 14, -Math.PI / 2);
    // Safehouse pad + pay&spray pad (hazard paint).
    var hazTex = T.hazard(); hazTex.wrapS = hazTex.wrapT = THREE.RepeatWrapping; hazTex.repeat.set(3, 1);
    var pad = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), new THREE.MeshLambertMaterial({ map: hazTex }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(140, 0.07, 420); scene.add(pad);
    var pad2 = pad.clone(); pad2.position.set(-140, 0.07, 280); scene.add(pad2);
    return { sun: sun, dirLight: dir };
  };
})();
