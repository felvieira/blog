(() => {
  const list = document.querySelector(".post-list");
  if (!list) return;
  const cards = [...list.querySelectorAll(".list-item")];
  const featuredCards = [...document.querySelectorAll(".featured a")];
  const search = document.querySelector("#post-search");
  const filters = [...document.querySelectorAll(".topic-filter")];
  const status = document.querySelector("#archive-status");
  const pagination = list.querySelector(".pagination");
  const pageSize = 18;
  const params = new URLSearchParams(location.search);
  let topic = params.get("tema") || "Todos";
  let page = Math.max(1, Number(params.get("pagina")) || 1);
  search.value = params.get("q") || "";

  function updateUrl() {
    const next = new URLSearchParams();
    if (search.value.trim()) next.set("q", search.value.trim());
    if (topic !== "Todos") next.set("tema", topic);
    if (page > 1) next.set("pagina", String(page));
    history.replaceState(null, "", `${location.pathname}${next.size ? `?${next}` : ""}${location.hash}`);
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase("pt-BR");
    const matches = (card) => (topic === "Todos" || card.dataset.topic === topic) && (!query || card.dataset.search.includes(query));
    const results = cards.filter(matches);
    const featuredMatches = featuredCards.filter(matches);
    featuredCards.forEach((card) => { card.hidden = !featuredMatches.includes(card); });
    const pages = Math.max(1, Math.ceil(results.length / pageSize));
    page = Math.min(page, pages);
    const visible = new Set(results.slice((page - 1) * pageSize, page * pageSize));
    cards.forEach((card) => { card.hidden = !visible.has(card); });
    pagination.replaceChildren();
    pagination.hidden = pages < 2;
    if (pages > 1) {
      const add = (label, target, disabled = false, current = false) => {
        const button = document.createElement("button");
        button.type = "button"; button.textContent = label; button.disabled = disabled;
        if (current) button.setAttribute("aria-current", "page");
        button.addEventListener("click", () => { page = target; render(); list.scrollIntoView({ behavior: "smooth", block: "start" }); });
        pagination.append(button);
      };
      add("Anterior", page - 1, page === 1);
      const first = Math.max(1, Math.min(page - 2, pages - 4));
      for (let number = first; number <= Math.min(pages, first + 4); number++) add(String(number), number, false, number === page);
      add("Próxima", page + 1, page === pages);
    }
    const total = results.length + featuredMatches.length;
    status.textContent = total
      ? `${total} artigos encontrados. Exibindo ${featuredMatches.length} destaques e ${Math.min(pageSize, results.length)} do arquivo${pages > 1 ? ` · página ${page} de ${pages}` : ""}.`
      : "Nenhum artigo encontrado. Tente outro termo ou assunto.";
    updateUrl();
  }

  filters.forEach((button) => {
    const active = button.dataset.topic === topic;
    button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", () => {
      topic = button.dataset.topic; page = 1;
      filters.forEach((filter) => { const selected = filter === button; filter.classList.toggle("is-active", selected); filter.setAttribute("aria-pressed", String(selected)); });
      render();
    });
  });
  search.addEventListener("input", () => { page = 1; render(); });
  window.addEventListener("popstate", () => location.reload());
  render();
})();
