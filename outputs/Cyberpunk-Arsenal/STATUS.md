# Continuation status

- **Application code checkpoint:** `5ec5ea9`; all requested features through item shadows are implemented and committed. No active unfinished implementation is recorded. Documentation commits may follow this checkpoint.
- **Current runnable fingerprint:** `d7d4af6111fd` (full SHA256 in `../Share-with-friends/release.json`). Data targets patch 2.5; this is a stored research target, not a new claim that every item was game-tested.
- **Validation:** the detail refinement passed 126 groups and 26 raster checks. The subsequent CSS-only shadow change passed 22 relevant regression groups, five workflow checks and offline distribution checks. Other historical report hashes refer to earlier HTML; read the latest report section rather than treating every archived run as current.

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
- Hosting is a future option only; nothing has been deployed or configured for it.
