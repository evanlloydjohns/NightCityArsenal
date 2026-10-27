# Night City Arsenal

**Double-click `index.html`.** It opens in your default browser on Windows. No installation, server, account or internet connection is needed. You may also drag the file into a current Edge, Chrome or Firefox window. Keep the supplied folder if you want the source and reports; the HTML file itself is self-contained.

The catalog includes **115 iconic weapons and 75 optional non-iconic weapons**. It targets **Cyberpunk 2077 Update 2.5**, released October 22, 2026. Coronation and Sihil are included alongside all 113 reconciled older iconics.

## Mods, planning and saved builds

The **Mods** tab contains **71 distinct modifications/attachments**, including the four Chimera-core iconics, with **257 published tier variants**. Search by name or effect, combine category/class/technology/tier/content/acquisition filters, and inspect individual sources and supported weapons.

To plan equipment:

1. Open a weapon's inspection and choose **Configure**, or use **Builds → New weapon build**.
2. Click a real equipment slot to open the visual picker. Read the effect and acquisition, choose the mod tier, then select it. Unsupported or unknown fits cannot be installed as valid choices; fixed factory sights are labeled.
3. Add a build name, freeform notes, optional comma-separated tags and an independent build favorite. **Save new build** creates a distinct record; **Update build** edits one explicitly; **Save as new** keeps both.
4. Return through **Builds** to search notes/tags, review acquisition, edit, duplicate, rename, favorite, delete with confirmation, or compare two configurations without numerical predictions.

**Planning never changes base weapon statistics.** No modified damage, DPS, magazine total or other simulated performance is calculated. Notes and planned selections remain separate from weapon data.

**Back up builds with Builds → Export JSON.** Import adds validated copies and remaps duplicate IDs instead of overwriting existing records. Missing references survive with review warnings. Weapon preferences have their own **Data notes → Export preferences** backup; it does not include saved builds. Use both exports before changing file paths or browsers. Storage failures are reported and the session remains exportable.

The source advertises 74 mods but exposes 71 distinct names, independently reconciled against the Wiki. Parallax's precise acquisition route remains unverified. Category SVGs are used where individual item imagery is unavailable. See [MODIFICATIONS-DATA.md](MODIFICATIONS-DATA.md) for coverage, quality gaps, compatibility exceptions and data schema.

## Send to friends

The sibling `Share-with-friends` folder contains **`Night-City-Arsenal.html`**, the one-file app to send, and **`Night-City-Arsenal.zip`**, a smaller attachment with the same app and short instructions. Friends download the HTML and double-click it, or extract the ZIP and open the HTML inside. Nothing needs to be installed or hosted. See [SHARING.md](SHARING.md).

Every future build automatically refreshes these same filenames and the full source archive. Each friend's favorites, saved builds and settings remain in their own browser; the shared file contains no sender preferences or builds.

## Terminal interface

Arsenal opens directly into a compact working inventory: title, search/sort/view commands, one shared reference/tier line and weapon results. The former marketing hero, overview counters, offline status block and density selector are removed. Overview totals, patch-target explanations and offline/bundled information are in **Data Notes**. No landing page or extra entry click was added.

The interface uses dark charcoal information surfaces inside a black/crimson shell, inset angular inventory frames, consistently outlined chamfered controls, yellow selected/iconic emphasis and cyan technical details. The NC mark is an original SVG monogram. The small **Filters** button collapses/restores the desktop rail without clearing selections or accordion state. Quick Compare buttons use restrained outlines. The comparison console groups damage/performance, handling, special properties and weapon information. Compact weapon headers remain pinned inside its scrolling table. Empty slots can open the weapon picker directly; one main Add weapon action remains. There is one readable interface layout; older backups retain favorites and settings while their retired density field is ignored. Fonts use Windows system families (Bahnschrift, Segoe UI and Consolas, with offline fallbacks); all interface glyphs and geometry are original SVG/CSS.

Comparison uses a searchable visual weapon picker. Type a name, class or technology; use Up/Down and Enter, or click a result. Selected weapons are excluded. Escape closes the picker and returns focus. Each populated column has a **Replace weapon** button.

Filter categories expand in place as independent accordions; several can stay open together. The sidebar scrolls independently on desktop and keeps Clear all accessible. Category headings have no hover or focus flyout. Expansion states persist between Arsenal and Favorites and across reloads. Long filter lists include an option search; it never clears selections. Click the checkbox, its text or the row to toggle once, or focus a checkbox and press Space. The active-filter count and removable chips identify your selections. Weapon inspection panels use a wider desktop layout: ability/stats/slots on the left and acquisition/identity on the right. Narrow screens stack these columns. Verification and sources remain expandable; all prior information is retained. Previous/Next navigation has its own fixed footer outside the single scrolling content area. Data Notes also uses expandable topics; all substantive source limitations remain available.

## Use

- Search names, classes, effects, manufacturers and base models. Press `/` to focus search.
- Select several checkboxes inside each expanded filter, such as **Pistol + Revolver**. Selections within one category use OR; different categories combine with AND. Remove individual selections with the chips above the catalog. Previous single-choice preferences are migrated automatically. On smaller screens, expand **Catalog filters**.
- Switch between cards and table view. Click the **Item Type** table header, or select **Item type** in the sort dropdown, to group by class and technology. Click again to reverse the order.
- Click a weapon's name or **Details** for its full ability, statistics, acquisition and sources. Press Escape to close.
- All 190 entries — 115 iconics and 75 non-iconics — show sourced weapon artwork in cards, table thumbnails, comparison columns and details. Images are embedded in the HTML and work offline.
- Select up to four weapons with **Compare**. The shared tier and reference apply to every column. Replace or remove selections directly in comparison.
- Mod and attachment capacity is visual: one icon per supported slot. Distinct game-style glyphs identify weapon, Tech, Smart, melee and throwable mods, plus scopes and muzzles. Expand **Slot icon key** for the legend; hover icons or focus their slot group for labels. Published tier-dependent counts update with the shared tier, and unknown counts are labeled.
- Star favorites. Preferences and comparisons save locally when your browser permits file-based local storage. **Data notes** can export/import a preference backup if you move the file or change browsers.
- Source links need internet only if you choose to open them. They are not runtime dependencies.

## Approved visual styling

The approved older burgundy card surfaces, transparent weapon-image lighting and subdued sidebar/page atmosphere have been recovered from saved local CSS. Newer layouts, the corrected NC monogram, readable typography, Inspect actions and efficient rendering remain. See [VISUAL-BASELINE.md](VISUAL-BASELINE.md) for the stable design reference and intentional differences from older screenshots.

## Software-rendering performance

The application is optimized by default, including when browser hardware acceleration is disabled. Existing card/image nodes are reused, numeric formatting is shared, offscreen content is contained by the browser after measuring its size, and expensive image/backdrop effects are avoided. No Performance Mode, virtualization framework or runtime service was added. See [PERFORMANCE-REPORT.md](PERFORMANCE-REPORT.md) for measured before/after timings, raw evidence, testing limits and reproducible development commands.

## Read the data correctly

**Inventory support does not mean every value was measured in 2.5.** Existing weapon records and effects are sourced community references with explicit verification labels. No local game installation was inspected. Read [DATA-SOURCES.md](DATA-SOURCES.md) and [VALIDATION-REPORT.md](VALIDATION-REPORT.md) for exact limitations.

The **Detailed game records** reference uses Gamestegy. Its damage is per projectile or melee hit; its DPS is a source base-DPS record, not a sustained firing-cycle calculation. It has seven published tiers. **Nukes & Dragons** supplies eleven-tier published damage/DPS grids for 112 iconics. Its values may use another projectile or headshot convention. The application preserves those differences and never mixes numerical references between comparison columns.

Unknown values are deliberately visible. No interpolation is used for missing intermediate + tiers. Crowbar and Caretaker's Spade have no separately verified triggered iconic ability. Manufacturer and critical modifiers remain unknown where they could not be verified. The app flags Widow Maker's conflicting projectile/damage-type records and untested updated effects.

## Included files

- `index.html` — complete runnable app, including all data and all 190 weapon images.
- `source/` — readable HTML, CSS, JavaScript, normalized dataset, original PNG/WebP assets, image-source manifest, build script, tests and optional refresh tools.
- `DATA-SOURCES.md` — attribution, methodology and source links.
- `VALIDATION-REPORT.md` — coverage reconciliation, limits and test results.
- `SHARING.md` — friend-facing distribution files, updating and future maintenance workflow.
- `validation/` — canonical inventory, exact data-gap ledger, test results and headless screenshots.

Normal use requires only `index.html`. The development build command is `python source/build.py`; see `source/UPDATE-DATA.md` for maintenance. Opening the unbuilt source template automatically redirects to the runnable application one folder up.

## Equipment UX update

All 72 current equipment items now show authentic source-linked in-game artwork. Click a mod name, image or card to inspect it. In the compact source-listed weapon browser, search/filter and choose the weapon tier; Plan build preselects the inspected modification only when its slot/tier fit is source-checked. Saved-build names and artwork open the plan; management actions remain available. Favorites explicitly distinguishes an empty collection, filters hiding saved weapons, and a search with no matches. Clearing Favorites filters includes standard weapons. Existing favorites, saved builds and notes retain their original storage keys. See MODIFICATIONS-DATA.md for reconciliation, imagery credits and source limits.
