# Night City Arsenal

- Keep the project lean: maintained application files in `src/`, build/preview commands in `tools/`, focused checks in `tests/`, generated products in `dist/`. Do not restore research collectors, caches, historical reports or profiling suites unless requested.
- Preserve the approved appearance, embedded artwork/data, stable filenames, storage keys, favorites and saved builds. Planning is informational and must not recalculate weapon stats.
- Preserve lazy image decoding, node reuse, offscreen containment and the existing static shadows for browsers without hardware acceleration.
- Keep the offline HTML self-contained and runnable from `file://`. Preserve the PWA's relative URLs, manifest identity, service-worker scope and safe update behavior.
- Edit `src/`, not generated files in `dist/`. `src/data/` is canonical; image `src` fields point to files under `src/assets/`. Image manifests retain provenance and checksums. Shared presentation rules live in `src/data/modifications.json` under `meta.display`.
- Run `python tools/build.py` after source edits. It produces the standalone HTML, complete PWA and both ZIPs. Keep sharing filenames stable. Both versions must come from the same source.
- Browser storage can depend on file location and hosting origin. Preserve the deployed PWA URL, manifest identity, scope and storage keys; document export/import when paths change.
- Use terminal tools and isolated headless browsers only. No Computer Use or visible browser automation.
- Choose checks appropriate to the change using `npm test -- <suite>`. Check changed production files offline with the `distribution` suite; use `pwa` for hosted changes. `build` verifies clean, deterministic builds and packaging. Keep test output and browser profiles in ignored `.tmp/`; do not commit them.
- Do not deploy, configure hosting or start persistent servers without a separate request.
- Preserve unrelated work and commit completed, validated changes. Keep generated products consistent with the tested HTML; `.gitattributes` preserves their exact bytes across Git checkouts. Development recovery snapshots remain in Git.
