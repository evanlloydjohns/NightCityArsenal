# Maintaining this distributable project

The user shares this application as a single offline HTML file with friends.

- Edit `source/`, then run `python source/build.py`. Do not edit generated `index.html` directly.
- Every build must refresh `index.html`, `../Share-with-friends/Night-City-Arsenal.html`, `../Share-with-friends/Night-City-Arsenal.zip`, the release manifest and `../Cyberpunk-Arsenal.zip`. Preserve these stable names for updates.
- Keep all runtime data and artwork embedded. No server, CDN, account or development dependency may become necessary for normal use.
- Preserve the local-storage key and migrate existing preferences, favorites and comparisons when needed.
- Use terminal tools and isolated headless browsers. Do not open visible windows or use desktop automation.
- Run relevant application tests and `source/tests/distribution.test.cjs` after changes. Rebuild after finalizing reports so archives contain current evidence; verify the final HTML matches the tested HTML.
- Final delivery should identify the friend-facing HTML and smaller ZIP. Keep the complete source archive available separately.
- Do not deploy or configure hosting without a separate user request. See `SHARING.md` for the release workflow.
- Preserve the approved appearance in `VISUAL-BASELINE.md` during future work. Burgundy card surfaces and transparent lighting use recovered historical CSS; subdued page/sidebar balance is deliberate. Keep the newer logo, inspection/comparison layouts, accessible controls and efficient rendering. Change this baseline only for a user request or a demonstrated defect.
