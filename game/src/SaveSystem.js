// SaveSystem: the save game. One localStorage slot holds money, mission progress,
// the player's position and health, weapons and wanted level. It is written when a
// mission is completed and when the player saves at the Safehouse, and read back by
// the title screen's CONTINUE option. Everything here is defensive: a missing or
// corrupt slot simply means no save exists.

import { SAVE_KEY } from './config.js';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return readSave() !== null;
}

export function writeSave(state) {
  try {
    const data = {
      version: 1,
      money: Math.floor(state.money),
      missionIndex: state.missions.index,
      missionStage: state.missions.stage,
      hp: Math.round(state.player.hp),
      armor: Math.round(state.player.armor),
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      wanted: state.wanted.level,
      weapons: state.player.weapons,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    state.saveNotice = 2.5;
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: then nothing persists between visits.
  }
}
