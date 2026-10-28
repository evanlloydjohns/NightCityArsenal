const { launchBrowser, newContext } = require("./browser.cjs");
const { root, writeReport } = require("./support.cjs");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url"),
  crypto = require("node:crypto");
const http = require("node:http");
const results = [];
let browser;
let server;
const BUILD_KEY = "night-city-arsenal.builds.v1", PREF_KEY = "night-city-arsenal.v1";
const E = require("../src/planner-core.js").createEngine(
  JSON.parse(fs.readFileSync(path.join(root, "src/data/weapons.json"))),
  JSON.parse(fs.readFileSync(path.join(root, "src/data/modifications.json"))),
);
const fixture = () => E.newBuild("Items.Preset_Katana_Saburo");
async function saved(page) {
  await page.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
}
async function downloadJSON(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator(selector).filter({ visible: true }).click(),
  ]);
  return JSON.parse(fs.readFileSync(await download.path(), "utf8"));
}
async function newPlan(page, name) {
  await page.evaluate(() => NCAExpansion.startPlan("Items.Preset_Katana_Saburo"));
  await page.locator("#plan-name").fill(name);
}
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
  browser = await launchBrowser();
  const url = pathToFileURL(path.join(root, "dist/Night-City-Arsenal.html")).href;
  await test("Build quota failure keeps a usable exportable session and does not alter weapon preferences", async () => {
    const c = await newContext(browser, {
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
    await saved(p);
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
    const c = await newContext(browser);
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
    const c = await newContext(browser);
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
  await test("Duplicate names stay within 300 characters, survive reload, and invalid writes are rejected", async () => {
    const c = await newContext(browser);
    const initial = [294, 295, 300].map((length) => ({ ...fixture(), name: "x".repeat(length) }));
    await c.addInitScript(({ key, bundle }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(bundle));
    }, { key: BUILD_KEY, bundle: E.exportBundle(initial) });
    const p = await c.newPage();
    await p.goto(url + "#builds");
    for (const build of initial) {
      await p.locator(`[data-plan-action=duplicate-build][data-build-id="${build.id}"]`).click();
      await p.waitForFunction((count) => document.querySelectorAll(".build-card").length === count, initial.length + initial.indexOf(build) + 1);
    }
    let builds = await p.evaluate(() => NCAExpansion.getBuilds());
    for (const build of builds.slice(3)) {
      assert.equal(build.name.length, 300);
      assert.ok(build.name.endsWith(" (copy)"));
    }
    await p.locator(`[data-plan-action=duplicate-build][data-build-id="${builds[5].id}"]`).click();
    await p.waitForFunction(() => document.querySelectorAll(".build-card").length === 7);
    const before = await p.evaluate((key) => localStorage.getItem(key), BUILD_KEY);
    await p.locator(`[data-plan-action=rename-build][data-build-id="${builds[0].id}"]`).click();
    await p.locator("#rename-build-name").evaluate((input) => { input.value = "z".repeat(301); });
    await p.locator("[data-plan-action=save-build-name]").click();
    assert.match(await p.locator("#toast").textContent(), /Build name must be text/);
    assert.equal(await p.evaluate((key) => localStorage.getItem(key), BUILD_KEY), before);
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds()))[0].name, initial[0].name);
    await p.reload();
    builds = await p.evaluate(() => NCAExpansion.getBuilds());
    assert.equal(builds.length, 7);
    E.sanitizeBundle(E.exportBundle(builds));
    await c.close();
  });
  await test("Malformed preferences survive initialization and saves and export their exact stored text", async () => {
    for (const raw of [" {broken\n", "null", "[]", "42"]) {
      const c = await newContext(browser, { acceptDownloads: true });
      await c.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: PREF_KEY, raw });
      const p = await c.newPage();
      await p.goto(url + "#data");
      assert.match(await p.locator(".inapp-storage").textContent(), /invalid data/);
      await p.locator(".masthead [data-nav=arsenal]").click();
      await p.locator("#search").fill("Unity");
      await p.locator(".masthead [data-nav=data]").click();
      assert.equal(await p.evaluate((key) => localStorage.getItem(key), PREF_KEY), raw);
      const backup = await downloadJSON(p, "#export-preference-recovery");
      assert.equal(backup.key, PREF_KEY);
      assert.deepEqual(backup.snapshots, [raw]);
      const session = await downloadJSON(p, "#export-preferences");
      assert.equal(session.preferences.query, "Unity");
      await c.close();
    }
  });
  await test("Partially corrupt build libraries recover valid records and retain originals through later saves", async () => {
    const good = { ...fixture(), name: "Recover this", notes: "Original notes" };
    const bad = { ...fixture(), name: "x".repeat(301) };
    const raw = "\n" + JSON.stringify(E.exportBundle([good, bad]), null, 2) + "\n";
    const c = await newContext(browser, { acceptDownloads: true });
    await c.addInitScript(({ key, raw }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    }, { key: BUILD_KEY, raw });
    const p = await c.newPage();
    await p.goto(url + "#builds");
    assert.deepEqual(await p.evaluate(() => NCAExpansion.getBuilds()), [good]);
    await newPlan(p, "Session addition");
    await p.locator("[data-plan-action=save-build]").click();
    await saved(p);
    assert.equal(await p.evaluate((key) => localStorage.getItem(key), BUILD_KEY), raw);
    await p.locator(".masthead [data-nav=builds]").click();
    const backup = await downloadJSON(p, "[data-plan-action=export-build-recovery]");
    assert.deepEqual(backup.snapshots, [raw]);
    const session = await downloadJSON(p, "[data-plan-action=export-builds]");
    assert.deepEqual(session.builds.map((b) => b.name), ["Recover this", "Session addition"]);
    await p.reload();
    assert.deepEqual(await p.evaluate(() => NCAExpansion.getBuilds()), [good]);
    await c.close();
  });
  await test("Unavailable reads are distinct from malformed data and never trigger replacement writes", async () => {
    const c = await newContext(browser);
    await c.addInitScript(() => {
      window.storageWrites = [];
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (["night-city-arsenal.v1", "night-city-arsenal.builds.v1"].includes(key)) throw new DOMException("Blocked", "SecurityError");
        return get.call(this, key);
      };
      Storage.prototype.setItem = function (key, raw) { window.storageWrites.push(key); return set.call(this, key, raw); };
    });
    const p = await c.newPage();
    await p.goto(url + "#data");
    assert.match(await p.locator(".inapp-storage").textContent(), /unavailable/);
    assert.equal(await p.locator("#export-preference-recovery").count(), 0);
    await newPlan(p, "Unavailable session");
    await p.locator("[data-plan-action=save-build]").click();
    await saved(p);
    assert.match(await p.locator(".build-storage-warning").textContent(), /unavailable/);
    assert.doesNotMatch(await p.locator(".build-storage-warning").textContent(), /invalid data/);
    assert.equal(await p.locator("[data-plan-action=export-build-recovery]").count(), 0);
    assert.deepEqual(await p.evaluate(() => storageWrites.filter((key) => ["night-city-arsenal.v1", "night-city-arsenal.builds.v1"].includes(key))), []);
    await c.close();
  });
  await test("Corruption introduced after load is detected before either storage key can be overwritten", async () => {
    const c = await newContext(browser, { acceptDownloads: true });
    const p = await c.newPage();
    await p.goto(url);
    await p.evaluate(([prefs, builds]) => {
      localStorage.setItem(prefs, "{late prefs");
      localStorage.setItem(builds, "{late builds");
    }, [PREF_KEY, BUILD_KEY]);
    await p.locator("#search").fill("Unity");
    await newPlan(p, "Later session");
    await p.locator("[data-plan-action=save-build]").click();
    await saved(p);
    assert.equal(await p.evaluate((key) => localStorage.getItem(key), BUILD_KEY), "{late builds");
    assert.deepEqual((await downloadJSON(p, "[data-plan-action=export-build-recovery]")).snapshots, ["{late builds"]);
    await p.locator(".masthead [data-nav=data]").click();
    assert.equal(await p.evaluate((key) => localStorage.getItem(key), PREF_KEY), "{late prefs");
    assert.deepEqual((await downloadJSON(p, "#export-preference-recovery")).snapshots, ["{late prefs"]);
    await c.close();
  });
  // An ephemeral loopback origin lets two real tabs share storage and Web Locks.
  server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(fs.readFileSync(path.join(root, "dist/Night-City-Arsenal.html")));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const hostedURL = `http://127.0.0.1:${server.address().port}/`;
  await test("External saves and conflicting edits cannot be silently overwritten, including a restored draft", async () => {
    const c = await newContext(browser, { offline: false, acceptDownloads: true });
    const good = fixture();
    await c.addInitScript(({ key, bundle }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(bundle));
    }, { key: BUILD_KEY, bundle: E.exportBundle([good]) });
    const a = await c.newPage(), b = await c.newPage();
    await a.goto(hostedURL + "#builds");
    await b.goto(hostedURL + "#builds");
    await a.evaluate((id) => NCAExpansion.openBuild(id, true), good.id);
    await a.locator("#plan-notes").fill("Stale tab edit");
    await b.evaluate((id) => NCAExpansion.openBuild(id, true), good.id);
    await b.locator("#plan-notes").fill("Other tab edit");
    await b.locator("[data-plan-action=save-build]").click();
    await saved(b);
    const latest = await b.evaluate((key) => localStorage.getItem(key), BUILD_KEY);
    await a.waitForFunction(() => document.querySelector(".build-storage-warning")?.textContent.includes("another tab"));
    await a.locator("[data-plan-action=save-build]").click();
    await saved(a);
    assert.equal(await a.evaluate((key) => localStorage.getItem(key), BUILD_KEY), latest);
    assert.equal((await a.evaluate(() => NCAExpansion.getBuilds()))[0].notes, "Stale tab edit");
    await a.waitForFunction(() => JSON.parse(sessionStorage.getItem("night-city-arsenal.draft.v1"))?.build.notes === "Stale tab edit");
    await a.reload();
    await a.locator("[data-plan-action=save-build]").click();
    assert.match(await a.locator("#plan-save-status").textContent(), /opened before/);
    assert.equal(await a.evaluate((key) => localStorage.getItem(key), BUILD_KEY), latest);
    // Saving the restored draft as a distinct build reconciles without replacing the other edit.
    await a.locator("[data-plan-action=save-as-new]").click();
    await saved(a);
    const reconciled = JSON.parse(await a.evaluate((key) => localStorage.getItem(key), BUILD_KEY));
    assert.deepEqual(reconciled.builds.map((build) => build.notes), ["Other tab edit", "Stale tab edit"]);
    await c.close();
  });
  await test("Simultaneous tab saves serialize their storage checks and preserve the losing session for export", async () => {
    const c = await newContext(browser, { offline: false, acceptDownloads: true });
    // Deliberately delay all notification handling: the save boundary itself
    // must still detect a changed value while holding the shared lock.
    await c.addInitScript(() => window.addEventListener("storage", (event) => event.stopImmediatePropagation()));
    const a = await c.newPage(), b = await c.newPage();
    await a.goto(hostedURL);
    await b.goto(hostedURL);
    await newPlan(a, "Tab A");
    await newPlan(b, "Tab B");
    await Promise.all([a.locator("[data-plan-action=save-build]").click(), b.locator("[data-plan-action=save-build]").click()]);
    await Promise.all([saved(a), saved(b)]);
    const bundle = JSON.parse(await a.evaluate((key) => localStorage.getItem(key), BUILD_KEY));
    assert.equal(bundle.builds.length, 1);
    const loser = bundle.builds[0].name === "Tab A" ? b : a;
    assert.match(await loser.locator(".build-storage-warning").textContent(), /another tab/);
    await loser.locator(".masthead [data-nav=builds]").click();
    const session = await downloadJSON(loser, "[data-plan-action=export-builds]");
    assert.equal(session.builds.length, 1);
    assert.notEqual(session.builds[0].name, bundle.builds[0].name);
    await c.close();
  });
  await new Promise((resolve) => server.close(resolve));
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
  writeReport("modifications/storage-results.json", report);
  if (report.failed) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  server?.close();
  process.exitCode = 1;
});
