# Completeness and validation report

Research snapshot: **October 25, 2026**. Target: **Cyberpunk 2077 Update 2.5**. Deliverable: `index.html`, a single self-contained offline application. The source project is in `source/`.

## Inventory result

**115 unique iconic weapons**, plus **75 optional non-iconic weapons**. No known iconic in the reconciled public-source inventories was omitted.

| Cross-check | Result |
|---|---|
| Vaexil 2.31 canonical list | All 113 iconic names matched after alias normalization. |
| Nukes & Dragons | All 112 listed iconics matched. Gwynbleidd is absent there, rather than a duplicate or a missing app record. |
| Gamestegy current weapon index | All 115 listed iconics matched, including Coronation and Sihil. |
| Games Lantern 2.3 | Declares 104 iconics. Individual records/manufacturers were cross-checked; the complete accessible export needed to identify its exact eleven-item difference was unavailable. Its total was not accepted as completeness evidence. |
| Cyberpunk Wiki | Requested category could not be retrieved through available legitimate access. Not claimed as a successful inventory audit. |
| Official 2.5 release and recent guides | Release verified; Coronation and Sihil independently confirmed as new iconics absent from the older 113 list. Boar Carver verified non-iconic. |

The difference between 112 and 113 is **Gwynbleidd**. The difference between the reconciled 113 older iconics and 115 current sourced iconics is **Coronation and Sihil**. A four-mod-slot revolver, a new sword, and a non-iconic reward knife are not conflated into one generic “King's gear” entry.

Alias normalization merges display qualifiers such as Hercules 3AX (Prototype), Rasetsu (Prototype), NDI Osprey (Prototype), Butcher's Cleaver (Iconic), Crowbar (Bunker), and capitalization differences. Stable sourced `Items.*` record identifiers distinguish standard weapons from iconic variants. Multiple copies of La Chingona Dorada or Genjiroh do not become duplicate weapon definitions.

The optional catalog excludes the AR minigame toy, the unarmed Knuckles record and a duplicate legacy Quasar article without an equipment payload. It preserves actual weapon variants and the two distinct standard/iconic Crowbar records. Non-iconic content-source fields are Unknown unless verified; they are not all assumed to be base-game content.

## Iconic coverage breakdown

| Coverage | Count |
|---|---:|
| Base-game content, including the two 2.5 additions | 59 |
| Phantom Liberty | 52 |
| Account/promotional rewards | 4 |
| Firearms | 84 |
| Melee | 24 |
| Throwable | 7 |
| x-MOD2 variants, included in the categories above | 11 |

The four reward records are Black Unicorn, Gwynbleidd, Scorch and Yasha. Yasha's old campaign is marked no longer available in the acquisition reference; that historical availability was not independently re-tested in 2.5. Other former promotional weapons have current airdrop acquisition leads where the 2.31 reference reports them.

The complete 115-entry inventory with source URLs is in `validation/canonical-inventory.json`. Every iconic has an authored, source-based ability summary. **Crowbar and Caretaker's Spade** are explicitly marked as having no separately verified triggered combat ability; their source tooltip text is flavor only.

## Numerical and verification limits — explicit outstanding items

- **No independent game-file or in-game 2.5 measurements.** The inventory was checked against current release information and current public references. Existing weapon statistics and ability behavior are not blanket-certified as unchanged. This is a documented reference application, not a laboratory-verified 2.5 simulator.
- Gamestegy provides **seven tier records for all 115 iconics**: 1, 2, 3, 4, 5, 5+, 5++. Its intermediate **1+, 2+, 3+, 4+ data is absent for all 115**; those selections display Unknown.
- Nukes & Dragons provides **all eleven damage/DPS tiers for 112 iconics**. **Gwynbleidd, Coronation and Sihil** have no numerical record there. Their fields remain Unknown in that mode.
- **85 of 190 manufacturers are Unknown.** Exact weapon names are listed in `validation/data-gaps.json`. Verified model-family attributions are labeled and sourced; no generic manufacturer category was guessed into a brand.
- All **115 iconic fixed critical-hit-chance and critical-damage base fields** are Unknown in the normalized numerical source. Conditional critical effects remain in the ability descriptions. Other missing fields are listed per weapon in the gap ledger; absent is never treated as zero.
- **Widow Maker** has an unresolved conflict: detailed data reports five projectiles and Physical base damage, while the ability describes two Chemical projectiles. Both are displayed with a warning; no guessed correction was applied.
- **La Chingona Dorada and Yasha** have effect descriptions in the newer detailed source that differ from the 2.31 acquisition reference. The newer source is summarized, attributed and marked untested. La Chingona Dorada's dual-wield ammunition effect is shown separately from base statistics.
- **Double Trouble eligibility** is inferred only from the official Power pistol/revolver class restriction. Individual weapon exceptions, animation compatibility and the interaction of two iconic effects have not been game-tested. No dual-wield damage adjustment is folded into base stats.
- Acquisition branches, Black Market recovery, rewards and missability mainly come from the explicitly older 2.31 reference. Recent routes for Coronation/Sihil have an independent guide cross-check. They remain published leads, not personally walked routes.
- A source's tier table does not prove that each weapon naturally drops at each tier. Attachment/mod slots describe the sourced configuration and may vary with tier or fitted equipment.
- Games Lantern's exact 104-count discrepancy remains unresolved at record level due to access limitations. This does not leave a named weapon missing from the 115-entry inventory independently reconciled from the other sources. Unindexed or undocumented new additions cannot be ruled out without a complete 2.5 game-file audit.

## Automated data checks

Passed checks include unique IDs and names, valid record identifiers, source links, finite numeric values, nonnegative values where appropriate, unit normalization, valid tier keys, exact tier counts, no invented intermediate tiers, content/family coverage, reward entries and all eleven x-MOD2 variants.

The required notable cases were explicitly checked for identity, class, technology and populated ability: Malorian Arms 3516, Erebus, Her Majesty, Guts, Satori, Skippy, Yinglong, Rasetsu, Byakko, Widow Maker, Nehan, Achilles x-MOD2, Coronation and Sihil. Every one of the 115 iconic detail panels was opened programmatically and checked for its complete ability text, acquisition section and source links.

The refresh normalizer was also run against the cached research records in a separate staging directory. It reproduced the delivered 190-record dataset exactly. All Python tools and the JavaScript application passed syntax checks. A future live refresh remains dependent on upstream access and schema stability; it is never allowed to silently overwrite the production dataset.

## Production application tests

The exact delivered `index.html` was opened using **`file://` in an isolated headless Microsoft Edge**, with **network offline** and no desktop interaction. **Final result: 24 test groups passed, 0 failed.** The detailed result is recorded in `validation/test-results.json`.

The suite covers 24 test groups, including:

- Offline local-file launch and the full catalog.
- All 190 weapon images decode from embedded data URLs; dimensions match the canonical image manifest. A standalone copy of just the HTML loads images offline. Cards, table thumbnails, comparison columns and detail headers display mapped artwork. All 75 non-iconic detail images were additionally opened and decoded, and their table and comparison views checked.
- Name, class, manufacturer, effect, base-model and multiword searches.
- Every filter independently, combined filters, rewards, new content and dual-wield class eligibility.
- Multi-select OR behavior within a category (including all 38 Pistol/Revolver iconics), AND behavior between categories, individual chip removal, persistence and migration from earlier single-choice preference backups.
- Source slot identifiers, scope/muzzle classification, mod-technology distinctions, published tier counts, one icon per slot in cards/table/details/comparison, unknown intermediate tiers and no numerical capacity badges.
- Item Type header and dropdown sorting in both directions, class/technology grouping, saved sort state and accessible sort direction.
- All numerical sort keys in both directions; missing values sort last, including when a real value is zero.
- All eleven tier choices, exact source values, and Unknown where a reference lacks the tier.
- All 115 detail panels; melee/throwable applicability and full readable iconic effects.
- Table/card switching, favorite persistence, filter/sort/tier persistence and keyboard shortcuts.
- Two, three and four comparison columns; adding, replacement, removal and the four-item limit.
- Higher-is-better and lower-is-better highlights, ties, zero denominators and missing data.
- Mixed-family comparison warnings, disabled inapplicable rankings, and projectile-basis mismatches.
- Shared source/tier behavior, absent weapon records and persisted comparison selections.
- Complete offline dataset export and preference export/import.
- Desktop (1440 × 1000), tablet (768 × 1024), phone (390 × 844), mobile filter expansion, no global horizontal overflow and no horizontal overflow inside the phone detail dialog.
- Blocked and corrupt local storage recovery.
- No critical console errors, no HTTP requests and no external script/style/image dependencies.

A real UI defect found during testing — a schematic overlapping the comparison remove button — was fixed and retested. The final suite is rerun on the built artifact after source changes. Headless screenshot renders are included in `validation/` and were visually inspected.

## Completion status

Follow-up launch fix: `source/template.html` redirects to `../index.html` when opened directly. The build strips this development-only redirect. The current 24-group suite starts at the template and verifies that the production application opens correctly.

Follow-up image delivery: all 190 entries, including the 75 non-iconics, now have source-matched artwork bundled in the single HTML. All 189 original PNGs and the Testera WebP passed integrity and nonempty-pixel checks. Four iconic contact sheets and three non-iconic sheets were visually inspected, along with the updated application and detail-panel renders. There are 186 distinct image hashes; the four shared-art pairs and the unresolved current wrench appearance are documented in `DATA-SOURCES.md` and affected detail panels. No image was generated, recolored or replaced with a generic class picture. Testera uses Games Atlas's rendered image with its credit preserved, replacing an outline-only reference image. Source URLs, dimensions, attribution and checksums are in `source/weapon-images.json`.

Follow-up filters and capacity display (dataset r2): category filters support multiple simultaneous selections; old stored single-value filters migrate to arrays. Slot groups now preserve source IDs and tier counts, correcting the earlier classification of muzzle attachments as ordinary mods. For example, Liberty at Tier 5++ shows one muzzle, two weapon mods and one scope; Tier 1 shows just its two attachments, Tier 2 adds one mod, and Tier 2+ reports unknown mod capacity because that tier is absent from the source slot table. Coronation shows four Tech-mod icons. Cards, table rows, comparison rows and weapon details share the same capacity renderer. Item Type sorting groups by class, then technology, with name as a stable tie-break. Generic game-style glyphs are original SVG drawings; provenance and limitations are documented in `DATA-SOURCES.md`.

Friend-facing distribution: the build now automatically generates a standalone `Night-City-Arsenal.html` and smaller ZIP in the sibling `Share-with-friends` folder, alongside instructions, a release fingerprint and SHA-256 hashes. The HTML is byte-for-byte identical to the application that passed the 24-group suite. A separate headless offline distribution test opened both the share file and a fresh ZIP extraction, decoded all 190 images in each, exercised multi-select filtering and saved favorites, and confirmed empty initial personal preferences, no original installation path, no page errors and no network dependencies. Results are in `validation/distribution-test.json`. The ZIP excludes the source template and development dependencies. No server was configured.

The application, source, offline dataset, comparisons, favorites, preference backups, attribution and launch instructions are delivered and usable without development setup. **No known weapon is missing from the reconciled 115-entry iconic inventory.** The source-access, numerical, acquisition and per-weapon 2.5 verification limits above remain explicitly unresolved; the application does not conceal them or substitute fabricated data.


## UI refinement verification — October 25, 2026

The interface was refined in place. Canonical weapon identities, numerical values, effect text, source metadata, tier mappings and image assets were not altered. SHA-256 before and after:

- `source/weapons.json`: `4615455fb6cd14614d5281b28203d7a814968da32d53af8b68316fd2039f1386`
- `source/weapon-images.json`: `674479708131510ef963e5d2bc5d2145408162deed312316439290c0e6926b3c`

Existing storage key `night-city-arsenal.v1` is retained. Comfortable density is the default for old backups; compact density is optional and persists. No storage reset is needed. Normal browser/file-origin storage limitations still apply.

The 24-group existing regression suite passed with the comparison-selector tests updated to exercise the actual visual picker. All original data, filter, sort, tier, slot, favorite, comparison math, import/export and offline tests remain active. The new nine-group UI suite passed: comfortable catalog at 1920×1080, 2560×1440, 3840×2160, 1366×768, 768×1024 and 390×844; manufacturer search and filter closing; density persistence; wide modal and focus return; sticky table headers; keyboard comparison selection/replacement; duplicate exclusion; expandable notes; mobile filters/dialog scrolling; reduced motion and keyboard tooltips. Page width and picker fit checks passed. No page errors or application network dependencies were found.

Screenshots of all major screens, empty states, the comparison picker, filter dropdowns and responsive layouts were captured from the built offline file and visually reviewed. Evidence: `validation/ui-refinement/`, with machine-readable results in `results.json`. The exact friend-facing HTML and a fresh ZIP extraction are checked by `source/tests/distribution.test.cjs`; see `validation/distribution-test.json`.

Remaining limits: tests use isolated headless Microsoft Edge on Windows. Firefox/Safari and physical touch devices were not independently exercised. No manual screen-reader audit was performed. System fonts have offline fallback families; their appearance varies by operating system. Existing data gaps and patch-verification limitations described above remain unchanged.


## Targeted accordion and consistency fixes — October 25, 2026

The multi-select filters now use in-flow native `details` sections. Multiple categories remain open, checkbox changes do not close them, and outside clicks/focus changes do not dismiss them. The original dropdown dismissal/exclusivity handlers were removed. Each checkbox has an explicit native label association, with the label covering the full option row; no row click simulation or duplicate toggling handler is used. A controlled headless run of the old version did not reproduce the user's intermittent label failure, so its precise timing cause is not claimed as proven. The new implementation is verified directly for checkbox, text, row padding and keyboard activation across all seven multi-select categories, with exactly one change event per activation.

The desktop sidebar has one viewport-constrained outer scroller and a sticky Clear all header. Its available height accounts for the top-of-page position and comparison tray; it stays visible without requiring the catalog to scroll. Long option lists have their own bounded scroll area as explicitly permitted, with search outside that list. Selected counts, chips, category clears, OR/AND logic and the narrow-screen collapsible panel remain. Expansion preferences use an optional `openFilters` array in the existing storage key; old preference files remain compatible.

The missing diagonal button outline came from applying an ordinary rectangular CSS border to a clipped polygon. Primary/Compare controls now share matching outer and inset clipped polygons. The selected confirmation state remains green, active filter counts/chips and checkboxes use yellow, and keyboard focus uses cyan. The diagonal is continuous in normal, hover and keyboard-focus renders; disabled controls keep the same geometry. Twelve raster combinations cover device pixel ratios 1, 1.25 and 2 at CSS zoom scales 80%, 100%, 125% and 150%. `source/tests/check-border.py` verifies actual outline pixels in the interior diagonal region, beyond the horizontal/vertical edges. These are headless scale simulations, not manual browser-toolbar zoom tests.

The weapon modal has a single `.detail-scroll` content scroller and a separate persistent navigation footer. The footer consumes layout space rather than covering content. Long acquisition rows, expanded identity/source sections, final attribution/ID lines, focus-driven scrolling and Previous/Next navigation are checked. Disclosure states and scroll position are retained for same-weapon rerenders.

Validation: all 24 core regression groups, 9 existing UI groups and 11 new sidebar/control/modal groups passed, plus the 12 raster border checks and offline friend-package tests. New screenshots and results are in `validation/sidebar-refinement/`. Layouts were checked at 1920×1080, 2560×1440, 768×1024 and 390×844; the existing UI suite also checks 3840×2160 and 1366×768. `source/weapons.json` and `source/weapon-images.json` retain the exact SHA-256 hashes recorded above. All 115 iconics, 190 total records, numerical data and source metadata are unchanged.

The existing browser/data limitations still apply: isolated headless Edge was used, with no manual screen-reader audit or physical touch-device test. No visible browser window or desktop automation was used. No additional runtime dependency was added.


## Current terminal shell and browse architecture — October 25, 2026

This section supersedes the earlier UI descriptions of the hero, density selector and filter-heading tooltips. The maintained stylesheet was replaced with a unified design system rather than another override layer. No data-pipeline or weapon-math rewrite was performed.

**Browse structure:** Arsenal remains the default entry. No landing page was added. The marketing heading/subtext, large overview counters and offline/status banner have been removed from Arsenal. Overview counts, patch target and offline/bundled information live in Data Notes. The operational result count remains next to the inventory title. Reference/tier controls are one compact shared component, moved between the Arsenal/Favorites and comparison hosts without duplicating input IDs or losing event handlers. Their source definitions remain available on demand. At 1920×1080 the first card begins at about 312px, compared with roughly 630px in the prior shell; at 2560×1440 and 3840×2160 it begins at about 316px and 320px. Mobile results begin at about 517px in a 390×844 viewport.

**Removed controls:** There is no density selector, alternate density state, runtime branch, body attribute or density CSS. The sanitizer ignores the retired field in old backups while preserving favorites, comparisons, filters, tier, reference and view. Filter headings have no `data-tip` or hover/focus explanation box, including after selection. Their native in-flow accordion behavior, selected counts, label-row activation and independent scrolling remain. Specific statistic/slot/action tooltips still supply accessible contextual labels.

**Design system:** warm black surfaces, crimson structural outlines/gradients, inset asymmetrical inventory silhouettes, chamfered tabs and controls, yellow iconic/selected emphasis and cyan technical details. Repeated filled yellow Compare buttons were replaced by restrained crimson outlines; selected Compare controls use yellow confirmation. The shared outer/inset polygon technique preserves diagonal outlines. Tables, inspection panels, the picker, notes and favorites use the same shell. Comparison rows are grouped into ballistics/handling, configuration/effects, and identity/acquisition/provenance. The single modal scroller and separate persistent navigation footer are preserved.

**Persistence fix:** Native `details` queues its `toggle` event after activation. A regression check caught an immediate state snapshot/reload racing that save. Summary activation now persists the upcoming native open state before that queued event, without canceling activation or intercepting option-row clicks. The ordinary toggle listener reconciles programmatic changes. The checkbox activation tests still require exactly one change event per click or Space press.

**Validation:** 24 core regression groups, 9 UI groups, 11 sidebar/control/modal groups and 7 new terminal-shell groups passed: **51 groups total**, plus 12 DPR/CSS-zoom raster checks and the offline shared HTML/fresh ZIP extraction check. Tests explicitly cover metadata relocation, direct browse entry, density removal, old preference compatibility, absence of category hover/focus flyouts, reference controls across navigation/rerendering, grouped comparisons, viewport overflow and early result positioning. All 190 embedded weapon images decode; all 115 iconic details and 75 non-iconic images remain covered by the core suite. Screenshots of cards, table, filters, favorites, populated comparison, inspection, picker and Data Notes were captured and visually inspected. Screenshots and geometry/results: `validation/terminal-shell/`. Existing UI/sidebar screenshot suites also remain available.

Weapon data and image-manifest SHA-256 values remain exactly those recorded above. No new external runtime dependency, asset request, service or visible desktop automation was introduced. Existing data verification gaps and the limitation to isolated headless Edge/browser scale simulations remain; Firefox/Safari and a manual screen-reader audit were not added in this pass.


## Previous visual/performance refinement — October 25, 2026

This supersedes prior descriptions of narrow single-column inspection, burgundy content fills and partially shared action-button outlines. The current release has charcoal content planes within the existing crimson shell, a wider 1150px desktop inspection with two information columns and one scroll region, persistent footer navigation, compact sticky comparison identities, directly clickable empty comparison slots, an optional persistent desktop filter-rail collapse, and an original path-based SVG NC mark. Card statistics precede secondary slot metadata, preview text has a full-ability action, functional secondary type remains readable and unknown inspection numbers are visually subordinate.

All angular button families use the same inexpensive outer/inset polygon construction, including high-specificity selected navigation states and focus. Twelve DPR/zoom selected-button raster checks and fourteen actual-control family pixel checks passed. Existing native option-row semantics, multiple open accordions, chips and source/tier behavior remain intact.

The previous pass's **61 test groups** passed in isolated headless Edge explicitly launched with GPU/compositing disabled. The new ten-group suite covers node/image identity reuse, formatter reuse, browser-native containment with stable full-catalog scroll extents, responsive inspection, sidebar restoration, sticky four-weapon comparison identities, neutral content/brand geometry and full outline-family auditing. All prior 51 groups remain active, updated only for intentionally revised grouping/layout expectations and explicit software rendering. Offline distribution tests include fresh ZIP extraction. No page errors or runtime asset requests were observed. Screenshots are under `validation/performance-refinement/`.

Performance was measured before implementation and again with the final release using the same back-to-back three-run, 1920×1080, offline, 4× CPU-throttled protocol. CDP reports software compositing and rasterization. See `PERFORMANCE-REPORT.md` for all medians, profiling findings, isolated-experiment limits and raw JSON paths. No claim is made that headless throttled measurements perfectly reproduce a particular visible browser. Initial table layout and native modal activation still have nonzero rendering costs. No user hardware-acceleration setting was changed.

`source/weapons.json` and `source/weapon-images.json` retain the exact hashes previously recorded. All 115 iconic and 75 non-iconic records, source artwork, numerical facts, canonical IDs and data confidence notes are preserved. No backend, external runtime dependency, visible browser automation, density mode or sidebar hover flyout was introduced. Earlier browser/data-verification limitations still apply.


## Previous atmospheric styling and layout refinement

The current release supersedes the previous 1150px modal cap and Full ability action. Static radial weapon-image lighting is restored across cards, Favorites, inspection and comparison. Charcoal information surfaces remain distinct from crimson shell/sidebar atmosphere. Inspection now permits 1240px total desktop width, uses a larger image anchor, compact acquisition facts and collapsed route/fallback details; technical identity moves below the primary columns. The card action reads Inspect. The exact NC SVG, all numerical comparison logic, data/image manifests and original artwork remain unchanged. No unrelated feature expansion was added.

All **67 test groups** pass on the current HTML: existing 61 plus 6 new atmospheric/preservation groups. The new baseline comparison validates every acquisition/identity fact, acquisition hint, ability text and source link for all 190 weapons. All 12 selected-outline DPR/zoom cases and 14 actual button-family pixel audits pass. Test reports and screenshots in `validation/atmosphere/` include desktop, wide desktop, narrow, table, Favorites, long acquisition and mixed-family comparison. The existing 4K and offline regression suites were rerun. Current offline distribution evidence is in `validation/distribution-test.json`.

Comparable three-run GPU-disabled, 4x CPU profiles show no browsing/scroll regression in this sample; first inspection increased about 19 ms. This is not a causal claim of faster styling or a guarantee for visible browsers. Detailed results, hashes and remaining limits are in the current section of PERFORMANCE-REPORT.md. No visible browser, desktop interaction or personal browser-setting change was used. Data and artwork hashes recorded earlier remain exact. All 115 iconic and 75 non-iconic weapons remain available offline.


## Current approved visual restoration

Recovered actual color and gradient declarations from the saved pre-optimization terminal stylesheet; Git history is unavailable because the workspace is not a repository. No rollback occurred. Runtime changes are confined to source/styles.css. A production-output test proves that scripts, markup, data and NC SVG are identical after removing the style block. Burgundy card interiors, transparent blended image lighting and subdued page/sidebar atmosphere now match the older visual treatment. Recent readable type, chamfer geometry, card hierarchy, rail collapse, two-column inspection and grouped sticky comparisons are intentionally preserved. VISUAL-BASELINE.md records this stable approved styling.

All **73 functional/UI groups** pass on the restored production bytes, including a new six-group visual-restoration suite and the existing full 190-weapon information comparison. All 12 DPR/zoom outline raster cases and 14 actual button-family pixel audits pass. All requested page views plus 1920/2560/4K/narrow screenshots were inspected, with a direct same-weapon, matched-scale comparison to the user's approved reference. Evidence is in validation/visual-restoration/. No runtime page errors or network assets were observed. Updated friend-file/fresh-ZIP distribution evidence is in validation/distribution-test.json.

GPU-disabled 4x CPU profiling initially showed variable cold-layout timing. Alternating before/restored contexts did not reproduce a consistent browsing/scroll regression: scroll task work 677.5 -> 671.9 ms, search response 25.7 -> 28.4 ms and first inspection 239.5 -> 212.0 ms. Both the less-favorable separated measurements and the alternating results are fully reported in PERFORMANCE-REPORT.md; no causal speedup or visible-browser guarantee is claimed. Data/artwork hashes remain exact and all 115 iconic plus 75 non-iconic weapons remain bundled. Existing in-game data confidence and browser/audit limits remain unchanged.
