# Weapon equipment and saved builds

Research snapshot: October 26, 2026. Target: Cyberpunk 2077 Update 2.5. The official release announcement and news listing were checked; no newer released update was found. The published 2.5 notes introduce Clampdown without naming its equipment reward. The refreshed Gamestegy and Nukes & Dragons catalogs now identify Disjunctor; it is included with its community-documented effect and quest route. The earlier 71-item snapshot missed this newly listed record. Their cross-platform mod.io support concerns third-party game mods and is separate from this equipment planner.

## Inventory and sources

The bundle contains **72 distinct equipment records and 257 directly sourced tier variants**:

| Category | Records |
|---|---:|
| Ranged weapon mods | 29 |
| Melee weapon mods | 10 |
| Throwable weapon mods | 3 |
| Scopes | 16 |
| Silencers | 4 |
| Muzzle brakes | 10 |

Four iconic Chimera-core mods are included within these categories: Firecracker, Wallpuncher, Hackatomy and Severance. They are not counted again as additional records.

[Nukes & Dragons' catalog](https://nukesdragons.com/cyberpunk-2077/db/mods) now lists 32 ranged (including three throwable), 10 melee, 16 scopes and 14 muzzles: **72 named records**. Its footer advertises 75, while cached individual pages still say 74. [Gamestegy's current equipment catalog](https://gamestegy.com/cyberpunk-2077/wiki/mods) independently lists the same 72 current items: 42 weapon mods, 16 scopes and 14 muzzles. Its 45 separately labeled legacy/cyberware/clothing items are excluded, including XC-10 Alecto and pre-2.0 mods. The three extra names implied by N&D's current footer remain unidentified; no unsupported entries were added.

The fifth iconic equipment record, **[Disjunctor](https://gamestegy.com/cyberpunk-2077/wiki/19016/disjunctor)**, is a Tier 5 Tech mod added in 2.5. Its two conditional charge/Bolt effects agree with [N&D](https://nukesdragons.com/cyberpunk-2077/db/mods/disjunctor). Gamestegy supplies the post-Clampdown H10 package route. It is separate from the four Chimera-core choices; Chimera removability is not assumed. The sources disagree on 12 versus 13 individual fits, so the common 12 are used. HA-4 Grit (Barghest) remains unverified for this mod. Its game entity ID and independent live-game confirmation remain unavailable.

Every equipment record includes its own source URLs, published tiers/effects, acquisition leads, individual compatibility IDs and confidence notes. Source facts were collected through public indexed page extracts. Earlier direct HTTP retrieval was refused; indexed public extracts supplied the factual records. This quality pass used ordinary headless browser requests to the public Gamestegy catalog and its linked CDN artwork; they returned the images directly. No access challenge was bypassed. Source designs, code and site layouts were not copied. Factual equipment summaries retain numeric conditions; flavor prose was not used as a replacement for effects.

Primary references:

- [Gamestegy equipment](https://gamestegy.com/cyberpunk-2077/wiki/mods): independent current/legacy inventory, Disjunctor cross-check and item-specific artwork. Each artwork page/CDN URL is retained in the image manifest and displayed in item inspection. Game artwork remains CD PROJEKT RED property, subject to the [fan-content guidelines](https://www.cdprojektred.com/en/fan-content).

- [Nukes & Dragons Mods](https://nukesdragons.com/cyberpunk-2077/db/mods): individual tier tables, structured values, effect descriptions and complete Used by/Fits lists. Canonical URLs are stored per record.
- [Cyberpunk Wiki Attachments and Modifications](https://cyberpunk.fandom.com/wiki/Cyberpunk_2077_Attachments_and_Modifications): independent inventory, classes, installation, crafting, scope families and exceptions. Individual pages provide acquisition and source cross-checks. Wiki community content is credited to its contributors under its [CC BY-SA terms](https://www.fandom.com/licensing).
- [Official 2.5 notes](https://www.cyberpunk.net/en/news/52120/check-out-whats-coming-to-night-city-in-the-edgerunners-2-update-for-cyberpunk-2077/) and [release announcement](https://www.cyberpunk.net/en/news/52125/cyberpunk-2077s-edgerunners-2-update-2-5-is-out-now): target version verification, not per-item game certification.
- [Active Chimera Core](https://cyberpunk.fandom.com/wiki/Active_Chimera_Core): one-core/four-alternative crafting choice. Individual mod pages document removability.

## Compatibility policy

The planner requires **both** published slot capacity from the preserved weapon archive **and** positive individual equipment support. Slot, class/technology restrictions expressed by the source lists, weapon/mod quality, iconic variants, x-MOD2 capacities and known exceptions all apply. Conventional quality 1–5 is stored independently of weapon tiers; a modification cannot exceed its host weapon's quality. No automatic quality upgrade or scaling is invented. Intermediate weapon + tiers with no published slot capacity remain unverified rather than borrowing another tier's capacity.

Most iconics expose only their documented attachments. x-MOD2 and explicitly source-listed exceptions such as Yasha retain supported mod slots; the engine does not impose an inaccurate blanket ban on every iconic. No-slot weapons still support notes-only reference builds. The source-listed Slaught-O-Matic lies outside the preserved 190-weapon catalog and cannot be configured here; no weapon record was added or altered to resolve that mismatch.

Fixed-attachment overlays correct broad fit lists without changing existing weapon statistics/slot-capacity records:

- Lexington x-MOD2: fixed ClearVue Mk.8 scope ([source](https://cyberpunk.fandom.com/wiki/Lexington_x-MOD2)).
- Ol' Reliable: fixed Type 2067 scope ([source](https://cyberpunk.fandom.com/wiki/Ol%27_Reliable)).
- Ambition: fixed unique Zetatech scope ([source](https://cyberpunk.fandom.com/wiki/Ambition)).
- Rook: fixed Grandstand scope and XC-10 Strix silencer ([source](https://cyberpunk.fandom.com/wiki/Rook)).
- The Headsman: dedicated sight; replacement has not been verified and is blocked as unknown.

One normal-playthrough Active Chimera Core crafts one iconic mod. Alternative builds may explore different choices; a single plan cannot equip two core-crafted choices. Conventional mods are normally permanent after installation in the game; x-MOD2 replacement and removable Chimera mods are documented exceptions. Attachments are generally removable, with fixed sights as above. Snipers require a scope in game. Empty planner slots represent undecided choices, not simulated removal from a game save.

## Data limits and conflicts

- Item-specific acquisition leads were verified for **71 of 72** records. **Parallax** retains Unknown for its exact route, plus the independently documented general mod-upgrade recipe. Random loot/vendor stock is never labeled guaranteed.
- E305 Prospecta and HPO Kanone MAX Mk.77 are marked **Pre-installed**, not purchasable/lootable, following their acquisition descriptions. Dogtown airdrops and Just Another Story routes require Phantom Liberty; this does not make every lower tier of an item expansion-exclusive.
- Modification tiers are published subsets, not an assertion that other qualities cannot exist. E305 Prospecta's explicit Wiki Tier 5 zoom/sway/full-charge effect is included separately because N&D stops at Tier 4. Additional scope-quality variants without an unambiguous tier record are not guessed.
- Gaki's Wiki Tier 5 charge-time description and N&D's internal charge field differ. Both statements remain identified; there is no inferred conversion. N&D structured reload-time fields can also disagree with prose about reload speed, and some fields are rounded. Primary descriptions and raw source fields remain separate.
- Conservative individual-evidence rules can leave plausible fits unverified when a weapon is absent from the equipment source, such as Coronation for older mod lists; Disjunctor explicitly lists Coronation, but other fits are not inferred from it. Class resemblance alone does not silently validate them.
- No individual equipment effect or fit was tested in a live 2.5 game. Source-verified means support in the cited community reference, not universal patch certification. Unknown compatibility is never selectable as valid; imported stale references remain stored and flagged.
- All **72 of 72** records now have distinct source-linked in-game equipment artwork; **0 use fallbacks** in this release. `source/modification-images.json` records each item/page/CDN URL, dimensions, copyright attribution and SHA256. The source-sized WebP images are at most 160×160; original CDN bytes are retained without recompression. Total payload is 496,874 bytes before embedding. Composited pixel comparisons on black and white confirm all 72 are visually identical to the preceding lossless conversion; only invisible RGB under transparent pixels differs. They appear in catalog, inspection, picker, occupied slots, selected effects and saved-build summaries. Original category SVGs remain a safe fallback for missing future assets. Artwork belongs to CD PROJEKT RED, sourced via Gamestegy, under the same noncommercial fan-reference treatment as the weapon art. No invented render or runtime download is used; all original 190 weapon images remain unchanged.

## Planning and saved data

This is an information-only planner. Selected equipment never mutates base weapons, recalculates damage/DPS/speed/magazine values, or adds bonuses into totals. Saved-build comparison presents identity, selected components, effects, acquisition, tags and notes; it is not a predicted-performance comparison.

Build schema **1** uses stable weapon IDs and `mod.*` equipment IDs. Each record stores name, weapon tier/reference, slot/modification IDs and modification tiers, plain-text notes, tags, independent favorite flag, creation/edit dates, patch target and equipment-data version. Several builds can refer to the same weapon. Updating a build is explicit; Save as new and Duplicate create new IDs. Deletion requires confirmation. Unsaved drafts can be resumed during the session.

Builds use `night-city-arsenal.builds.v1`; original weapon preferences retain `night-city-arsenal.v1`. The app stores no personal builds in the shared HTML. **Builds → Export JSON** backs up builds, notes, tags and favorites; **Data notes → Export preferences** is a separate weapon-preferences backup. Use both before moving the file or changing browsers. File-origin storage behavior varies by browser. There is no account, cloud synchronization, game-save connection or automatic update service.

Imports validate schema, types, dates, array sizes and unsafe object keys. Duplicate IDs are remapped instead of silently overwriting existing records. Missing weapon/mod references, orphan slots and older data versions are preserved with review flags. Unsupported future schemas are rejected without changing existing data; a future schema change must add an explicit migration. Notes support up to one million characters per build; imports are capped at 20 MB and 1000 builds for bounded validation. A storage/quota failure is reported; the current session remains exportable. Corrupt stored bytes are reported and retained until an explicit save/import changes the library.

## Source maintenance

The approved appearance was checkpointed before development in Git commit `736742b`. `source/styles.css`, `source/weapons.json`, `source/weapon-images.json` and the original weapon artwork are unchanged. New UI lives in `expansion.css`/`expansion.js`; compatibility/portability logic lives in `planner-core.js`; equipment data is in `modifications.json`. The existing controller has only integration changes for new navigation/actions. No backend or runtime dependency was added.

`source/tools/normalize-modifications.py` regenerates equipment data from cached public research extracts. Its input format is the preserved source-page text with line labels, canonical `index.json` category slugs, and individual Wiki acquisition extracts. The task's development cache remains in `work/mods-research/`, with existing weapon-page inverse links used to cross-check Grandstand. Raw third-party pages are research inputs, not bundled redistributions of entire websites. Future refreshes should recheck official patches, reconcile item names/tiers across independent sources, update explicit exceptions with linked evidence, preserve canonical IDs, run the new data/UI tests, and rebuild the same stable HTML/ZIP outputs. Never interpolate unknown tiers or turn absent evidence into a valid fit.


## UX quality pass and persistence investigation

The Favorites investigation used isolated contexts, including an old single-choice preference fixture, Cards/Table, all primary navigation sections, reload and a temporary loopback HTTP origin. Saved favorites and Builds use different keys; no collision or migration data loss was reproduced. The reproducible defect was ambiguous feedback when saved favorites were hidden by the current collection/search/filters. Favorites now distinguishes an empty saved collection, filters hiding saved entries, and no search matches. Clear filters in Favorites includes **all** weapon collections so standard favorites are actually revealed. Clear search retains other filters. Blocked storage shows a session-only message instead of implying durability. This is not an inspection of the user's personal browser storage. A file URL, a moved file and a hosted origin can have separate browser storage; use the existing export/import tools when moving between them.

Mod names and artwork are native keyboard buttons. Noninteractive card space delegates to the same inspection without nesting buttons or swallowing independent controls. Saved-build names/artwork use the same convention; Open is primary and management controls are subordinate. The compact source-listed weapon browser initially renders ten rows, supports Show 10 More, and combines name, class, technology, collection, status and weapon-tier controls. Source-listed is distinct from source-plus-slot/tier checked, incompatible and unverified. Plan Build revalidates and preselects the chosen mod and exact tiers into a real slot. No invalid or unknown fit is enabled. Picker evidence is expandable; uncertainty is retained, and selected slots show image, tier and effects without reopening the picker.

The additive inventory revision is `2026.10.26-r2`; the equipment rule snapshot remains `2026.10.26-mods-r1` because none of the previous 71 records/rules changed. Old saved builds therefore are not blanket-marked stale for an image/UX update. Individual selections are still validated on review. Reviewed extra source records are maintained in `source/tools/modification-additions.json`, applied by the normalizer after the earlier cache. Artwork maintenance uses `tools/download-modification-images.cjs` with an optional cache directory and `tools/bundle_modification_images.py` (development-only Playwright and Python). All completed assets are already bundled; recipients need neither tool.


## Modification inspection formatting refinement

The detail view now separates identity, effects, category support, acquisition, important restrictions and the existing compact weapon browser. Class tags and technology badges are informational. A required-slot glyph has its own label; category support still does not prove an individual fit. General rules live once in `source/modification-display.json` and appear in a collapsed **Installation Rules & Restrictions** disclosure after the weapon browser. Permanence, one-core limits, pre-installed equipment and fixed/unverified replacement warnings stay visible above the browser.

The reference-tier selector is compact and inline with Modification effects, and offers only published tiers. All 30 scopes/muzzles use the existing structured field arrays directly; names, signs and units are not converted. Missing units stay missing: +26 FOV is not silently turned into degrees or a percentage. Seven additional simple weapon mods use reviewed field/description mappings (Big Mag, Zero-G, Swiss Cheese, Supercharger, Condenser, Headhopper and Gambiteer). Explicit tier rows are copied from each existing documented effect, with no formulas or runtime parsing of prose. Big Mag's documented reload speed is distinct from the raw Reload Time label; Gambiteer's documented homing probability is distinct from its unitless raw hit-probability field. Raw fields and original descriptions remain available in their collapsed technical disclosure. The build checks every reviewed mapping against the canonical source tier values.

Other complex/conditional effects remain complete, readable descriptions. Gaki's separate 50% charge statement, E305's Wiki-only Tier 5 and Cetus's conditional headshot behavior remain visible beside their numeric rows. No source effects, numerical datasets, imagery, compatibility rules, player preferences or saved-build schema were changed. Catalog previews now name the displayed Reference Tier, show a few primary rows where appropriate, and move exhaustive tier/class lists into inspection. Data verification, image credits and source links remain accessible in a separate final disclosure.
