/* Guard each existing storage key without replacing unreadable or newer data. */
(() => {
  "use strict";
  function create(key, decode, recover = () => undefined) {
    let baseline, value, problem = "";
    const snapshots = [], listeners = new Set();
    const preserve = (raw) => {
      if (raw !== null && !snapshots.includes(raw)) snapshots.push(raw);
    };
    const notify = () => listeners.forEach((fn) => fn());
    function inspect(raw) {
      try {
        return decode(raw);
      } catch {
        preserve(raw);
        problem = "malformed";
        try { return recover(raw); } catch { return undefined; }
      }
    }
    try {
      baseline = localStorage.getItem(key);
      if (baseline !== null) value = inspect(baseline);
    } catch {
      problem = "unavailable";
    }
    function check() {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== baseline) {
          preserve(raw);
          if (raw !== null) inspect(raw);
          if (problem !== "malformed") problem = "changed";
          notify();
          return false;
        }
        return !problem;
      } catch {
        problem = "unavailable";
        notify();
        return false;
      }
    }
    window.addEventListener("storage", (event) => {
      if (event.key !== key && event.key !== null) return;
      try {
        if (event.storageArea === localStorage) check();
      } catch {
        problem = "unavailable";
        notify();
      }
    });
    return {
      value,
      get revision() { return baseline; },
      get problem() { return problem; },
      get hasRecovery() { return snapshots.length > 0; },
      subscribe(fn) { listeners.add(fn); },
      message(label) {
        if (problem === "malformed")
          return `${label} storage contains invalid data. Original stored contents are preserved; export recovery data and this session before repairing storage and reloading. Changes are session only.`;
        if (problem === "changed")
          return `${label} storage changed in another tab. Saving is blocked to prevent overwriting other changes, including conflicting edits. Export this session before reloading and reconciling the JSON backups.`;
        if (problem === "unavailable")
          return `${label} could not be saved: browser storage is unavailable (blocked, full, or safe locking unsupported). Export this session before reloading.`;
        return "";
      },
      async write(next, lock = true) {
        // Callers validate before changing their session. Validate again at the boundary.
        const raw = JSON.stringify(next);
        decode(raw);
        if (problem) return false;
        try {
          const commit = () => {
            if (!check()) return false;
            localStorage.setItem(key, raw);
            baseline = raw;
            return true;
          };
          // Small preference writes stay synchronous so an immediate reload
          // after favoriting cannot discard a queued write.
          if (!lock) return commit();
          // localStorage has no compare-and-swap. A shared Web Lock closes the
          // read/write race between cooperating Arsenal tabs, including file://.
          if (!navigator.locks?.request) throw Error("Storage locking unavailable");
          return await navigator.locks.request(key, commit);
        } catch {
          problem = "unavailable";
          notify();
          return false;
        }
      },
      exportRecovery() {
        const url = URL.createObjectURL(new Blob([JSON.stringify({
          application: "night-city-arsenal", key, snapshots,
        }, null, 2)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = key + ".recovery.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    };
  }
  window.NCAStorage = Object.freeze({ create });
})();
