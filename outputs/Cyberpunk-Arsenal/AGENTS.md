# Maintaining Night City Arsenal

- The visual design is approved. Preserve existing styling unless explicitly asked to change it; reuse existing components and follow `VISUAL-BASELINE.md`. Static item shadows are intentional.
- Make minimal, targeted changes. Do not redesign or refactor unrelated functionality.
- Keep everything embedded and functional offline from `file://`; no backend, CDN, account or runtime tooling.
- Optimize for browsers without hardware acceleration; preserve lazy decoding, node reuse and offscreen containment.
- Do not use Computer Use, visible browsers or desktop automation. Test through terminal tools and isolated headless browsers.
- Edit `source/`, never generated HTML. Preserve stable IDs, existing storage keys, favorites and saved builds. Planning must not recalculate base weapon stats.
- Choose tests appropriate to the scope. Do not automatically run comprehensive visual/performance audits; docs-only changes do not need browser tests.
- After application changes run `python source/build.py`, check the changed production distribution offline, and rebuild after reports are finalized. The packaged HTML must match the tested file. Keep the stable HTML/ZIP filenames listed in README.
- Preserve unrelated changes; do not deploy or configure hosting without user instruction.

Read `README.md` for architecture/commands and `STATUS.md` for known issues and decisions. Repository-root instructions also apply when present.
