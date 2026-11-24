// A small seeded random generator (mulberry32): the same seed always builds the same
// city, the same traffic and the same screenshot scenes, which is what makes the
// ?shot= scenes repeatable for the screenshots.

export function createRandom(seed) {
  let state = seed | 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(random, min, max) {
  return min + random() * (max - min);
}

export function randomInt(random, min, max) {
  return Math.floor(randomRange(random, min, max + 1));
}

export function randomPick(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function randomChoice(random, list) {
  return list[Math.floor(random() * list.length)];
}
