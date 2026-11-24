// Boot and the one loop: input is read every frame, the simulation advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between four screens: title, play, paused and game
// over. ?seed=N fixes the city. ?shot=start|steal|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { PLAYER, STEP, VIEW, WEAPONS } from './config.js';
import { createRandom } from './random.js';
import { buildWorldMap } from './WorldMap.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RELOAD, ACTION_WEAPON1, ACTION_WEAPON2, ACTION_WEAPON3, createInput } from './input.js';
import { createSoundEngine } from './audio.js';
import { spawnTraffic } from './TrafficAI.js';
import { spawnPedestrians } from './PedestrianAI.js';
import { createMissions } from './MissionManager.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { interact, refreshInteractPrompt, updateGame } from './update.js';
import { hasSave, readSave, writeSave } from './SaveSystem.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

/** Build a fresh game state: city, player, traffic, pedestrians, missions, HUD data. */
export function createGame(seedValue, saveData) {
  const random = createRandom(seedValue);
  const world = buildWorldMap(random);
  const start = world.landmarks.start;
  const state = {
    random,
    world,
    time: 0,
    money: 250,
    wanted: { level: 0, quietTimer: 0, roadblockDone: false },
    lastCrimeAt: -100,
    lastShotAt: -100,
    gameOver: false,
    saveNotice: 0,
    interactPrompt: '',
    hasSave: hasSave(),
    player: {
      x: start.x, y: start.y, angle: -Math.PI / 2,
      onFoot: true, car: null,
      hp: PLAYER.maxHp, armor: 0,
      weapon: 'pistol',
      weapons: {
        pistol: { ammo: 12, reserve: 96 },
        shotgun: { ammo: 6, reserve: 18 },
        rifle: { ammo: 30, reserve: 90 },
      },
      fireTimer: 0, reloading: 0, invuln: 0,
      interactGate: false,
    },
    cars: [],
    peds: [],
    guards: [],
    bullets: [],
    particles: [],
    skids: [],
    pickups: [
      { kind: 'armor', x: world.landmarks.safehouse.x + 160, y: world.landmarks.safehouse.y + 40, value: 0 },
      { kind: 'health', x: world.landmarks.paySpray.x + 170, y: world.landmarks.paySpray.y + 40, value: 0 },
      { kind: 'armor', x: world.landmarks.downtown.x + 120, y: world.landmarks.downtown.y - 60, value: 0 },
    ],
    missions: createMissions(),
    camera: { x: 0, y: 0 },
    stats: { shots: 0, kills: 0, steals: 0 },
    sound: createSoundEngine(),
  };
  state.cars = spawnTraffic(random, 16);
  // A couple of parked cars near the start so the player can drive right away.
  state.cars.push(
    { id: 6001, type: 'sedan', x: 1080, y: 1470, angle: 0, speed: 0, targetSpeed: 0, color: '#3e6b8f', isTraffic: false, isPolice: false, isPlayer: false, hp: 100 },
    { id: 6002, type: 'taxi', x: 920, y: 1330, angle: Math.PI, speed: 0, targetSpeed: 0, color: '#f5b700', isTraffic: false, isPolice: false, isPlayer: false, hp: 100 },
  );
  state.peds = spawnPedestrians(random, 26);
  if (saveData) {
    state.money = saveData.money;
    state.missions.index = Math.min(saveData.missionIndex, 2);
    state.missions.stage = saveData.missionStage ?? 'pier';
    state.player.hp = saveData.hp;
    state.player.armor = saveData.armor;
    state.player.x = saveData.x;
    state.player.y = saveData.y;
    state.wanted.level = saveData.wanted ?? 0;
    if (saveData.weapons) state.player.weapons = saveData.weapons;
  }
  state.camera.x = Math.max(0, Math.min(3200 - VIEW.width, state.player.x - VIEW.width / 2));
  state.camera.y = Math.max(0, Math.min(2400 - VIEW.height, state.player.y - VIEW.height / 2));
  return state;
}

function runShot(name) {
  const state = createGame(seed);
  window.__game = state;
  let scene;
  try {
    scene = stageShot(name, state);
  } catch (error) {
    window.__shotError = String(error && error.message ? error.message : error);
    scene = { screen: SCREEN_TITLE };
  }
  const renderer = createRenderer(canvas);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const state = createGame(seed);
  window.__game = state;
  const renderer = createRenderer(canvas);
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fromSave) {
    const fresh = createGame(seed, fromSave ? readSave() : null);
    Object.assign(state, fresh);
    state.sound = fresh.sound;
    state.random = fresh.random;
    accumulator = 0;
    screen = SCREEN_PLAY;
    state.sound.unlock();
    announce('Playing. Vance is on the streets of Cinderport.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = state.sound.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(false);
      else if (input.isDown('KeyC') && state.hasSave) startGame(true);
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame(false);
      return;
    }
    if (actions & ACTION_PAUSE) {
      screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_INTERACT) interact(state);
    if (actions & ACTION_RELOAD) {
      const slot = state.player.weapons[state.player.weapon];
      if (slot.ammo < WEAPONS[state.player.weapon].mag) {
        state.player.reloading = WEAPONS[state.player.weapon].reload;
      }
    }
    if (actions & ACTION_WEAPON1) state.player.weapon = 'pistol';
    if (actions & ACTION_WEAPON2) state.player.weapon = 'shotgun';
    if (actions & ACTION_WEAPON3) state.player.weapon = 'rifle';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      // The city lives behind the title: traffic and pedestrians keep moving.
      while (accumulator >= STEP) {
        updateGame(state, { axes: { forward: 0, strafe: 0, sprint: false, handbrake: false }, mouse: { x: 640, y: 360, down: false } }, STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        updateGame(state, input, STEP);
        accumulator -= STEP;
        if (state.gameOver) {
          screen = SCREEN_OVER;
          announce('Wasted.');
          break;
        }
      }
      refreshInteractPrompt(state);
      const driving = !!state.player.car;
      const speedRatio = driving ? Math.abs(state.player.car.speed) / 520 : 0;
      const policeNear = state.cars.some((c) => c.isPolice && Math.hypot(c.x - state.player.x, c.y - state.player.y) < 600);
      state.sound.update(driving, speedRatio, policeNear);
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Iron Bayou: Rustline. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
