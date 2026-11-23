// EMBERFALL hand-in (Node 22, standard library only). This program is the
// entry's root main.ts: it stages the deliverable into the output folder
// the grader reads — the game/ static files, the screenshots/ renders, and
// a dossier.json built with make.fun's vendored library, which is what the
// judge reads. It never deletes anything: the grader's /output parent is
// read-only, so the program only creates directories and writes files.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function stageFolder(name) {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
stageFolder('game');
stageFolder('screenshots');

// The gate's own caps, as the scorer applies them: at most 4 screenshots
// of 256 KiB each, at most 993 game files totalling 48 MiB, no game path
// over 1000 bytes, and the dossier text capped at 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
