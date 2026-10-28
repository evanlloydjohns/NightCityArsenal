/* Headless test browsers only; never use a personal browser profile. */
const fs = require("node:fs");
const path = require("node:path");
const { artifactDir } = require("./support.cjs");
const chromium = () => require(process.env.PLAYWRIGHT_MODULE || "playwright").chromium;

function browserExecutable() {
  if (process.env.BROWSER_EXECUTABLE) return process.env.BROWSER_EXECUTABLE;
  const edge = process.platform === "win32" && path.join(
    process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
    "Microsoft/Edge/Application/msedge.exe",
  );
  return edge && fs.existsSync(edge) ? edge : chromium().executablePath();
}
function launchOptions() {
  // Playwright's temporary profiles and transient artifacts belong with test output.
  const temporary = artifactDir("browser-tmp");
  for (const key of ["TMPDIR", "TMP", "TEMP"]) process.env[key] = temporary;
  return {
    executablePath: browserExecutable(),
    headless: true,
    args: ["--disable-gpu", "--disable-gpu-compositing"],
    downloadsPath: artifactDir("downloads"),
  };
}
const launchBrowser = () => chromium().launch(launchOptions());
const launchPersistentContext = (profile, options) =>
  chromium().launchPersistentContext(profile, { ...launchOptions(), ...options });
// Each call creates isolated storage. Hosted fixtures explicitly opt into networking.
const newContext = (browser, options) => browser.newContext({ offline: true, ...options });

module.exports = { browserExecutable, launchBrowser, launchPersistentContext, newContext };
