# Windows PWA

Night City Arsenal has two distributions from the same maintained source. The original `index.html` and `../Share-with-friends/Night-City-Arsenal.html` still run directly from `file://`, with all data and artwork embedded. The separate `pwa/` folder is the static website to host over HTTPS and install through Edge. No desktop framework, backend, cloud account or runtime dependencies were added.

## Build and local preview

From `outputs/Cyberpunk-Arsenal/`:

```powershell
python source/build.py
python source/serve_pwa.py
```

Open `http://localhost:8765/` in Microsoft Edge. The preview binds only to loopback and serves **only** `pwa/`. Leave the command running during first preparation. Wait for the footer to say **Offline ready — all weapon and equipment artwork included.** Ctrl+C stops the preview. `--port 8766` selects another port, but changes the browser storage origin and installation identity; use one stable address/port.

There is no need to run an icon generator during normal builds. Approved PNG icons are maintained under `source/pwa/icons/`. If the masthead SVG is deliberately changed later, `source/pwa/generate-icons.cjs` renders it using development-only Playwright/headless Edge; set `PLAYWRIGHT_MODULE` and `BROWSER_EXECUTABLE` as in README.

## Install and launch in Windows 11

For normal use, first host the complete contents of `pwa/` over HTTPS. The same steps work on localhost for development:

1. Open the HTTPS application address (or `http://localhost:8765/`) in Edge.
2. Wait for **Offline ready** in the footer. Keep the address and browser profile stable.
3. Click Edge's **App available / Install Night City Arsenal** address-bar icon. Alternatively, use **… > Apps > Install Night City Arsenal** (the wording can vary with Edge version).
4. Confirm **Install**. In Edge's app options, choose **Pin to taskbar**, **Pin to Start**, or **Create Desktop shortcut** as desired. Installed apps are also managed at `edge://apps`.
5. Close the original website tab. Open **Start > Night City Arsenal**, or click its yellow NC taskbar/desktop icon.
6. Check that it opens directly to Arsenal in a separate, resizable/maximizable window with normal Windows decorations and without browser tabs or an address bar. In-app navigation stays in that window. External reference links open separately; Edge controls their final destination.

No experimental custom title bar is used. The manifest requests `standalone` and supplies the existing NC branding for Windows identity. Actual OS installation, icon selection and window chrome require the manual check above; headless testing does not demonstrate Start/taskbar integration.

Microsoft documents the [PWA manifest and standalone window model](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/) and [Edge installation workflow](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/ux). Updates follow the browser's [service worker waiting lifecycle](https://web.dev/articles/service-worker-lifecycle).

Once prepared, a localhost installation can launch from its service-worker cache with the preview server stopped. This was tested with a full headless Edge process restart and an unavailable HTTP server. Localhost is a development workflow: future updates still need the server at the same address. Production HTTPS hosting removes the need to run a local server; once cached, the app can launch offline without a second browser tab.

## Offline resources and updates

The existing approximately 9.5 MB HTML already embeds all CSS, JavaScript, data, icons used inside the UI and **190 weapon + 72 equipment images**. No external fonts are required. The service worker precaches that single HTML and the manifest, so there is no redundant separate imagery download or deferred imagery-preparation step. Shell favicons/install icons are cached opportunistically; an unavailable optional icon does not block the fully embedded application. Offline readiness is confirmed against the active worker's required cache entries, not inferred from connectivity.

The worker uses a content-derived cache version and verifies fetched resource SHA256 values before accepting them. A partial deployment or missing required shell fails installation and leaves the old application active. Cached navigation serves a coherent embedded app version; external references are outside the cache. Root and `index.html` navigation, query strings and all existing hash views are supported. Unknown paths remain real 404s. Both root hosting and subdirectories work with relative manifest/worker URLs and scope. Host the folder as a directory with a trailing slash or its `index.html`.

On normal launches Edge checks for a changed worker; no application polling timer is added. A ready update shows **Update available — Restart to update** in the footer. There is no automatic reload. Restart refuses while a plan is unsaved or a dialog is open, and the worker refuses early activation while another Arsenal tab/window is open. Save the plan, close dialogs and other Arsenal windows, then click Restart. Alternatively close all Arsenal windows/tabs; the browser can activate the update naturally. Activation removes only old caches belonging to this application **at this scope**. No local/session storage, favorites, builds or other apps' caches are cleared.

If preparation fails, reconnect and use **Retry offline preparation**. Browser storage eviction, clearing site data, private browsing and profile removal can remove offline resources or personal data. Offline status confirms the application shell at that moment, not a permanent storage guarantee. Keep JSON backups. External reference sites require connectivity.

## Personal data and origin migration

Storage keys and schema are unchanged. Preferences/favorites, build notes/tags, build favorites and saved configurations remain in browser storage through reloads, process restarts and worker updates. Unsaved drafts remain session-scoped; save before closing/restarting. Planning still never recalculates weapon statistics.

`file://`, localhost (including different ports), and HTTPS use different storage. An installed app shares storage with the same origin in the same Edge profile; it does not inherit another origin's data. To move:

1. In the old app use **Data notes > Export preferences** and **Builds > Export JSON**.
2. In the new app use **Data notes > Import preferences** and **Builds > Import JSON**.
3. Verify favorites, builds and notes before discarding the original. Build import preserves existing builds; duplicate IDs get new IDs instead of overwriting records.

## Future static hosting / Amplify

Deploy **only the contents of `outputs/Cyberpunk-Arsenal/pwa/`**, also provided at the root of `outputs/Night-City-Arsenal-PWA.zip`. Keep `index.html`, `manifest.webmanifest`, `sw.js` and `icons/` together. Use HTTPS, serve the manifest as `application/manifest+json` and the worker as JavaScript, and preserve its same-directory scope. Set `Cache-Control: no-cache` on HTML, the manifest and worker so updates can be revalidated. Serve icons with normal revalidation; their stable URLs can change in future releases.

Deploy the folder atomically where possible. No SPA catch-all rewrite is needed: navigation is hash-based. Do not rewrite missing `sw.js`/manifest/icons to HTML. Do not use `Clear-Site-Data` during updates. If the host adds a CSP header, it must permit the inline scripts/styles, data images, and same-origin workers/manifest/connections allowed by the hosted HTML's CSP. The file distribution retains its original stricter policy. Avoid moving the production origin or base path once installed: they determine storage, worker scope and manifest ID.

No AWS resources, hosting, credentials, ports exposed beyond loopback, Windows installer or background service were configured by this task.

## Verification

`source/tests/pwa.test.cjs` tests the real generated output in GPU-disabled, isolated headless Microsoft Edge, including a persistent profile and loopback-only server. It checks the manifest and browser installability diagnostics, seven PNG sizes and original SVG geometry, registration, optional-icon failure, required caching, offline data/navigation/images, JSON portability, notes/favorites/configuration persistence, safe updates, failed deployments, cache isolation, root/subpath hosting and offline process restart with the server stopped. Its HTTP update fixtures are in memory and do not edit the production files. See `validation/pwa-test.json` for the exact tested fingerprints and results.

Also run the relevant existing planner/UI regressions and `source/tests/distribution.test.cjs` against the friend-facing file and extracted ZIP. Finalize reports before the last package rebuild; the tested application bytes must remain identical.
