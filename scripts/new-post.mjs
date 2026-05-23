#!/usr/bin/env node
/**
 * new-post.mjs — Scaffolds a new post from TEMPLATE.html
 *
 * Usage:
 *   node scripts/new-post.mjs --slug=my-post-title --title="My Post Title" \
 *     --lang=en --excerpt="Short description" --cover=assets/images/my-cover.png \
 *     --body=path/to/body.html
 *
 * The body file should be HTML fragments (no <html>, <head>, <body> wrappers).
 *
 * Output: posts/YYYY-MM-DD-slug.html
 * Then runs update-index.mjs automatically.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT     = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const TEMPLATE = join(ROOT, "TEMPLATE.html");

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => { const [k, ...v] = a.slice(2).split("="); return [k, v.join("=")]; }),
);

const required = ["slug", "title", "lang", "excerpt", "body"];
for (const k of required) {
  if (!args[k]) { console.error(`Missing --${k}`); process.exit(1); }
}

// ─── Build post ──────────────────────────────────────────────────────────────
const today    = new Date().toISOString().slice(0, 10);
const filename = `${today}-${args.slug}.html`;
const outPath  = join(ROOT, "posts", filename);

if (existsSync(outPath)) {
  console.error(`Already exists: ${outPath}`);
  process.exit(1);
}

if (!existsSync(args.body)) {
  console.error(`Body file not found: ${args.body}`);
  process.exit(1);
}

const bodyHtml = readFileSync(args.body, "utf8");
const tmpl     = readFileSync(TEMPLATE, "utf8");

const readingTime = Math.max(1, Math.round(bodyHtml.split(/\s+/).length / 220));
const dateHuman   = new Date(today).toLocaleDateString(args.lang === "pt-BR" ? "pt-BR" : "en-US", {
  year: "numeric", month: "long", day: "numeric",
});

const langLabel = args.lang === "pt-BR" ? "🇧🇷 Português" : "🌎 English";
const coverUrl  = args.cover
  ? `https://felvieira.github.io/blog/${args.cover}`
  : "https://opengraph.githubassets.com/1/felvieira/blog";

const html = tmpl
  .replaceAll("{{LANG}}", args.lang)
  .replaceAll("{{TITLE}}", args.title)
  .replaceAll("{{EXCERPT}}", args.excerpt)
  .replaceAll("{{COVER_IMAGE_URL}}", coverUrl)
  .replaceAll("{{DATE_HUMAN}}", dateHuman)
  .replaceAll("{{DATE_ISO}}", today)
  .replaceAll("{{LANG_LABEL}}", langLabel)
  .replaceAll("{{READING_TIME}}", String(readingTime))
  .replaceAll("{{FILENAME}}", filename)
  .replace("{{BODY_HTML}}", bodyHtml);

writeFileSync(outPath, html);
console.log(`Created: posts/${filename}`);

// ─── Update index ────────────────────────────────────────────────────────────
execSync(`node ${join(ROOT, "scripts", "update-index.mjs")}`, { stdio: "inherit" });

console.log(`\nNext steps:`);
console.log(`  cd ${ROOT}`);
console.log(`  git add . && git commit -m "post: ${args.title}" && git push`);
console.log(`\nURL after push: https://felvieira.github.io/blog/posts/${filename}`);
