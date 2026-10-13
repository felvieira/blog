// Shared navigation, theme preference, related reading, and honest copy feedback.
const root = document.documentElement;
const themeKey = "felvieira-blog-theme";
const validThemes = ["light", "dark"];
let savedTheme = null;
try { savedTheme = localStorage.getItem(themeKey); } catch {}
const initialTheme = validThemes.includes(savedTheme)
  ? savedTheme
  : (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
root.dataset.theme = initialTheme;

document.querySelectorAll("nav.top").forEach((nav) => {
  if (!nav.querySelector(".theme-switch")) {
    nav.insertAdjacentHTML("beforeend", `<div class="theme-switch" role="group" aria-label="Escolher tema">
      <button type="button" data-theme-choice="light">Claro</button>
      <button type="button" data-theme-choice="dark">Escuro</button>
    </div>`);
  }
  const controls = [...nav.querySelectorAll("[data-theme-choice]")];
  const updateThemeControls = () => controls.forEach((button) => {
    const selected = button.dataset.themeChoice === root.dataset.theme;
    button.setAttribute("aria-pressed", String(selected));
  });
  controls.forEach((button) => button.addEventListener("click", () => {
    const theme = button.dataset.themeChoice;
    if (!validThemes.includes(theme)) return;
    root.dataset.theme = theme;
    try { localStorage.setItem(themeKey, theme); } catch {}
    updateThemeControls();
  }));
  updateThemeControls();
});

document.querySelectorAll("footer.post").forEach((footer) => {
  const source = footer.querySelector('a[href*="github.com/felvieira/blog"], a[href*="links.felvieira.com.br"]');
  if (!source) return;
  source.href = "https://links.felvieira.com.br/@felvieira.dev";
  source.textContent = "Meus links";
  if (document.querySelector("main article") && !footer.querySelector('a[href="../"]')) {
    source.insertAdjacentHTML("beforebegin", '<a href="../">Todos os artigos</a><span aria-hidden="true"> · </span>');
  }
});
document.querySelectorAll("button.copy-share").forEach((button) => {
  if (button.textContent.includes("Copiar texto do post")) button.textContent = "📋 Copiar resumo e link";
});

const article = document.querySelector("main article");
const share = document.querySelector(".share-block");
if (article && share) {
  const readingTime = document.querySelector(".meta .tag:last-child");
  if (readingTime) readingTime.textContent = readingTime.textContent.replace("min read", "min de leitura");
  const cover = document.querySelector("main > p > img");
  if (cover) { cover.fetchPriority = "high"; cover.decoding = "async"; }
  article.querySelectorAll("img").forEach((image) => { image.loading = "lazy"; image.decoding = "async"; });

  fetch("../posts-index.json")
    .then((response) => response.ok ? response.json() : [])
    .then((posts) => {
      if (!Array.isArray(posts)) return;
      const current = posts.find((post) => post.filename === location.pathname.split("/").pop());
      if (!current) return;
      const related = posts.filter((post) => post.filename !== current.filename && post.topic === current.topic).slice(0, 3);
      if (!related.length) return;
      const section = document.createElement("section");
      section.className = "related-posts";
      const heading = document.createElement("h2"); heading.textContent = "Continue lendo"; section.append(heading);
      related.forEach((post) => {
        const link = document.createElement("a"); link.href = post.filename; link.textContent = post.title;
        const meta = document.createElement("span"); meta.textContent = `${post.topic} · ${post.date}`; link.append(meta); section.append(link);
      });
      share.after(section);
    })
    .catch(() => {});
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button.copy-share");
  if (!button) return;
  const text = button.closest(".share-block")?.querySelector(".share-text")?.textContent?.trim();
  if (!text) return;
  let copied = false;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível");
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text; textarea.tabIndex = -1; textarea.setAttribute("aria-hidden", "true");
    textarea.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.append(textarea); textarea.select();
    try { copied = document.execCommand("copy"); } catch { copied = false; }
    textarea.remove();
  }
  const original = button.dataset.label || button.textContent;
  button.dataset.label = original;
  button.closest(".share-block")?.querySelector(".share-text")?.classList.toggle("visible-copy", !copied);
  button.textContent = copied ? "✓ Resumo e link copiados" : "Não foi possível copiar. Selecione o texto abaixo.";
  button.classList.toggle("copied", copied); button.classList.toggle("copy-failed", !copied);
  window.setTimeout(() => {
    button.textContent = original; button.classList.remove("copied", "copy-failed");
  }, 3500);
});
