# Overview (parcial) — blog (felvieira)

> ⚠️ **Este NÃO é o pipeline completo de 5 fases da skill 33 (Detective Spec).**
> É um overview parcial gerado sob demanda pelo `/catalog-project`, extraído
> diretamente do código/conteúdo real do repo, com hedge de confiança quando a
> evidência é indireta. Não substitui uma engenharia reversa completa.

## O que este repo é (confiança: alta — evidência direta em README + estrutura)

Um blog estático de posts técnicos (IA, coding, dev tools), publicado via GitHub Pages,
mantido por um único autor (`felvieira`) e alimentado por um workflow assistido por IA
(Claude Code + skill externa `dev-team-kit-fv:41-blog-publisher`).

## Capabilities extraídas do código real

| Capability | Evidência | Confiança |
|---|---|---|
| Publicação de post via scaffold (`new-post.mjs`) | Script real em `scripts/new-post.mjs`, lê `TEMPLATE.html`, escreve `posts/*.html` | Alta — código lido diretamente |
| Regeneração automática de índice (`update-index.mjs`) | Script real em `scripts/update-index.mjs`, reescreve `index.html` e `README.md` entre marcadores de comentário | Alta — código lido diretamente |
| Compartilhamento para LinkedIn (botão copiar + texto pronto) | `TEMPLATE.html` tem `.share-block` com `share_hook`/`linkedin_text`; `assets/js/share.js` referenciado | Alta — template + script referenciados |
| Notificação via webhook pessoal ao publicar | `new-post.mjs` lê `LINKEDIN_WEBHOOK_URL` de `.env` e faz `fetch` POST opcional | Alta — código lido, mas é feature pessoal opcional (não roda sem a env var) |
| Suporte bilíngue (pt-BR / en) | `--lang` no script, `langLabel`/`LANG_LABEL` no template, README lista posts com bandeira | Alta |
| Geração de imagem via fal.ai ou Playwright | Citado no README ("via skill 17 fal.ai ou skill 42 Playwright") — a geração em si acontece **fora deste repo**, no kit externo | Média — depende de skills externas não auditadas aqui |
| Deploy automático via GitHub Pages | `.nojekyll` presente, README cita Pages, sem CI custom | Alta |

## O que NÃO existe neste repo (confiança: alta — ausência verificada)

- Sem backend/API própria — a `docs/SPEC-web-publisher.md` é uma **proposta não
  implementada** de um web app externo (Next.js + serverless), não código deste repo.
- Sem autenticação, sem banco de dados, sem testes automatizados, sem CI/CD.
- Sem `package.json` — os scripts `.mjs` rodam via Node.js nativo (ESM), sem deps npm.

## Fronteiras e ambiguidades (hedge)

- `posts-source/` contém apenas 2 arquivos de um único post (bilíngue .en/.pt-BR) —
  não está claro se é um padrão adotado para todos os posts futuros ou um caso isolado
  de um post específico. Confiança baixa sobre a intenção — não generalizar.
- A spec `docs/SPEC-web-publisher.md` descreve um sistema que reimplementaria a skill 41
  como webapp público; não há evidência de que tenha sido construído (nenhum código
  correspondente no repo, nenhuma env var de Anthropic/GitHub token além do
  `LINKEDIN_WEBHOOK_URL` pessoal).
