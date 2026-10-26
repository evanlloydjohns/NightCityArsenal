# Night City Arsenal project workflow

The user shares this app with friends on Discord as an offline browser file.

- Keep the production application self-contained and runnable from `file://`. Embed all data, artwork, styles, scripts and icons. Do not add a backend, CDN, account requirement, installer, runtime development dependencies or auto-updater.
- Do not use visible browsers, Computer Use or desktop automation. Use terminal tools and isolated headless browser testing.
- Edit the maintained source under `outputs/Cyberpunk-Arsenal/source/`. Do not edit the generated HTML directly.
- After every application update, run `python outputs/Cyberpunk-Arsenal/source/build.py`. This automatically regenerates all distribution formats:
  - `outputs/Cyberpunk-Arsenal/index.html` — existing local working copy.
  - `outputs/Share-with-friends/Night-City-Arsenal.html` — single file to send friends.
  - `outputs/Share-with-friends/Night-City-Arsenal.zip` — compact Discord-friendly ZIP containing the same HTML, instructions and reports.
  - `outputs/Share-with-friends/release.json` — content fingerprint and hashes.
  - `outputs/Cyberpunk-Arsenal.zip` — complete source/project archive, for maintenance rather than ordinary sharing.
- Keep these filenames stable so recipients can replace an older file. Preserve browser preference compatibility and the existing local-storage key; migrate state rather than dropping favorites and selections.
- Run the relevant source tests and a headless offline distribution check after changes. After tests/reports are finalized, rerun the build so the packages contain current reports. The final HTML must remain byte-for-byte identical to the tested HTML.
- Deliver links to the friend-facing HTML and ZIP after future changes. No user build steps should be necessary.
- Hosting on the user's PC/server is a possible future option only. Do not deploy, open ports or configure hosting unless the user requests it.
- The approved visual baseline is documented in `outputs/Cyberpunk-Arsenal/VISUAL-BASELINE.md`: subdued page/sidebar, cohesive burgundy cards and transparent static image lighting. Preserve it during future feature work; do not reinterpret the palette or restore older functional defects. The corrected NC logo, current inspection/comparison layouts and CPU rendering optimizations remain intentional.
