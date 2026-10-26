# Approved visual baseline

The user's second attached image is the primary approved Arsenal reference. Their first image shows the pre-restoration implementation; subsequent images show the desired older styling in other views. Preserve this baseline during future feature work unless the user requests a change or a clear visual/functional defect requires one.

## Recovery and implementation

Git inspection found no repository, commits or reflog in this workspace. The actual older terminal stylesheet was recovered from the existing local snapshot `work/performance-refinement/styles.css`. No reset, rollback or old component replacement was performed. Selected original surface values were integrated into the maintained `source/styles.css`. The generated production change is CSS-only: after removing the style block, the previous and restored HTML are byte-for-byte identical. The original JavaScript, markup, complete dataset, artwork and NC SVG are unchanged.

The recovered values include:

| Region | Approved treatment |
|---|---|
| Ordinary card interior | `linear-gradient(145deg,#231117,#100c0f 70%)` |
| Card edge | `#813343` |
| Card weapon light | `radial-gradient(ellipse,#72304738,transparent 72%)` |
| Sidebar | `linear-gradient(90deg,#1e0e15,#100b0e)` |
| Sidebar header | `#251019` |
| Page | Two low-opacity crimson radial gradients over `#090708`, rather than an opaque left-hand burgundy wash |
| Inspection identity header | `linear-gradient(110deg,#5a2036,#251020 60%,#170d16)` |
| Inspection weapon light | `radial-gradient(ellipse,#a7446740,transparent 73%)` |
| Inspection stats | `linear-gradient(120deg,#2a1221,#180e17)` |
| Inspection interior | `#100b10` |
| Primary accents | Yellow `#fcee0a`, cyan `#65e4e9` |

Lighting fades to transparency so each image blends into its surrounding burgundy surface. Avoid opaque rectangular lighting fields on otherwise neutral black cards. Keep crimson subtle around the page and distributed through the cards. Comparison, search, table and Data Notes surfaces use corresponding historical colors; their current layouts remain intact.

## Intentional differences from older screenshots

- The corrected path-based NC monogram is retained instead of the older distorted glyph.
- Current card dimensions, stat/ability hierarchy, secondary slots, readable type and **Inspect** action are retained. These produce small spacing/height differences from the older cards.
- The optional filter-rail toggle, consistent chamfered control geometry, wider two-column inspection, expandable acquisition routes, compact sticky comparison headers and simplified empty comparison remain.
- Older per-image drop shadows and backdrop blur were not restored. Static gradients reproduce the surface atmosphere without reintroducing those CPU-rendering costs. There are no new animations, filters, masks, compositor hints or external assets.
- Favorites, active filters and comparison selections in the user's screenshots are personal state, not bundled defaults.

## Visual evidence and checks

`validation/visual-restoration/approved-reference.png` preserves the supplied primary reference. `restored-reference-scale.png` renders the same four leading reload-sorted weapons at 2560x1440 and scales to the reference's 2048x1152 size for comparison. `reference-comparison.jpg` shows approved, preceding and restored views together. This is a close restoration of the actual surface treatments, not a claim of pixel equivalence across browsers or preserved layout differences.

The six-group `source/tests/visual-restoration.test.cjs` verifies the exact recovered gradients, CSS-only output, original script/NC mark, all requested views, mixed-family warnings, responsive geometry and software-rendering safeguards. It accepts the preceding HTML via `RESTORATION_BASELINE`. Original functional, accessibility/geometry and data-preservation suites remain active. See `VALIDATION-REPORT.md` and the current section of `PERFORMANCE-REPORT.md` for release results and limitations.
