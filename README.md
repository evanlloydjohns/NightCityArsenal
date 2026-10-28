# Night City Arsenal

An offline Cyberpunk 2077 weapon reference and equipment planner.

- **Open:** [Night-City-Arsenal.html](dist/Night-City-Arsenal.html). Double-click it; no installation or internet is needed.
- **Share:** [Night-City-Arsenal.zip](dist/Night-City-Arsenal.zip). Extract it, then open the HTML inside.
- **PWA:** [deployable files](dist/pwa/) or [PWA ZIP](dist/Night-City-Arsenal-PWA.zip). Host the complete folder at the same HTTPS URL/scope used by any existing installation, then install through Edge. No hosting is configured here.

Favorites and builds stay in your browser. Keep the same file location/browser or PWA origin when updating. Before moving, export preferences from **Data notes** and builds from **Builds > Export JSON**, then import both in the new location.

If another tab changes stored data, further writes in the stale tab are blocked. Export its session before reloading, then import builds to keep both versions (duplicate IDs receive new IDs). A restored draft based on an older library must be saved as new or reopened from the latest library before updating. Automatic merging is deliberately avoided.

Invalid stored data is left untouched. **Export storage recovery** in Data notes or Builds downloads a JSON envelope whose `snapshots` strings preserve the original stored text; ordinary exports contain the usable session, including individually valid recovered builds. Keep both exports before repairing the affected storage key and reloading. Completely malformed JSON cannot be partially recovered automatically. Blocked/full storage uses session-only changes and ordinary JSON exports; builds also require Web Locks for safe persistent writes.

The restructure moves the old `outputs/Share-with-friends/` HTML to `dist/`. Its contents and the PWA HTML are preserved byte-for-byte. Moving the offline file may expose a separate browser preference store; export preferences and builds from the old location before switching, then import them. This change does not clear browser data. Git retains the previous paths and working edits at `refs/archive/pre-development-restructure`.

## Development

| Path | Purpose |
|---|---|
| `src/` | Readable HTML, CSS, JavaScript, canonical JSON and original artwork |
| `src/pwa/` | Manifest, worker/client sources, shell fragments and install icons |
| `tools/` | Build/package command and optional local PWA preview |
| `tests/` | Build reproducibility, planner, catalog, equipment, storage, distribution and PWA checks |
| `dist/` | Generated offline HTML, PWA folder and both sharing ZIPs |

Edit source, then build from the repository root:

```powershell
python tools/build.py
```

Python 3.9+ and its standard library are sufficient. The command also works from another directory when given the script's absolute path. `--output SOME_FOLDER` selects a separate output folder. Builds use no network and include all artwork/data. ZIPs are deterministic, contain only their product files, and are tracked alongside the tested HTML.

`src/data/weapons.json` and `modifications.json` contain the reviewed application data. Their `image.src` values reference `src/assets/`; the build verifies image-manifest checksums and embeds the bytes. Equipment presentation rules are in `modifications.json` under `meta.display`. Preserve IDs, storage keys and source uncertainty. Planning never recalculates weapon statistics.

For local PWA development, run `python tools/preview.py` and visit `http://localhost:8765/`. It serves only `dist/pwa/` on loopback; Ctrl+C stops it. Keep the same origin/port to preserve its storage and installation identity. Installed offline caches can be evicted; retain JSON backups. Headless checks do not establish Windows Start/taskbar integration.

## Checks

Tests need Node.js 20+ and development-only Playwright:

```powershell
npm ci
npm test
```

Windows tests use installed Microsoft Edge when available. On other systems, first run `npx playwright install chromium`. `BROWSER_EXECUTABLE`, `PLAYWRIGHT_MODULE` and `PYTHON_EXECUTABLE` can select existing local tools; the shipped products need none of these dependencies.

Run only relevant suites for ordinary changes:

```powershell
npm test -- build planner-core distribution
npm test -- pwa
```

Available suites: `build`, `planner-core`, `app`, `mod-detail`, `modifications-ui`, `equipment-ux`, `build-storage`, `distribution`, `pwa`. Browser checks run headless with GPU/compositing disabled and isolated storage. All reports, downloads, screenshots and browser profiles go to ignored `.tmp/`. Research caches, collectors and historical visual/performance audits remain removed; prior development is recoverable from Git.
