# Blog — felvieira

Posts técnicos sobre IA coding, Dev Team Kit, e ferramentas pra dev.

🌐 **Live:** https://felvieira.github.io/blog/

## Como funciona

Os posts são gerados automaticamente pela **skill 41 do Dev Team Kit** (`dev-team-kit-fv:41-blog-publisher`).

Eu mando texto ou assunto pro Claude → ele gera HTML + imagens (via skill 17 fal.ai ou skill 42 Playwright) → commit/push aqui → publica via GitHub Pages → retorna URL.

## Posts

<!-- BLOG_INDEX_START -->
- **2026-05-24** — [Como RAG funciona — o padrão arquitetural que faz LLMs deixarem de alucinar](posts/2026-05-24-how-rag-works.html) (🇧🇷 PT)
- **2026-05-24** — [LLM Concepts Deep Dive — os 15 conceitos que separam quem usa IA de brinquedo de quem usa em produção](posts/2026-05-24-llm-concepts-deep-dive.html) (🇧🇷 PT)
- **2026-05-24** — [Como projetar seu primeiro AI Agent — o framework de 10 passos de manual a fleet autônoma](posts/2026-05-24-design-ai-agent.html) (🇧🇷 PT)
- **2026-05-24** — [Reinforcement Learning explicado simples — de cervos na floresta ao DeepSeek-R1](posts/2026-05-24-reinforcement-learning-explained.html) (🇧🇷 PT)
- **2026-05-24** — [Vector Databases — quando pgvector basta, quando você precisa de Pinecone, e o framework de decisão](posts/2026-05-24-vector-databases-deep-dive.html) (🇧🇷 PT)
- **2026-05-24** — [Context Engineering 101 — a arte que separa prompt engineer de top 1% dos usuários de LLM](posts/2026-05-24-context-engineering-101.html) (🇧🇷 PT)
- **2026-05-24** — [AI Coding Workflow 101 — o loop de 6 estágios que separa dev que reclama de IA de dev que entrega 3x mais](posts/2026-05-24-ai-coding-workflow-101.html) (🇧🇷 PT)
- **2026-05-24** — [LLM Evals Explicado — os 15 conceitos que separam ship-and-pray de engenharia séria com LLMs](posts/2026-05-24-llm-evals-explained.html) (🇧🇷 PT)
- **2026-05-24** — [O que torna um AI Agent diferente do ChatGPT — abrindo a tampa do loop ReAct](posts/2026-05-24-how-ai-agents-work.html) (🇧🇷 PT)
- **2026-05-24** — [Como MCP funciona — o USB-C dos LLMs que finalmente desbloqueia agents em produção](posts/2026-05-24-how-mcp-works.html) (🇧🇷 PT)
- **2026-05-24** — [9 Agentic Design Patterns — do prompt chaining ao multi-agent, com tabela de decisão](posts/2026-05-24-agentic-design-patterns.html) (🇧🇷 PT)
- **2026-05-24** — [Multi-Agent Architectures — as 6 topologias, quando usar cada uma, e por que não usar nenhuma](posts/2026-05-24-multi-agent-architecture.html) (🇧🇷 PT)
- **2026-05-23** — [Top 1% no Claude Code: o que o playbook não ensina (e a gente provou medindo)](posts/2026-05-23-top-1-claude-code.html) (🇧🇷 PT)
- **2026-05-23** — [AI Agents: Memória, Estado e Consistência (o que ninguém te conta sobre rodar em produção)](posts/2026-05-23-ai-agents-memory-state-consistency.html) (🇧🇷 PT)
- **2026-05-23** — [ML System Design 101 — Os 10 conceitos que você precisa dominar antes de qualquer entrevista](posts/2026-05-23-ml-system-design-101.html) (🇧🇷 PT)
- **2026-05-23** — [Construindo seu próprio AI Chat Assistant — quando off-the-shelf vira teto baixo](posts/2026-05-23-personal-ai-chat-assistant.html) (🇧🇷 PT)
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
