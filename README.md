# Blog — felvieira

Posts técnicos sobre IA coding, Dev Team Kit, e ferramentas pra dev.

🌐 **Live:** https://felvieira.github.io/blog/

## Como funciona

Os posts são gerados automaticamente pela **skill 41 do Dev Team Kit** (`dev-team-kit-fv:41-blog-publisher`).

Eu mando texto ou assunto pro Claude → ele gera HTML + imagens (via skill 17 fal.ai ou skill 42 Playwright) → commit/push aqui → publica via GitHub Pages → retorna URL.

## Posts

<!-- BLOG_INDEX_START -->
<!-- BLOG_INDEX_END -->

## Estrutura

```
blog/
├── index.html              ← landing page com lista de posts
├── posts/
│   └── YYYY-MM-DD-slug.html
├── assets/
│   ├── css/
│   │   └── post.css        ← estilo compartilhado
│   └── images/             ← imagens por post
└── _config.yml             ← config opcional Pages
```

## Tech

- HTML estático puro (sem build step)
- CSS dark mode próprio
- Imagens: fal.ai (gemini-25-flash padrão) ou Playwright screenshots
- GitHub Pages na branch `main` root path
- License: CC-BY-4.0 (texto) + Apache-2.0 (código nos snippets)
