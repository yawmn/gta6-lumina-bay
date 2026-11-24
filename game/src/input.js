// Keyboard + mouse input. Drag orbits the camera; click shoots (when armed);
// keys are tracked in a set so the game loop reads them each frame.
(function () {
  'use strict';
  var G = window.IB = window.IB || {};
  G.Input = function (canvas) {
    var keys = {};
    var mouse = { dx: 0, dy: 0, down: false, clicked: false, wheel: 0 };
    var pressed = {};
    window.addEventListener('keydown', function (e) {
      if (e.repeat) return;
      keys[e.code] = true; pressed[e.code] = true;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    canvas.addEventListener('mousedown', function (e) { mouse.down = true; mouse.clicked = true; });
    window.addEventListener('mouseup', function () { mouse.down = false; });
    window.addEventListener('mousemove', function (e) {
      if (!mouse.down) return;
      mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0;
    });
    canvas.addEventListener('wheel', function (e) { mouse.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return {
      keys: keys, mouse: mouse,
      down: function (code) { return !!keys[code]; },
      // True once after a keydown; consumed by the game loop.
      wasPressed: function (code) { if (pressed[code]) { pressed[code] = false; return true; } return false; },
      consumeClick: function () { var c = mouse.clicked; mouse.clicked = false; return c; },
      consumeDrag: function () { var d = { dx: mouse.dx, dy: mouse.dy }; mouse.dx = 0; mouse.dy = 0; return d; },
      consumeWheel: function () { var w = mouse.wheel; mouse.wheel = 0; return w; }
    };
  };
})();
