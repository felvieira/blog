#!/usr/bin/env node
/** Generate light WebP archive covers from the cover images referenced by posts. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const posts = join(ROOT, "posts");
const destination = join(ROOT, "assets", "images", "thumbs");
const invalidIndex = join(destination, ".invalid.json");
mkdirSync(destination, { recursive: true });
const sources = new Set();
for (const filename of readdirSync(posts).filter((name) => name.endsWith(".html"))) {
  const html = readFileSync(join(posts, filename), "utf8");
  const cover = html.match(/<img[^>]+src="\.\.\/(assets\/images\/[^\"]+)"/)
    ?? html.match(/<meta property="og:image" content="(?:https?:\/\/[^/]+\/[^/]+\/)?(assets\/images\/[^\"]+)"/);
  if (cover) sources.add(cover[1]);
}

const existingSources = [];
const missing = [];
const invalid = new Set(existsSync(invalidIndex) ? JSON.parse(readFileSync(invalidIndex, "utf8")) : []);
for (const relative of sources) {
  const source = join(ROOT, relative);
  if (!existsSync(source)) { missing.push(relative); continue; }
  if (invalid.has(relative)) continue;
  const filename = relative.slice("assets/images/".length).replace(/\.[^.]+$/, "") + ".webp";
  const output = join(destination, filename);
  if (!existsSync(output) || statSync(source).mtimeMs > statSync(output).mtimeMs) existingSources.push(source);
}

if (existingSources.length) {
  const options = ["mogrify", "-path", destination, "-format", "webp", "-auto-orient", "-thumbnail", "800x800^", "-gravity", "center", "-extent", "800x800", "-strip", "-quality", "76"];
  const failed = [];
  for (let offset = 0; offset < existingSources.length; offset += 20) {
    const batch = existingSources.slice(offset, offset + 20);
    try {
      execFileSync("magick", [...options, ...batch], { stdio: "ignore" });
    } catch {
      for (const source of batch) {
        try { execFileSync("magick", [source, ...options.slice(1), join(destination, `${source.split(/[\\/]/).pop().replace(/\.[^.]+$/, "")}.webp`)], { stdio: "ignore" }); }
        catch { failed.push(source.split(/[\\/]/).pop()); invalid.add(`assets/images/${source.split(/[\\/]/).pop()}`); }
      }
    }
  }
  if (failed.length) console.log(`Capas sem conversão (arquivo de origem inválido): ${failed.length}.`);
}
writeFileSync(invalidIndex, `${JSON.stringify([...invalid], null, 2)}\n`);
console.log(`Miniaturas atualizadas: ${existingSources.length}; ausentes: ${missing.length}; total de capas encontradas: ${sources.size}.`);
