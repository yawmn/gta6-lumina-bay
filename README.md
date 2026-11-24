# IRON BAYOU: RUSTLINE

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/yawmn/gta6-lumina-bay/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/yawmn/gta6-lumina-bay/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01).

**Vance**, a smuggler driver framed by the Ironclad Syndicate, takes back
Cinderport — a rust-belt port city of steel mills, rail yards and bayou water —
one heist at a time.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

WASD move · SHIFT sprint · mouse drag to look · CLICK shoot · R reload ·
1-3 switch weapon · E steal / enter a car · SPACE handbrake · ESC pause.

## The game

- **A living city**: low-poly Cinderport at sunset — downtown towers, Pier 9,
  the Rail Yard, the Foundry, the safehouse row — with traffic, pedestrians,
  a minimap and a district readout.
- **Cars to steal and drive**: sedans, taxis, the armored cargo truck and
  police cruisers, with chase camera, engine hum and RUST FM 94.2 on the radio.
- **Wanted 0–5 stars**: steal, shoot or hit a pedestrian and the police come
  for you — pursuit cars that ram, roadblocks at 4 stars, Pay & Spray to go clean.
- **Three missions**: Hotwire at Pier 9, Rail-Yard Ambush, The Foundry Heist —
  with beacon pillars, objectives, rewards and a save slot.
- **Combat**: pistol / SMG / shotgun, tracers, muzzle flash, guards and a boss.
- **Sound**: fully procedural WebAudio — no audio files.

Built in vanilla JavaScript + vendored Three.js (r152, offline). No network
at runtime. Play it free at [make.fun](https://make.fun/r/wkpcknk0).
