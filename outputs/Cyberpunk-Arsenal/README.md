# Night City Arsenal

**Launch:** double-click `index.html`. For Discord use `../Share-with-friends/Night-City-Arsenal.html` or the smaller ZIP of the same name. No installation, internet, account or server is needed.

**Windows app:** the additional `pwa/` distribution supports Edge installation, standalone windows and service-worker offline launches. See [PWA.md](PWA.md) for local preview, installation, data migration, updates and future HTTPS hosting. The original single-file distribution remains supported.

## Current features

- 190 weapons: 115 iconic and 75 standard; 72 modifications/attachments with 257 published tier variants and bundled artwork.
- Search, combined multi-select filters, card/table views, sorting, weapon inspection, tier/reference selection, Favorites and 2–4 weapon comparison.
- Mods catalog with structured effect rows, compatibility tags, acquisition, source disclosures and a compact compatible-weapon browser.
- Visual slot-based configuration with conservative compatibility checks; saved builds with notes, tags, independent favorites, edit/duplicate/delete, two-build review and JSON import/export.
- Approved burgundy/crimson UI with static silhouette shadows. Planning never changes base weapon statistics.

## Architecture

Buildless vanilla JavaScript/CSS; Python is a development-only packager.

| Maintained source | Responsibility |
|---|---|
| `source/template.html`, `source/styles.css`, `source/app.js` | Original shell, catalog, weapon details/comparison and preferences |
| `source/expansion.js`, `source/expansion.css` | Mods, visual planner, saved builds and native styling extensions |
| `source/planner-core.js` | Pure compatibility, build schema, validation and safe import/export |
| `source/weapons.json`, `source/modifications.json`, `source/modification-display.json` | Canonical source values; separate presentation mappings/shared installation rules |
| `source/assets/`, `*-images.json` | Local artwork and attributed/checksummed mappings |
| `source/build.py`, `source/package_release.py` | Embed all runtime content and refresh distributions/checksums |
| `source/build_pwa.py`, `source/pwa/`, `source/serve_pwa.py` | Derive hosted PWA, manifest, exact NC icons, safe caching/update lifecycle and loopback preview |
| `source/tests/`, `validation/` | Development tests, reports and headless screenshots |

## Build and release

Run commands from this directory (`outputs/Cyberpunk-Arsenal/` in the repository):

```powershell
python source/build.py
```

This refreshes `index.html`; the HTML/ZIP, `START-HERE.txt` and `release.json` in `../Share-with-friends/`; this project's `SHA256SUMS.txt`; and `../Cyberpunk-Arsenal.zip` (full source/report archive). Keep filenames stable. Edit source, not generated HTML. After an application change, test the built distribution; finalize reports and rebuild packages so the final HTML remains byte-for-byte identical to the tested file. Documentation/package-only updates should leave its fingerprint unchanged.

It also builds the static `pwa/` deployment folder and `../Night-City-Arsenal-PWA.zip`. Preview with `python source/serve_pwa.py`, then open `http://localhost:8765/` in Edge. No deployment occurs during builds.

## Scoped testing

Tests require development-only Node.js, Playwright and a headless browser. On this Windows workspace the bundled runtime is available without installing dependencies:

```powershell
$runtime = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node'
$nodeExe = Join-Path $runtime 'bin/node.exe'
$env:PLAYWRIGHT_MODULE = Join-Path $runtime 'node_modules/playwright'
$env:BROWSER_EXECUTABLE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
& $nodeExe source/tests/planner-core.test.cjs
& $nodeExe source/tests/distribution.test.cjs
```

These are example selections, not a mandatory full suite. Elsewhere use installed Node/Playwright and set the same variables as needed. Choose the closest test:

| Change | Test under `source/tests/` |
|---|---|
| Compatibility, data, build schema/import validation | `planner-core.test.cjs` |
| Weapon browser, filtering, comparison or preferences | `app.test.cjs` |
| Mod detail formatting/tier values | `mod-detail.test.cjs` |
| Planner and saved-build workflows | `modifications-ui.test.cjs` |
| Favorites, imagery, compact fit browser or card interactions | `equipment-ux.test.cjs` |
| Build storage failures | `build-storage.test.cjs` |
| Changed production sharing files | `distribution.test.cjs` |
| Manifest, service worker, offline HTTP launches, installation eligibility or updates | `pwa.test.cjs` |

Use a targeted screenshot/layout check for visual changes. Broader `*refinement.test.cjs`, `atmosphere.test.cjs`, `visual-restoration.test.cjs` and `*profile.cjs` audits are for relevant layout/rendering work, not every small edit. Baseline-dependent suites need a preserved pre-change HTML path in `ATMOSPHERE_BASELINE`/`RESTORATION_BASELINE`. Profiles take paths documented in their headers. Keep browser work headless; do not alter personal browser settings/storage.

## Continuation and data

Read [STATUS.md](STATUS.md) first for known issues and durable implementation decisions. [VISUAL-BASELINE.md](VISUAL-BASELINE.md) defines the approved appearance. [MODIFICATIONS-DATA.md](MODIFICATIONS-DATA.md), [DATA-SOURCES.md](DATA-SOURCES.md), and `source/UPDATE-DATA.md` cover provenance and optional research tooling. Never infer missing values or run a data refresh merely to make a UI change. Detailed validation/performance reports are evidence, not instructions to repeat every historical audit.
