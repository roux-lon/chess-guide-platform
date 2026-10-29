// Copies the lite, single-threaded Stockfish build from node_modules into
// public/engine/ so the app serves the engine from its own origin (no CDN, no
// COOP/COEP headers needed). Safe to run repeatedly. Runs on install, dev and build.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "stockfish", "bin");
const to = join(root, "public", "engine");
const files = ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"];

if (!existsSync(from)) {
  console.warn("copy-engine: node_modules/stockfish not found yet, skipping.");
  process.exit(0);
}

mkdirSync(to, { recursive: true });
for (const file of files) {
  const src = join(from, file);
  const dest = join(to, file);
  if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue;
  copyFileSync(src, dest);
  console.log(`copy-engine: ${file}`);
}
