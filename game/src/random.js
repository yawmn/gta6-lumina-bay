// Seeded RNG (mulberry32) so ?seed=1 staging is deterministic.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  G.RNG = {
    seed: 1, fn: mulberry32(1),
    reseed: function (s) { this.seed = s; this.fn = mulberry32(s); },
    next: function () { return this.fn(); },
    range: function (a, b) { return a + this.fn() * (b - a); },
    int: function (a, b) { return Math.floor(this.range(a, b + 1)); },
    pick: function (arr) { return arr[Math.floor(this.fn() * arr.length)]; },
    chance: function (p) { return this.fn() < p; }
  };
  G.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.dist2d = function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
})();
