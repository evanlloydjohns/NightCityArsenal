const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  results = [];
let browser;
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, passed: false, error: e.stack });
    console.error("FAIL", name, e.message);
  }
}
(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE,
    args: ["--disable-gpu", "--disable-gpu-compositing"],
  });
  const url = pathToFileURL(path.join(root, "dist/Night-City-Arsenal.html")).href;
  await test("Build quota failure keeps a usable exportable session and does not alter weapon preferences", async () => {
    const c = await browser.newContext({
      offline: true,
      acceptDownloads: true,
    });
    await c.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "night-city-arsenal.builds.v1")
          throw new DOMException("Quota", "QuotaExceededError");
        return set.call(this, k, v);
      };
    });
    const p = await c.newPage();
    await p.goto(url);
    await p.evaluate(() => {
      void NCAExpansion.startPlan("Items.Preset_Katana_Saburo");
    });
    const prefs = await p.evaluate(() =>
      localStorage.getItem("night-city-arsenal.v1"),
    );
    await p.locator("#plan-name").fill("Session-only backup");
    await p
      .locator("#plan-notes")
      .fill("Keep these notes even if storage fills up.");
    await p.locator("[data-plan-action=save-build]").click();
    assert.match(
      await p.locator("#plan-save-status").textContent(),
      /session only/,
    );
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 1);
    assert.equal(
      await p.evaluate(() => localStorage.getItem("night-city-arsenal.v1")),
      prefs,
    );
    await p.locator(".masthead [data-nav=builds]").click();
    assert.match(
      await p.locator("#builds-panel .notice").first().textContent(),
      /could not be saved/,
    );
    const pending = p.waitForEvent("download");
    await p.locator("[data-plan-action=export-builds]").click();
    const dl = await pending;
    const json = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    assert.equal(
      json.builds[0].notes,
      "Keep these notes even if storage fills up.",
    );
    await c.close();
  });
  await test("Corrupt build storage is reported and retained; ordinary weapon favorites still load", async () => {
    const c = await browser.newContext({ offline: true });
    await c.addInitScript(() => {
      if (!sessionStorage.getItem("fixture")) {
        localStorage.setItem("night-city-arsenal.builds.v1", "{broken");
        localStorage.setItem(
          "night-city-arsenal.v1",
          JSON.stringify({ favorites: ["Items.Preset_Unity_Agent"] }),
        );
        sessionStorage.setItem("fixture", "1");
      }
    });
    const p = await c.newPage();
    await p.goto(url);
    assert.equal(
      (await p.evaluate(() => Arsenal.getState())).favorites.length,
      1,
    );
    await p.locator(".masthead [data-nav=builds]").click();
    assert.match(
      await p.locator("#builds-panel .notice").first().textContent(),
      /invalid/,
    );
    assert.equal(
      await p.evaluate(() =>
        localStorage.getItem("night-city-arsenal.builds.v1"),
      ),
      "{broken",
    );
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 0);
    await c.close();
  });
  await test("Compatible-weapon filtering respects fixed sights and unknown slot data", async () => {
    const c = await browser.newContext({ offline: true });
    const p = await c.newPage();
    await p.goto(url);
    await p.locator(".masthead [data-nav=mods]").click();
    await p.locator("[data-mod-filter=category]").selectOption("Scope");
    await p.locator("[data-plan-action=choose-filter-weapon]").click();
    await p.locator("#equipment-weapon-search").fill("Lexington x-MOD2");
    await p.locator("[data-plan-action=choose-weapon-result]").click();
    assert.equal(await p.locator("#mods-results .equipment-card").count(), 0);
    await p.locator("[data-plan-action=clear-mod-weapon]").click();
    assert.ok((await p.locator("#mods-results .equipment-card").count()) > 0);
    await c.close();
  });
  await browser.close();
  const report = {
    productionSHA256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, "dist/Night-City-Arsenal.html")))
      .digest("hex"),
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
  fs.writeFileSync(
    path.join(root, ".tmp/tests/modifications/storage-results.json"),
    JSON.stringify(report, null, 2),
  );
  if (report.failed) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exitCode = 1;
});
