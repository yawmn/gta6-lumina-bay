// World layout: avenue grid, building blocks, props and landmarks for Cinderport.
// Generated from the seeded RNG so the city is identical for every ?seed= run.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.buildWorld = function (seed) {
    var R = G.RNG; R.reseed(seed);
    var C = G.CFG;
    var world = { buildings: [], props: [], colliders: [], roadsX: [], roadsZ: [], spawns: {} };
    var i, j, x, z;
    // Roads: one strip per avenue, stored for the minimap and traffic loops.
    C.AVENUES_X.forEach(function (ax) { world.roadsX.push({ x: ax, from: -500, to: 500 }); });
    C.AVENUES_Z.forEach(function (az) { world.roadsZ.push({ z: az, from: -700, to: 700 }); });
    // Buildings: fill each block between avenues. Downtown (center) gets towers.
    var xs = [-700].concat(C.AVENUES_X).concat([700]);
    var zs = [-500].concat(C.AVENUES_Z).concat([500]);
    var bases = ['#2b5b84', '#a63a2b', '#2d4a3e', '#4a3b2e', '#5a5468', '#333a44'];
    for (i = 0; i < xs.length - 1; i++) for (j = 0; j < zs.length - 1; j++) {
      var x0 = xs[i] + C.ROAD_W / 2 + 4, x1 = xs[i + 1] - C.ROAD_W / 2 - 4;
      var z0 = zs[j] + C.ROAD_W / 2 + 4, z1 = zs[j + 1] - C.ROAD_W / 2 - 4;
      var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      // Keep landmark plots clear.
      if (G.dist2d(cx, cz, C.LANDMARKS.pier.x, C.LANDMARKS.pier.z) < 110) continue;
      if (G.dist2d(cx, cz, C.LANDMARKS.safehouse.x, C.LANDMARKS.safehouse.z) < 90) continue;
      if (G.dist2d(cx, cz, C.LANDMARKS.railyard.x, C.LANDMARKS.railyard.z) < 100) continue;
      if (G.dist2d(cx, cz, C.LANDMARKS.foundry.x, C.LANDMARKS.foundry.z) < 110) continue;
      if (G.dist2d(cx, cz, C.LANDMARKS.paynspray.x, C.LANDMARKS.paynspray.z) < 80) continue;
      var downtown = Math.abs(cx) < 280 && Math.abs(cz) < 140;
      var n = downtown ? R.int(1, 2) : R.int(1, 3);
      for (var k = 0; k < n; k++) {
        var w = R.range(28, Math.min(70, (x1 - x0) / n));
        var d = R.range(28, Math.min(70, z1 - z0));
        var bx = R.range(x0 + w / 2, x1 - w / 2), bz = R.range(z0 + d / 2, z1 - d / 2);
        var h = downtown ? R.range(45, 110) : R.range(16, 55);
        var b = { x: bx, z: bz, w: w, d: d, h: h, base: R.pick(bases),
                  floors: Math.max(2, Math.round(h / 9)), cols: Math.max(2, Math.round(w / 11)),
                  seed: R.int(1, 99999) };
        world.buildings.push(b);
        world.colliders.push({ x: bx - w / 2, z: bz - d / 2, x2: bx + w / 2, z2: bz + d / 2 });
      }
    }
    // Props: containers at the pier and rail yard, cranes, foundry smokestacks.
    var contCols = ['#a63a2b', '#2b5b84', '#2d4a3e', '#b8860b'];
    for (i = 0; i < 10; i++) world.props.push({ kind: 'container', x: -660 + (i % 5) * 22, z: -120 + Math.floor(i / 5) * 30, color: contCols[i % 4], ry: (i % 2) * 0.12 });
    for (i = 0; i < 6; i++) world.props.push({ kind: 'container', x: -60 + (i % 3) * 24, z: -380 + Math.floor(i / 3) * 28, color: contCols[(i + 1) % 4], ry: 0 });
    for (i = 0; i < 3; i++) world.props.push({ kind: 'crane', x: -600 + i * 60, z: -180 });
    for (i = 0; i < 4; i++) world.props.push({ kind: 'stack', x: 600 + (i % 2) * 36, z: -60 + Math.floor(i / 2) * 44, h: 70 + i * 8 });
    for (i = 0; i < 8; i++) world.props.push({ kind: 'barrel', x: R.range(-600, 640), z: R.range(-420, 420), color: R.pick(contCols) });
    // Landmark plots (flat pads + sign positions).
    world.spawns = {
      player: { x: 0, z: 380 },
      truck: { x: -640, z: -40 },
      sedan: { x: 4, z: 352 },
      taxi: { x: -140, z: 20 },
      safehouse: { x: 140, z: 420 },
      paynspray: { x: -140, z: 280 },
      railyard: { x: 0, z: -350 },
      foundry: { x: 560, z: 0 },
      boss: { x: 560, z: -24 },
      guards: [{ x: -20, z: -330 }, { x: 24, z: -368 }, { x: -44, z: -372 }]
    };
    return world;
  };
})();
