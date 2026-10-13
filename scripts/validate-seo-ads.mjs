import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { enhancePage } from "./update-seo.mjs";

const root = new URL("../", import.meta.url);
const read = file => readFileSync(join(fileURLToPath(root), file), "utf8");
const config = JSON.parse(read("site.config.json"));
const files = ["index.html", ...readdirSync(new URL("posts/", root)).filter(f => f.endsWith(".html")).map(f => `posts/${f}`)];
const sitemap = read("sitemap.xml");
for (const file of files) {
  const html = read(file);
  const head = html.match(/<head>(.*?)<\/head>/s)[1];
  assert.equal((head.match(/rel="canonical"/g) || []).length, 1, file);
  assert.equal((html.match(/src="(?:\.\.\/)?assets\/js\/ads.js"/g) || []).length, 1, file);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.ok(schema.description && schema.author.name, file);
  assert.equal(schema["@type"], file === "index.html" ? "Blog" : "BlogPosting", file);
  for (const image of schema.image || []) {
    assert.ok(existsSync(new URL(image.replace(config.url, ""), root)), `${file}: ${image}`);
  }
  const enhanced = enhancePage(html, file, config);
  assert.equal(enhanced.html, html, `Idempotência: ${file}`);
  if (enhanced.canonical === enhanced.pageUrl && !enhanced.noindex) assert.ok(sitemap.includes(`<loc>${enhanced.pageUrl}</loc>`), file);
}
const syndicated = enhancePage('<html lang="pt-BR"><head><title>Teste &amp; segurança</title><meta name="description" content="Texto &quot;seguro&quot;"><meta name="robots" content="noindex"><link rel="canonical" href="https://example.com/original"></head><body><main></main></body></html>', 'posts/2026-01-01-teste.html', config);
assert.equal(syndicated.canonical, 'https://example.com/original');
assert.equal(syndicated.noindex, true);
assert.equal(enhancePage(syndicated.html, 'posts/2026-01-01-teste.html', config).html, syndicated.html);

async function checkAds({ enabled = true, width = true, origin = new URL(config.url).origin, pathname = new URL(config.url).pathname, invalid = false, fail = false } = {}) {
  const appended = [];
  let listener;
  const media = { matches: width, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = null; } };
  const sandbox = {
    URL, location: { origin, pathname }, matchMedia: () => media,
    fetch: async () => ({ ok: !fail, json: async () => ({ ...config, ads: { ...config.ads, enabled, ...(invalid ? { publisherId: 'invalid' } : {}) } }) }),
    document: { currentScript: { src: new URL('assets/js/ads.js', config.url).href }, querySelector: () => appended[0], createElement: () => ({ dataset: {} }), head: { append: s => appended.push(s) } }
  };
  runInNewContext(read('assets/js/ads.js'), sandbox);
  await new Promise(resolve => setImmediate(resolve));
  return { appended, media, getListener: () => listener };
}
for (const options of [{ enabled: false }, { origin: 'http://127.0.0.1:8766' }, { pathname: '/another-site/' }, { invalid: true }, { fail: true }]) {
  assert.equal((await checkAds(options)).appended.length, 0);
}
const desktop = await checkAds();
assert.equal(desktop.appended.length, 1);
assert.equal(desktop.appended[0].src, `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.ads.publisherId}`);
assert.equal(desktop.getListener(), null);
const mobile = await checkAds({ width: false });
assert.equal(mobile.appended.length, 0);
mobile.media.matches = true;
mobile.getListener()();
assert.equal(mobile.appended.length, 1);
assert.equal(mobile.getListener(), null);
console.log(`OK: SEO de ${files.length} páginas, canonical externo/noindex, idempotência e AdSense ligado/desligado/local/mobile.`);
