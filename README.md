# gta6-lumina-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/yawmn/gta6-lumina-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/yawmn/gta6-lumina-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**IRON BAYOU: RUSTLINE** — an original open-world crime game in Cinderport, a rust-belt port city of steel mills, rail yards and bayou swamp. Vance, a smuggler driver framed by the Ironclad Syndicate, takes back the city's three routes: steal the syndicate cargo truck at Pier 9, ambush the rail-yard convoy, and blow the foundry gate to face the boss.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — plain static files under `game/`.

## Play

- **On foot:** WASD move, mouse aim, click shoot, Shift sprint, E enter / steal a car, R reload, 1–3 swap weapons (pistol, shotgun, rifle), M mute, Esc pause.
- **Driving:** W/S accelerate and brake, A/D steer, Space handbrake, E exit the car.
- **The city:** traffic and pedestrians, four vehicle types (sedan, taxi, cargo truck, police), a wanted level from 0–5 stars with police pursuit and roadblocks, Pay & Spray to lose the heat, a safehouse to save, and a HUD with money, health, armor, wanted stars, mission objective, district label and a minimap.
- **Missions:** three story missions with markers, cash rewards and a save after each one — Hotwire at Pier 9, Rail-Yard Ambush, and The Foundry Heist.

## Layout

- `game/` — the playable game: `index.html` and ES modules under `game/src/` (WorldMap, TrafficAI, PedestrianAI, WantedSystem, MissionManager, CombatSystem, SaveSystem, render, update, shots, main).
- `screenshots/` — four real renders of the game (title, carjacking, police chase, mission passed).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's vendored library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=wkpcknk0&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
