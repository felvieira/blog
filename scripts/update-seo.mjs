#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, resolve } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
function decode(value) {
  return String(value).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|#39|nbsp);/gi, (entity, code) => {
    if (code.startsWith("#")) return String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[code.toLowerCase()] ?? entity;
  });
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
}
function meta(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    if (attrs.name === key || attrs.property === key) return attrs.content ?? "";
  }
  return "";
}

export function enhancePage(html, filename, config, fallbackImage = "") {
  const isHome = filename === "index.html";
  const pageUrl = new URL(isHome ? "" : filename.split('/').map(encodeURIComponent).join('/'), config.url).href;
  const existingCanonical = (html.match(/<link\b[^>]*>/gi) ?? []).map(attributes).find(attrs => attrs.rel === "canonical")?.href;
  const oldSelfUrl = new URL(isHome ? "" : filename, config.url).href;
  const canonical = existingCanonical && existingCanonical !== oldSelfUrl ? new URL(existingCanonical, pageUrl).href : pageUrl;
  if (!/^https?:\/\//.test(canonical)) throw new Error(`Canonical inválida: ${filename}`);
  const title = isHome ? config.title : decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/ — [^—]*'s blog$/, "");
  const description = isHome ? config.description : meta(html, "description");
  const language = attributes(html.match(/<html\b[^>]*>/i)?.[0] ?? "").lang || "pt-BR";
  const date = filename.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  const robots = meta(html, "robots") || "index, follow, max-image-preview:large";
  let image = meta(html, "og:image");
  if (image) {
    let asset = image.match(/assets\/images\/[^?#]+/)?.[0];
    if (asset && !existsSync(join(ROOT, asset))) asset = decodeURIComponent(asset);
    const thumbnail = asset?.startsWith("assets/images/thumbs/") ? asset : asset?.replace("assets/images/", "assets/images/thumbs/").replace(/\.[^.]+$/, ".webp");
    image = thumbnail && existsSync(join(ROOT, thumbnail)) ? new URL(thumbnail.split('/').map(encodeURIComponent).join('/'), config.url).href : "";
  }
  image ||= fallbackImage;
  const author = { "@type": "Person", name: config.author.name, url: config.author.url };
  const schema = isHome
    ? { "@context": "https://schema.org", "@type": "Blog", "@id": config.url + "#blog", url: canonical, name: config.name, description, inLanguage: language, author }
    : { "@context": "https://schema.org", "@type": "BlogPosting", "@id": pageUrl + "#article", mainEntityOfPage: canonical, url: pageUrl, headline: title, description, inLanguage: language, datePublished: date, author, ...(image ? { image: [image] } : {}), isPartOf: { "@id": config.url + "#blog" } };
  const tags = [
    `<link rel="canonical" href="${escape(canonical)}">`,
    `<meta name="author" content="${escape(config.author.name)}">`,
    `<meta name="robots" content="${escape(robots)}">`,
    `<meta property="og:site_name" content="${escape(config.name)}">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:url" content="${escape(canonical)}">`,
    `<meta property="og:type" content="${isHome ? "website" : "article"}">`,
    `<meta property="og:locale" content="${escape(language.replace("-", "_"))}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${escape(title)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
    ...(image ? [`<meta property="og:image" content="${escape(image)}">`, `<meta property="og:image:alt" content="${escape(title)}">`, `<meta name="twitter:image" content="${escape(image)}">`] : []),
    ...(!isHome && date ? [`<meta property="article:published_time" content="${date}">`, `<meta property="article:author" content="${escape(config.author.url)}">`] : []),
    `<link rel="sitemap" type="application/xml" href="${escape(new URL("sitemap.xml", config.url).href)}">`,
    `<meta name="google-adsense-account" content="${escape(config.ads.publisherId)}">`,
    `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
    `<script src="${isHome ? "" : "../"}assets/js/ads.js" defer></script>`
  ];
  html = html.replace(/<head>([\s\S]*?)<\/head>/i, (_, original) => {
    let head = original.replace(/\n?<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->\n?/g, "\n");
    head = head.replace(/<meta\b[^>]*>\s*/gi, tag => {
      const attrs = attributes(tag);
      return /^(og:|twitter:|article:)/.test(attrs.property || attrs.name || "") || ["robots", "author", "google-adsense-account"].includes(attrs.name) ? "" : tag;
    }).replace(/<link\b[^>]*>\s*/gi, tag => ["canonical", "sitemap"].includes(attributes(tag).rel) ? "" : tag);
    if (isHome) head = head.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(config.title)}</title>`).replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escape(description)}">`);
    return `<head>${head.trimEnd()}\n<!-- SEO_START -->\n${tags.join("\n")}\n<!-- SEO_END -->\n</head>`;
  });
  html = html.replace(/<(main|nav)\b([^>]*)>/g, (tag, name, attrs) => {
    if ((name === "main" || /class="top"/.test(attrs)) && !attrs.includes("google-side-rail-overlap")) return `<${name}${attrs} google-side-rail-overlap="false">`;
    return tag;
  });
  return { html, canonical, pageUrl, noindex: /noindex/i.test(robots) };
}

export function updateSeo() {
  const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
  const posts = readdirSync(join(ROOT, "posts")).filter(file => file.endsWith(".html")).sort().reverse();
  const cover = readdirSync(join(ROOT, "assets/images/thumbs")).filter(file => file.endsWith(".webp")).sort().reverse()[0];
  const fallbackImage = cover ? new URL(`assets/images/thumbs/${cover}`, config.url).href : "";
  const urls = [];
  let changed = 0;
  for (const filename of ["index.html", ...posts.map(file => `posts/${file}`)]) {
    const path = join(ROOT, filename);
    const original = readFileSync(path, "utf8");
    const result = enhancePage(original, filename, config, filename === "index.html" ? fallbackImage : "");
    if (result.html !== original) { writeFileSync(path, result.html); changed++; }
    if (result.canonical === result.pageUrl && !result.noindex) urls.push(result.pageUrl);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escape(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
  writeFileSync(join(ROOT, "sitemap.xml"), sitemap);
  console.log(`SEO: ${changed} páginas atualizadas; ${urls.length} URLs canônicas no sitemap.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) updateSeo();
