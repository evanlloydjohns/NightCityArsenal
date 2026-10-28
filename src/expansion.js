      /* Mods reference, visual equipment planning and personal saved builds. */
      (() => {
        "use strict";
        const A = window.Arsenal,
          DB = JSON.parse(
            document.getElementById("modification-data").textContent,
          ),
          E = NCAPlannerCore.createEngine(A.data, DB),
          M = DB.modifications,
          DISPLAY = DB.meta.display;
        const $ = (id) => document.getElementById(id),
          esc = (v) =>
            String(v ?? "").replace(
              /[&<>"']/g,
              (c) =>
                ({
                  "&": "&amp;",
                  "<": "&lt;",
                  ">": "&gt;",
                  '"': "&quot;",
                  "'": "&#39;",
                })[c],
            ),
          norm = (v) =>
            String(v ?? "")
              .normalize("NFKD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase();
        const KEY = "night-city-arsenal.builds.v1",
          DRAFT_KEY = "night-city-arsenal.draft.v1";
        let builds = [],
          storageProblem = "",
          draft = null,
          draftMode = "new",
          readOnly = false,
          dirty = false,
          draftTimer,
          dialogState = null,
          dialogOpener = null,
          buildPage = 60,
          comparison = [];
        let modFilters = {
            query: "",
            category: "",
            class: "",
            technology: "",
            weapon: "",
            tier: "",
            content: "",
            effect: "",
            acquisition: "",
          },
          buildFilters = { query: "", tag: "", weapon: "", favorites: false };
        const searches = new Map(
          M.map((m) => [
            m.id,
            norm(
              [
                m.name,
                m.category,
                ...m.classes,
                ...m.technologies,
                ...m.effectCategories,
                ...Object.values(m.tierEffects).map((e) => e.summary),
              ].join(" "),
            ),
          ]),
        );
        try {
          const raw = localStorage.getItem(KEY);
          if (raw) builds = E.sanitizeBundle(JSON.parse(raw));
        } catch {
          storageProblem =
            "Saved-build storage is unavailable or contains an invalid file. Existing stored bytes were not replaced. Use JSON export to protect this session.";
        }
        try {
          const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
          if (raw?.build) {
            draft = E.sanitizeBuild(raw.build);
            draftMode = raw.mode === "edit" ? "edit" : "new";
            dirty = !!raw.dirty;
          }
        } catch {}
        const button = (action, label, attrs = "", style = "") =>
          `<button class="chamfer ${style}" data-plan-action="${action}" ${attrs}>${label}</button>`;
        const glyphKind = (m) =>
          m.slotKind === "mod"
            ? m.category === "Melee mod"
              ? "melee-mod"
              : m.category === "Throwable mod"
                ? "throwable-mod"
                : m.technologies.length === 1 && m.technologies[0] === "Tech"
                  ? "tech-mod"
                  : m.technologies.length === 1 && m.technologies[0] === "Smart"
                    ? "smart-mod"
                    : "normal-mod"
            : m.slotKind;
        const icon = (m) =>
          `<span class="equipment-icon slot-${glyphKind(m)}">${m.image?.src ? `<img data-mod-art-id="${esc(m.id)}" alt="${esc(m.name)} in-game equipment artwork" width="${m.image.width}" height="${m.image.height}" loading="lazy" decoding="async">` : `<span role="img" aria-label="${esc(m.category)} category fallback">${A.slotGlyph(glyphKind(m))}</span>`}</span>`;
        function hydrateEquipment(root) {
          root.querySelectorAll("img[data-mod-art-id]").forEach((img) => {
            const m = E.mods.get(img.dataset.modArtId);
            if (m?.image?.src) img.src = m.image.src;
            img.removeAttribute("data-mod-art-id");
          });
        }
        const compatibilityLabel = (status) =>
          status === "compatible"
            ? "Source + slot checked"
            : status === "unknown"
              ? "Unverified"
              : "Incompatible";
        const classSummary = (m) =>
          m.classes.length > 2
            ? m.classes.slice(0, 2).join(" · ") +
              ` +${m.classes.length - 2} classes`
            : m.classes.join(" · ") || "Individual compatibility unverified";
        const effect = (m, t) =>
          m?.tierEffects[String(t)]?.summary ||
          "No published effect at this tier. No interpolation is applied.";
        const links = (m) =>
          m.sources
            .map(
              (s) =>
                `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a>`,
            )
            .join("");
        const acquisition = (m) =>
          `<ul class="acquisition-list">${m.acquisition.map((a) => `<li><span class="quality-tag">${esc(a.methods.join(" / "))}</span> ${esc(a.text)}</li>`).join("")}</ul>`;
        const methods = (m) => [
          ...new Set(m.acquisition.flatMap((a) => a.methods)),
        ];
        const banner = () =>
          storageProblem
            ? `<div class="notice build-storage-warning" role="status">${esc(storageProblem)}</div>`
            : "";
        const tiers = (selected, list = A.data.meta.tiers) =>
          list
            .map(
              (t) =>
                `<option value="${esc(t)}" ${String(t) === String(selected) ? "selected" : ""}>${esc(t)}</option>`,
            )
            .join("");
        const options = (values, selected, any) =>
          `<option value="">${esc(any)}</option>` +
          values
            .map(
              (v) =>
                `<option ${v === selected ? "selected" : ""}>${esc(v)}</option>`,
            )
            .join("");
        const unique = (key) =>
          [
            ...new Set(
              M.flatMap((m) => (Array.isArray(m[key]) ? m[key] : [m[key]])),
            ),
          ].sort((a, b) => a.localeCompare(b));
        function persist(next) {
          builds = next;
          try {
            localStorage.setItem(KEY, JSON.stringify(E.exportBundle(builds)));
            storageProblem = "";
            document
              .querySelectorAll(".build-storage-warning")
              .forEach((n) => n.remove());
            return true;
          } catch {
            storageProblem =
              "This session could not be saved to browser storage (blocked or full). Export builds now to keep your changes.";
            const panel = document.querySelector(
              ".expansion-panel:not([hidden])",
            );
            if (panel) {
              let warning = panel.querySelector(".build-storage-warning");
              if (!warning) {
                warning = document.createElement("div");
                warning.className = "notice build-storage-warning";
                warning.setAttribute("role", "alert");
                panel.prepend(warning);
              }
              warning.textContent = storageProblem;
            }
            return false;
          }
        }
        function rememberDraft() {
          clearTimeout(draftTimer);
          draftTimer = setTimeout(() => {
            try {
              sessionStorage.setItem(
                DRAFT_KEY,
                JSON.stringify({ build: draft, mode: draftMode, dirty }),
              );
            } catch {}
          }, 200);
        }
        function closeEquipment() {
          if ($("equipment-dialog").open) $("equipment-dialog").close();
          dialogState = null;
          if (dialogOpener?.isConnected) dialogOpener.focus();
        }
        function showEquipment(content) {
          if (!$("equipment-dialog").open)
            dialogOpener = document.activeElement;
          $("equipment-content").innerHTML = content;
          hydrateEquipment($("equipment-content"));
          A.hydrateArtwork($("equipment-content"));
          if (!$("equipment-dialog").open) $("equipment-dialog").showModal();
          $("equipment-content").querySelector("button,input,select")?.focus();
        }
        function shell(title, kicker, body, footer = "") {
          return `<div class="exp-dialog-head"><div><span class="eyebrow cyan">${esc(kicker)}</span><h2 id="equipment-title">${esc(title)}</h2></div>${button("close-equipment", "×", 'aria-label="Close equipment window"')}</div><div class="exp-dialog-body">${body}</div>${footer ? `<div class="exp-dialog-foot">${footer}</div>` : ""}`;
        }
        function confirmAction(title, message, accept = "Confirm") {
          const d = $("plan-confirm");
          $("plan-confirm-title").textContent = title;
          $("plan-confirm-message").textContent = message;
          $("plan-confirm-accept").textContent = accept;
          d.returnValue = "cancel";
          d.showModal();
          $("plan-confirm-cancel").focus();
          return new Promise((resolve) =>
            d.addEventListener(
              "close",
              () => resolve(d.returnValue === "accept"),
              { once: true },
            ),
          );
        }
        $("plan-confirm-cancel").addEventListener("click", () =>
          $("plan-confirm").close("cancel"),
        );
        $("plan-confirm-accept").addEventListener("click", () =>
          $("plan-confirm").close("accept"),
        );
        $("equipment-dialog").addEventListener("cancel", (e) => {
          e.preventDefault();
          closeEquipment();
        });
        function render(view) {
          for (const name of ["mods", "builds", "planner"])
            $(name + "-panel").hidden = view !== name;
          if (!["mods", "builds", "planner"].includes(view)) return;
          $("tray").hidden = true;
          window.scrollTo(0, 0);
          if (view === "mods") renderMods();
          else if (view === "builds") renderBuilds();
          else renderPlanner();
        }
        function renderMods() {
          const filters = [
            ["category", "Category", unique("category")],
            ["class", "Weapon class", unique("classes")],
            ["technology", "Technology", unique("technologies")],
            ["tier", "Available tier", ["1", "2", "3", "4", "5"]],
            ["content", "Content", unique("content")],
            ["effect", "Effect", unique("effectCategories")],
            [
              "acquisition",
              "Acquisition",
              [...new Set(M.flatMap(methods))].sort(),
            ],
          ];
          $("mods-panel").innerHTML =
            `<div class="section-intro"><div><span class="eyebrow cyan">NC / EQUIPMENT REFERENCE</span><h1>Mods & attachments</h1><p>Documented equipment effects, tiers and acquisition. Planning never changes weapon base statistics.</p></div>${button("equipment-notes", "Coverage & rules ↗")}</div><div class="exp-toolbar"><label class="search-box"><span aria-hidden="true">⌕</span><input id="mods-search" type="search" aria-label="Search modifications" placeholder="Search names or effects — recoil, stealth, magazine…" value="${esc(modFilters.query)}"></label>${button("mods-reset", "Clear filters")}</div><div class="exp-filters">${filters.map(([key, label, values]) => `<label>${label}<select data-mod-filter="${key}">${options(values, modFilters[key], "All " + label.toLowerCase())}</select></label>`).join("")}<div><span>Compatible weapon</span>${button("choose-filter-weapon", esc(E.weapons.get(modFilters.weapon)?.name || "Any weapon"), 'data-context="mods"')}${modFilters.weapon ? button("clear-mod-weapon", "Clear", 'aria-label="Clear compatible weapon"') : ""}</div></div><p id="mods-result-count" class="exp-result-status" role="status"></p><div id="mods-results" class="equipment-grid"></div>`;
          renderModResults();
        }
        function filteredMods() {
          const words = norm(modFilters.query).split(/\s+/).filter(Boolean);
          return M.filter(
            (m) =>
              words.every((q) => searches.get(m.id).includes(q)) &&
              (!modFilters.category || m.category === modFilters.category) &&
              (!modFilters.class || m.classes.includes(modFilters.class)) &&
              (!modFilters.technology ||
                m.technologies.includes(modFilters.technology)) &&
              (!modFilters.tier || m.tiers.includes(modFilters.tier)) &&
              (!modFilters.content || m.content === modFilters.content) &&
              (!modFilters.effect ||
                m.effectCategories.includes(modFilters.effect)) &&
              (!modFilters.acquisition ||
                methods(m).includes(modFilters.acquisition)) &&
              (!modFilters.weapon ||
                E.slotsFor(
                  modFilters.weapon,
                  modFilters.tier || "5++",
                ).slots.some((s) =>
                  m.tiers.some(
                    (t) =>
                      E.compatibility(
                        m.id,
                        modFilters.weapon,
                        modFilters.tier || "5++",
                        s.id,
                        t,
                      ).status === "compatible",
                  ),
                )),
          );
        }
        function displayEffect(m, t, compact = false) {
          const e = m.tierEffects[String(t)],
            custom = DISPLAY.primaryModFields[m.id];
          if (!e)
            return '<p class="effect-prose">No published effect at this tier.</p>';
          const rows =
            m.slotKind !== "mod"
              ? e.fields
              : custom
                ? custom.descriptionRows?.[String(t)] || [
                    ...e.fields.filter((f) =>
                      (custom.fields || []).includes(f.label),
                    ),
                    ...(custom.extraRows || []),
                  ]
                : [];
          const shown = compact ? rows.slice(0, 3) : rows;
          const prose = rows.length ? custom?.description || "" : e.summary;
          const note = DISPLAY.tierNotes[m.id]?.[String(t)];
          return `${shown.length ? `<dl class="effect-stat-rows">${shown.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}</dl>` : ""}${prose ? `<p class="effect-prose">${esc(prose)}</p>` : ""}${compact && rows.length > shown.length ? `<span class="effect-more">+${rows.length - shown.length} more source field${rows.length - shown.length === 1 ? "" : "s"} in Inspect</span>` : ""}${note ? `<p class="effect-note">${esc(note)}</p>` : ""}`;
        }
        function installationGroup(m) {
          return m.uniqueGroup === "chimera-core"
            ? "chimera"
            : m.slotKind !== "mod"
              ? "attachment"
              : m.iconic
                ? "otherIconic"
                : "conventional";
        }
        function individualRestrictions(m) {
          const group = installationGroup(m),
            warnings = [];
          if (group === "conventional")
            warnings.push(
              "Normally permanent once installed in game. x-MOD2 replacement is an exception.",
            );
          if (group === "chimera")
            warnings.push(
              "Crafting consumes the single Active Chimera Core: choose one of four core-crafted mods per normal playthrough.",
            );
          if (group === "otherIconic")
            warnings.push(
              "Removal/replacement for this iconic is unverified. Do not assume Chimera removal rules.",
            );
          if (m.acquisition.some((a) => a.methods.includes("Pre-installed")))
            warnings.push(
              "Pre-installed equipment. Check the individual weapon before planning a replacement.",
            );
          if (
            m.slotKind !== "mod" &&
            m.compatibleWeaponIds.some(
              (id) => DB.meta.fixedAttachments[id]?.[m.slotKind],
            )
          )
            warnings.push(
              "Some source-listed weapons have fixed or unverified attachments. Their unavailable Plan Build actions stay blocked below.",
            );
          return warnings;
        }
        function modCard(m) {
          const t = modFilters.tier || m.tiers.at(-1),
            attrs = `data-mod-id="${esc(m.id)}" data-tier="${t}"`;
          return `<article class="equipment-card browsable-card" data-open-mod="${esc(m.id)}" data-open-tier="${t}"><div class="equipment-card-head"><button class="equipment-art-open" data-plan-action="mod-detail" ${attrs} aria-label="Inspect ${esc(m.name)} artwork">${icon(m)}</button><div><h2><button class="equipment-name" data-plan-action="mod-detail" ${attrs}>${esc(m.name)}</button></h2><span class="eyebrow">${esc(m.category)}</span>${m.iconic ? '<span class="badge iconic">◆ ICONIC</span>' : ""}</div></div><div class="equipment-card-body"><div class="equipment-facts equipment-reference"><span>Reference Tier ${esc(t)}</span><span>${esc(m.content)}</span></div><div class="equipment-effect">${displayEffect(m, t, true)}</div><p class="mod-card-compat" title="${esc(m.classes.join(", "))}"><span class="compact-fact-label">Classes</span>${esc(classSummary(m))}</p><p class="mod-card-acquisition"><span class="compact-fact-label">Acquisition</span>${esc(methods(m).join(" / "))}</p></div><div class="equipment-card-actions">${button("mod-detail", "Inspect ↗", attrs)}</div></article>`;
        }

        function renderModResults() {
          const mods = filteredMods();
          $("mods-result-count").textContent =
            mods.length +
            " of " +
            M.length +
            " equipment records · source values, no stat simulation";
          $("mods-results").innerHTML =
            mods.map(modCard).join("") ||
            '<div class="empty"><h2>No equipment matches</h2><p>Try fewer filters or another effect keyword.</p></div>';
          hydrateEquipment($("mods-results"));
        }
        function openMod(id, tier) {
          const m = E.mods.get(id);
          if (!m) return;
          dialogState = {
            kind: "detail",
            id,
            tier: m.tiers.includes(String(tier))
              ? String(tier)
              : m.tiers.at(-1),
            weapons: {
              query: "",
              class: "",
              technology: "",
              iconic: "",
              status: "",
              limit: 10,
              tier: A.getState().tier,
            },
          };
          renderModDetail();
        }
        function renderModDetail() {
          const m = E.mods.get(dialogState.id),
            t = dialogState.tier,
            wf = dialogState.weapons,
            e = m.tierEffects[t],
            compatible = m.compatibleWeaponIds
              .map((id) => E.weapons.get(id))
              .filter(Boolean),
            kind = glyphKind(m),
            warnings = individualRestrictions(m);
          const raw = e.fields
            .map(
              (f) =>
                `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`,
            )
            .join("");
          const ruleTexts = [
            ...DISPLAY.rules.general,
            ...DISPLAY.rules[installationGroup(m)],
          ];
          showEquipment(
            shell(
              m.name,
              m.category,
              `
   <div class="equipment-detail-identity mod-detail-identity">${icon(m)}<div><p>${esc(m.content)}</p>${m.iconic ? '<span class="badge iconic">◆ ICONIC</span>' : ""}</div></div>
   <div class="equipment-detail-columns mod-info-grid">
    <section class="detail-ability mod-primary-effects" aria-labelledby="mod-effects-title"><div class="mod-effects-heading"><h3 id="mod-effects-title">Modification effects</h3><label class="detail-tier-control">Tier <select id="mod-detail-tier" aria-label="Modification reference tier">${tiers(t, m.tiers)}</select></label></div>${displayEffect(m, t)}</section>
    <section class="mod-compatibility" aria-labelledby="mod-compatibility-title"><h3 id="mod-compatibility-title">Compatibility</h3><h4>Supported classes</h4><ul class="compatibility-tags" aria-label="Supported weapon classes">${m.classes.map((c) => `<li>${esc(c)}</li>`).join("") || "<li>Unverified</li>"}</ul><h4>Technology / action</h4><ul class="compatibility-tags technology-tags" aria-label="Supported technologies">${m.technologies.map((c) => `<li>${esc(c)}</li>`).join("") || "<li>Unverified</li>"}</ul><dl class="required-slot"><div><dt>Required equipment slot</dt><dd><span class="slot-token slot-${kind}" aria-hidden="true">${A.slotGlyph(kind)}</span>${esc(E.kinds[kind] || m.slotKind)} slot</dd></div></dl><p class="mod-category-caveat">Category support is a guide. Individual weapon, slot and tier checks are below.</p></section>
    <section class="mod-acquisition" aria-labelledby="mod-acquisition-title"><h3 id="mod-acquisition-title">Acquisition</h3>${acquisition(m)}</section>
    ${warnings.length ? `<aside class="mod-important-restrictions" aria-labelledby="mod-restrictions-title"><h3 id="mod-restrictions-title">Important restrictions</h3>${warnings.map((w) => `<p>${esc(w)}</p>`).join("")}</aside>` : ""}
   </div>
   <section class="mod-compatible-browser"><h3>Source-listed weapons in this archive (${compatible.length})</h3><p class="muted">Source-listed is not proof of fit. Rows check the chosen tiers, real slots and fixed attachments. Individual patch 2.5 fits are not game-tested.</p><div class="exp-toolbar"><label class="search-box"><input id="compatible-search" type="search" aria-label="Search source-listed weapons" placeholder="Search weapon names…" value="${esc(wf.query)}"></label><label>Weapon tier <select id="compatible-tier">${tiers(wf.tier)}</select></label></div><div class="compatible-filters"><label>Class <select data-compatible-filter="class">${options([...new Set(compatible.map((w) => w.class))].sort(), wf.class, "All classes")}</select></label><label>Technology <select data-compatible-filter="technology">${options([...new Set(compatible.map((w) => w.technology))].sort(), wf.technology, "All technologies")}</select></label><label>Collection <select data-compatible-filter="iconic">${options(["Iconic", "Standard"], wf.iconic, "All weapons")}</select></label><label>Status <select data-compatible-filter="status">${options(["compatible", "incompatible", "unknown"], wf.status, "All statuses")}</select></label></div><p id="compatible-result-count" role="status" class="muted"></p><div id="mod-compatible-results"></div></section>
   ${m.outsideCatalogWeapons.length ? `<details><summary>Other source-listed weapon names</summary><p>${esc(m.outsideCatalogWeapons.join(" · "))}</p></details>` : ""}
   <details class="mod-installation-rules"><summary>Installation Rules & Restrictions</summary><ul>${ruleTexts.map((r) => `<li>${esc(r)}</li>`).join("")}</ul><a href="${esc(DB.meta.rulesSource)}" target="_blank" rel="noopener noreferrer">Installation and crafting reference ↗</a></details>
   <details class="mod-raw-fields"><summary>Published Structured Fields</summary>${raw ? `<dl class="facts">${raw}</dl>` : "<p>No separate numerical fields published; use the documented effect description.</p>"}<h4>Documented source description</h4><p class="raw-effect-description">${esc(e.summary)}</p><p class="muted">Original source labels, signs and units are retained. Internal fields can differ from effect descriptions; these are not combined bonuses or calculated weapon statistics.</p>${DISPLAY.primaryModFields[m.id]?.technicalNote ? `<p>${esc(DISPLAY.primaryModFields[m.id].technicalNote)}</p>` : ""}</details>
   <details class="mod-verification"><summary>Data verification & sources</summary><p>Available tiers: ${esc(m.tiers.join(" / "))}</p>${m.verificationNotes.map((n) => `<p>${esc(n)}</p>`).join("")}<p>${esc(m.imageStatus)}</p>${m.image ? `<p class="muted">${esc(m.image.attribution)}</p><a href="${esc(m.image.sourcePage)}" target="_blank" rel="noopener noreferrer">Artwork source ↗</a>` : ""}<div class="exp-source-links">${links(m)}</div><p class="muted">${esc(DB.meta.dataVersion)} · target patch ${esc(DB.meta.targetPatch)}</p></details>
  `,
            ),
          );
          renderCompatibleWeapons();
        }

        function modWeaponFit(m, w, weaponTier, modTier) {
          const layout = E.slotsFor(w.id, weaponTier),
            slots = layout.slots.filter((slot) =>
              m.slotKind === "mod"
                ? slot.kind.endsWith("-mod")
                : slot.kind === m.slotKind,
            );
          const answers = slots.map((slot) => ({
            ...E.compatibility(m.id, w.id, weaponTier, slot.id, modTier),
            slotId: slot.id,
          }));
          return (
            answers.find((c) => c.status === "compatible") ||
            answers.find((c) => c.status === "unknown") ||
            answers[0] || {
              status: layout.unknown.length ? "unknown" : "incompatible",
              reason:
                layout.unknown[0] ||
                "No matching published equipment slot at this weapon tier.",
            }
          );
        }
        function renderCompatibleWeapons() {
          if (dialogState?.kind !== "detail") return;
          const m = E.mods.get(dialogState.id),
            f = dialogState.weapons,
            rows = m.compatibleWeaponIds
              .map((id) => E.weapons.get(id))
              .filter(Boolean)
              .map((w) => ({
                w,
                c: modWeaponFit(m, w, f.tier, dialogState.tier),
              }))
              .filter(
                ({ w, c }) =>
                  norm(w.name).includes(norm(f.query)) &&
                  (!f.class || w.class === f.class) &&
                  (!f.technology || w.technology === f.technology) &&
                  (!f.iconic || (f.iconic === "Iconic") === w.iconic) &&
                  (!f.status || c.status === f.status),
              )
              .sort((a, b) => a.w.name.localeCompare(b.w.name));
          $("compatible-result-count").textContent =
            `${rows.length} matches · showing ${Math.min(f.limit, rows.length)} · equipment Tier ${dialogState.tier}`;
          $("mod-compatible-results").innerHTML =
            `<div class="compact-weapon-list">${rows
              .slice(0, f.limit)
              .map(
                ({ w, c }) =>
                  `<div class="compatible-weapon-row" data-compatible-weapon="${esc(w.id)}"><button class="compatible-identity" data-plan-action="inspect-compatible" data-weapon-id="${esc(w.id)}"><span class="exp-weapon-thumb">${A.artwork(w)}</span><span><strong>${esc(w.name)}</strong><small>${esc(w.technology)} / ${esc(w.class)}${w.iconic ? " · Iconic" : ""}</small></span></button><div class="compatible-status"><span class="equipment-compat ${c.status}">${compatibilityLabel(c.status)}</span>${c.status !== "compatible" ? `<small>${esc(c.reason)}</small>` : ""}</div>${button("plan-compatible", "Plan build", `data-weapon-id="${esc(w.id)}" data-mod-id="${esc(m.id)}" data-tier="${esc(dialogState.tier)}" data-weapon-tier="${esc(f.tier)}" ${c.status !== "compatible" ? "disabled" : ""}`)}</div>`,
              )
              .join(
                "",
              )}</div>${!rows.length ? '<p class="muted">No source-listed weapons match these filters.</p>' : ""}${rows.length > f.limit ? button("more-compatible", "Show 10 more") : ""}`;
          A.hydrateArtwork($("mod-compatible-results"));
        }
        async function startPlan(weaponId, planned = null) {
          let fit;
          if (planned) {
            const m = E.mods.get(planned.modId),
              w = E.weapons.get(weaponId);
            if (!m || !w) return false;
            fit = modWeaponFit(m, w, planned.weaponTier, planned.modTier);
            if (fit.status !== "compatible") {
              A.toast(fit.reason);
              return false;
            }
          }
          if (
            dirty &&
            !(await confirmAction(
              "Start another plan?",
              "Your unsaved draft will be replaced. Saved builds are unaffected.",
              "Replace draft",
            ))
          )
            return false;
          draft = E.newBuild(
            weaponId,
            planned?.weaponTier || A.getState().tier,
            A.getState().profile,
          );
          if (planned)
            draft.selections = [
              {
                slotId: fit.slotId,
                modId: planned.modId,
                tier: planned.modTier,
              },
            ];
          draftMode = "new";
          readOnly = false;
          dirty = !!planned;
          rememberDraft();
          if ($("details").open) A.closeDetail();
          closeEquipment();
          A.navigate("planner");
          $("planner-panel").querySelector("h1").setAttribute("tabindex", "-1");
          $("planner-panel").querySelector("h1").focus({ preventScroll: true });
          return true;
        }
        function planBase(w) {
          if (!w)
            return '<p class="notice">The original weapon is missing from this data snapshot. Its ID and all selections are preserved.</p>';
          const s = A.stats(w, { tier: draft.tier, profile: draft.profile }),
            keys =
              w.group === "Firearm"
                ? ["damage", "dps", "speed", "magazine", "reload", "range"]
                : ["damage", "dps", "speed", "stamina", "returnTime", "range"];
          const labels = {
            damage: "Damage / source",
            dps: "DPS / source",
            speed: "Attack speed",
            magazine: "Magazine",
            reload: "Reload time",
            range: "Effective range",
            stamina: "Stamina cost",
            returnTime: "Return time",
          };
          return `<details class="base-reference" open><summary>Base weapon statistics · unmodified</summary><div class="plan-base-stats">${keys.map((k) => `<div><strong>${typeof s[k] === "number" ? esc(Math.round(s[k] * 100) / 100) + ({ speed: "/s", reload: " s", range: " m", returnTime: " s" }[k] || "") : "Unknown"}</strong><span>${labels[k]}</span></div>`).join("")}</div><p class="muted">${esc(draft.profile === "records" ? "Gamestegy detailed records" : "Nukes & Dragons published stats")} · Tier ${esc(draft.tier)}. Selected equipment never changes these values.</p></details>`;
        }
        function selectedEffect(s) {
          const m = E.mods.get(s.modId);
          return m
            ? `${icon(m)}<h3>${esc(m.name)} <small>Tier ${esc(s.tier)}</small></h3><p>${esc(effect(m, s.tier))}</p>${acquisition(m)}${button("mod-detail", "Equipment reference ↗", `data-mod-id="${esc(m.id)}" data-tier="${esc(s.tier)}"`)}`
            : `<h3>Missing modification</h3><p>${esc(s.modId)} · Tier ${esc(s.tier)}</p>`;
        }
        function renderPlanner() {
          if (!draft) {
            $("planner-panel").innerHTML =
              `<div class="empty"><h1>Plan a weapon build</h1><p>Choose a weapon to inspect its real equipment slots.</p>${button("choose-plan-weapon", "Choose weapon", "", "primary")}</div>`;
            return;
          }
          const w = E.weapons.get(draft.weaponId),
            layout = E.slotsFor(draft.weaponId, draft.tier),
            issues = E.issues(draft),
            orphans = draft.selections.filter(
              (s) => !layout.slots.some((x) => x.id === s.slotId),
            );
          $("planner-panel").innerHTML =
            `<div class="section-intro"><div><span class="eyebrow cyan">NC / ${readOnly ? "SAVED CONFIGURATION" : "EQUIPMENT PLANNER"}</span><h1>${readOnly ? esc(draft.name) : "Plan weapon build"}</h1><p>Reference planning only. Effects remain separate; no damage, DPS or other base-stat calculations.</p></div>${button("to-builds", "Build library ↗")}</div>${banner()}<div class="plan-identity"><div class="plan-weapon-art">${w ? A.artwork(w) : ""}</div><div><h2>${esc(w?.name || draft.weaponId)}</h2><p class="classification">${esc(w?.technology || "Unknown")} / ${esc(w?.class || "Missing weapon")}</p><div class="exp-inline-fields"><label>Weapon tier <select id="plan-tier" ${readOnly ? "disabled" : ""}>${tiers(draft.tier)}</select></label><label>Base reference <select id="plan-profile" ${readOnly ? "disabled" : ""}><option value="records" ${draft.profile === "records" ? "selected" : ""}>Detailed records</option><option value="nd" ${draft.profile === "nd" ? "selected" : ""}>Published stats</option></select></label>${w ? button("inspect-base-weapon", "Weapon inspection ↗", `data-weapon-id="${esc(w.id)}"`) : ""}</div></div></div>${issues.length ? `<div class="notice review-warning"><strong>Needs review — not a validated configuration</strong><ul>${issues.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : '<p class="exp-result-status">Source-checked equipment rules · not individually game-tested in patch 2.5</p>'}<div class="planner-columns"><div>${planBase(w)}<h2>Planned equipment</h2><div class="equipment-slots">${layout.slots
              .map((slot) => {
                const selected = draft.selections.find(
                    (s) => s.slotId === slot.id,
                  ),
                  m = E.mods.get(selected?.modId);
                return `<article class="equipment-slot ${selected ? "occupied" : ""}">${m ? icon(m) : `<span class="slot-token slot-${slot.kind}">${A.slotGlyph(slot.kind)}</span>`}<span class="slot-name">${esc(slot.label)}</span><strong>${esc(selected ? m?.name || selected.modId : slot.fixed ? slot.fixed.name : "Empty — choose equipment")}</strong>${selected ? `<small>Tier ${esc(selected.tier)}</small>${m ? `<p class="slot-effect-summary">${esc(effect(m, selected.tier))}</p>` : ""}` : ""}${slot.fixed ? `<small>${slot.fixed.status === "fixed" ? "Built-in · cannot be swapped" : "Replacement unverified"}</small><a href="${esc(slot.fixed.source)}" target="_blank" rel="noopener noreferrer">Slot rule source ↗</a>` : ""}${!readOnly && !slot.fixed ? `<div class="exp-actions">${button("pick-slot", selected ? "Change" : "Choose", `data-slot-id="${esc(slot.id)}"`)}${selected ? button("clear-slot", "Clear", `data-slot-id="${esc(slot.id)}"`) : ""}</div>` : ""}</article>`;
              })
              .join(
                "",
              )}</div>${!layout.slots.length ? '<p class="muted">No supported slots are published at this tier. You can save a weapon reference with notes; no fictitious slots are added.</p>' : ""}${layout.unknown.map((x) => `<p class="notice">${esc(x)}</p>`).join("")}${orphans.length ? `<section class="notice"><h3>Preserved selections without a current slot</h3>${orphans.map((s) => `<p>${esc(s.slotId)} · ${esc(E.mods.get(s.modId)?.name || s.modId)} · Tier ${esc(s.tier)} ${!readOnly ? button("clear-slot", "Remove from plan", `data-slot-id="${esc(s.slotId)}"`) : ""}</p>`).join("")}</section>` : ""}<p class="installation-note">The planner is freely editable. Conventional mods are normally permanent in the game; x-MOD2 replacement and removable Chimera mods are exceptions. Fixed sights may not be removable. An empty sniper-scope slot means undecided, not a scope-less in-game weapon.</p></div><aside class="plan-notes"><h2>${readOnly ? "Personal notes" : "Save this configuration"}</h2>${readOnly ? `<h3>${esc(draft.name)}</h3><p class="build-notes-full">${esc(draft.notes || "No personal notes.")}</p><p>${draft.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</p><p>${draft.favorite ? "★ Favorite build" : "Not favorited"} · ${esc(draft.patchTarget)} target</p><div class="exp-actions">${button("edit-current-build", "Edit configuration", "", "primary")}${button("duplicate-current", "Duplicate")}</div>` : `<label>Build name<input id="plan-name" value="${esc(draft.name)}" maxlength="300"></label><label>Personal notes<textarea id="plan-notes" rows="9" placeholder="Why this setup? What do you still need to acquire?">${esc(draft.notes)}</textarea></label><label>Tags <small>Separate with commas</small><input id="plan-tags" value="${esc(draft.tags.join(", "))}" placeholder="Stealth, Experimental"></label><label class="check"><input id="plan-favorite" type="checkbox" ${draft.favorite ? "checked" : ""}> Favorite this build</label><p class="muted">Build favorites are independent of weapon favorites.</p><div class="exp-actions">${button("save-build", draftMode === "edit" ? "Update build" : "Save new build", "", "primary")}${draftMode === "edit" ? button("save-as-new", "Save as new") : ""}</div><p id="plan-save-status" role="status" class="muted">${draftMode === "edit" ? "Editing an existing build." : "A new build never overwrites another configuration."}</p>`}</aside></div><section class="planned-effects"><h2>Documented equipment effects & acquisition</h2><p class="muted">Each component is listed independently. Bonuses are not added together or applied to the base weapon.</p>${draft.selections.length ? draft.selections.map((s) => `<article class="equipment-effect-detail">${selectedEffect(s)}</article>`).join("") : '<p class="muted">Choose equipment to review its effects and acquisition here.</p>'}</section>`;
          A.hydrateArtwork($("planner-panel"));
          hydrateEquipment($("planner-panel"));
        }
        function editDraftField(target) {
          if (!draft || readOnly) return;
          const fields = { "plan-name": "name", "plan-notes": "notes" };
          if (fields[target.id]) draft[fields[target.id]] = target.value;
          if (target.id === "plan-tags")
            draft.tags = [
              ...new Set(
                target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              ),
            ].slice(0, 50);
          if (target.id === "plan-favorite") draft.favorite = target.checked;
          dirty = true;
          rememberDraft();
        }
        async function saveBuild(asNew = false) {
          if (!draft || readOnly) return;
          draft.name = draft.name.trim();
          if (!draft.name) {
            $("plan-name").focus();
            A.toast("Give this build a name.");
            return;
          }
          const next = E.clone(draft);
          next.dataVersion = DB.meta.dataVersion;
          next.patchTarget = DB.meta.targetPatch;
          next.updatedAt = new Date().toISOString();
          const warnings = E.issues(next);
          if (
            warnings.length &&
            !(await confirmAction(
              "Save with review flags?",
              "Unverified or stale selections will be preserved and clearly flagged. This will not be labeled a validated setup.",
              "Save flagged plan",
            ))
          )
            return;
          if (asNew || draftMode !== "edit") {
            next.id = E.uid();
            next.createdAt = next.updatedAt;
          }
          let clean;
          try {
            clean = E.sanitizeBuild(next);
          } catch (e) {
            A.toast(e.message);
            return;
          }
          const exists = builds.some((b) => b.id === clean.id);
          if (!exists && builds.length >= 1000) {
            A.toast(
              "Library limit reached. Export an archive before adding more builds.",
            );
            return;
          }
          const success = persist(
            exists
              ? builds.map((b) => (b.id === clean.id ? clean : b))
              : [...builds, clean],
          );
          draft = E.clone(clean);
          draftMode = "edit";
          dirty = false;
          rememberDraft();
          renderPlanner();
          $("plan-save-status").textContent = success
            ? "Saved in this browser. Export a backup before moving the HTML file."
            : "Saved in this session only. Export builds now.";
          A.toast(
            success
              ? "Build saved."
              : "Browser storage unavailable — export this session.",
          );
        }
        function openSlot(slotId) {
          const slot = E.slotsFor(draft.weaponId, draft.tier).slots.find(
            (s) => s.id === slotId,
          );
          if (!slot || slot.fixed) return;
          dialogState = {
            kind: "picker",
            slotId,
            query: "",
            all: false,
            category: "",
          };
          showEquipment(
            shell(
              "Choose " + slot.label,
              "VISUAL EQUIPMENT PICKER",
              `<div class="exp-toolbar"><label class="search-box"><input id="equipment-search" type="search" aria-label="Search equipment picker" placeholder="Search equipment names or effects"></label></div><div class="exp-inline-fields"><label>Category <select id="equipment-category">${options(unique("category"), "", "All categories")}</select></label><label class="check"><input id="equipment-show-all" type="checkbox"> Show incompatible or unverified</label></div><p id="equipment-result-status" class="muted" role="status"></p><div id="equipment-picker-results" class="equipment-grid picker-equipment-grid"></div>`,
              "Source + slot checked means source-listed, matching slot and tier, with fixed restrictions checked; not individually game-tested. Equipment effects never alter base weapon stats.",
            ),
          );
          renderPickerResults();
        }
        function renderPickerResults() {
          const d = dialogState;
          if (d?.kind !== "picker") return;
          const slot = E.slotsFor(draft.weaponId, draft.tier).slots.find(
              (s) => s.id === d.slotId,
            ),
            selected = draft.selections.find((s) => s.slotId === d.slotId);
          let matches = [];
          for (const m of M) {
            if (d.category && m.category !== d.category) continue;
            if (!norm(searches.get(m.id)).includes(norm(d.query))) continue;
            const possible = m.tiers.filter(
                (t) => Number(t) <= parseInt(draft.tier, 10),
              ),
              t =
                selected?.modId === m.id
                  ? selected.tier
                  : possible.at(-1) || m.tiers[0];
            const c = E.compatibility(
              m.id,
              draft.weaponId,
              draft.tier,
              d.slotId,
              t,
              draft.selections,
            );
            if (!d.all && c.status !== "compatible") continue;
            matches.push({ m, t, c });
          }
          $("equipment-result-status").textContent =
            matches.length +
            " entries · " +
            slot.label +
            " · Tier " +
            draft.tier +
            " weapon";
          $("equipment-picker-results").innerHTML =
            matches
              .map(
                ({ m, t, c }) =>
                  `<article class="equipment-card ${selected?.modId === m.id && selected.tier === t ? "equipment-selected" : ""}" data-equipment-card="${esc(m.id)}"><div class="equipment-card-head">${icon(m)}<div><h3>${esc(m.name)}</h3><span>${esc(m.category)}${m.iconic ? " · Iconic" : ""}</span></div></div><div class="equipment-card-body"><label>Modification tier <select data-picker-mod-tier="${esc(m.id)}">${tiers(t, m.tiers)}</select></label><p class="picker-effect">${esc(effect(m, t))}</p><p class="equipment-compat ${c.status}">${compatibilityLabel(c.status)}</p><details class="compat-evidence"><summary>Compatibility evidence</summary><p>${esc(c.reason)}</p></details><details><summary>Acquisition & installation</summary>${acquisition(m)}<p>${m.slotKind === "mod" && !m.iconic ? "Normally permanent in game; planning remains editable." : "See equipment sources for installation exceptions."}</p><div class="exp-source-links">${links(m)}</div></details></div><div class="equipment-card-actions">${button("select-equipment", selected?.modId === m.id ? "Selected" : "Select this equipment", `data-mod-id="${esc(m.id)}" data-tier="${esc(t)}" ${c.status !== "compatible" ? "disabled" : ""}`, c.status === "compatible" ? "primary" : "")}</div></article>`,
              )
              .join("") ||
            '<div class="empty"><h3>No source-verified equipment matches</h3><p>Try a different search or reveal unavailable entries to see the reasons.</p></div>';
          hydrateEquipment($("equipment-picker-results"));
        }
        function selectedMatch(id, tier) {
          return draft.selections.some(
            (s) =>
              s.slotId === dialogState.slotId &&
              s.modId === id &&
              s.tier === tier,
          );
        }
        function selectEquipment(id, tier) {
          if (!draft || dialogState?.kind !== "picker") return;
          const slotId = dialogState.slotId,
            c = E.compatibility(
              id,
              draft.weaponId,
              draft.tier,
              slotId,
              tier,
              draft.selections,
            );
          if (c.status !== "compatible") {
            A.toast(c.reason);
            return;
          }
          draft.selections = draft.selections.filter(
            (s) => s.slotId !== slotId,
          );
          draft.selections.push({ slotId, modId: id, tier: String(tier) });
          dirty = true;
          rememberDraft();
          closeEquipment();
          renderPlanner();
          $("planner-panel")
            .querySelector(`[data-slot-id="${CSS.escape(slotId)}"]`)
            ?.focus();
        }
        function renderBuilds() {
          const tags = [...new Set(builds.flatMap((b) => b.tags))].sort();
          $("builds-panel").innerHTML =
            `<div class="section-intro"><div><span class="eyebrow cyan">NC / PERSONAL CONFIGURATIONS</span><h1>Saved weapon builds</h1><p>Keep equipment plans, acquisition leads and your own notes. Stored in this browser, separate from weapon favorites.</p></div><div class="exp-actions">${dirty ? button("resume-draft", "Resume unsaved plan") : ""}${button("choose-plan-weapon", "New weapon build", "", "primary")}</div></div>${banner()}<div class="exp-toolbar"><label class="search-box"><span aria-hidden="true">⌕</span><input id="builds-search" type="search" aria-label="Search saved builds" placeholder="Search build names, weapons, tags or personal notes…" value="${esc(buildFilters.query)}"></label>${button("export-builds", "Export JSON")}${button("import-builds", "Import JSON")}<input id="builds-import-file" type="file" accept="application/json,.json" hidden></div><div class="exp-inline-fields"><label>Tag <select id="builds-tag">${options(tags, buildFilters.tag, "All tags")}</select></label><label class="check"><input id="builds-favorites" type="checkbox" ${buildFilters.favorites ? "checked" : ""}> Favorite builds only</label>${button("choose-filter-weapon", esc(E.weapons.get(buildFilters.weapon)?.name || "Any weapon"), 'data-context="builds"')}${buildFilters.weapon ? button("clear-build-weapon", "Clear weapon") : ""}${button("compare-builds", "Review two builds side by side", comparison.length !== 2 ? "disabled" : "")}</div><p id="builds-result-count" class="exp-result-status" role="status"></p><div id="builds-results" class="equipment-grid builds-grid"></div>`;
          renderBuildResults();
        }
        function filteredBuilds() {
          const words = norm(buildFilters.query).split(/\s+/).filter(Boolean);
          return builds
            .filter(
              (b) =>
                words.every((q) =>
                  norm(
                    [
                      b.name,
                      E.weapons.get(b.weaponId)?.name,
                      b.notes,
                      ...b.tags,
                    ].join(" "),
                  ).includes(q),
                ) &&
                (!buildFilters.favorites || b.favorite) &&
                (!buildFilters.tag || b.tags.includes(buildFilters.tag)) &&
                (!buildFilters.weapon || b.weaponId === buildFilters.weapon),
            )
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        }
        function renderBuildResults() {
          const rows = filteredBuilds();
          $("builds-result-count").textContent =
            rows.length +
            " saved configuration" +
            (rows.length === 1 ? "" : "s");
          $("builds-results").innerHTML = rows.length
            ? rows
                .slice(0, buildPage)
                .map((b) => {
                  const w = E.weapons.get(b.weaponId),
                    flags = E.issues(b);
                  return `<article class="equipment-card build-card browsable-card" data-open-build="${esc(b.id)}" data-build-id="${esc(b.id)}"><div class="build-card-top"><span class="eyebrow">SAVED CONFIGURATION</span>${button("favorite-build", b.favorite ? "★" : "☆", `data-build-id="${esc(b.id)}" aria-label="${b.favorite ? "Unfavorite" : "Favorite"} build ${esc(b.name)}" aria-pressed="${b.favorite}"`)}</div><button class="build-art equipment-art-open" data-plan-action="review-build" data-build-id="${esc(b.id)}" aria-label="Open ${esc(b.name)} artwork">${w ? A.artwork(w) : "<span>Weapon reference missing</span>"}</button><div class="equipment-card-body"><h2><button class="equipment-name" data-plan-action="review-build" data-build-id="${esc(b.id)}">${esc(b.name)}</button></h2><p>${esc(w?.name || b.weaponId)} · Tier ${esc(b.tier)}</p><span class="quality-tag ${flags.length ? "review-needed" : ""}">${flags.length ? "Needs review" : "Source-checked plan"}</span><ul class="build-selection-summary">${b.selections.map((s) => `<li>${E.mods.has(s.modId) ? icon(E.mods.get(s.modId)) : ""}${esc(E.mods.get(s.modId)?.name || s.modId)} <small>T${esc(s.tier)}</small></li>`).join("") || "<li>No equipment selected</li>"}</ul><p>${b.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")}</p><p class="build-notes-preview">${esc(b.notes || "No notes yet.")}</p><label class="check"><input type="checkbox" data-build-compare="${esc(b.id)}" ${comparison.includes(b.id) ? "checked" : ""}> Compare this plan</label></div><div class="equipment-card-actions build-actions">${button("review-build", "Open", `data-build-id="${esc(b.id)}"`, "primary")}${button("edit-build", "Edit", `data-build-id="${esc(b.id)}"`)}${button("duplicate-build", "Duplicate", `data-build-id="${esc(b.id)}"`)}${button("rename-build", "Rename", `data-build-id="${esc(b.id)}"`)}${button("delete-build", "Delete", `data-build-id="${esc(b.id)}"`, "destructive")}</div></article>`;
                })
                .join("") +
              (rows.length > buildPage
                ? button("more-builds", "Show more builds")
                : "")
            : `<div class="empty"><h2>${builds.length ? "No builds match" : "Your build library starts here"}</h2><p>${builds.length ? "Try another keyword or clear your filters." : "Choose a weapon, plan its supported equipment, and save a name and notes."}</p>${button("choose-plan-weapon", "Plan a weapon build", "", "primary")}</div>`;
          A.hydrateArtwork($("builds-results"));
          hydrateEquipment($("builds-results"));
        }
        async function openBuild(id, edit = false) {
          const build = builds.find((b) => b.id === id);
          if (!build) return;
          if (
            dirty &&
            !(await confirmAction(
              "Replace unsaved draft?",
              "Your current unsaved edits will be replaced by this saved build.",
              "Open saved build",
            ))
          )
            return;
          draft = E.clone(build);
          draftMode = "edit";
          readOnly = !edit;
          dirty = false;
          rememberDraft();
          A.navigate("planner");
        }
        function duplicateBuild(id) {
          if (builds.length >= 1000) {
            A.toast(
              "Library limit reached. Export an archive before adding more builds.",
            );
            return;
          }
          const original = builds.find((b) => b.id === id);
          if (!original) return;
          const copy = E.clone(original);
          copy.id = E.uid();
          copy.name = original.name + " (copy)";
          copy.favorite = false;
          copy.createdAt = copy.updatedAt = new Date().toISOString();
          persist([...builds, copy]);
          A.toast(
            storageProblem
              ? "Duplicated in this session; export a backup."
              : "Build duplicated.",
          );
          if (A.getView() === "builds") renderBuilds();
          else openBuild(copy.id, true);
        }
        function renameBuild(id) {
          const build = builds.find((b) => b.id === id);
          if (!build) return;
          dialogState = { kind: "rename", id };
          showEquipment(
            shell(
              "Rename build",
              "SAVED CONFIGURATION",
              `<label>Build name<input id="rename-build-name" value="${esc(build.name)}" maxlength="300"></label>`,
              button("save-build-name", "Save name", "", "primary"),
            ),
          );
          $("rename-build-name").select();
        }
        async function deleteBuild(id) {
          const b = builds.find((b) => b.id === id);
          if (!b) return;
          if (
            !(await confirmAction(
              "Delete saved build?",
              `Delete “${b.name}” and its saved notes? Export a backup first if you want to keep a copy.`,
              "Delete build",
            ))
          )
            return;
          persist(builds.filter((x) => x.id !== id));
          comparison = comparison.filter((x) => x !== id);
          if (draft?.id === id) {
            draft = null;
            dirty = false;
            rememberDraft();
          }
          renderBuilds();
          A.toast("Build deleted.");
        }
        function chooseWeapon(context = "plan") {
          dialogState = { kind: "weapon", context, query: "" };
          showEquipment(
            shell(
              context === "plan" ? "Choose a weapon" : "Filter by weapon",
              "WEAPON ARCHIVE",
              `<label class="search-box"><input id="equipment-weapon-search" type="search" aria-label="Search planner weapons" placeholder="Search weapon name, class or technology"></label><p class="muted">Slot capacity and compatibility are checked after selecting a weapon and tier.</p><div id="equipment-weapons" class="compatible-weapon-list"></div>`,
            ),
          );
          renderWeaponChoices();
        }
        function renderWeaponChoices() {
          const q = norm(dialogState.query),
            rows = A.data.weapons.filter((w) =>
              norm([w.name, w.class, w.technology].join(" ")).includes(q),
            );
          $("equipment-weapons").innerHTML =
            rows
              .slice(0, 80)
              .map(
                (w) =>
                  `<button class="exp-weapon-choice" data-plan-action="choose-weapon-result" data-weapon-id="${esc(w.id)}"><span class="exp-weapon-thumb">${A.artwork(w)}</span><span><strong>${esc(w.name)}</strong><small>${esc(w.technology)} / ${esc(w.class)}</small></span></button>`,
              )
              .join("") +
            (rows.length > 80
              ? '<p class="muted">Showing 80 matches; search to narrow the weapon list.</p>'
              : "");
          A.hydrateArtwork($("equipment-weapons"));
        }
        function exportBuilds() {
          const json = JSON.stringify(E.exportBundle(builds), null, 2),
            url = URL.createObjectURL(
              new Blob([json], { type: "application/json" }),
            ),
            a = document.createElement("a");
          a.href = url;
          a.download = "Night-City-Arsenal-Builds.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        async function importBuilds(file) {
          if (!file) return;
          try {
            if (file.size > 20 * 1024 * 1024)
              throw Error(
                "This file exceeds the 20 MB import safety limit. Split a large archive into smaller backups.",
              );
            const result = E.importBundle(
              JSON.parse(await file.text()),
              builds,
            );
            const durable = persist(result.builds);
            renderBuilds();
            showEquipment(
              shell(
                "Build import complete",
                "LOCAL DATA PORTABILITY",
                `<p>${result.imported} builds imported. ${result.duplicates} duplicate IDs received new IDs; no existing build was overwritten.</p><p>${durable ? "Saved in this browser." : "Session only — browser storage failed. Export now."}</p>${result.warnings.length ? `<h3>Preserved items needing review</h3><ul>${result.warnings.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p>All imported references pass the current source rules.</p>"}`,
              ),
            );
          } catch (e) {
            showEquipment(
              shell(
                "Import rejected",
                "EXISTING BUILDS PRESERVED",
                `<p role="alert">${esc(e.message)}</p><p>Your existing build library was not changed.</p>`,
              ),
            );
          }
        }
        function compareBuilds() {
          const picks = comparison
            .map((id) => builds.find((b) => b.id === id))
            .filter(Boolean);
          if (picks.length !== 2) return;
          showEquipment(
            shell(
              "Saved configuration comparison",
              "REFERENCE ONLY · NO MODIFIED STATS",
              `<div class="build-comparison-wrap"><table class="build-comparison"><thead><tr><th>Plan</th>${picks.map((b) => `<th>${esc(b.name)}</th>`).join("")}</tr></thead><tbody><tr><th>Base weapon</th>${picks.map((b) => `<td>${esc(E.weapons.get(b.weaponId)?.name || b.weaponId)} · Tier ${esc(b.tier)}</td>`).join("")}</tr><tr><th>Equipment, effects & acquisition</th>${picks.map((b) => `<td>${b.selections.map((s) => `<section>${selectedEffect(s)}</section>`).join("") || "No equipment selected"}</td>`).join("")}</tr><tr><th>Notes & tags</th>${picks.map((b) => `<td><p class="build-notes-full">${esc(b.notes)}</p><p>${esc(b.tags.join(" · "))}</p></td>`).join("")}</tr><tr><th>Validation</th>${picks.map((b) => `<td>${esc(E.issues(b).join(" · ") || "Source-checked rules; not individually game-tested.")}</td>`).join("")}</tr></tbody></table></div>`,
            ),
          );
        }
        function equipmentNotes() {
          showEquipment(
            shell(
              "Equipment coverage & rules",
              "SOURCE TRANSPARENCY",
              `<p>${esc(DB.meta.inventoryNote)}</p><p>All ${M.length} distinct catalog records and ${M.reduce((n, m) => n + m.tiers.length, 0)} published tier variants are bundled offline. No older or invented scaling formula is applied.</p><p>Compatibility requires a published slot at the chosen weapon tier and positive individual support in the source. Missing evidence is unverified. Most iconics therefore offer attachments only; x-MOD2 and explicitly source-listed exceptions retain real mod slots.</p><p>Conventional installed weapon mods are normally permanent in game. x-MOD2 replacement is an exception; Chimera mods can be removed. Some iconic sights are fixed. The planner remains editable and models neither your inventory nor your game save.</p><p>Modification quality may not exceed weapon quality. Intermediate weapon + tiers with no published slot count stay unverified. Empty slots mean an unfinished plan, not a simulated in-game equipment state.</p><p>Four Chimera mods share the one-core crafting choice. Different builds can explore alternatives; a single plan cannot consume that core twice.</p><p>Parallax has no verified item-specific acquisition route in this snapshot. Other routes retain vendor/random/crafting distinctions and level/tier conditions. None of these per-item community references is blanket-certified for 2.5.</p><p>All ${DB.meta.itemImageCount || 0} current records include source-linked in-game item artwork from Gamestegy, bundled offline. Category glyphs remain a fallback for unavailable artwork. Disjunctor is an additional source-listed 2.5 Tech mod, separate from the four Chimera-core choices.</p><div class="exp-source-links"><a href="${esc(DB.meta.rulesSource)}" target="_blank" rel="noopener noreferrer">Installation and crafting reference ↗</a><a href="${esc(DB.meta.patchSource)}" target="_blank" rel="noopener noreferrer">Official 2.5 notes ↗</a></div><p>Data snapshot: ${esc(DB.meta.dataVersion)}. Build schema: 1. User builds use their own browser-storage key and JSON export; weapon preferences are untouched.</p>`,
            ),
          );
        }
        document.addEventListener("input", (e) => {
          const n = e.target;
          if (n.id === "mods-search") {
            modFilters.query = n.value;
            renderModResults();
          } else if (n.id === "builds-search") {
            buildFilters.query = n.value;
            buildPage = 60;
            renderBuildResults();
          } else if (
            n.id === "equipment-search" &&
            dialogState?.kind === "picker"
          ) {
            dialogState.query = n.value;
            renderPickerResults();
          } else if (
            n.id === "compatible-search" &&
            dialogState?.kind === "detail"
          ) {
            dialogState.weapons.query = n.value;
            dialogState.weapons.limit = 10;
            renderCompatibleWeapons();
          } else if (
            n.id === "equipment-weapon-search" &&
            dialogState?.kind === "weapon"
          ) {
            dialogState.query = n.value;
            renderWeaponChoices();
          } else if (n.closest("#planner-panel")) editDraftField(n);
        });
        document.addEventListener("change", (e) => {
          const n = e.target;
          if (n.dataset.modFilter) {
            modFilters[n.dataset.modFilter] = n.value;
            renderModResults();
          } else if (n.id === "mod-detail-tier") {
            dialogState.tier = n.value;
            renderModDetail();
            $("mod-detail-tier").focus();
          } else if (n.dataset.compatibleFilter || n.id === "compatible-tier") {
            const key = n.dataset.compatibleFilter || "tier";
            dialogState.weapons[key] = n.value;
            dialogState.weapons.limit = 10;
            renderCompatibleWeapons();
          } else if (n.id === "plan-tier" || n.id === "plan-profile") {
            draft[n.id === "plan-tier" ? "tier" : "profile"] = n.value;
            dirty = true;
            rememberDraft();
            renderPlanner();
          } else if (n.id === "builds-tag") {
            buildFilters.tag = n.value;
            renderBuildResults();
          } else if (n.id === "builds-favorites") {
            buildFilters.favorites = n.checked;
            renderBuildResults();
          } else if (n.id === "builds-import-file") importBuilds(n.files[0]);
          else if (
            n.id === "equipment-category" ||
            n.id === "equipment-show-all"
          ) {
            dialogState[n.id === "equipment-category" ? "category" : "all"] =
              n.id === "equipment-category" ? n.value : n.checked;
            renderPickerResults();
          } else if (n.dataset.pickerModTier) {
            const m = E.mods.get(n.dataset.pickerModTier),
              card = n.closest(".equipment-card"),
              c = E.compatibility(
                m.id,
                draft.weaponId,
                draft.tier,
                dialogState.slotId,
                n.value,
                draft.selections,
              );
            card.querySelector(".picker-effect").textContent = effect(
              m,
              n.value,
            );
            const status = card.querySelector(".equipment-compat");
            status.className = "equipment-compat " + c.status;
            status.textContent = compatibilityLabel(c.status);
            card.querySelector(".compat-evidence p").textContent = c.reason;
            card.classList.toggle(
              "equipment-selected",
              selectedMatch(m.id, n.value),
            );
            const b = card.querySelector(
              '[data-plan-action="select-equipment"]',
            );
            b.dataset.tier = n.value;
            const selected = draft.selections.find(
              (s) => s.slotId === dialogState.slotId,
            );
            b.textContent =
              selected?.modId === m.id && selected.tier === n.value
                ? "Selected"
                : "Select this equipment";
            b.disabled = c.status !== "compatible";
          } else if (n.dataset.buildCompare) {
            if (n.checked) {
              if (comparison.length >= 2) {
                n.checked = false;
                A.toast("Select two saved builds at a time.");
                return;
              }
              comparison.push(n.dataset.buildCompare);
            } else
              comparison = comparison.filter(
                (id) => id !== n.dataset.buildCompare,
              );
            $("builds-panel").querySelector(
              '[data-plan-action="compare-builds"]',
            ).disabled = comparison.length !== 2;
          } else if (n.id === "plan-favorite") editDraftField(n);
        });
        document.addEventListener("click", async (e) => {
          let n = e.target.closest("[data-plan-action]");
          if (!n) {
            if (
              e.target.closest("button,a,input,select,textarea,label,details")
            )
              return;
            const card = e.target.closest("[data-open-mod],[data-open-build]");
            if (card) {
              if (card.dataset.openMod)
                openMod(card.dataset.openMod, card.dataset.openTier);
              else await openBuild(card.dataset.openBuild, false);
            }
            return;
          }
          if (n.disabled) return;
          const action = n.dataset.planAction,
            id = n.dataset.buildId,
            weaponId = n.dataset.weaponId;
          if (action === "configure") await startPlan(weaponId);
          else if (action === "plan-compatible")
            await startPlan(weaponId, {
              modId: n.dataset.modId,
              modTier: n.dataset.tier,
              weaponTier: n.dataset.weaponTier,
            });
          else if (action === "more-compatible") {
            dialogState.weapons.limit += 10;
            renderCompatibleWeapons();
          } else if (action === "mod-detail")
            openMod(n.dataset.modId, n.dataset.tier);
          else if (action === "close-equipment") closeEquipment();
          else if (action === "equipment-notes") equipmentNotes();
          else if (action === "inspect-compatible") {
            closeEquipment();
            A.openDetail(weaponId);
          } else if (action === "inspect-base-weapon") A.openDetail(weaponId);
          else if (action === "choose-plan-weapon") chooseWeapon("plan");
          else if (action === "choose-filter-weapon")
            chooseWeapon(n.dataset.context);
          else if (action === "choose-weapon-result") {
            const context = dialogState.context;
            closeEquipment();
            if (context === "plan") await startPlan(weaponId);
            else if (context === "mods") {
              modFilters.weapon = weaponId;
              renderMods();
            } else {
              buildFilters.weapon = weaponId;
              renderBuilds();
            }
          } else if (action === "clear-mod-weapon") {
            modFilters.weapon = "";
            renderMods();
          } else if (action === "clear-build-weapon") {
            buildFilters.weapon = "";
            renderBuilds();
          } else if (action === "mods-reset") {
            for (const k in modFilters) modFilters[k] = "";
            renderMods();
          } else if (action === "pick-slot") openSlot(n.dataset.slotId);
          else if (action === "clear-slot") {
            draft.selections = draft.selections.filter(
              (s) => s.slotId !== n.dataset.slotId,
            );
            dirty = true;
            rememberDraft();
            renderPlanner();
          } else if (action === "select-equipment")
            selectEquipment(n.dataset.modId, n.dataset.tier);
          else if (action === "save-build" || action === "save-as-new")
            await saveBuild(action === "save-as-new");
          else if (action === "to-builds") A.navigate("builds");
          else if (action === "resume-draft") {
            readOnly = false;
            A.navigate("planner");
          } else if (action === "review-build" || action === "edit-build")
            await openBuild(id, action === "edit-build");
          else if (action === "edit-current-build") {
            readOnly = false;
            renderPlanner();
          } else if (
            action === "duplicate-build" ||
            action === "duplicate-current"
          )
            duplicateBuild(id || draft.id);
          else if (action === "rename-build") renameBuild(id);
          else if (action === "save-build-name") {
            const name = $("rename-build-name").value.trim(),
              renameId = dialogState.id;
            if (!name) {
              $("rename-build-name").focus();
              return;
            }
            persist(
              builds.map((b) =>
                b.id === renameId
                  ? { ...b, name, updatedAt: new Date().toISOString() }
                  : b,
              ),
            );
            if (draft?.id === renameId) draft.name = name;
            closeEquipment();
            renderBuilds();
          } else if (action === "favorite-build") {
            persist(
              builds.map((b) =>
                b.id === id
                  ? {
                      ...b,
                      favorite: !b.favorite,
                      updatedAt: new Date().toISOString(),
                    }
                  : b,
              ),
            );
            renderBuildResults();
          } else if (action === "delete-build") await deleteBuild(id);
          else if (action === "export-builds") exportBuilds();
          else if (action === "import-builds") $("builds-import-file").click();
          else if (action === "compare-builds") compareBuilds();
          else if (action === "more-builds") {
            buildPage += 60;
            renderBuildResults();
          }
        });
        window.NCAExpansion = Object.freeze({
          render,
          engine: E,
          data: DB,
          getBuilds: () => E.clone(builds),
          getDraft: () => (draft ? E.clone(draft) : null),
          isDraftDirty: () => dirty,
          startPlan,
          openBuild,
          filteredMods,
          filteredBuilds,
        });
        if (["mods", "builds", "planner"].includes(A.getView()))
          render(A.getView());
      })();
