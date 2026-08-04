# Spec — Web App "Blog Publisher" (postar de fora, sem Claude Code local)

> **Como usar este documento:** cole ele inteiro numa IA de codificação (Claude, Cursor,
> v0, Bolt, etc.) e diga *"construa este sistema seguindo a spec"*. Ele é autocontido:
> arquitetura, stack, contratos de API, o system prompt do gerador, e o passo a passo.
> O objetivo é replicar, num web app externo, o que hoje a skill 41 (`blog-publisher`)
> faz localmente via Claude Code.

---

## 1. Objetivo

Um web app onde um usuário abre no navegador, digita um **assunto** (ou cola um texto/URL),
e o sistema:

1. Escreve um **post de blog autoral em PT-BR** (voz própria, sem creditar fonte).
2. Gera **1 imagem de capa + 2-3 imagens inline** via fal.ai.
3. Gera um **hook misterioso + texto pronto pro LinkedIn**.
4. Monta o **HTML** a partir de um template fixo.
5. **Publica** commitando no repositório GitHub Pages (`felvieira/blog`).
6. Retorna a **URL pública** do post.

Tudo sem depender do Claude Code rodando na máquina de ninguém.

---

## 2. Arquitetura

```
┌────────────────┐   POST /api/publish   ┌──────────────────────────┐
│  Frontend       │ ────────────────────▶ │  Serverless function      │
│  (form simples) │   { input, mode }     │  (guarda TODAS as chaves) │
│                 │ ◀──────────────────── │                           │
│  mostra a URL   │   { url, slug }       │  1. Claude API → texto     │
└────────────────┘                        │  2. fal.ai → imagens       │
                                          │  3. monta HTML (template)  │
                                          │  4. GitHub API → commit    │
                                          │  5. commit update-index    │
                                          └──────────────────────────┘
                                                       │
                                                       ▼
                                          GitHub Pages builda (~30s)
                                                       │
                                                       ▼
                                          https://felvieira.github.io/blog/posts/...
```

**Por que precisa de backend (não pode ser só frontend):** as 3 chaves
(`ANTHROPIC_API_KEY`, `FAL_AI_API_KEY`, `GITHUB_TOKEN`) são segredos. No navegador
qualquer um as rouba. O frontend é público; o backend é privado e guarda os segredos.

---

## 3. Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | Next.js (App Router) ou HTML+JS puro | Trivial: um form + um fetch |
| Backend | **Serverless** — Next.js Route Handler (`app/api/publish/route.ts`), ou Vercel/Cloudflare/Netlify Function | Não precisa servidor 24/7; roda sob demanda |
| LLM | Anthropic API (`@anthropic-ai/sdk`), modelo `claude-sonnet-5` (ou o mais capaz disponível) | É o cérebro que escreve o post |
| Imagem | fal.ai REST, modelo `fal-ai/flux-2-flash` (text-to-image, barato) | Mesmo default da skill 41 |
| Publicação | GitHub REST **Contents API** (`@octokit/rest`) | Reaproveita 100% do blog estático atual |
| Hospedagem | Vercel (deploy do Next.js + as env vars) | Uma env var por chave, deploy git-push |

> Alternativa de publicação: `workflow_dispatch` do GitHub Actions em vez de commit
> direto. Mais desacoplado, porém com latência maior. Comece com Contents API.

---

## 4. Variáveis de ambiente (segredos do backend)

```
ANTHROPIC_API_KEY=sk-ant-...
FAL_AI_API_KEY=...                # fal.ai
GITHUB_TOKEN=ghp_...              # PAT fine-grained com escopo "Contents: read/write" no repo blog
GITHUB_OWNER=felvieira
GITHUB_REPO=blog
PAGES_BASE=https://felvieira.github.io/blog
```

---

## 5. Contrato da API

### `POST /api/publish`

**Request:**
```json
{
  "input": "assunto livre OU texto colado OU uma URL",
  "mode": "subject | text | url",   // opcional; backend infere se ausente
  "lang": "pt-BR"                    // default pt-BR
}
```

**Response (sucesso):**
```json
{
  "ok": true,
  "url": "https://felvieira.github.io/blog/posts/2026-08-04-titulo-slug.html",
  "slug": "titulo-slug",
  "title": "Título do post",
  "commit": "https://github.com/felvieira/blog/commit/abc123"
}
```

**Response (erro):** `{ "ok": false, "error": "mensagem legível" }` com status 4xx/5xx.

> Como a geração leva ~30-90s (texto + N imagens), considere: (a) timeout alto na
> function, ou (b) padrão assíncrono — retorna `jobId` na hora e o frontend faz polling
> em `GET /api/status/:jobId`. Para MVP, síncrono com timeout de 120s basta.

---

## 6. Passo a passo do backend (a "skill 41 como código")

### Passo 1 — Escrever o post (Claude API)

Chamar a Anthropic API com o **system prompt** da seção 8. O modelo retorna um JSON
estruturado (use tool-use / structured output pra garantir o formato):

```json
{
  "title": "...",
  "slug": "kebab-case-sem-acento-max-50",
  "excerpt": "resumo autoral ~2 frases, sem citar fonte",
  "body_html": "<p>...</p><h2>...</h2>...",  // fragmentos, sem <html>/<head>/<body>
  "share_hook": "hook misterioso 1-2 frases",
  "linkedin_text": "texto pronto pro LinkedIn com \\n e hashtags",
  "image_prompts": [
    { "slot": "cover", "prompt": "..." },
    { "slot": "1-tema", "prompt": "..." },
    { "slot": "2-tema", "prompt": "..." },
    { "slot": "3-tema", "prompt": "..." }
  ]
}
```

Se `mode=url`: faça fetch do conteúdo da URL antes e passe como contexto de pesquisa
(a URL é **insumo**, nunca creditada — ver regra de abstração no system prompt).

### Passo 2 — Gerar as imagens (fal.ai)

Para cada item de `image_prompts`, chamar fal.ai `flux-2-flash`:
- cover: 1500×750 (aspect 2:1)
- inline: ~1200×675
- Baixar o binário resultante. Nomear: `{YYYY-MM-DD}-{slug}-cover.jpg` e
  `{YYYY-MM-DD}-{slug}-{N}-{tema}.jpg`.

### Passo 3 — Inserir imagens inline no body

Antes do `<h2>`/`<h3>` de cada seção principal, injetar:
```html
<p><img src="../assets/images/{nome}.jpg" alt="{descrição acessível}"></p>
```
(a IA que escreve pode já marcar onde vão, ou o backend distribui uniformemente.)

### Passo 4 — Montar o HTML (template fixo)

Usar o template da seção 7, substituindo os placeholders. Calcular:
- `reading_time` = `max(1, round(palavras / 220))`
- `date_human` = data por extenso em pt-BR (ex: "4 de agosto de 2026")
- `date_iso` = `YYYY-MM-DD`
- `cover_image_url` = `{PAGES_BASE}/assets/images/{slug}-cover.jpg`
- `cover_img_tag` = `<img src="../assets/images/{slug}-cover.jpg" alt="{title} — cover" style="width:100%;height:auto;border-radius:8px;margin:24px 0 32px;border:1px solid var(--border)">`
- `filename` = `{date_iso}-{slug}.html`

### Passo 5 — Publicar (GitHub Contents API)

Para cada arquivo (o HTML + cada imagem), fazer `PUT /repos/{owner}/{repo}/contents/{path}`
com o conteúdo em **base64**:
- HTML → `posts/{filename}`
- imagens → `assets/images/{nome}.jpg`

Depois, **regenerar o index**: baixar a lista de `posts/`, reconstruir o bloco entre
`<!-- POSTS_START -->` e `<!-- POSTS_END -->` no `index.html` e o bloco
`<!-- BLOG_INDEX_START/END -->` no `README.md`, e commitar. (Porta a lógica de
`scripts/update-index.mjs` do repo — extrai title/date/lang/excerpt de cada post e
ordena por data DESC.)

> Dica: junte tudo num único commit via a Git Data API (cria tree + commit) em vez de
> N chamadas Contents — mais atômico e uma build só do Pages.

### Passo 6 — Retornar a URL

`{PAGES_BASE}/posts/{filename}`. Opcional: fazer polling de `HEAD` na URL até dar 200
(Pages leva ~30s) antes de responder "publicado".

---

## 7. Template HTML (fixo — copiar exatamente)

Este é o `TEMPLATE.html` do repo. Placeholders `{{...}}` são substituídos pelo backend.
Requer que o repo já tenha `assets/css/post.css` e `assets/js/share.js` (já existem).

```html
<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{TITLE}} — felvieira's blog</title>
<meta name="description" content="{{EXCERPT}}">
<meta property="og:title" content="{{TITLE}}">
<meta property="og:description" content="{{EXCERPT}}">
<meta property="og:image" content="{{COVER_IMAGE_URL}}">
<meta property="og:type" content="article">
<link rel="stylesheet" href="../assets/css/post.css">
</head>
<body>
<nav class="top">
  <a class="brand" href="../">📝 felvieira's blog</a>
  <a href="https://github.com/felvieira" style="margin-left:auto">GitHub</a>
  <a href="https://github.com/felvieira/claude-skills-fv">Dev Team Kit</a>
</nav>

<main class="wrap">
  <h1>{{TITLE}}</h1>
  <p class="meta">
    <span>{{DATE_HUMAN}}</span>
    <span class="tag">{{LANG_LABEL}}</span>
    <span class="tag">{{READING_TIME}} min read</span>
  </p>

  {{COVER_IMG_TAG}}

  <article>
{{BODY_HTML}}
  </article>

  <section class="share-block">
    <p class="share-label">📣 Gostou? Compartilha no LinkedIn</p>
    <p class="share-hook">{{SHARE_HOOK}}</p>
    <div class="share-actions">
      <button type="button" class="copy-share">📋 Copiar texto do post</button>
      <a class="share-linkedin" href="https://www.linkedin.com/feed/?shareActive=true" target="_blank" rel="noopener">in Abrir LinkedIn</a>
    </div>
    <div class="share-text">{{LINKEDIN_TEXT}}</div>
  </section>

  <footer class="post">
    <span>{{DATE_HUMAN}}</span>
    <span><a href="https://github.com/felvieira/blog">felvieira's blog</a></span>
  </footer>
</main>
<script src="../assets/js/share.js"></script>
</body>
</html>
```

`{{LANG_LABEL}}` = `🇧🇷 Português` para pt-BR, `🌎 English` para en.

---

## 8. SYSTEM PROMPT do gerador de post (o coração — copiar para a chamada da Claude API)

```
Você é um escritor técnico que publica no blog do felvieira. Escreve posts AUTORAIS
em PT-BR sobre IA, engenharia de software e ferramentas de dev. Sua saída é SEMPRE um
objeto JSON válido (nada de texto fora do JSON).

PRINCÍPIO FUNDADOR — AUTORAL, NÃO ADAPTAÇÃO:
O post final deve soar como conhecimento próprio, escrito do zero. Se você recebeu uma
URL ou texto como insumo, ele é APENAS material de pesquisa — NUNCA um texto a ser
creditado ou adaptado.

REGRA DE ABSTRAÇÃO DE FONTE (crítico):
- NUNCA escreva "o autor", "o texto diz", "o post original", "a newsletter aponta",
  "segundo {nome de quem escreveu a fonte}", "como {fulano} mostra" quando {fulano} é
  apenas quem escreveu a fonte. Vire afirmação direta e autoral.
- NUNCA inclua footer "Fonte original", "adaptação de", "inspirado em", "crédito a",
  ou link para a newsletter/artigo-fonte.
- ABSTRAIA qualquer coisa pessoal do autor da fonte que não pertence ao assunto: plugs
  de "meu canal", "meu curso", "meu livro", "assine a newsletter", recomendações do
  YouTube/produto de terceiros. Isso some.
- MANTENHA nomes APENAS quando a pessoa é fonte técnica verificável e independente do
  conceito: autor de um paper citado, criador de um framework/modelo/empresa (ex: "o
  paper de Lewis et al. (2020) introduziu RAG", "a Anthropic definiu esses patterns").
  Na DÚVIDA, abstraia.
- MANTENHA links técnicos úteis (arxiv, docs oficiais, repos, ferramentas reais).
Critério-mestre: "essa menção é um fato do assunto, ou é um vínculo ao texto-fonte /
à pessoa que o escreveu?" — Fato do assunto fica; vínculo à fonte some.

ESTRUTURA DO POST:
- Hook forte de abertura (2-3 parágrafos que fisgam sem enrolação).
- Corpo com <h2> por seção principal, <h3> por subseção, <p>, <ul>, <pre><code>,
  <table>, <blockquote> quando fizer sentido. HTML semântico, fragmentos apenas
  (sem <html>/<head>/<body>). Paths de imagem relativos (../assets/images/...).
- 800-1500 palavras. Tom técnico-direto, primeira pessoa quando natural.
- Sem hype vazio, sem "delve into", sem "comprehensive", sem em-dashes em rajada
  (aplique anti-AI-writing: soar humano, não marketing genérico).

BLOCO LINKEDIN:
- share_hook: 1-2 frases com TOM DE MISTÉRIO/curiosidade sobre o que o post revela —
  faz querer ler, sem entregar a resposta.
- linkedin_text: texto pronto pra colar no LinkedIn. Hook de abertura + 2-3 linhas
  (com \n reais) do que a pessoa aprende + 1 linha de CTA + 3-5 hashtags relevantes.
  NÃO cite fonte/autor. NÃO inclua a URL (o sistema anexa depois).

IMAGENS:
- image_prompts: 1 "cover" (conceitual, representa o tema do post) + 2 a 3 inline
  (cada uma ilustra UMA seção, prompts DISTINTOS entre si — não 3 covers parecidas).
  Prompts em inglês, descritivos, estilo ilustração técnica limpa, sem texto na imagem.

SAÍDA — responda SOMENTE com este JSON:
{
  "title": "...",
  "slug": "kebab-case-sem-acento-max-50",
  "excerpt": "resumo autoral ~2 frases sem citar fonte",
  "body_html": "...",
  "share_hook": "...",
  "linkedin_text": "...",
  "image_prompts": [ { "slot": "cover", "prompt": "..." }, { "slot": "1-tema", "prompt": "..." } ]
}
```

**User message** enviada ao modelo: o `input` do usuário (assunto/texto/URL). Se for URL,
faça o fetch e injete o conteúdo extraído junto, marcado como "material de pesquisa".

---

## 9. Critérios de aceite (o que precisa ser verdade pra estar "pronto")

- [ ] `POST /api/publish` com um assunto retorna uma URL que abre um post real (HTTP 200).
- [ ] O post publicado tem: cover visível, 2-3 imagens inline, bloco `.share-block` com
      hook + botão copiar funcional, footer autoral.
- [ ] `grep` no HTML final NÃO acha "Fonte original", "adaptação", "segundo {autor}".
- [ ] `index.html` e `README.md` do repo listam o novo post (index regenerado).
- [ ] Nenhuma chave de API aparece no bundle do frontend (só no backend).
- [ ] Erro tratado: input vazio → 400; falha de imagem → post publica sem a inline que
      falhou (não quebra tudo); falha de commit → retorna erro legível, não deixa lixo.
- [ ] Botão "copiar" funciona no post publicado (contexto https do Pages).

---

## 10. Ordem de implementação sugerida

1. Repo Next.js + env vars + deploy vazio na Vercel (prova o pipeline de deploy).
2. `/api/publish` que só chama a Claude API e retorna o JSON (sem imagem, sem commit).
3. Adicionar fal.ai (gerar cover só) e ver o binário voltar.
4. Adicionar o commit via Octokit (publica HTML sem imagem primeiro, depois com).
5. Portar o `update-index` (regenerar index/README).
6. Frontend: form + loading + mostrar URL.
7. Tratar erros, timeout/async, e os critérios de aceite.

---

## 11. Referências do sistema atual (para fidelidade)

- Repo estático alvo: `github.com/felvieira/blog` (Pages na branch `main`, root).
- Estrutura: `posts/YYYY-MM-DD-slug.html`, `assets/css/post.css` (dark mode),
  `assets/js/share.js` (botão copiar), `index.html` (landing auto-gerada).
- Lógica de index a portar: `scripts/update-index.mjs` (extrai meta de cada post,
  ordena por data DESC, reescreve os blocos delimitados por comentários).
- Modelo de imagem default: `flux-2-flash` via fal.ai (text-to-image barato).
```
