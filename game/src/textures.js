// Procedural canvas textures: building facades, roads, signs, water, containers.
// Everything is drawn in code — no image assets, no network.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
    var g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
    var b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  G.Textures = {
    facade: function (base, floors, cols, seed) {
      var rng = (function (s) { var a = s >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(seed);
      return canvasTex(256, 256, function (ctx, w, h) {
        ctx.fillStyle = shade(base, 0.85); ctx.fillRect(0, 0, w, h);
        var cw = w / cols, ch = h / floors;
        for (var f = 0; f < floors; f++) for (var c = 0; c < cols; c++) {
          var lit = rng() < 0.42;
          ctx.fillStyle = lit ? (rng() < 0.7 ? '#ffd27a' : '#9fd8ff') : '#141a22';
          ctx.fillRect(c * cw + cw * 0.18, f * ch + ch * 0.22, cw * 0.64, ch * 0.56);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, h - 10, w, 10);
      });
    },
    road: function () {
      return canvasTex(128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#23272e'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1b1f25';
        for (var i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
        ctx.fillStyle = '#f5b700'; ctx.fillRect(w / 2 - 3, 8, 6, 34); ctx.fillRect(w / 2 - 3, 86, 6, 34);
        ctx.fillStyle = '#c8cdd4'; ctx.fillRect(4, 0, 3, h); ctx.fillRect(w - 7, 0, 3, h);
      });
    },
    sidewalk: function () {
      return canvasTex(128, 128, function (ctx, w, h) {
        ctx.fillStyle = '#3a4048'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#2c323a'; ctx.lineWidth = 2;
        for (var i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke(); }
      });
    },
    hazard: function () {
      return canvasTex(128, 64, function (ctx, w, h) {
        ctx.fillStyle = '#14161a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffd60a';
        for (var x = -h; x < w + h; x += 32) {
          ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 16, 0); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 16, h); ctx.closePath(); ctx.fill();
        }
      });
    },
    water: function () {
      return canvasTex(256, 256, function (ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1d4a5e'); g.addColorStop(1, '#0e2a3a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,180,90,0.35)'; ctx.lineWidth = 2;
        for (var i = 0; i < 14; i++) {
          var y = Math.random() * h, x = Math.random() * w;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + Math.random() * 40, y); ctx.stroke();
        }
      });
    },
    container: function (color) {
      return canvasTex(128, 128, function (ctx, w, h) {
        ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        for (var x = 0; x < w; x += 16) ctx.fillRect(x, 0, 4, h);
        ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, 0, w, 8);
      });
    },
    sign: function (text, bg, fg, sub) {
      return canvasTex(512, 128, function (ctx, w, h) {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
        ctx.fillStyle = fg; ctx.font = 'bold 64px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2);
        if (sub) { ctx.font = 'bold 30px Arial, sans-serif'; ctx.fillText(sub, w / 2, h / 2 + 38); }
      });
    },
    policeDoor: function () {
      return canvasTex(256, 128, function (ctx, w, h) {
        ctx.fillStyle = '#f2f4f6'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#111'; ctx.font = 'bold 52px Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('POLICE', w / 2, h / 2);
      });
    },
    sky: function () {
      return canvasTex(16, 512, function (ctx, w, h) {
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0.0, '#1c2a4a'); g.addColorStop(0.45, '#5a4a6e');
        g.addColorStop(0.62, '#c65a2e'); g.addColorStop(0.72, '#ff9a3c');
        g.addColorStop(0.8, '#3a2f3a'); g.addColorStop(1.0, '#241f28');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
    },
    sun: function () {
      return canvasTex(128, 128, function (ctx, w, h) {
        var g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,220,150,1)'); g.addColorStop(0.35, 'rgba(255,150,60,0.85)');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
    }
  };
})();
