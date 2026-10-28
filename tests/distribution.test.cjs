/* Verify the exact files friends receive. Development dependencies only. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ROOT = path.resolve(__dirname, "..");
const SHARED = path.join(ROOT, "dist");
const SCRATCH = path.join(ROOT, ".tmp/tests/distribution");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const report = {
  method:
    "Unchanged production HTML, isolated headless Edge, file:// and network offline",
  checks: [],
};
let browser;
(async () => {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const original = fs.readFileSync(path.join(ROOT, "dist/Night-City-Arsenal.html"));
  const html = path.join(SHARED, "Night-City-Arsenal.html"),
    zip = path.join(SHARED, "Night-City-Arsenal.zip");
  const raw = original.toString("utf8");
  assert.ok(!raw.includes("C:/Users/evanl"));
  assert.ok(!raw.includes("C:\\Users\\evanl"));
  assert.ok(!raw.includes("/*__DATA__*/"));
  report.checks.push(
    "Standalone product is self-contained and has no source template markers",
    "No original installation path or unbuilt template is embedded",
  );
  const extractScript = `import json,pathlib,sys,tempfile,zipfile
archive=pathlib.Path(sys.argv[1]);destination=pathlib.Path(tempfile.mkdtemp(prefix='friend-',dir=sys.argv[2])).resolve()
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for member in z.namelist(): (destination/member).resolve().relative_to(destination)
 assert not any('/source/' in n or 'template.html' in n for n in z.namelist())
 z.extractall(destination)
print(destination/'Night-City-Arsenal'/'Night-City-Arsenal.html')`;
  const extracted = execFileSync(
    process.env.PYTHON_EXECUTABLE || "python",
    ["-c", extractScript, zip, SCRATCH],
    { encoding: "utf8" },
  ).trim();
  assert.equal(hash(fs.readFileSync(extracted)), hash(original));
  report.checks.push(
    "ZIP integrity passes; fresh extraction contains the identical app and no development template",
  );
  browser = await chromium.launch({
    headless: true,
    args: ["--disable-gpu", "--disable-gpu-compositing"],
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : { channel: "msedge" }),
  });
  for (const file of [html, extracted]) {
    const context = await browser.newContext({
      offline: true,
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage(),
      errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(pathToFileURL(file).href);
    assert.equal(await page.locator(".weapon-card").count(), 115);
    const initial = await page.evaluate(() => Arsenal.getState());
    assert.deepEqual(initial.favorites, []);
    assert.deepEqual(initial.compare, []);
    assert.equal(initial.query, "");
    const loaded = await page.evaluate(async () => {
      await Promise.all(
        Arsenal.data.weapons.map(async (w) => {
          const img = new Image();
          img.src = w.image.src;
          await img.decode();
          if (!img.naturalWidth) throw Error(w.name);
        }),
      );
      return Arsenal.data.weapons.length;
    });
    assert.equal(loaded, 190);
    await page.locator("#filter-class summary").click();
    await page
      .locator("#filter-class")
      .getByRole("checkbox", { name: "Pistol", exact: true })
      .check();
    await page
      .locator("#filter-class")
      .getByRole("checkbox", { name: "Revolver", exact: true })
      .check();
    assert.equal(await page.locator(".weapon-card").count(), 38);
    await page.locator("#reset").click();
    await page
      .getByRole("button", { name: "Favorite Her Majesty", exact: true })
      .click();
    await page.reload();
    assert.equal(await page.locator("#favorite-count").textContent(), "1");
    assert.deepEqual(await page.evaluate(() => NCAExpansion.getBuilds()), []);
    await page.locator('.masthead [data-nav="mods"]').click();
    assert.equal(
      await page.locator("#mods-results .equipment-card").count(),
      72,
    );
    assert.equal(
      await page.evaluate(async () => {
        await Promise.all(
          NCAExpansion.data.modifications.map(async (m) => {
            const img = new Image();
            img.src = m.image.src;
            await img.decode();
            if (!img.naturalWidth) throw Error(m.name);
          }),
        );
        return NCAExpansion.data.modifications.length;
      }),
      72,
    );
    await page.evaluate(() =>
      NCAExpansion.startPlan("Items.Preset_Kyubi_Legendary"),
    );
    await page
      .locator('[data-plan-action="pick-slot"][data-slot-id="normal-mod:1"]')
      .click();
    await page.locator("#equipment-search").fill("Big Mag");
    await page
      .locator(
        '#equipment-picker-results [data-plan-action="select-equipment"]',
      )
      .click();
    await page.locator("#plan-name").fill("Recipient offline plan");
    await page
      .locator("#plan-notes")
      .fill(
        "Acquisition reminder travels in JSON, not in the shared application.",
      );
    await page.locator('[data-plan-action="save-build"]').click();
    await page.reload();
    const saved = await page.evaluate(() => NCAExpansion.getBuilds());
    assert.equal(saved.length, 1);
    assert.equal(saved[0].selections[0].modId, "mod.big-mag");
    assert.match(saved[0].notes, /Acquisition reminder/);
    assert.deepEqual(errors, []);
    assert.ok(
      requests.every((u) => u.startsWith("file:") || u.startsWith("blob:")),
    );
    await context.close();
    report.checks.push(
      `${path.basename(path.dirname(file))}: offline catalog, 190 image decodes, multi-select, favorites, 72 mods and artwork decodes, visual configuration, saved build reload, no sender preferences/builds and no page errors passed`,
    );
  }
  await browser.close();
  browser = null;
  report.applicationFingerprint = hash(original).slice(0, 12);
  report.productionSHA256 = hash(original);
  report.passed = true;
  fs.writeFileSync(
    path.join(ROOT, ".tmp/tests/distribution-test.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (path.resolve(SCRATCH) !== path.join(ROOT, ".tmp/tests/distribution")) {
    throw new Error("Unexpected extraction cleanup path");
  }
  fs.rmSync(SCRATCH, { recursive: true, force: true });
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  process.exitCode = 1;
});
