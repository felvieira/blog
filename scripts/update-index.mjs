#!/usr/bin/env node
/**
 * update-index.mjs — Regenerate index.html post list + README index from posts/*.html
 *
 * Used by skill 41 (blog-publisher) after creating a new post. Idempotent.
 *
 * Multi-user: reads ~/.dev-team-kit/blog-config.json (or DEVKIT_BLOG_CONFIG)
 * to derive the title suffix to strip (e.g. " — username's blog").
 *
 * For each HTML in posts/, extracts:
 *   - title (from <title> tag, strips " — {github_user}'s blog" suffix if found)
 *   - date (from filename YYYY-MM-DD-slug.html)
 *   - lang (from <html lang>)
 *   - excerpt (from <meta description>)
 *
 * Then sorts by date DESC and updates:
 *   - index.html: HTML list between <!-- POSTS_START --> and <!-- POSTS_END -->
 *   - README.md: markdown list between <!-- BLOG_INDEX_START --> and <!-- BLOG_INDEX_END -->
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { updateSeo } from "./update-seo.mjs";

const ROOT      = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const POSTS_DIR = join(ROOT, "posts");
const INDEX     = join(ROOT, "index.html");
const README    = join(ROOT, "README.md");
const POSTS_INDEX = join(ROOT, "posts-index.json");
const INVALID_COVERS = join(ROOT, "assets", "images", "thumbs", ".invalid.json");
const invalidCovers = existsSync(INVALID_COVERS) ? new Set(JSON.parse(readFileSync(INVALID_COVERS, "utf8"))) : new Set();

// ─── Load blog config (multi-user friendly) ──────────────────────────────────
function loadBlogConfig() {
  const configPath = process.env.DEVKIT_BLOG_CONFIG
    || join(homedir(), ".dev-team-kit", "blog-config.json");
  if (!existsSync(configPath)) return { github_user: "user" };
  return JSON.parse(readFileSync(configPath, "utf8"));
}
const config = loadBlogConfig();
// Build a tolerant regex that strips either "{user}'s blog" or any "X's blog"
const titleSuffixRe = new RegExp(` — ${config.github_user}'s blog$|—[^—]*'s blog$`);

// Small WebP covers keep the archive light. ImageMagick is optional; when it
// is unavailable, cards keep their original cover rather than breaking builds.
const THUMBS_DIR = join(ROOT, "assets", "images", "thumbs");
function thumbnailFor(cover) {
  if (!cover || !cover.startsWith("assets/images/")) return cover;
  if (cover.startsWith("assets/images/thumbs/")) return cover;
  if (invalidCovers.has(cover)) return "";
  const source = join(ROOT, cover);
  if (!existsSync(source)) return "";
  const thumb = join(THUMBS_DIR, `${cover.slice("assets/images/".length).replace(/\.[^.]+$/, "")}.webp`);
  try {
    if (!existsSync(thumb) || statSync(source).mtimeMs > statSync(thumb).mtimeMs) {
      execFileSync("magick", [source, "-auto-orient", "-thumbnail", "800x800^", "-gravity", "center", "-extent", "800x800", "-strip", "-quality", "76", thumb], { stdio: "ignore" });
    }
    return existsSync(thumb) ? `assets/images/thumbs/${thumb.split(/[\\/]/).pop()}` : cover;
  } catch {
    return cover;
  }
}

function extractPostMeta(filename) {
  const html  = readFileSync(join(POSTS_DIR, filename), "utf8");
  const title = (html.match(/<title>([^<]+)<\/title>/)?.[1] ?? filename)
                   .replace(titleSuffixRe, "");
  const lang  = html.match(/<html lang="([^"]+)"/)?.[1] ?? "en";
  const desc  = html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "";
  const date  = filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
  // Cover: prefer the body <img> src (relative), fall back to og:image (absolute URL).
  // Body <img> gives a repo-relative path we can reuse as posts/<img> from the index root.
  let cover = "";
  const bodyImg = html.match(/<img[^>]+src="\.\.\/(assets\/images\/[^"]+)"/);
  if (bodyImg) cover = bodyImg[1];
  else {
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? "";
    // og:image may be an absolute Pages URL — keep only the assets/... tail if present
    const tail = og.match(/(assets\/images\/[^"]+)$/);
    cover = tail ? tail[1] : og;
  }
  const readMin = html.match(/(\d+)\s*min(?: read| de leitura)/)?.[1] ?? "";
  const content = html.match(/<article>([\s\S]*?)<\/article>/)?.[1] ?? "";
  const topic = classifyTopic(`${title} ${desc} ${content.slice(0, 1500)}`);
  const thumbnail = thumbnailFor(cover);
  return { filename: encodeURIComponent(filename), title, lang, excerpt: desc, date, cover: thumbnail.startsWith('assets/') ? thumbnail.split('/').map(encodeURIComponent).join('/') : thumbnail, readMin, topic };
}

function classifyTopic(text) {
  const value = text.toLocaleLowerCase("pt-BR");
  if (/benchmark|testei|testes|experimento|comfyui|gpu|modelo local|comparativo/.test(value)) return "Experimentos";
  if (/agente|agent|mcp|llm|ia |inteligência artificial|modelo de ia|openai|claude|gemini|gpt|rag|harness/.test(value)) return "IA e agentes";
  if (/carreira|vendas|produto|marketing|negócio|empresa|cliente|equipe|liderança/.test(value)) return "Produto e carreira";
  return "Desenvolvimento";
}

const posts = readdirSync(POSTS_DIR)
  .filter(f => f.endsWith(".html"))
  .map(extractPostMeta)
  .sort((a, b) => b.date.localeCompare(a.date));

// ISO date (YYYY-MM-DD) -> short BR format (DD/MM/YYYY) for landing cards.
const dateShort = p => {
  const [y, m, d] = p.date.split("-");
  return y && m && d ? `${d}/${m}/${y}` : p.date;
};
// Card byline: "DD/MM/YYYY · N min de leitura" (language is only flagged when not pt-BR).
const metaLine = p => [
  dateShort(p),
  p.readMin && `${p.readMin} min de leitura`,
  p.lang !== "pt-BR" && "🌎 English",
].filter(Boolean).join(" · ");

// Featured = up to 3 newest (1 hero + 2 secondary); rest = compact list with thumbnail.
const featured = posts.slice(0, 3);
const rest     = posts.slice(3);

function heroCard(p) {
  return `      <a class="feat-hero${p.cover ? "" : " no-img"}" href="posts/${p.filename}" data-topic="${escapeHtml(p.topic)}" data-search="${escapeHtml(`${p.title} ${p.excerpt}`.toLocaleLowerCase("pt-BR"))}">
        ${p.cover ? `<img class="feat-hero-img" src="${p.cover}" alt="" width="800" height="450" fetchpriority="high">` : ""}
        <div class="feat-hero-body">
          <p class="meta">${metaLine(p)}</p>
          <h2>${escapeHtml(p.title)}</h2>
          ${p.excerpt ? `<p class="excerpt">${escapeHtml(p.excerpt)}</p>` : ""}
        </div>
      </a>`;
}

function secondaryCard(p) {
  return `        <a class="feat-sec${p.cover ? "" : " no-img"}" href="posts/${p.filename}" data-topic="${escapeHtml(p.topic)}" data-search="${escapeHtml(`${p.title} ${p.excerpt}`.toLocaleLowerCase("pt-BR"))}">
          ${p.cover ? `<img class="feat-sec-img" src="${p.cover}" alt="" width="800" height="800" loading="lazy">` : ""}
          <div class="feat-sec-body">
            <p class="meta">${metaLine(p)}</p>
            <h3>${escapeHtml(p.title)}</h3>
          </div>
        </a>`;
}

function listItem(p) {
  return `      <a class="list-item${p.cover ? "" : " no-img"}" href="posts/${p.filename}" data-topic="${escapeHtml(p.topic)}" data-search="${escapeHtml(`${p.title} ${p.excerpt}`.toLocaleLowerCase("pt-BR"))}">
        ${p.cover ? `<img class="list-thumb" src="${p.cover}" alt="" width="800" height="533" loading="lazy">` : ""}
        <div class="list-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="meta">${metaLine(p)}</p>
          ${p.excerpt ? `<p class="excerpt">${escapeHtml(p.excerpt)}</p>` : ""}
        </div>
      </a>`;
}

const featuredHtml = featured.length
  ? `    <section class="featured">
${featured[0] ? heroCard(featured[0]) : ""}
${featured.length > 1 ? `      <div class="feat-secondary">
${featured.slice(1).map(secondaryCard).join("\n")}
      </div>` : ""}
    </section>`
  : "";

const restHtml = rest.length
  ? `    <section class="post-list">
      <h2 class="section-label" id="arquivo">Artigos recentes</h2>
${rest.map(listItem).join("\n")}
      <nav class="pagination" aria-label="Paginação dos artigos" hidden></nav>
    </section>`
  : "";

const indexHtml = [featuredHtml, restHtml].filter(Boolean).join("\n");

const indexFile = readFileSync(INDEX, "utf8");
const indexUpdated = indexFile.replace(
  /<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/,
  `<!-- POSTS_START -->\n${indexHtml}\n    <!-- POSTS_END -->`,
);
// Remove "no posts" placeholder when we have posts
const indexFinal = posts.length > 0
  ? indexUpdated.replace(/\s*<div class="index-item"[^>]*>\s*No posts yet[^<]*<\/div>/, "")
  : indexUpdated;
writeFileSync(INDEX, indexFinal.replace(/<!-- POST_COUNT -->\d+/, `<!-- POST_COUNT -->${posts.length}`).replace(/[ \t]+$/gm, ""));
writeFileSync(POSTS_INDEX, JSON.stringify(posts.map(({ filename, title, date, topic }) => ({ filename, title, date: dateShort({ date }), topic })), null, 2));

// Build README markdown list
const readmeList = posts.length === 0
  ? "*No posts yet.*"
  : posts.map(p => `- **${p.date}** — [${p.title}](posts/${p.filename}) (${p.lang === "pt-BR" ? "🇧🇷 PT" : "🌎 EN"})`).join("\n");

const readmeFile = readFileSync(README, "utf8");
const readmeUpdated = readmeFile.replace(
  /<!-- BLOG_INDEX_START -->[\s\S]*?<!-- BLOG_INDEX_END -->/,
  `<!-- BLOG_INDEX_START -->\n${readmeList}\n<!-- BLOG_INDEX_END -->`,
);
writeFileSync(README, readmeUpdated);

console.log(`Index updated: ${posts.length} post(s).`);
updateSeo();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
