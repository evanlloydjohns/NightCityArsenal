# Night City Arsenal

- The existing visual design is approved. Preserve styling unless the user explicitly requests a change; reuse established components. See `outputs/Cyberpunk-Arsenal/VISUAL-BASELINE.md`.
- Prefer minimal, targeted changes for small tasks. Do not redesign/refactor unrelated code.
- Keep the app self-contained, offline and runnable from `file://`: embed data, artwork, CSS, JavaScript and icons. No backend, CDN, account, installer or runtime development dependencies.
- Optimize for browsers without hardware acceleration. Preserve lazy decoding, node reuse and offscreen containment. The requested static item shadows are intentional; avoid adding expensive effects.
- Never use Computer Use, visible browsers or desktop automation. Use terminal tools and isolated headless browsers.
- Edit maintained files in `outputs/Cyberpunk-Arsenal/source/`; never edit generated HTML directly.
- Preserve storage keys, stable IDs and existing user data. Migrate deliberately; never drop favorites or builds. The planner is informational and must not recalculate weapon stats.
- Run tests appropriate to the change. Do not automatically perform comprehensive visual/performance audits for small tasks; documentation-only work normally needs documentation/package checks, not browser tests.
- After application updates, run `python outputs/Cyberpunk-Arsenal/source/build.py`. Keep all stable sharing filenames; see the app README. Check the changed production file offline with `source/tests/distribution.test.cjs`, finalize reports, then rebuild packages without changing the tested HTML.
- Preserve unrelated working changes. Commit completed, validated work without destructive resets.
- Deliver the updated friend-facing HTML and ZIP after application changes. Do not deploy, open ports or configure hosting without a separate request.

Start with `README.md`, then the linked app README and `STATUS.md` for architecture, commands and known limitations.
