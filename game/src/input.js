// Input (3D): keyboard and mouse for a third-person game. Held keys steer on foot
// and in a car; one-shot presses are queued as bit flags and taken once by the
// loop. The mouse orbits the camera: pointer lock while playing, drag as a
// fallback. Clicking fires (and, on desktop, locks the pointer).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_RELOAD = 8;
export const ACTION_MUTE = 16;
export const ACTION_WEAPON1 = 32;
export const ACTION_WEAPON2 = 64;
export const ACTION_WEAPON3 = 128;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const mouse = { x: 640, y: 360, down: false, dx: 0, dy: 0 };
  let dragging = false;

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'Digit1') actions |= ACTION_WEAPON1;
    else if (event.code === 'Digit2') actions |= ACTION_WEAPON2;
    else if (event.code === 'Digit3') actions |= ACTION_WEAPON3;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
    dragging = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    if (document.pointerLockElement === canvas) {
      mouse.dx += event.movementX || 0;
      mouse.dy += event.movementY || 0;
    } else if (dragging) {
      mouse.dx += event.movementX || 0;
      mouse.dy += event.movementY || 0;
    }
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse.down = true;
    dragging = true;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    if (event.button === 0) actions |= ACTION_CONFIRM;
    if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      try {
        const p = canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch {
        // Pointer lock is a nicety; drag-orbit works without it.
      }
    }
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
    dragging = false;
  });

  return {
    keys,
    mouse,
    isDown(code) {
      return keys.has(code);
    },
    /** Mouse orbit deltas since the last take, in pixels. */
    takeLook() {
      const out = { dx: mouse.dx, dy: mouse.dy };
      mouse.dx = 0;
      mouse.dy = 0;
      return out;
    },
    /** Forward/back/left/right as -1, 0 or 1, from WASD or the arrow keys. */
    axes() {
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const down = keys.has('KeyS') || keys.has('ArrowDown');
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      return {
        forward: (up ? 1 : 0) - (down ? 1 : 0),
        strafe: (right ? 1 : 0) - (left ? 1 : 0),
        sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
        handbrake: keys.has('Space'),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
