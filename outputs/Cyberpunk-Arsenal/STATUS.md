# Continuation status

- **Current implementation:** Edge-installable PWA distribution added after the `5ec5ea9` application and `9121b34` documentation checkpoints. The approved application remains intact; file:// delivery is still supported. See `PWA.md` for preview, installation, migration, safe updates and hosting instructions.
- **Current runnable fingerprint:** `c91a86eecd71` (full SHA256 in `../Share-with-friends/release.json`); hosted PWA `d1e793f3fc16` (full SHA256 in `validation/pwa-test.json`). Data targets patch 2.5; this is a stored research target, not a new claim that every item was game-tested.
- **Current validation:** 59 existing regression groups, 10 PWA groups and five offline distribution checks passed. Headless Edge reports no manifest/installability errors. Full process restart with the loopback server stopped, all 262 item-image decodes, JSON portability, cache repair, failed deployments and safe updates passed. Windows Start/taskbar installation and OS window behavior remain manual verification steps. Other historical report hashes refer to earlier HTML; read the latest report section rather than treating every archived run as current.

## Known issues and limits

- DB-2 Testera's original WebP has an opaque background/watermark; its shadow follows the image bounds. Other 261 item images support silhouette shadows. Artwork was not cut out or replaced.
- Parallax's exact acquisition is unknown. Sources reconcile 72 named equipment records despite differing 74/75 footer totals; do not invent entries to match a banner.
- Community tier/effect/compatibility data is not individually certified in-game for patch 2.5. Missing tiers remain unknown; source conventions/conflicts remain visible (notably reload speed/time, Gaki charge fields and some scope variants).
- Strict positive-evidence compatibility can reject plausible but unverified fits. Fixed attachments and unsupported slots are intentionally blocked. Imported stale/missing references remain stored and flagged.
- Browser file storage varies by file path/browser/origin. Builds and weapon preferences have separate JSON backups; quota/blocked-storage sessions remain exportable. No cloud sync exists.

## Decisions to preserve

- Information-only planning: display each documented mod effect independently; never combine bonuses or mutate base weapon stats.
- Storage keys: `night-city-arsenal.v1` (weapon preferences), `night-city-arsenal.builds.v1` (schema 1 builds), `night-city-arsenal.draft.v1` (session draft). Preserve stable IDs and migrate deliberately.
- `modification-display.json` controls presentation/shared rules separately from canonical numerical data. Seven simple-mod mappings are reviewed per tier; ambiguous raw fields remain technical disclosures.
- Shadows are a user-requested exception to older no-image-filter guards: one static alpha-aware shadow, smaller for thumbnails. Preserve the approved burgundy design and other CPU-rendering safeguards.
- ZIPs, QA screenshots and `work/` research caches are Git-ignored. Builds recreate packages; live research refresh tooling may require local caches and upstream parser maintenance. They are not runtime dependencies.
- `source/pwa/` and `source/build_pwa.py` generate `pwa/` and `../Night-City-Arsenal-PWA.zip`. Do not edit generated PWA files. Required HTML/manifest are hash-verified and cached together; optional shell icons do not block preparation. Artwork remains embedded. Updates wait, never force a reload, guard unsaved plans/dialogs and other open windows, and only delete obsolete app caches at the same scope. Storage keys/schema are unchanged. File, localhost and HTTPS origins require explicit JSON migration.
- Offline cache/site data can be evicted or cleared; keep JSON backups. Unsaved drafts remain session-scoped. Actual Windows installation is not claimed from headless testing.
- HTTPS static hosting is prepared but nothing has been deployed. The only server used in automated tests was a temporary loopback fixture; `source/serve_pwa.py` provides an optional loopback-only development preview.
