// Procedural WebAudio: gunshots, sirens, engine hum, pickups, jingles, booms.
// No audio files; everything is synthesized. Context starts on first gesture.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  var ctx = null, sirenNodes = null, engineNodes = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function blip(freq, dur, type, vol, slide) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
  function noise(dur, vol, lowpass) {
    var c = ac(); if (!c) return;
    var len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
    var g = c.createGain(); g.gain.value = vol || 0.3;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }
  G.Audio = {
    unlock: function () { ac(); },
    shot: function () { noise(0.12, 0.5, 900); blip(160, 0.08, 'square', 0.15, 60); },
    reload: function () { blip(700, 0.06, 'square', 0.1); setTimeout(function () { blip(900, 0.06, 'square', 0.1); }, 90); },
    pickup: function () { blip(880, 0.12, 'sine', 0.2); setTimeout(function () { blip(1320, 0.16, 'sine', 0.2); }, 90); },
    jingle: function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.22, 'triangle', 0.22); }, i * 130); }); },
    boom: function () { noise(0.7, 0.6, 300); blip(90, 0.5, 'sine', 0.35, 30); },
    siren: function (on) {
      var c = ac(); if (!c) return;
      if (on && !sirenNodes) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = 700; g.gain.value = 0.05;
        var lfo = c.createOscillator(); lfo.frequency.value = 1.4;
        var lg = c.createGain(); lg.gain.value = 250;
        lfo.connect(lg); lg.connect(o.frequency); o.connect(g).connect(c.destination);
        o.start(); lfo.start(); sirenNodes = { o: o, lfo: lfo, g: g };
      } else if (!on && sirenNodes) {
        try { sirenNodes.o.stop(); sirenNodes.lfo.stop(); } catch (e) {}
        sirenNodes = null;
      }
    },
    engine: function (rpm, on) {
      var c = ac(); if (!c) return;
      if (on && !engineNodes) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.value = 60; g.gain.value = 0.04;
        var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
        o.connect(f).connect(g).connect(c.destination); o.start();
        engineNodes = { o: o, g: g };
      } else if (!on && engineNodes) {
        try { engineNodes.o.stop(); } catch (e) {}
        engineNodes = null;
      }
      if (engineNodes) engineNodes.o.frequency.value = 50 + rpm * 120;
    }
  };
})();
