# AdSense e SEO

## Ligar e desligar anúncios

O controle do blog está em `site.config.json`, em `ads.enabled`.

```sh
node scripts/manage-ads.mjs status
node scripts/manage-ads.mjs on
node scripts/manage-ads.mjs off
```

Depois de mudar, faça commit/push de `site.config.json` e aguarde o deploy do GitHub Pages. O novo valor vale nos próximos carregamentos de página. Uma aba já aberta precisa ser recarregada.

O carregador só solicita o AdSense na origem de produção e no caminho `/blog/`, a partir de 1280 pixels de largura. Desativado, não injeta o script do Google. Falhas na configuração deixam a página sem anúncios. A identificação da conta em uma meta tag serve para verificação e não carrega anúncios.

No AdSense, o site é cadastrado como `felvieira.github.io`, pois o Google não aceita `/blog/` como site separado. Em **Anúncios → Editar site**, use anúncios automáticos com **Formatos overlay → Anúncios de coluna lateral → À esquerda e à direita**. Mantenha âncoras, vinhetas, formatos in-page, formatos de intenção e otimização automática desligados. O Google decide se existe espaço/inventário para exibir anúncios; o código não garante preenchimento.

O conteúdo principal e a navegação têm `google-side-rail-overlap="false"`. A integração não reserva espaços vazios nem cobre o texto com banners próprios.

Antes de ligar em produção, conclua a aprovação do site no AdSense, as informações de privacidade e a configuração de consentimento exigida para as regiões atendidas. A aprovação é uma etapa externa, diferente de publicar o código.

**Arquivos na raiz do domínio:** `ads.txt` e `robots.txt` precisam ser publicados em `https://felvieira.github.io/`, mantido pelo repositório `felvieira/felvieira.github.io`. Colocá-los em `/blog/` não substitui os arquivos da raiz.

## SEO

```sh
node scripts/update-index.mjs
node scripts/validate-seo-ads.mjs
```

O gerador do índice chama `update-seo.mjs`, que atualiza homepage e artigos: canonical, autoria, Open Graph, Twitter Cards, Blog/BlogPosting em JSON-LD e `sitemap.xml`. Novos artigos criados por `new-post.mjs` passam pelo mesmo fluxo.

Canonicals externos e `noindex` explícitos são preservados; essas páginas ficam fora do sitemap. A data publicada vem do nome do artigo. O gerador não inventa data de atualização nem altera o texto editorial. As imagens de compartilhamento usam miniaturas WebP existentes.

Envie `https://felvieira.github.io/blog/sitemap.xml` à propriedade correspondente no Google Search Console. A publicação do sitemap não confirma indexação nem garante posição no Google.

Referências: [colunas laterais do AdSense](https://support.google.com/adsense/answer/16531757?hl=pt-BR), [dados estruturados de artigos](https://developers.google.com/search/docs/appearance/structured-data/article), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
