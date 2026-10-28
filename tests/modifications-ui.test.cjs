const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, ".tmp/tests/modifications");
fs.mkdirSync(out, { recursive: true });
let browser, p;
const results = [],
  errors = [],
  requests = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, passed: false, error: e.stack });
    console.error("FAIL", name, e.message);
  }
};
const settle = () =>
  p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
const shot = async (n) => {
  await p.mouse.move(0, 0);
  await p.waitForTimeout(150);
  await p.screenshot({
    path: path.join(out, n + ".png"),
    animations: "disabled",
    style: ".toast{visibility:hidden!important}",
  });
};
const nav = async (v) => {
  await p.locator(`.masthead [data-nav="${v}"]`).click();
  await p.evaluate(() => scrollTo(0, 0));
  await settle();
};
async function start(id) {
  await p.evaluate((id) => {
    void NCAExpansion.startPlan(id);
  }, id);
  if (await p.locator("#plan-confirm").evaluate((n) => n.open))
    await p.locator("#plan-confirm-accept").click();
  await settle();
}
async function select(slot, name, tier) {
  await p
    .locator(`[data-plan-action=pick-slot][data-slot-id="${slot}"]`)
    .click();
  await p.locator("#equipment-search").fill(name);
  const card = p
    .locator("#equipment-picker-results .equipment-card")
    .filter({ has: p.getByRole("heading", { name, exact: true }) });
  if (tier) await card.locator("select").selectOption(tier);
  await card.locator("[data-plan-action=select-equipment]").click();
}
(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE,
    args: ["--disable-gpu", "--disable-gpu-compositing"],
  });
  const c = await browser.newContext({
    offline: true,
    viewport: { width: 1920, height: 1080 },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => requests.push(r.url()));
  await p.goto(pathToFileURL(path.join(root, "dist/Night-City-Arsenal.html")).href);
  await p.evaluate(() => {
    window.__baseWeapons = JSON.stringify(Arsenal.data.weapons);
    window.__originalPrefs = Arsenal.getState();
  });
  await test("Mods navigation loads all 72 real records; name/effect search and all filters combine", async () => {
    await nav("mods");
    assert.equal(await p.locator("#mods-results .equipment-card").count(), 72);
    await shot("mods-1920");
    await p.locator("#mods-search").fill("recoil");
    assert.ok((await p.locator("#mods-results .equipment-card").count()) > 0);
    assert.ok((await p.locator("#mods-results .equipment-card").count()) < 72);
    await p.locator("[data-plan-action=mods-reset]").click();
    await p.locator("[data-mod-filter=category]").selectOption("Ranged mod");
    await p.locator("[data-mod-filter=class]").selectOption("Assault Rifle");
    await p.locator("[data-mod-filter=technology]").selectOption("Power");
    await p.locator("[data-mod-filter=tier]").selectOption("5");
    await p.locator("[data-mod-filter=effect]").selectOption("Magazine");
    assert.match(await p.locator("#mods-results").textContent(), /Big Mag/);
    await p.locator("[data-plan-action=mods-reset]").click();
  });
  await test("Equipment inspection exposes tiers, conditions, acquisition and source-linked weapon planning", async () => {
    await p.locator("#mods-search").fill("big mag");
    await p
      .locator(
        "#mods-results .equipment-card-actions [data-plan-action=mod-detail]",
      )
      .click();
    assert.equal(await p.locator("#equipment-title").textContent(), "Big Mag");
    await p.locator("#mod-detail-tier").selectOption("1");
    assert.match(
      await p
        .locator(".equipment-detail-columns .detail-ability")
        .textContent(),
      /15%/,
    );
    await p.locator("#mod-detail-tier").selectOption("5");
    assert.match(
      await p
        .locator(".equipment-detail-columns .detail-ability")
        .textContent(),
      /55%/,
    );
    assert.ok((await p.locator(".acquisition-list li").count()) > 0);
    assert.ok((await p.locator(".exp-source-links a").count()) >= 2);
    await shot("mod-detail-1920");
    await p.locator("#compatible-search").fill("Kyubi x-MOD2");
    await p
      .locator(
        '[data-plan-action=plan-compatible][data-weapon-id="Items.Preset_Kyubi_Legendary"]',
      )
      .click();
    assert.equal(await p.locator(".equipment-slot").count(), 4);
  });
  await test("Visual slots and picker show only verified compatible choices, complete effects and acquisition", async () => {
    await shot("planner-empty-1920");
    await p
      .locator('[data-plan-action=pick-slot][data-slot-id="normal-mod:1"]')
      .click();
    assert.ok(
      (await p.locator("#equipment-picker-results .equipment-card").count()) >
        5,
    );
    assert.equal(
      await p
        .locator(
          "#equipment-picker-results [data-plan-action=select-equipment]:disabled",
        )
        .count(),
      0,
    );
    await p.locator("#equipment-search").fill("big mag");
    await p.getByText("Acquisition & installation", { exact: true }).click();
    assert.match(
      await p.locator("#equipment-picker-results").textContent(),
      /vendor|Crafting/i,
    );
    await shot("picker-1920");
    await p
      .locator("#equipment-picker-results [data-picker-mod-tier]")
      .selectOption("4");
    assert.match(await p.locator(".picker-effect").textContent(), /45%/);
    await p
      .locator("#equipment-picker-results [data-plan-action=select-equipment]")
      .click();
    assert.match(await p.locator(".planned-effects").textContent(), /45%/);
  });
  await test("Planning four real slots changes no base statistics or canonical weapon data", async () => {
    const before = await p.locator(".plan-base-stats").textContent();
    await select("normal-mod:2", "Firecracker");
    await select("scope:1", "OS-1 GimletEye", "4");
    await select("muzzle:1", "XC-10 Cetus", "5");
    assert.equal(await p.locator(".plan-base-stats").textContent(), before);
    assert.equal(await p.locator(".equipment-slot.occupied").count(), 4);
    assert.ok(
      await p.evaluate(
        () => JSON.stringify(Arsenal.data.weapons) === __baseWeapons,
      ),
    );
    await shot("planner-filled-1920");
  });
  await test("Selections can change and clear; names, multiline notes, tags and independent favorites save", async () => {
    await p
      .locator('[data-plan-action=clear-slot][data-slot-id="muzzle:1"]')
      .click();
    assert.equal(await p.locator(".equipment-slot.occupied").count(), 3);
    await select("muzzle:1", "CS-1 Taipan", "4");
    await p.locator("#plan-name").fill("Gig stealth reference");
    await p
      .locator("#plan-notes")
      .fill(
        "Clear gigs quietly.\nNeed to acquire this mod before upgrading.\n<script>notes stay plain text</script>",
      );
    await p.locator("#plan-tags").fill("Stealth, Experimental");
    await p.locator("#plan-favorite").check();
    await p.locator("[data-plan-action=save-build]").click();
    await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
    assert.match(
      await p.locator("#plan-save-status").textContent(),
      /Saved in this browser/,
    );
    const b = (await p.evaluate(() => NCAExpansion.getBuilds()))[0];
    assert.equal(b.selections.length, 4);
    assert.ok(b.notes.includes("<script>"));
    assert.deepEqual(b.tags, ["Stealth", "Experimental"]);
    assert.equal(b.favorite, true);
    assert.equal(
      (await p.evaluate(() => Arsenal.getState())).favorites.length,
      0,
    );
    await nav("builds");
    await shot("builds-1920");
  });
  await test("Saved library persists across reload; notes/tags/favorites search and review work", async () => {
    await p.reload();
    await p.evaluate(
      () => (window.__baseWeapons = JSON.stringify(Arsenal.data.weapons)),
    );
    assert.equal(await p.locator(".build-card").count(), 1);
    await p.locator("#builds-search").fill("upgrading");
    assert.equal(await p.locator(".build-card").count(), 1);
    await p.locator("#builds-search").fill("missingword");
    assert.equal(await p.locator(".build-card").count(), 0);
    await p.locator("#builds-search").fill("");
    await p.locator("#builds-tag").selectOption("Stealth");
    await p.locator("#builds-favorites").check();
    assert.equal(await p.locator(".build-card").count(), 1);
    await p.locator("[data-plan-action=review-build]").last().click();
    assert.match(
      await p.locator(".build-notes-full").textContent(),
      /Need to acquire/,
    );
    assert.equal(await p.locator("#plan-notes").count(), 0);
    await shot("saved-review-1920");
  });
  await test("Editing, save-as-new, duplicate and rename preserve notes without silent overwrites", async () => {
    await p.locator("[data-plan-action=edit-current-build]").click();
    await p
      .locator("#plan-notes")
      .fill("Updated purpose.\nTest this scope while fighting armor.");
    await p.locator("[data-plan-action=save-build]").click();
    await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 1);
    await p.locator("#plan-name").fill("Second configuration");
    await p.locator("[data-plan-action=save-as-new]").click();
    await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 2);
    await nav("builds");
    await p.locator("#builds-favorites").uncheck();
    await p.locator("#builds-tag").selectOption("");
    await p.locator("[data-plan-action=duplicate-build]").first().click();
    await p.waitForFunction(() => document.querySelectorAll(".build-card").length === 3);
    assert.equal(await p.locator(".build-card").count(), 3);
    await p.locator("[data-plan-action=rename-build]").first().click();
    await p.locator("#rename-build-name").fill("Boss-fight trial");
    await p.locator("[data-plan-action=save-build-name]").click();
    await p.locator("#equipment-dialog").waitFor({ state: "hidden" });
    assert.match(
      await p.locator("#builds-results").textContent(),
      /Boss-fight trial/,
    );
    assert.ok(
      (await p.evaluate(() => NCAExpansion.getBuilds())).every((b) =>
        b.notes.includes("Updated purpose"),
      ),
    );
  });
  await test("Build comparison shows equipment, notes and acquisition without modified performance", async () => {
    await p.locator("[data-build-compare]").nth(0).check();
    await p.locator("[data-build-compare]").nth(1).check();
    await p.locator("[data-plan-action=compare-builds]").click();
    assert.equal(await p.locator(".build-comparison thead th").count(), 3);
    assert.match(
      await p.locator(".build-comparison").textContent(),
      /Updated purpose/,
    );
    assert.match(await p.locator(".build-comparison").textContent(), /55%|45%/);
    assert.equal(await p.locator(".build-comparison .winner").count(), 0);
    await shot("build-comparison-1920");
    await p.locator("[data-plan-action=close-equipment]").click();
  });
  let exported;
  await test("JSON export includes IDs/notes/tags/favorites; duplicate imports append rather than overwrite", async () => {
    const downloadPromise = p.waitForEvent("download");
    await p.locator("[data-plan-action=export-builds]").click();
    const dl = await downloadPromise;
    assert.equal(dl.suggestedFilename(), "Night-City-Arsenal-Builds.json");
    exported = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    assert.equal(exported.schemaVersion, 1);
    assert.equal(exported.builds.length, 3);
    assert.ok(exported.builds.every((b) => b.selections.length === 4));
    await p.locator("#builds-import-file").setInputFiles({
      name: "builds.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
    await p.waitForFunction(
      () =>
        NCAExpansion.getBuilds().length === 6 &&
        document.getElementById("equipment-dialog").open &&
        document.getElementById("equipment-title").textContent ===
          "Build import complete",
    );
    assert.match(
      await p.locator("#equipment-content").textContent(),
      /3 builds imported.*3 duplicate/s,
    );
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 6);
    await p.locator("[data-plan-action=close-equipment]").click();
  });
  await test("Malformed and unsafe imports leave the existing library unchanged", async () => {
    const before = await p.evaluate(() =>
      JSON.stringify(NCAExpansion.getBuilds()),
    );
    for (const value of [
      "{broken",
      JSON.stringify({ schemaVersion: 99, builds: [] }),
      ' {"schemaVersion":1,"builds":[],"__proto__":{"polluted":true}}',
    ]) {
      await p.locator("#builds-import-file").setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from(value),
      });
      await p.waitForFunction(
        () =>
          document.getElementById("equipment-dialog").open &&
          document.getElementById("equipment-title").textContent ===
            "Import rejected",
      );
      assert.match(
        await p.locator("#equipment-title").textContent(),
        /Import rejected/,
      );
      assert.equal(
        await p.evaluate(() => JSON.stringify(NCAExpansion.getBuilds())),
        before,
      );
      await p.locator("[data-plan-action=close-equipment]").click();
    }
    assert.equal(await p.evaluate(() => ({}).polluted), undefined);
  });
  await test("Missing/stale references survive import and review without disappearing", async () => {
    const b = {
      ...exported.builds[0],
      id: "stale-fixture",
      name: "Stale reference",
      weaponId: "Items.Not_In_Data",
      dataVersion: "older",
      patchTarget: "2.31",
      selections: [
        { slotId: "scope:1", modId: "mod.missing-fixture", tier: "5" },
      ],
    };
    await p.locator("#builds-import-file").setInputFiles({
      name: "stale.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, builds: [b] })),
    });
    await p.waitForFunction(
      () =>
        NCAExpansion.getBuilds().some((b) => b.id === "stale-fixture") &&
        document.getElementById("equipment-dialog").open &&
        document.getElementById("equipment-title").textContent ===
          "Build import complete",
    );
    assert.match(
      await p.locator("#equipment-content").textContent(),
      /Missing weapon/,
    );
    await p.locator("[data-plan-action=close-equipment]").click();
    await p
      .locator(
        '.build-card[data-build-id="stale-fixture"] [data-plan-action=review-build]',
      )
      .last()
      .click();
    assert.match(
      await p.locator(".review-warning").textContent(),
      /Missing weapon/,
    );
    assert.match(
      await p.locator("#planner-panel").textContent(),
      /mod.missing-fixture/,
    );
    await shot("stale-build-1920");
    await nav("builds");
  });
  await test("Destructive deletion requires confirmation and can be cancelled", async () => {
    const count = await p.locator(".build-card").count();
    await p
      .locator(
        '.build-card[data-build-id="stale-fixture"] [data-plan-action=delete-build]',
      )
      .click();
    await p.locator("#plan-confirm-cancel").click();
    assert.equal(await p.locator(".build-card").count(), count);
    await p
      .locator(
        '.build-card[data-build-id="stale-fixture"] [data-plan-action=delete-build]',
      )
      .click();
    await p.locator("#plan-confirm-accept").click();
    await p
      .locator('.build-card[data-build-id="stale-fixture"]')
      .waitFor({ state: "detached" });
    assert.equal(await p.locator(".build-card").count(), count - 1);
  });
  await test("Fixed iconic sights and unknown intermediate-tier slots cannot be falsely equipped", async () => {
    await start("Items.Preset_Lexington_Shooting_Competition");
    assert.match(
      await p.locator("#planner-panel").textContent(),
      /ClearVue Mk.8 factory scope/,
    );
    assert.equal(
      await p
        .locator('[data-plan-action=pick-slot][data-slot-id="scope:1"]')
        .count(),
      0,
    );
    await start("Items.Preset_Unity_Default");
    await p.locator("#plan-tier").selectOption("4+");
    assert.match(
      await p.locator(".review-warning").textContent(),
      /unverified/,
    );
    assert.equal(
      await p
        .locator('[data-plan-action=pick-slot][data-slot-id="normal-mod:1"]')
        .count(),
      0,
    );
  });
  await test("Incompatible picker entries explain restrictions and disabled cards cannot install", async () => {
    await p.locator("#plan-tier").selectOption("5++");
    await p
      .locator('[data-plan-action=pick-slot][data-slot-id="normal-mod:1"]')
      .click();
    await p.locator("#equipment-show-all").check();
    await p.locator("#equipment-search").fill("Wallpuncher");
    assert.equal(
      await p
        .locator(
          "#equipment-picker-results [data-plan-action=select-equipment]",
        )
        .isDisabled(),
      true,
    );
    assert.match(
      await p.locator(".equipment-compat").textContent(),
      /incompatible|unverified/i,
    );
    await p.locator("[data-plan-action=close-equipment]").click();
  });
  await test("Weapon-inspection Configure action and unsaved draft resume integrate with existing screens", async () => {
    await nav("arsenal");
    await p
      .getByRole("button", { name: "Details for Her Majesty", exact: true })
      .click();
    await p.locator(".configure-weapon").click();
    if (await p.locator("#plan-confirm").evaluate((n) => n.open))
      await p.locator("#plan-confirm-accept").click();
    await p.waitForFunction(
      () => NCAExpansion.getDraft()?.weaponId === "Items.Preset_Unity_Agent",
    );
    assert.match(
      await p.locator(".plan-identity").textContent(),
      /Her Majesty/,
    );
    await p.locator("#plan-notes").fill("Resume this unsaved plan");
    await nav("builds");
    await p.locator("[data-plan-action=resume-draft]").click();
    assert.equal(
      await p.locator("#plan-notes").inputValue(),
      "Resume this unsaved plan",
    );
  });
  await test("Responsive screenshots at 2560 and 390; no overflow, errors or runtime network assets", async () => {
    for (const [width, height] of [
      [2560, 1440],
      [390, 844],
    ]) {
      await p.setViewportSize({ width, height });
      await nav("mods");
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await shot("mods-" + width);
      await p.locator("#mods-search").fill("Firecracker");
      await p
        .locator(
          "#mods-results .equipment-card-actions [data-plan-action=mod-detail]",
        )
        .click();
      assert.equal(
        await p
          .locator("#equipment-dialog")
          .evaluate((n) => n.scrollWidth > n.clientWidth),
        false,
      );
      await shot("mod-detail-" + width);
      await p.keyboard.press("Escape");
      await nav("builds");
      await shot("builds-" + width);
      await p.locator("[data-plan-action=resume-draft]").click();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await shot("planner-" + width);
    }
    assert.deepEqual(errors, []);
    assert.ok(requests.every((u) => u.startsWith("file:")));
    assert.ok(
      await p.evaluate(
        () => JSON.stringify(Arsenal.data.weapons) === __baseWeapons,
      ),
    );
  });
  await browser.close();
  const report = {
    method: "Offline production file in isolated GPU-disabled headless Edge",
    productionSHA256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, "dist/Night-City-Arsenal.html")))
      .digest("hex"),
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
    errors,
  };
  fs.writeFileSync(
    path.join(out, "ui-results.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("RESULT", report.passed, "passed", report.failed, "failed");
  if (report.failed) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exitCode = 1;
});
