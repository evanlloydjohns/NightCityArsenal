# Data sources and attribution

Snapshot: **October 25, 2026**. Application dataset: **2026.10.25-r2**. Inventory target: **Update 2.5**, released October 22, 2026. This describes a public-source research snapshot, not an extraction from the user's game installation.

## Release verification

- [Official Update 2.5 patch notes](https://www.cyberpunk.net/en/news/52120/check-out-whats-coming-to-night-city-in-the-edgerunners-2-update-for-cyberpunk-2077/) — release date, new quests and Power pistol/revolver restriction for Double Trouble.
- [Official release announcement](https://www.cyberpunk.net/index.php/en/news/52125/cyberpunk-2077s-edgerunners-2-update-2-5-is-out-now) — confirms the update was released, rather than merely announced. The official news and newer-patch search did not establish a later released version as of the snapshot date.

## Weapon sources

| Source | Used for | Provenance limitation |
|---|---|---|
| [Gamestegy weapon index](https://gamestegy.com/cyberpunk-2077/wiki/weapons) and individual pages | 115 iconic identities; published game record IDs, numerical records, seven-tier tables, classifications, slot configurations and iconic effects | Has 2.5 content, but older records are not individually certified against an unmodified 2.5 game. Its raw base-DPS record differs from its index's calculated firing DPS and individual page firing-cycle display. |
| [Nukes & Dragons](https://nukesdragons.com/cyberpunk-2077/db/weapons) and 183 individual weapon pages | Independently reconciled 112 iconics; published damage/DPS grids at all 11 tiers; attack rate, magazine, reload, headshot and projectile figures where displayed | Per-weapon patch is unspecified. No stats are inferred for Gwynbleidd, Coronation or Sihil, which are absent. |
| [Vaexil](https://cyberpunk.vaexil.tv/weapons) and 113 individual pages | Independent 113-iconic inventory; base model, expansion/reward distinction, quest/activity, acquisition hint, deadline, lifepath and choice constraints | Explicitly written against 2.31. Author says routes were cross-checked against published guides, not personally walked in game. |
| [Games Lantern](https://cyberpunk.gameslantern.com/weapons) and individual/related-weapon records | Manufacturer/model-family cross-checks and numerical convention checks | Explicitly labeled 2.3; its advertised 104-iconic total is not treated as authoritative. A complete accessible inventory export was unavailable. |

Every normalized weapon contains individual `sources` entries, their roles and patch limitations. The application's details panel displays those links. `validation/canonical-inventory.json` lists the 115 iconic game record IDs, names and source URLs.

## New content missing from the older lists

- [Coronation detailed record](https://gamestegy.com/cyberpunk-2077/wiki/19010/coronation) and [The Click acquisition cross-check](https://www.theclick.gg/cyberpunk-2077-coronation-revolver/) — iconic Tech revolver from Clampdown, with four mod slots. It does not meet the Power-only dual-wield restriction.
- [Sihil detailed record](https://gamestegy.com/cyberpunk-2077/wiki/19014/sihil) and [GamingBolt new-item report](https://gamingbolt.com/cyberpunk-2077-update-2-5-adds-5-new-items-from-the-witcher-3-and-a-halo-2-inspired-pose) — iconic sword from Ariadne's message/package sequence.
- [Boar Carver record](https://gamestegy.com/cyberpunk-2077/wiki/19015/boar-carver) — same package, but **non-iconic**. It is included as optional content and does not inflate the iconic total.
- [2.5 additions index](https://gamestegy.com/cyberpunk-2077/wiki/patch-2-5) — cross-check of the three new weapons, separating the two iconics from Boar Carver. Clothing, Disjunctor, perks and other unrelated entries are excluded from the weapon inventory.
- [Gwynbleidd detailed record](https://gamestegy.com/cyberpunk-2077/wiki/3118/gwynbleidd) — account-reward iconic omitted from the Nukes & Dragons inventory; independently present in Vaexil.

## Numerical treatment

1. **No runtime research:** all normalized records are embedded in `index.html`. The application has no fetch/API/CDN calls and a Content Security Policy that blocks network connections.
2. **No mixed numeric columns:** a shared reference and shared tier apply across the comparison. Absent values remain Unknown; another source or tier is never silently substituted.
3. **Detailed reference:** damage uses the structured `damagePerProjectile` value; melee uses the corresponding hit value. DPS uses `baseDps`, with its matching published tier value. This is a source game record, not an independently calculated sustained DPS. Attack speed, magazine, reload, range, stamina and return time use the source's summary/by-tier fields. A by-tier dictionary takes precedence over a scalar; missing dictionary entries are not interpolated.
4. **Published reference:** damage and DPS are copied from each weapon's published 11-tier grid. Other available displayed values are preserved as the reference's base configuration. Its lone Tier 5 stamina figure is shown only at Tier 5, because other stamina tiers were not published in that display.
5. **Percentages:** fractional armor and critical modifiers in detailed records are normalized to percent. Headshot damage bonus is kept in each source's own documented/displayed convention; sources disagree and are never cross-ranked. A 0% field is distinct from an absent field.
6. **Units:** seconds, meters, attacks per second, projectile counts, magazine rounds, percentages and raw stamina units. No player perks, difficulty, armor, charge, fitted modifications or conditional effects are included in base numerical values.
7. **Calculations:** comparison differences use subtraction and, only for a positive reference value, percentage change. No damage interpolation, inferred scaling or effectiveness score is used. Bars show the relative magnitude of displayed values, not an overall weapon score.
8. **Model-family manufacturers:** where an individual iconic uses a verified base model, the maker is attributed to that family and labeled accordingly. Generic upstream “Street”/“Corporation” labels do not establish a manufacturer and become Unknown. The linked manufacturer reference provides the basis.
9. **Slot capacity:** source `modSlots` groups retain their slot identifiers, conditions and published `countByTier` tables. `PowerModule` is a muzzle attachment, not an ordinary weapon mod; `Scope` is an optic attachment. `Tech_*_WeaponMod*`, `Smart_*_WeaponMod*` and other weapon-mod identifiers determine the icon category. Published tier keys are mapped directly to the shared tier. Missing intermediate-tier counts are shown as unknown rather than inferred. Fixed counts remain as published. These icons show supported capacity, not whether a dropped weapon's slots are empty or its fitted attachments can be removed. A source listing no slot groups is labeled “No slots listed,” not a verified zero-capacity claim. Slot capacity uses this detailed reference even when the numerical stats reference is changed.

The slot glyphs are original SVG drawings following the game's visual conventions (chip/mod, Tech lightning, Smart targeting, melee/throwing, scope and muzzle). They are not claimed to be extracted game UI assets. One visible glyph represents one supported slot; accessible labels and tooltips identify the type.

## Access, wording and artwork

Public pages and publicly delivered structured page data were read using HTTP requests with caching and limited concurrency. Available robots policies were inspected. Login-only endpoints were not used. Cyberpunk Wiki's requested category was unavailable through the available access methods; it is **not** counted as a successfully audited inventory. Challenges on Games Lantern and VULKK were not bypassed. Accessible Games Lantern pages were reviewed with the research tool; an inaccessible complete export was not reconstructed speculatively.

Ability descriptions are original factual paraphrases of the individually linked sources and retain important numerical conditions where available. They are not presented as verbatim in-game tooltip quotations. Acquisition includes short attributed hints and structured quest/location/choice facts; long guide walkthroughs are not bundled. No third-party fonts or website layouts are redistributed. The original Games Atlas credit on the Testera image is retained.

## Weapon inventory artwork

All 190 weapons — 115 iconics and 75 non-iconics — have source-matched artwork. The 189 inventory PNGs come from the image URL in their individually identified Gamestegy weapon records. DB-2 Testera has no image in that source: [Games Atlas's individual Testera page](https://www.gamesatlas.com/cyberpunk-2077/weapons/db-2-testera) supplies its rendered weapon image as a WebP, with its original background and credit retained. Games Lantern's outline-only Testera image was checked but replaced with this rendered image. No AI-generated reconstructions, generic class stand-ins or modded recolors were used. Original source bytes and proportions are preserved; transparent assets retain transparency. These are sourced weapon images, not newly captured gameplay screenshots or 3D viewers.

`source/weapon-images.json` records every weapon ID, iconic status, original image URL, source page, MIME type, dimensions, byte count, SHA-256 checksum and attribution. Unaltered files are in `source/assets/iconics/` and `source/assets/non-iconics/`. The build requires a mapped image for every weapon, validates checksums and embeds all images as data URLs into `index.html`; no image CDN access is needed when the app runs. Cards, table rows, comparison columns and detail headers all use the same canonical mapping. `source/tools/image-overrides.json` documents the alternate Testera source.

The 190 source mappings produce 186 distinct image hashes. Four pairs share inventory artwork in the source: Amnesty / Ol' Reliable; Electric Baton Alpha / Tinker Bell; Monkey Wrench / Steel Pipe; and Neurotoxin knife / Punknife. Each is mapped from its own source record rather than being substituted by this application. Shared-image notes are shown in each affected detail panel. Ol' Reliable's inventory appearance was additionally checked against [PC Gamer's in-game screenshot](https://www.pcgamer.com/cyberpunk-2077-phantom-liberty-weapons-iconic-legendary/). Shared source icons do not establish that equipped 3D models, historical appearances or every randomly generated skin are identical. In particular, the reference supplies a pipe icon for its Monkey Wrench record; a distinct current wrench appearance was not verified, so none was fabricated.

Game art remains the property of CD PROJEKT RED. This is an unofficial, noncommercial fan reference, with the [CD PROJEKT RED Fan Content Guidelines](https://www.cdprojektred.com/en/fan-content) reviewed for context. Attribution and image-source links are visible in the app. Neither the fan guidelines nor this project's code license transfer ownership of game artwork or the source website's content.

Cyberpunk 2077, Phantom Liberty, character and weapon names, and associated game content belong to CD PROJEKT RED and their respective rights holders. Gamestegy, Nukes & Dragons/Wombat Factory, Vaexil and Games Lantern retain rights in their original sites, prose, artwork and compilations. Attribution does not relicense their content as this application's code. This project is an independent, unofficial fan reference and is not endorsed by any source or rights holder.

## Limits requiring continued research

See `VALIDATION-REPORT.md` and the exact machine-readable `validation/data-gaps.json`. In particular, older per-weapon 2.5 behavior remains unmeasured, both references have coverage gaps, all fixed critical chance/damage fields are unknown, some manufacturer names are unknown, and source conflicts are retained with visible warnings.


## UI refinement assets

Interface icons are original 24px line-art SVG paths, slot glyphs are the existing original game-style symbols, and panel decorations are CSS. No proprietary game font or additional third-party icon library was added. Typography uses locally installed system fonts and fallbacks. The previously attributed weapon artwork is unchanged. No new research or numerical data changes were made in this visual pass.


## Terminal shell revision

The current shell uses original CSS-based frames, angular geometry and the existing original SVG icon set. No proprietary font, official menu artwork or additional third-party visual library was bundled. All weapon data and attributed images are unchanged. Project totals, bundled/offline status and patch explanations are now presented in Data Notes; this relocation does not increase the stated confidence in community records.


## Visual/performance refinement assets

The corrected NC mark is original inline SVG path geometry; it does not depend on a logo font or copied game artwork. Existing weapon PNG/WebP bytes and mappings are unchanged. DOM image hydration assigns the same bundled data URLs rather than repeatedly serializing them into markup. The software-rendering performance report describes local development profiling only; the application contains no performance telemetry or network reporting.


## Equipment expansion — October 26, 2026

The offline bundle now also includes 71 individually sourced weapon modifications/attachments and 256 tier variants. Equipment facts and positive compatibility lists are normalized from individual Nukes & Dragons pages and cross-checked with individual Cyberpunk Wiki acquisition/install references. All record-level URLs are in source/modifications.json and accessible in the app. MODIFICATIONS-DATA.md provides the reconciled inventory, source links, known omissions/conflicts and attribution. Official 2.5 announcements were rechecked; individual equipment behavior is not independently game-certified. No weapon data or original image bytes were changed. New equipment uses existing original category SVGs rather than unlicensed/invented item renders. No live request is needed for Mods or Builds.

Equipment artwork quality pass: all 72 items use source-linked in-game images from [Gamestegy](https://gamestegy.com/cyberpunk-2077/wiki/mods), individually credited in `source/modification-images.json` and item inspection. Game art remains copyright CD PROJEKT RED; original code and game-asset rights remain separate. The current inventory independently reconciles 72 named records, including Disjunctor; N&D footer counts (74/75) are not substituted for named data. See MODIFICATIONS-DATA.md.
