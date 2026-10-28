/* Catalog DOM lifecycle: pooled cards/rows and offscreen containment.
 * The entry point supplies templates and live state; no storage or navigation.
 * Creating the renderer registers its resize listener, before the first render.
 */
window.NCACatalog = (() => {
  "use strict";
  function create({
    getState, getView, filtered, card, table, hydrateArtwork,
    decorateControls, renderChips, hideTooltip, patchWeaponNode, escape,
  }) {
    const $ = (id) => document.getElementById(id);
    let catalogKey = "",
      cardRoot = null,
      tableRoot = null,
      tableHeadKey = "";
    const cardPool = new Map(),
      rowPool = new Map();
    function fragment(html) {
      const template = document.createElement("template");
      template.innerHTML = html;
      return template.content;
    }
    function reconcile(parent, nodes) {
      const wanted = new Set(nodes);
      for (const child of [...parent.children])
        if (!wanted.has(child)) child.remove();
      let cursor = parent.firstElementChild;
      for (const node of nodes) {
        if (node === cursor) cursor = cursor.nextElementSibling;
        else parent.insertBefore(node, cursor);
      }
    }
    function renderCatalog() {
      const state = getState(), currentView = getView();
      const rows = filtered(),
        key = state.profile + "|" + state.tier;
      if (key !== catalogKey) {
        catalogKey = key;
        cardPool.clear();
        rowPool.clear();
        cardRoot = null;
        tableRoot = null;
        tableHeadKey = "";
      }
      $("result-count").textContent = rows.length;
      $("catalog-heading").firstChild.textContent =
        currentView === "favorites"
          ? "Your favorites "
          : state.iconic === "iconic"
            ? "Iconic arsenal "
            : state.iconic === "normal"
              ? "Standard arsenal "
              : "Full arsenal ";
      $("catalog-kicker").textContent =
        currentView === "favorites"
          ? "NC / SAVED INVENTORY"
          : "NC / INVENTORY";
      $("results-announcement").textContent =
        `${rows.length} weapon${rows.length === 1 ? "" : "s"} found`;
      renderChips();
      hideTooltip();
      if (!rows.length) {
        const noFavorites =
          currentView === "favorites" && !state.favorites.length;
        const hiddenFavorites =
          currentView === "favorites" &&
          state.favorites.length &&
          !filtered({ ...state, query: "" }, "favorites").length;
        const searched = !!state.query.trim() && !hiddenFavorites;
        const heading = noFavorites
          ? "Your collection starts here."
          : hiddenFavorites
            ? "Filters are hiding your favorites."
            : searched
              ? "No search results."
              : "No weapons match these filters.";
        const message = noFavorites
          ? "Star weapons in the arsenal to save them in this browser."
          : hiddenFavorites
            ? `${state.favorites.length} saved favorite${state.favorites.length === 1 ? " is" : "s are"} outside the current collection or filters. Your saved weapons are still here.`
            : searched
              ? `No weapons match “${state.query}” with the current filters.`
              : "Try another collection or clear your filters.";
        $("catalog").innerHTML =
          `<div class="empty"><div class="empty-symbol">${currentView === "favorites" ? "☆" : "⌕"}</div><h3>${heading}</h3><p>${escape(message)}</p><button class="primary" data-action="${noFavorites ? "browse" : searched ? "clear-search" : "reset"}">${noFavorites ? "Browse weapons" : searched ? "Clear search" : "Clear filters"}</button></div>`;
        decorateControls($("catalog"));
        return;
      }
      const cards = state.view === "cards",
        pool = cards ? cardPool : rowPool,
        missing = rows.filter((w) => !pool.has(w.id));
      if (missing.length) {
        const fresh = fragment(
          cards ? missing.map(card).join("") : table(missing),
        );
        hydrateArtwork(fresh);
        decorateControls(fresh);
        fresh
          .querySelectorAll(cards ? ".weapon-card" : "tbody>tr")
          .forEach((node) => pool.set(node.dataset.weapon, node));
      }
      let root, parent;
      if (cards) {
        if (!cardRoot) {
          cardRoot = document.createElement("div");
          cardRoot.className = "cards";
        }
        root = cardRoot;
        parent = root;
      } else {
        if (!tableRoot) tableRoot = fragment(table([])).firstElementChild;
        root = tableRoot;
        parent = root.querySelector("tbody");
        const headingKey = state.sort + "|" + state.direction;
        if (headingKey !== tableHeadKey) {
          root
            .querySelector("thead")
            .replaceWith(fragment(table([])).querySelector("thead"));
          tableHeadKey = headingKey;
          decorateControls(root.querySelector("thead"));
        }
      }
      const nodes = rows.map((w) => {
        const node = pool.get(w.id);
        patchWeaponNode(node, w);
        return node;
      });
      reconcile(parent, nodes);
      if ($("catalog").firstElementChild !== root)
        $("catalog").replaceChildren(root);
      if (cards) scheduleCardContainment();
    }
    let containmentFrame = 0;
    function scheduleCardContainment() {
      if (containmentFrame || !CSS.supports("content-visibility", "auto"))
        return;
      containmentFrame = requestAnimationFrame(() => {
        containmentFrame = 0;
        if (!cardRoot?.isConnected || getState().view !== "cards") return;
        const width = Math.round(cardRoot.getBoundingClientRect().width);
        if (cardRoot.dataset.measuredWidth === String(width)) return;
        cardRoot.classList.remove("cv-ready");
        const first = cardRoot.firstElementChild;
        if (!first) return;
        const box = first.getBoundingClientRect(),
          css = getComputedStyle(first),
          height =
            box.height -
            parseFloat(css.paddingTop) -
            parseFloat(css.paddingBottom) -
            parseFloat(css.borderTopWidth) -
            parseFloat(css.borderBottomWidth);
        cardRoot.style.setProperty("--card-content-height", height + "px");
        cardRoot.dataset.measuredWidth = String(width);
        cardRoot.classList.add("cv-ready");
      });
    }
    window.addEventListener("resize", scheduleCardContainment);

    function updateSelection(w) {
      for (const node of [cardPool.get(w.id), rowPool.get(w.id)])
        if (node) patchWeaponNode(node, w);
    }
    return Object.freeze({ render: renderCatalog, updateSelection });
  }
  return Object.freeze({ create });
})();
