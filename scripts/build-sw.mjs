// Writes out/sw.js after `next build`: the offline helper plus a list of every file to save.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
const SKIP = new Set(["sw.js", "_headers"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(OUT)
  .map((f) => relative(OUT, f).split(sep).join("/"))
  .filter((f) => !SKIP.has(f))
  .sort();

const hash = createHash("sha256");
for (const f of files) hash.update(f).update(readFileSync(join(OUT, f)));
const cacheName = "chess-coach-" + hash.digest("hex").slice(0, 12);

const template = readFileSync("scripts/sw.template.js", "utf8");
const sw = template
  .replace("__CACHE_NAME__", cacheName)
  .replace("/*__FILES__*/ []", JSON.stringify(files, null, 1));
writeFileSync(join(OUT, "sw.js"), sw);

console.log(`sw.js written: ${files.length} files, cache ${cacheName}`);
