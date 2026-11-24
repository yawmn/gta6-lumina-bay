// HUD: DOM overlay (money, health, weapon, wanted stars, objective, district,
// radio, prompts, banners, title / pause / wasted screens) and the 2D minimap.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.HUD = function () {
    var $ = function (id) { return document.getElementById(id); };
    var els = {
      money: $('hud-money'), hp: $('hud-hp'), armor: $('hud-armor'),
      weapon: $('hud-weapon'), ammo: $('hud-ammo'), stars: $('hud-stars'),
      objective: $('hud-objective'), district: $('hud-district'),
      radio: $('hud-radio'), prompt: $('hud-prompt'), hint: $('hud-hint'),
      banner: $('hud-banner'), bannerTitle: $('banner-title'), bannerSub: $('banner-sub'),
      title: $('screen-title'), pause: $('screen-pause'), wasted: $('screen-wasted'),
      minimap: $('minimap'), crosshair: $('crosshair'), loadLine: $('load-line')
    };
    var bannerTimer = 0;
    function stars(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }
    var hud = {
      update: function (game) {
        els.money.textContent = '$' + game.money.toLocaleString('en-US');
        els.hp.textContent = 'HP ' + Math.max(0, Math.round(game.hp));
        els.armor.textContent = 'ARMOR ' + Math.max(0, Math.round(game.armor));
        var w = G.CFG.WEAPONS[game.weaponIndex];
        els.weapon.textContent = w.name;
        els.ammo.textContent = game.ammo + ' / ' + game.reserve;
        els.stars.textContent = stars(game.wanted.level);
        els.stars.className = 'stars' + (game.wanted.level >= 4 ? ' hot' : '');
        els.objective.textContent = game.missions.objective();
        els.district.textContent = G.districtAt(game.player.x, game.player.z);
        els.radio.style.display = game.car ? 'block' : 'none';
        els.crosshair.style.display = (!game.car && game.state === 'playing') ? 'block' : 'none';
        if (bannerTimer > 0) { bannerTimer -= 1 / 60; if (bannerTimer <= 0) els.banner.style.display = 'none'; }
      },
      setPrompt: function (text) {
        if (text) { els.prompt.textContent = text; els.prompt.style.display = 'block'; }
        else els.prompt.style.display = 'none';
      },
      banner: function (title, sub) {
        els.bannerTitle.textContent = title; els.bannerSub.textContent = sub || '';
        els.banner.style.display = 'block'; bannerTimer = 3.2;
      },
      flashStars: function () { els.stars.classList.add('flash'); setTimeout(function () { els.stars.classList.remove('flash'); }, 500); },
      showTitle: function (save) {
        els.title.style.display = 'flex';
        els.loadLine.textContent = save ? 'L — LOAD SAVE (SLOT 1 · MISSION ' + (save.mission + 1) + ')' : 'L — LOAD SAVE (NO SAVE YET)';
      },
      hideTitle: function () { els.title.style.display = 'none'; },
      showPause: function (v) { els.pause.style.display = v ? 'flex' : 'none'; },
      showWasted: function (v) { els.wasted.style.display = v ? 'flex' : 'none'; },
      drawMinimap: function (game) {
        var c = els.minimap, ctx = c.getContext('2d');
        var W = c.width, H = c.height, C = G.CFG;
        function X(x) { return (x + C.WORLD_W / 2) / C.WORLD_W * W; }
        function Z(z) { return (z + C.WORLD_D / 2) / C.WORLD_D * H; }
        ctx.fillStyle = '#10141a'; ctx.fillRect(0, 0, W, H);
        // Water (west bay).
        ctx.fillStyle = '#12384a'; ctx.fillRect(0, 0, X(-700), H);
        // Roads.
        ctx.strokeStyle = '#3a4048'; ctx.lineWidth = 3;
        C.AVENUES_X.forEach(function (x) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); ctx.stroke(); });
        C.AVENUES_Z.forEach(function (z) { ctx.beginPath(); ctx.moveTo(0, Z(z)); ctx.lineTo(W, Z(z)); ctx.stroke(); });
        // Buildings.
        ctx.fillStyle = '#4a5568';
        game.world.buildings.forEach(function (b) { ctx.fillRect(X(b.x - b.w / 2), Z(b.z - b.d / 2), Math.max(1, b.w / C.WORLD_W * W), Math.max(1, b.d / C.WORLD_D * H)); });
        // Mission beacon (pulsing).
        if (game.missions.beaconPos) {
          var pulse = 5 + 3 * Math.sin(performance.now() / 250);
          ctx.fillStyle = '#ffd60a';
          ctx.beginPath(); ctx.arc(X(game.missions.beaconPos.x), Z(game.missions.beaconPos.z), pulse, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#111'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('!', X(game.missions.beaconPos.x), Z(game.missions.beaconPos.z));
        }
        // Traffic + police dots.
        ctx.fillStyle = '#e8e8e8';
        game.trafficCars.forEach(function (car) { ctx.fillRect(X(car.mesh.position.x) - 1, Z(car.mesh.position.z) - 1, 2, 2); });
        ctx.fillStyle = '#00a8ff';
        game.wanted.police.forEach(function (p) { ctx.fillRect(X(p.mesh.position.x) - 2, Z(p.mesh.position.z) - 2, 4, 4); });
        // Player arrow.
        var px = X(game.player.x), pz = Z(game.player.z);
        ctx.save(); ctx.translate(px, pz); ctx.rotate(game.player.yaw);
        ctx.fillStyle = '#f5b700';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    };
    G.hud = hud;
    return hud;
  };
})();
