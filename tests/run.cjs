/* Development-only runner; no dependencies are shipped with the app. */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { root } = require("./support.cjs");
const { browserExecutable } = require("./browser.cjs");
const suites = ["build", "planner-core", "app", "mod-detail", "modifications-ui", "equipment-ux", "build-storage", "distribution", "pwa"];
const selected = process.argv.slice(2);
const requested = selected.length ? selected : suites;
if (requested.some((name) => !suites.includes(name))) {
  console.error("Choose suites:", suites.join(", "));
  process.exit(1);
}
const env = { ...process.env };
if (requested.some((name) => !["build", "planner-core"].includes(name))) {
  try {
    require(env.PLAYWRIGHT_MODULE || "playwright");
    env.BROWSER_EXECUTABLE = browserExecutable();
  }
  catch { console.error("Install test dependencies with npm install, or set PLAYWRIGHT_MODULE."); process.exit(1); }
}
for (const suite of requested) {
  console.log("\nRunning", suite);
  const result = suite === "build"
    ? spawnSync(env.PYTHON_EXECUTABLE || "python", [path.join(__dirname, "build.test.py")], { cwd: root, env, stdio: "inherit" })
    : spawnSync(process.execPath, [path.join(__dirname, suite + ".test.cjs")], { cwd: root, env, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
