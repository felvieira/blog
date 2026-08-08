# Repo Audit — blog (felvieira)

> Investigação direta (não é o pipeline completo da skill 18). Gerado para alimentar
> `.project-memory/manifest.yaml` via `/catalog-project`.

## Identidade

- Nome do repo: `blog`
- Owner: `felvieira` (GitHub)
- Remote: `https://github.com/felvieira/blog.git` (origin, fetch+push configurados)
- Live: https://felvieira.github.io/blog/
- HEAD atual: `eec4998939afc82c03fcfb7faa4e1ab178bdb741` (2026-08-05)

## Natureza do projeto

Blog estático pessoal de posts técnicos sobre IA/coding. **Não é um webapp** — não há
`package.json`, sem build step, sem framework de frontend, sem backend/API própria.
100% HTML/CSS/JS estático publicado via GitHub Pages (branch `main`, root path).

Conteúdo é gerado por um agente Claude Code usando a skill `dev-team-kit-fv:41-blog-publisher`
do kit externo `claude-skills-fv`: o usuário manda um assunto/texto, o Claude escreve o
post, gera imagens (fal.ai ou Playwright), monta o HTML a partir de `TEMPLATE.html`,
comita e faz push. Confirmado pelo README.md (seção "Como funciona") e pelos scripts
`scripts/new-post.mjs` / `scripts/update-index.mjs`.

## Stack (evidência: arquivos do repo, sem package.json)

- **Runtime dos scripts:** Node.js (`v22.23.2` local), executado com `node` puro —
  scripts usam ESM nativo (`.mjs`) e `process.loadEnvFile`, sem dependências de npm
  (nenhum `node_modules`, nenhum `package.json` no repo).
- **Frontend/site:** HTML estático puro + CSS (`assets/css/post.css`, dark mode) + JS
  vanilla (`assets/js/share.js` — botão de copiar texto do LinkedIn).
- **Hospedagem:** GitHub Pages, branch `main`, root (`.nojekyll` presente — desativa
  processamento Jekyll, serve os arquivos como estão).
- **Sem banco de dados, sem auth, sem API própria.**

## Scripts

- `scripts/new-post.mjs` — cria `posts/YYYY-MM-DD-slug.html` a partir de `TEMPLATE.html`,
  preenche placeholders (title, excerpt, cover, share block), roda `update-index.mjs`
  automaticamente, e opcionalmente dispara webhook pessoal do LinkedIn
  (`LINKEDIN_WEBHOOK_URL` via `.env`, gitignored).
- `scripts/update-index.mjs` — regenera `index.html` (hero + secundários + lista) e o
  bloco `<!-- BLOG_INDEX_START/END -->` do `README.md`, extraindo title/date/lang/excerpt
  de cada arquivo em `posts/`.

## Conteúdo

- **19 posts** publicados em `posts/*.html`, todos em pt-BR, sobre IA/LLMs/agents/coding
  (RAG, MCP, RL, vector DBs, AI agents, Claude Code, etc.) — extraído de `README.md` e
  contagem direta de `posts/*.html`.
- Imagens em `assets/images/` (cover + 2-3 inline por post), geradas via fal.ai
  (`gemini-25-flash` conforme README) ou Playwright screenshot.
- `posts-source/` tem 2 arquivos (`.en.md` + `.pt-BR.md`) de um post específico
  ("honest-review-24-claude-code-tools") — parece ser fonte/rascunho bilíngue, caso
  isolado (não é o padrão dos demais posts).

## Documentação existente

- `README.md` — explica o propósito do blog, como funciona (skill 41), lista de posts
  (índice auto-gerado), estrutura de pastas, stack, licença (CC-BY-4.0 texto +
  Apache-2.0 código).
- `docs/SPEC-web-publisher.md` — spec completa e autocontida para replicar a skill 41
  como um webapp externo (Next.js + serverless + Anthropic API + fal.ai + GitHub Contents
  API). É uma spec de um sistema **proposto**, não implementado neste repo — não confundir
  com stack real do blog atual.

## Operações

- `.env` (gitignored) contém `LINKEDIN_WEBHOOK_URL` — endpoint pessoal (n8n/automation em
  `automate.felvieira.com.br`) que `new-post.mjs` chama opcionalmente após publicar, para
  notificar/enviar o texto pronto pro LinkedIn. Não há `.env.example`.
- Nenhum CI configurado (sem `.github/workflows/`). Deploy é implícito: push para `main`
  → GitHub Pages rebuilda.
- Nenhum `docker-compose.yml`, `vercel.json`, ou infra declarada — hospedagem é 100%
  GitHub Pages nativo.

## Sem evidência (omitido do manifest)

- Sem `docs/context/session-*.md` → seção `sessions` omitida.
- Sem `docs/pricing*`, `docs/landing*`, `CHANGELOG.md` → não há copy de produto/pricing
  para extrair (não é um produto comercial, é um blog pessoal).
- Sem métricas coletadas (analytics, uptime, etc.) em nenhum doc do repo.

## Status

`active` — commits recentes e frequentes (últimos 5 commits todos de posts/fixes,
o mais recente de 2026-08-05/06).
