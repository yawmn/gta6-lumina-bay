// Entrypoint for IRON BAYOU: RUSTLINE (make.fun bounty gta6-01).
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json with buildDossier from the kit's vendored library, so the
// dossier the grader rebuilds matches this one byte for byte.
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Node 22, standard library only; MAKEFUN_OUTPUT_DIR stands in for /output
// outside the grader.)
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(resolve(repoRoot, 'game'), resolve(outDir, 'game'), { recursive: true });
const shotsDir = resolve(repoRoot, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, resolve(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
});
writeFileSync(resolve(outDir, 'dossier.json'), dossier);
console.log('IRON BAYOU: RUSTLINE — wrote ' + resolve(outDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
