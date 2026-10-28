/* Saved-build session, validation, recovery and filtering.
 * NCAStorage retains ownership of conflict detection, recovery snapshots and locks.
 * Drafts and user-facing warnings stay with the expansion coordinator.
 */
window.NCABuildLibrary = (() => {
  "use strict";
  function create({ engine: E, storage, normalize, onInvalid }) {
    const KEY = "night-city-arsenal.builds.v1";
    const store = storage.create(
      KEY,
      (raw) => E.sanitizeBundle(JSON.parse(raw)),
      (raw) => {
        const bundle = JSON.parse(raw);
        if (bundle?.schemaVersion !== 1 || !Array.isArray(bundle.builds)) return [];
        // Keep individually valid records usable; the full original remains
        // untouched and exportable, including rejected records and duplicates.
        const recovered = [], ids = new Set();
        for (const build of bundle.builds) {
          try {
            const [clean] = E.sanitizeBundle({ schemaVersion: 1, builds: [build] });
            if (!ids.has(clean.id) && recovered.length < 1000) {
              recovered.push(clean);
              ids.add(clean.id);
            }
          } catch {}
        }
        return recovered;
      },
    );
    let builds = store.value || [];
    async function persist(next) {
      try {
        next = E.sanitizeBundle(E.exportBundle(next));
      } catch (e) {
        onInvalid(e.message);
        return null;
      }
      builds = next;
      const saved = await store.write(E.exportBundle(builds));
      return saved;
    }
    function filtered(filters) {
      const words = normalize(filters.query).split(/\s+/).filter(Boolean);
      return builds
        .filter(
          (b) =>
            words.every((q) =>
              normalize(
                [
                  b.name,
                  E.weapons.get(b.weaponId)?.name,
                  b.notes,
                  ...b.tags,
                ].join(" "),
              ).includes(q),
            ) &&
            (!filters.favorites || b.favorite) &&
            (!filters.tag || b.tags.includes(filters.tag)) &&
            (!filters.weapon || b.weaponId === filters.weapon),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return Object.freeze({
      get builds() { return builds; },
      get revision() { return store.revision; },
      get hasRecovery() { return store.hasRecovery; },
      message: () => store.message("Saved-build"),
      subscribe: (fn) => store.subscribe(fn),
      exportRecovery: () => store.exportRecovery(),
      persist,
      filtered,
    });
  }
  return Object.freeze({ create });
})();
