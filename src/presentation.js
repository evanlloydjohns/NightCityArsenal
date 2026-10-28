/* Shared presentation only: no state, storage or equipment calculations. */
window.NCAPresentation = (() => {
  "use strict";
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  const normalize = (text) =>
    String(text ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const validNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);
  const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  });
  const formatNumber = (n) => numberFormatter.format(n);
  function stats(w, s) {
    return w.profiles[s.profile]?.tiers[s.tier] || {};
  }
  function applicable(w, key) {
    if (
      [
        "magazine",
        "reload",
        "projectiles",
        "charge",
        "chargeMultiplier",
      ].includes(key)
    )
      return (
        w.group === "Firearm" &&
        (!["charge", "chargeMultiplier"].includes(key) ||
          w.technology === "Tech")
      );
    if (["stamina", "blockStamina"].includes(key))
      return w.group !== "Firearm";
    if (key === "returnTime") return w.group === "Throwable";
    if (key === "headshot") return w.group !== "Melee";
    return true;
  }
  const statDefs = [
    ["damage", "Damage", "", true],
    ["dps", "DPS (source)", "", true],
    ["speed", "Attack speed", "/s", true],
    ["magazine", "Magazine", "", true],
    ["reload", "Reload time", " s", false],
    ["range", "Effective range", " m", true],
    ["headshot", "Headshot bonus", "%", true],
    ["armor", "Armor penetration", "%", true],
    ["critChance", "Critical-hit chance", "%", true],
    ["critDamage", "Critical damage", "%", true],
    ["stamina", "Attack stamina", "", false],
    ["blockStamina", "Block stamina", "", false],
    ["returnTime", "Throw return time", " s", false],
    ["projectiles", "Projectiles / shot", "", true],
    ["charge", "Charge time", " s", false],
    ["chargeMultiplier", "Charge multiplier", "×", true],
    ["bleed", "Bleed chance", "%", true],
    ["poison", "Poison chance", "%", true],
    ["burn", "Burn chance", "%", true],
    ["shock", "Shock chance", "%", true],
  ];
  const statMap = new Map(statDefs.map((x) => [x[0], x]));
  function statLabel(key, profile) {
    if (key === "damage")
      return profile === "records"
        ? "Damage / projectile or hit"
        : "Damage (source)";
    if (key === "dps")
      return profile === "records"
        ? "DPS · game record"
        : "DPS · published";
    return statMap.get(key)?.[1] || key;
  }
  function valueText(w, key, s) {
    if (!applicable(w, key)) return "N/A";
    const n = stats(w, s)[key];
    if (!validNumber(n)) return "Unknown";
    return (
      (key === "headshot" && n >= 0 ? "+" : "") +
      formatNumber(n) +
      (statMap.get(key)?.[2] || "")
    );
  }
  function download(name, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return Object.freeze({
    escape, normalize, validNumber, formatNumber, stats, applicable,
    statDefs, statLabel, valueText, download,
  });
})();
