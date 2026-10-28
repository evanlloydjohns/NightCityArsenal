/* Development-only runner; no dependencies are shipped with the app. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const suites = ["build", "planner-core", "app", "mod-detail", "modifications-ui", "equipment-ux", "build-storage", "distribution", "pwa"];
const selected = process.argv.slice(2);
const requested = selected.length ? selected : suites;
if (requested.some((name) => !suites.includes(name))) {
  console.error("Choose suites:", suites.join(", "));
  process.exit(1);
}
const env = { ...process.env };
if (requested.some((name) => !["build", "planner-core"].includes(name))) {
  let chromium;
  try { ({ chromium } = require(env.PLAYWRIGHT_MODULE || "playwright")); }
  catch { console.error("Install test dependencies with npm install, or set PLAYWRIGHT_MODULE."); process.exit(1); }
  if (!env.BROWSER_EXECUTABLE) {
    const edge = process.platform === "win32" && path.join(process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)", "Microsoft/Edge/Application/msedge.exe");
    env.BROWSER_EXECUTABLE = edge && fs.existsSync(edge) ? edge : chromium.executablePath();
  }
}
fs.mkdirSync(path.join(root, ".tmp/tests/modifications"), { recursive: true });
for (const suite of requested) {
  console.log("\nRunning", suite);
  const result = suite === "build"
    ? spawnSync(env.PYTHON_EXECUTABLE || "python", [path.join(__dirname, "build.test.py")], { cwd: root, env, stdio: "inherit" })
    : spawnSync(process.execPath, [path.join(__dirname, suite + ".test.cjs")], { cwd: root, env, stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}
