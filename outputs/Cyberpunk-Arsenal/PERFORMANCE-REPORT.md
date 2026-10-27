# Current Mods and Builds expansion: performance and validation

The approved application was captured before development in Git commit **736742b**. Existing `source/styles.css`, weapon data, image mappings and artwork remain unchanged. Only integration changes were made to the existing controller/template; equipment/UI/core logic lives in separate new source files. New Mods/Builds panels use the established palette, SVG slot glyphs, typography and shared chamfer geometry. There is no modified-stat simulation, backend, remote asset, visible browser automation or personal-browser setting change.

## Current measurements

Measurements use isolated offline headless Microsoft Edge at 1920x1080 with `--disable-gpu --disable-gpu-compositing`, reduced motion and CDP 4x CPU throttling. Responses span scripted activation through two animation frames, rather than physical input latency. The user continued using the computer; OS scheduling is uncontrolled. No other agent-launched browser test ran concurrently with either profiling workload. Headless/throttled results do not guarantee timings in the user's visible browser.

The comparison alternates before/expanded contexts (reversing order in the second pair) within one browser for three observations each. Before is the approved Git checkpoint. Git text newline normalization changes that blob's byte hash relative to the original working HTML, while preserving its browser content. The workload starts with the default 115 iconics and then switches to all 190; it is not a cold-page-load claim.

| Arsenal interaction | Approved checkpoint (ms) | Expanded app (ms) |
|---|---:|---:|
| Show all 190 weapons | 161.8 | 166.4 |
| Broad weapon search: p | 37.5 | 37.0 |
| First weapon table construction | 711.2 | 728.7 |
| Return to cached Cards | 119.0 | 119.8 |
| First weapon inspection | 305.6 | 310.9 |

The fixed 45-frame catalog scroll used **916.8 -> 911.9 ms of browser task work**. Total scheduled workload duration was 1446.1 -> 1548.1 ms; it intentionally contains frame waits and is not monitor FPS or input latency. Most response medians were close, with small overhead rather than a claimed speedup. Cold table construction and native inspection remain relatively costly at artificial 4x throttling.

The new feature workload uses three fresh offline contexts at the same GPU-disabled/4x settings:

| New-feature interaction | Median response (ms) |
|---|---:|
| open mods | 245.0 |
| search recoil | 31.2 |
| clear mod search | 104.3 |
| open planner | 110.8 |
| open slot picker | 113.8 |
| picker search | 53.6 |
| select equipment | 64.1 |
| save build | 35.8 |
| open builds | 43.3 |
| search build notes | 25.3 |

Idle task work over a one-second observation was **1.30 ms**. No continuous animation or polling loop was added. New equipment search uses a precomputed text index; only the active equipment/picker list is rendered. The build library renders at most 60 cards before Show more. All record combinations are not materialized. Existing weapon node/image reuse, one numeric formatter, lazy image loading, scoped rail sizing and measured native offscreen containment remain active and regression-tested. No filter, blur, mask, large shadow or compositor hint was added. Raw evidence is in `validation/modifications/arsenal-performance.json` and `performance.json`; development harnesses are `theme-profile.cjs` and `expansion-profile.cjs`.

## Current validation

**107 groups passed:** 73 existing regression/visual groups plus 15 planner/data/core groups, 16 end-to-end expansion groups and 3 storage/fixed-sight-filter groups. All browser groups use offline GPU-disabled headless Edge. Twelve DPR/zoom outline checks and fourteen actual-button-family pixel audits also pass. Friend-file and fresh-ZIP extraction checks exercise the original Arsenal plus all 71 Mods, visual selection, saved-build persistence, and empty recipient personal data.

The tests verify all 71 stable IDs, 256 tier variants, source links, acquisition categories, tier/slot gates, positive individual compatibility, iconic/x-MOD2 exceptions, fixed sights and one-core restrictions. Actual four-slot planning leaves the canonical weapon JSON and displayed base stats unchanged. Long plain-text notes, tags, independent favorites, explicit updates/save-as-new, duplicate/rename/delete, JSON portability, duplicate-ID remapping, unsafe/malformed imports, missing references, quota failures and corrupt storage are covered. Existing weapon data/source confidence, comparison math, images, favorites, filter persistence and offline launch remain covered.

Screenshots were inspected for Mods, equipment detail, empty/filled planner slots, visual picker, notes editor, saved library/review, stale references and informational build comparison. New screens cover 1920x1080, 2560x1440 and 390px; the existing Arsenal suite additionally checks 4K. Evidence is under `validation/modifications/`; the approved base CSS hash remains exact. No major overflow, broken icon or clipping defect was found in these tested views.

## Remaining limits

The bundled inventory reconciles 71 named items rather than padding the source's unexplained 74 banner. Parallax's precise acquisition is unverified; some scope tier/charge and internal-field conventions disagree across community sources. Category SVGs are used for equipment where individual item imagery was unavailable. Conservative fit rules can leave plausible new-weapon matches unverified. These limits are explicit in `MODIFICATIONS-DATA.md` and the app. No individual mod was game-tested in 2.5. Independent Firefox/Safari profiling, a physical touch-device run and a manual screen-reader audit were not performed. Browser file-storage behavior can vary; builds and weapon preferences have separate JSON backups.

- Approved Git checkpoint HTML SHA-256: `b84e888c148cd7fdd33ef911d494286e53573cfd1424a0b5541c30f84f56a25b`
- Expanded, tested HTML SHA-256: `528a88b9d427b515a72cd09a2a4e8875043399eb5743a73197510ebe2531bea1`
- Equipment snapshot: `2026.10.26-mods-r1`; saved-build schema: `1`.

---

# Previous approved-style restoration (historical evidence)

## Scope and recovery

The user designated the older screenshots as the visual baseline; their first image is the preceding implementation and their second image is the primary approved Arsenal reference. Git commands confirmed that the workspace is not a Git repository. The original older CSS was recovered from the saved local snapshot `work/performance-refinement/styles.css`, rather than reconstructed solely from screenshots. Selected original color/gradient declarations were integrated into `source/styles.css`; no repository rollback or old component replacement occurred.

Card interiors, image lighting, border intensity, subdued sidebar/page gradients, inspection surfaces and corresponding comparison/search/data surfaces use historical values. Current typography, card hierarchy, Inspect action, NC paths, two-column spacious inspection, acquisition disclosure, sticky grouped comparisons, filter rail, whole-row selection, persistence and rendering optimizations remain. After removing the style block, the preceding and restored production HTML are byte-for-byte identical. All 190 records, 115 iconics, image mappings and artwork bytes are unchanged. See VISUAL-BASELINE.md for the stable design contract, exact recovered values and intentional differences from the old screenshots.

## Software-rendering measurement

Isolated headless Edge, offline, 1920x1080, reduced motion, GPU/compositing explicitly disabled, 4x CPU throttling. The comprehensive three-context before/after runs use the existing performance-profile.cjs harness; CDP confirms software rasterization and compositing. No other regression browser suite ran concurrently with either profile. OS/user activity remains uncontrolled. Response windows span scripted activation through two animation frames, not physical input latency. The catalog begins at 115 iconics; all 190 is a later Collection action.

The first, separately timed full runs showed mixed results: all-weapon response 120.1 -> 126.2 ms, search 26.7 -> 25.3 ms, filter 54.3 -> 56.1 ms, first table 378.9 -> 531.7 ms and first inspection 194.9 -> 231.2 ms. Scroll task work was 560.4 -> 691.2 ms while scheduled frame intervals were almost unchanged at 23.6 -> 23.5 ms. These higher cold-layout medians warranted an additional check; they are not hidden or dismissed as proof of harmless noise.

A second, controlled-order check alternated fresh before/restored contexts within one browser, reversing order in the second pair, for three observations of each version under the same GPU-disabled/4x conditions. It includes all-weapon display, 45-frame scroll, cold table, cached cards, search and first inspection. It does not use the older pre-optimization release. No concurrent browser workload was launched by the agent.

| Alternating-check interaction | Before (ms) | Restored (ms) |
|---|---:|---:|
| All 190 collection switch | 133.3 | 131.9 |
| Broad search: p | 25.7 | 28.4 |
| First table construction | 528.6 | 501.9 |
| Return to cached Cards | 85.2 | 80.1 |
| First inspection open | 239.5 | 212.0 |
| Inspection close | 65.2 | 63.9 |

The alternating 45-frame scrolling workload used **677.5 -> 671.9 ms of task work**, with total scheduled workload duration 1201.1 -> 1195.9 ms. Total duration deliberately contains frame waits and is not an input-response metric. Clear-search response was 19.6 -> 27.2 ms while task work was 21.3 -> 18.6 ms, illustrating timing sensitivity to frame boundaries.

**Conclusion:** the higher cold-layout timings in the separated full profiles did not reproduce in the alternating check. This small sample did not demonstrate a consistent browsing/scrolling regression from the restored theme. It also does not establish a statistically significant speedup. Static gradients still require painting. The source code, DOM geometry, cached nodes, formatter reuse, image hydration, lazy decoding, native offscreen containment and scoped sidebar updates were preserved. No image filter, backdrop blur, large blurred shadow, animation, mask or compositor hint was restored. Browser/user/OS scheduling remains a limit, and this is not a guarantee for the user's visible browser.

Raw runs and hashes: `validation/visual-restoration/performance-before.json`, `performance-after.json` and `paired-performance.json`. Development harnesses: `source/tests/performance-profile.cjs` and `theme-profile.cjs`. The unmodified preceding HTML is retained at `work/visual-restoration/before.html` in the task workspace, not duplicated in the friend ZIP.

## Functional and visual validation

**73 groups passed**: 24 core + 9 UI + 11 sidebar + 7 terminal shell + 10 rendering/geometry + 6 atmospheric preservation + 6 visual restoration. All suites run isolated headless Edge with GPU/compositing disabled. The 190-weapon comparison against the preceding HTML preserves every acquisition/identity fact, hint, effect and source link. Twelve selected-button DPR/zoom raster combinations and fourteen actual-button-family pixel audits pass. Offline distribution tests cover the standalone shared HTML and a fresh ZIP extraction, all 190 image decodes, empty recipient personal state, filters and favorites with no page errors or runtime network assets.

Rendered screenshots were inspected for Arsenal Cards/Table, expanded sidebar, Favorites, spacious inspection with expanded acquisition/sources, empty/four-weapon/sticky comparison and narrow layout. Viewports include 1920x1080, 2560x1440, 3840x2160 and 390px width. The main reference comparison uses the same four leading reload-sorted weapons at 2560x1440, scaled to the provided reference's 2048x1152 dimensions. The approved screenshot, restored screenshot, preceding screenshot and contact sheet are retained under `validation/visual-restoration/`. Exact recovered CSS backgrounds are asserted independently of screenshot similarity.

Intentional differences: corrected NC monogram, consistent chamfer outlines, current card spacing/hierarchy and Inspect label, collapse control, wider two-column inspection and compact sticky/simplified comparison remain. Older per-image shadows/backdrop blur and previously removed defects were not restored. This is a close restoration of surface treatments with intentional layout differences, not a claim of pixel equivalence. The current visual baseline is documented for future work.

Remaining limits: no independent Firefox/Safari profiling, physical touch-device run or manual screen-reader audit was added. Existing data-verification limits remain. Cold table layout and native modal activation are nonzero. No known functional defect was found in the tested workflows.

- Preceding HTML SHA-256: `51f6f58e29e576a8eff8679aeba289eec3df26441685249548216e67d25de141`
- Restored HTML SHA-256: `87b057d73a3cf269818bc03e6b27b2ae98832c1f915e11b19b3e2ddd6680d6be`
- Source app.js remains SHA-256 `c170cb7af4b110200b01e3821de633ac9f827e0d519e3aa07b38f14c92be4599`.

---

# Previous atmospheric refinement (historical evidence)

This historical section describes the preceding release; the prior optimization report is preserved below as historical evidence. The weapon dataset, image mappings, image bytes, comparison calculations and NC SVG are unchanged.

## Current test method

Three independent offline contexts per version, isolated headless Microsoft Edge, 1920x1080, reduced motion and 4x CDP CPU throttling. Both runs explicitly disable GPU/compositing; CDP confirms software compositing and rasterization. No browser regression suites ran concurrently with either profile. The user continued using the computer, so unrelated OS activity remains uncontrolled. Measurements span scripted activation through two animation frames, rather than physical input latency. This is a small comparative sample, not a guarantee of visible-browser timing or smoothness.

Before is the immediately preceding optimized release, rather than the much older release in the historical report. The same development harness and sequence were used. Default startup shows 115 iconics; Show all 190 is a later Collection-filter action. Raw evidence: `validation/atmosphere/performance-before.json` and `performance-after.json`.

| Interaction | Before (ms) | Current (ms) |
|---|---:|---:|
| Show all 190 weapons | 141.7 | 117.9 |
| Broad search: p | 30.5 | 23.8 |
| Apply Power filter | 62.5 | 56.4 |
| First table construction | 660.0 | 452.5 |
| First inspection open | 206.4 | 225.5 |
| Inspection close | 93.0 | 67.1 |

The fixed 45-frame scrolling workload used **804.0 -> 646.9 ms** of browser task work; style recalculation used **83.1 -> 62.6 ms**. Median scheduled frame intervals were 27.7 -> 23.3 ms; these are a headless proxy, not display FPS. DOMContentLoaded was 1360.7 -> 1216.8 ms; idle task work over one second was 1.18 -> 1.01 ms.

**Interpretation:** this sample showed no catalog/search/filter/scroll regression. The first wider inspection open increased by 19.1 ms under artificial 4x throttling. It includes the larger modal and changed acquisition layout. No runtime rendering algorithm changed in this styling pass; lower timings elsewhere must not be treated as causal speedups from gradients. Three rounds and uncontrolled background activity do not establish statistical significance. No claim is made that static gradients are free or that every browser will show these exact results.

## Visual implementation

- One static radial gradient per weapon-image region; a stronger variant for large inspection art and a quieter variant for comparison thumbnails. Charcoal information panels retain bright crimson edges, cyan technical accents and yellow emphasis. No animation, blur, CSS filter, large shadow, raster texture or new external asset was added.
- Sidebar and shell share compatible charcoal/crimson backgrounds and structural separators. Existing optional rail collapse and native inline accordions are retained.
- Inspection is capped at 1240px total (roughly 1160px of usable information width), constrained to 94vw; mobile remains stacked. The image anchor is 490px on wide desktops. Quest/location/prerequisites and choice/deadline information stay visible. Method, story phase, lifepath and fallback details expand in place. Technical identity occupies a shared lower section. All original text and links remain available.
- Card action is now **Inspect**, because it opens the complete inspection modal. Existing accessible Details-for-weapon names remain compatible. The exact NC SVG paths and comparison math are unchanged. No Mods & Attachments expansion was implemented.

## Current validation

**67 test groups passed:** 24 core, 9 UI refinement, 11 sidebar, 7 terminal-shell, 10 rendering/geometry, and 6 atmospheric-refinement groups. The new suite compares every acquisition/identity fact, acquisition hint, iconic effect and provenance link for all 190 weapons against the preserved prior HTML. Tests also cover responsive modality, long acquisition routes, shared imagery in Favorites/comparison, mixed-family warnings, offline requests and software-rendering safeguards.

Twelve DPR/zoom outline raster checks and fourteen actual-button-family pixel audits passed. Screenshots at 1920x1080, 2560x1440 and 390px include card/table views, long and expanded inspection, Favorites, expanded sidebar and four-weapon comparison. The existing rendering suite additionally captures 4K. Before/after screenshots and new results are in `validation/atmosphere/`; other suites retain their own evidence directories. The offline distribution check verifies the standalone shared HTML and a fresh ZIP extraction.

Remaining limits: headless Edge is not a complete substitute for the user's visible browser; Firefox/Safari, physical touch devices and a manual screen-reader audit were not added. Cold table construction and native dialog activation still have nonzero costs. Existing source confidence and in-game patch verification limits remain unchanged.

- Before HTML SHA-256: `467e6923e6c27640ddc8efac1c19c5a4b67f4aa49f7d6e0523afc3d68f593d5f`
- Current HTML SHA-256: `51f6f58e29e576a8eff8679aeba289eec3df26441685249548216e67d25de141`

---

# Previous optimization pass (historical evidence)

Local test date: October 25, 2026. Weapon dataset and image mappings were not modified.

## Method

The preserved prior release and the finished application were profiled back-to-back using the same script, three independent offline browser contexts each, 1920×1080, reduced motion, and CDP CPU throttling rate 4. The first round also collects V8 sampling data; reported values are three-run medians. The browser is isolated **headless Microsoft Edge**, launched with `--disable-gpu --disable-gpu-compositing`. CDP reports `gpu_compositing: disabled_software` and `rasterization: disabled_software`. No personal browser settings were changed and no visible window was opened.

Cold page startup uses the default 115-iconic view. The “All 190 weapons” interaction changes the Collection filter to All after that startup; it is not a claim that a cold page loads in 102 ms.

The measured response window starts at scripted DOM activation and ends after two animation frames. It includes JavaScript, rendering/layout and the frame wait; it excludes human pointer travel and browser-process startup. It is a reproducible comparative workload, not an end-to-end hardware input-latency or monitor-FPS measurement. The user continued using the computer; OS scheduling and other activity are not controlled. Headless rendering and 4× throttling do not perfectly reproduce a particular visible browser or disabled-acceleration installation.

Raw metrics, action-level long tasks, formatter construction counts, DOM changes, sampling summaries, GPU status and hashes are bundled in `validation/performance/before.json` and `after.json`. The reproducible development harness is `source/tests/performance-profile.cjs`. The unmodified baseline HTML is retained in the task workspace under `work/performance-refinement/baseline.html`; it is not duplicated in the friend-facing download.

## Comparative response results

| Interaction | Before (ms) | After (ms) | Reduction |
|---|---:|---:|---:|
| All 190 weapons | 696.7 | 101.9 | 85.4% |
| Search: p | 743.8 | 24.7 | 96.7% |
| Search: pistol | 159.0 | 29.7 | 81.3% |
| Clear search | 659.9 | 46.1 | 93.0% |
| Favorite toggle | 698.1 | 29.1 | 95.8% |
| Apply Power filter | 391.0 | 39.5 | 89.9% |
| Cards → first Table construction | 711.2 | 327.8 | 53.9% |
| Table → cached Cards | 866.3 | 59.6 | 93.1% |
| Add two comparison selections | 1420.6 | 55.3 | 96.1% |
| Open comparison section | 195.0 | 163.7 | 16.1% |
| Return to cached Arsenal | 781.7 | 76.4 | 90.2% |
| First inspection open | 425.0 | 166.2 | 60.9% |
| Inspection close | 466.2 | 62.8 | 86.5% |

DOMContentLoaded: **1359.7 → 1015.8 ms**. First contentful paint: **364 → 344 ms**; that paint can include the shell rather than all weapon images.

## Scrolling and idle work

- Browser main-thread task work over the fixed 45-frame scroll: **1009.2 → 559.5 ms**.
- Style recalculation during that scroll: **397.3 → 54.1 ms**.
- Median scheduled scroll frame interval: **23.4 → 21.2 ms**. This is a headless animation-frame proxy, not physical display FPS.
- Idle task work over a one-second observation: **0.60 → 1.38 ms**. Both are small; no idle-performance reduction is claimed. No continuous animation or background rendering loop was introduced.

## Diagnosed costs and implemented changes

1. **Whole-catalog replacement on unrelated actions.** Favorites and comparison selection rebuilt all 190 entries, invalidated layout and replaced image nodes. A bounded DOM pool now keeps one current tier/reference set per view; filtered-out entries are detached and results remain real DOM nodes. Only the affected selection controls and tray are patched. Sorting/filtering reconcile existing nodes. There is no custom virtual list or inaccessible placeholder-only inventory.
2. **Repeated formatter construction.** The initial iconic view constructed 345 `Intl.NumberFormat` instances; an all-weapons rebuild constructed 568. One shared formatter now serves every render and interaction. Immutable icon markup is also reused.
3. **Serializing image payloads into HTML repeatedly.** Every render escaped and reparsed base64 image strings. Markup now contains stable record IDs; exact bundled image URLs are assigned once to the new image nodes. Explicit dimensions, lazy loading and asynchronous decoding were already present and are retained. No image recompression or source-art replacement was needed.
4. **Broad inherited-style invalidation.** Sidebar viewport sizing wrote inherited CSS variables on the document root while scrolling and forced repeated geometry/style work. It now batches geometry reads in one requested frame, writes only changed values on the sidebar itself, and does no continuous idle polling.
5. **Offscreen style/layout during native modal activation.** A controlled experiment first showed large warm-open/close gains from browser-native `content-visibility`. The delivered version enables this only after measuring a real card content box, preserving the placeholder size and full DOM. The regression test scrolls the entire catalog down and back at 1920, 2560 and 390px widths and checks total extents within four pixels. Unsupported browsers fall back to ordinary rendering.
6. **Software-rendered effects.** Backdrop blur, per-image drop shadows and the large clipped dialog shadow were replaced by flat dark overlays and the existing static stage gradients. Combined effect-ablation measurements were exploratory and ordered after the first modal open; they are confounded by warming and are not presented as isolated causal gains for individual CSS properties. The stronger evidence is the full before/after workload plus the independent containment experiment.
7. **Shared outline geometry.** All angular action families use a simple matching outer/inset polygon pair. No masks, GPU-only effects or `will-change` hints were added. Focus follows the same silhouette.

## Tests and visual evidence

- **61 functional/UI groups passed**, all using GPU-disabled headless Edge. The new ten-group suite verifies node/image reuse, one formatter, stable scroll extents, sidebar restoration, two-column inspection, compact sticky comparison headers, original SVG branding and shared button geometry.
- The narrow-header NC vector logo was also captured at DPR 1.25, 2 and 3 to check its small-size silhouette and letter clarity.
- Twelve selected-button raster combinations cover DPR 1, 1.25 and 2 at 80%, 100%, 125% and 150% CSS zoom.
- Pixel audits cover fourteen actual button families, including navigation, Details, Add/disabled, Replace, Compare/Selected, view, filter toggle, Reset, chips, modal close/Previous/Next and export. Centered captures prevent the fixed comparison tray from obscuring the sampled button. Solid-filled controls are checked as silhouettes rather than as a contrasting border.
- Offline file launch, all 190 image decodes, friend HTML and fresh ZIP extraction, favorites/preferences, comparison math and numeric tier/source consistency pass.
- Screenshots include 1920×1080, 2560×1440, 3840×2160 and a 390px viewport, plus inspection with expanded metadata, collapsed rail, four-weapon sticky comparison, Favorites and Data Notes. Evidence: `validation/performance-refinement/`.

## Remaining limits

Cold first Table construction and first native modal activation still incur browser layout/style work. They improved but are not instantaneous under artificial 4× throttling. Software scroll frame intervals remain a proxy rather than a smoothness guarantee. A manual screen-reader audit, physical touch-device testing and independent Firefox/Safari profiling were not performed. The app remains usable without `content-visibility` support, although its gains will differ. Existing game-data verification limits remain unchanged.

## Fingerprints

- Baseline HTML SHA-256: `de631d600c33bf9cb8ed94282aaeb9ebe304002946200c8cefd2208d8ee410b3`
- Previous-pass HTML SHA-256: `467e6923e6c27640ddc8efac1c19c5a4b67f4aa49f7d6e0523afc3d68f593d5f`

## Reproducing a development run

Normal application use requires no runtime installation. For development, use Node, Playwright and an installed Edge browser; set `PLAYWRIGHT_MODULE` if Playwright is not on Node's normal module path. From the application folder:

```powershell
$env:BROWSER_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:CPU_RATE='4'
$env:PERF_ROUNDS='3'
node source/tests/performance-profile.cjs index.html validation/performance/local.json
```

The optional raster scripts use Pillow during development. None of these tools are used by the delivered HTML.
