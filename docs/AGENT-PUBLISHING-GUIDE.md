# Guia de publicação para agentes (Grok Bot, ou qualquer outro)

Este documento é o manual de instruções pra qualquer agente com acesso a terminal
publicar posts neste blog, seguindo exatamente o mesmo processo usado por Claude
Code nas sessões anteriores.

## Como o sistema funciona

O blog é **HTML estático puro**, hospedado no **GitHub Pages**. Não existe build
step, framework, nem CI/CD especial. A "automação" é só:

```
1 arquivo .html por post → git commit → git push → GitHub Pages detecta o
push na branch `main` e republica sozinho (~30-40s depois).
```

Estrutura do repo:

```
posts/YYYY-MM-DD-slug.html    ← 1 arquivo por post (gerado, não editado à mão)
scripts/new-post.mjs          ← monta o HTML a partir de TEMPLATE.html + args
scripts/update-index.mjs      ← roda automaticamente, atualiza home + README
TEMPLATE.html                 ← template com placeholders {{TITLE}}, {{BODY_HTML}} etc
assets/images/                ← covers (2:1) e imagens inline (3:2), JPG
assets/css/post.css           ← estilo compartilhado, não editar por post
.env                          ← LINKEDIN_WEBHOOK_URL (gitignored, não commitar)
```

## Pré-requisitos

- Terminal com `git`, `node` (v20.6+) e `python` disponíveis
- Repo já clonado com `git push` autenticado pro GitHub (SSH key ou token configurado)
- `FAL_AI_API_KEY` disponível no ambiente (geração de imagem via fal.ai)
- `.env` do blog já com `LINKEDIN_WEBHOOK_URL` configurado, se quiser o
  webhook do LinkedIn disparando sozinho (opcional — sem isso o post é
  publicado normalmente, só não dispara pro LinkedIn)

## Passo a passo

### 1. Escrever o corpo do post

HTML puro — **nunca** incluir `<html>`, `<head>`, `<body>`. Só o conteúdo:
`<p>`, `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<table>`, `<blockquote>`, `<img>`,
`<pre><code>`. Tamanho alvo: 800-1500 palavras. Tom direto, autoral, primeira
pessoa quando fizer sentido.

**Regra editorial obrigatória — abstração de fonte:**
- O post nunca revela que é baseado em outro conteúdo (vídeo, artigo, post de
  terceiro). Não citar "o autor diz", "no vídeo", "segundo fulano" quando
  fulano é só quem produziu a fonte de inspiração.
- Fatos técnicos verificáveis e independentes (nome de empresa, produto,
  paper, framework real) podem ser citados normalmente — isso não é
  "atribuição de fonte", é fato do domínio.
- Na dúvida entre citar ou abstrair, abstrair.

Salvar o corpo em um arquivo temporário, ex: `.tmp-body-<slug>.html`.

### 2. Gerar as imagens

1 cover (aspect 2:1) + 2-3 imagens inline (aspect 3:2), inseridas no corpo
**antes** do `<h2>` da seção correspondente:

```bash
python D:/Repos/GERAL/image-generation/generate.py \
  --batch jobs.json \
  --out-dir D:/Repos/blog/assets/images/ \
  --model gpt-image-1-mini
```

`jobs.json` é uma lista de `{prompt, filename, aspect}` — ver
`D:/Repos/GERAL/image-generation/generate.py --list` pros modelos
disponíveis. Nomear os arquivos como `YYYY-MM-DD-<slug>-cover.jpg` e
`YYYY-MM-DD-<slug>-N-<tema>.jpg`.

### 3. Montar e publicar o HTML do post

```bash
cd D:\Repos\blog
node scripts/new-post.mjs \
  --slug=<slug-kebab-case> \
  --title="<Título do post>" \
  --lang=pt-BR \
  --excerpt="<Resumo de 1-2 frases — vai pro card da home e meta description>" \
  --cover=assets/images/<slug>-cover.jpg \
  --share-hook="<Hook curto e misterioso, 1-2 frases, pro bloco de compartilhar>" \
  --linkedin="<Texto completo pronto pra colar no LinkedIn, com \n reais entre parágrafos>" \
  --body=.tmp-body-<slug>.html
```

Esse comando:
- Gera `posts/YYYY-MM-DD-<slug>.html` a partir do `TEMPLATE.html`
- Roda `update-index.mjs` sozinho — atualiza `index.html` (home) e `README.md`
- **Dispara o webhook do LinkedIn automaticamente**, se `LINKEDIN_WEBHOOK_URL`
  estiver no `.env` (não precisa fazer nada a mais pra isso acontecer)

Args obrigatórios: `--slug`, `--title`, `--lang`, `--excerpt`, `--body`.
`--cover`, `--share-hook`, `--linkedin` são opcionais mas recomendados
(sem eles o post publica sem imagem de capa / sem bloco de LinkedIn rico).

### 4. Limpar temp e publicar no GitHub

```bash
rm .tmp-body-<slug>.html
git add posts/ assets/images/ index.html README.md
git commit -m "post: <Título do post>"
git push origin main
```

### 5. Confirmar a publicação

Aguardar ~40s (tempo do GitHub Pages buildar) e então:

```bash
curl -s -o /dev/null -w "%{http_code}" https://felvieira.github.io/blog/posts/YYYY-MM-DD-<slug>.html
```

Só reportar sucesso se o retorno for `200`. Se vier `404`, esperar mais
15-20s e tentar de novo antes de investigar problema real.

## O que NUNCA fazer

- Editar um `.html` já publicado em `posts/` à mão — sempre regenerar via
  `new-post.mjs` (ou editar e depois rodar `update-index.mjs` manualmente se
  for só correção pontual)
- Commitar o arquivo `.env` (tem segredo, está no `.gitignore`)
- Publicar sem `--excerpt` (quebra a meta description e o card da home)
- Reutilizar um `--slug` que já existe no mesmo dia — o script recusa
  (`Already exists`) se o arquivo de destino já existir
