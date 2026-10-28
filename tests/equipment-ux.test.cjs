/* Targeted quality pass on the final offline production file, never the user's browser. */
const { launchBrowser, newContext } = require("./browser.cjs");
const { root, artifactDir, writeReport } = require("./support.cjs");
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  crypto = require("crypto"),
  http = require("http"),
  { pathToFileURL } = require("url");
const out = artifactDir("equipment-ux"),
  html = path.join(root, "dist/Night-City-Arsenal.html"),
  url = pathToFileURL(html).href;
const results = [],
  errors = [],
  network = [];
let browser, server;
const key = "night-city-arsenal.v1";
async function fixture(seed, hosted = false) {
  const c = await newContext(browser, {
    offline: !hosted,
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  if (seed)
    await c.addInitScript(
      ({ seed, key }) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(key, JSON.stringify(seed));
          sessionStorage.setItem("seeded", "yes");
        }
      },
      { seed, key },
    );
  const p = await c.newPage();
  p.setDefaultTimeout(7000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => {
    if (!/^(file:|blob:|http:\/\/127\.0\.0\.1:)/.test(r.url()))
      network.push(r.url());
  });
  return { c, p };
}
const nav = (p, v) => p.locator(`.masthead [data-nav=${v}]`).click();
const close = (p) => p.locator("[data-plan-action=close-equipment]").click();
const shot = async (p, n) => {
  await p.screenshot({
    path: path.join(out, n + ".png"),
    animations: "disabled",
    style: ".toast{visibility:hidden!important}",
  });
};
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
  await test("Favorites retain old storage, navigate all sections, and agree in cards/table after reload", async () => {
    const { c, p } = await fixture({
      favorites: ["Items.Preset_Unity_Agent"],
      class: "Pistol",
      compare: [],
      tier: "5++",
    });
    await p.goto(url);
    assert.equal(await p.locator("#favorite-count").textContent(), "1");
    await nav(p, "favorites");
    assert.equal(await p.locator(".weapon-card").count(), 1);
    await p.locator("#view-table").click();
    assert.equal(await p.locator("#catalog tbody tr").count(), 1);
    await p
      .getByRole("button", { name: "Unfavorite Her Majesty", exact: true })
      .click();
    assert.equal(await p.locator("#favorite-count").textContent(), "0");
    assert.match(
      await p.locator("#catalog").textContent(),
      /Your collection starts here/,
    );
    await p.locator("[data-action=browse]").click();
    await p
      .getByRole("button", { name: "Favorite Her Majesty", exact: true })
      .click();
    for (const v of ["mods", "builds", "compare", "arsenal", "favorites"]) {
      await nav(p, v);
      assert.equal(await p.locator("#favorite-count").textContent(), "1");
    }
    await p.reload();
    assert.equal(await p.locator("#catalog tbody tr").count(), 1);
    assert.equal(
      (await p.evaluate(() => Arsenal.getState())).favorites[0],
      "Items.Preset_Unity_Agent",
    );
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 0);
    await c.close();
  });
  await test("Favorites distinguish no saved collection, filters hiding saved standards, and a failed search", async () => {
    const { c, p } = await fixture({ favorites: [], iconic: "iconic" });
    await p.goto(url + "#favorites");
    assert.match(
      await p.locator("#catalog").textContent(),
      /Your collection starts here/,
    );
    await p.evaluate(() => {
      const s = Arsenal.getState();
      s.favorites = [
        Arsenal.data.weapons.find((w) => !w.iconic && w.name === "Unity").id,
      ];
      localStorage.setItem("night-city-arsenal.v1", JSON.stringify(s));
    });
    await p.reload();
    assert.equal(await p.locator("#favorite-count").textContent(), "1");
    assert.match(
      await p.locator("#catalog").textContent(),
      /Filters are hiding your favorites/,
    );
    await p.locator("#catalog [data-action=reset]").click();
    assert.equal(await p.locator(".weapon-card").count(), 1);
    assert.equal((await p.evaluate(() => Arsenal.getState())).iconic, "all");
    await p.locator("#search").fill("not-a-weapon");
    assert.match(
      await p.locator("#catalog").textContent(),
      /No search results/,
    );
    await p.locator("[data-action=clear-search]").click();
    assert.equal(await p.locator(".weapon-card").count(), 1);
    await c.close();
  });
  await test("All 72 source-mapped authentic equipment images decode offline, with distinct assets and credits", async () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "src/data/modification-images.json")),
    );
    assert.equal(Object.keys(manifest.images).length, 72);
    assert.equal(
      new Set(Object.values(manifest.images).map((a) => a.sha256)).size,
      72,
    );
    for (const a of Object.values(manifest.images)) {
      assert.equal(
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(root, "src", a.file)))
          .digest("hex"),
        a.sha256,
      );
      assert.match(a.sourceUrl, /^https:\/\/cdn\.gamestegy\.com\//);
      assert.match(a.attribution, /CD PROJEKT RED/);
    }
    const { c, p } = await fixture();
    await p.goto(url);
    await nav(p, "mods");
    assert.equal(await p.locator("#mods-results img").count(), 72);
    assert.equal(
      await p.evaluate(async () => {
        for (const m of NCAExpansion.data.modifications) {
          const img = new Image();
          img.src = m.image.src;
          await img.decode();
          if (img.naturalWidth < 16) throw Error(m.name);
        }
        return NCAExpansion.data.modifications.length;
      }),
      72,
    );
    await shot(p, "mods-1920");
    await c.close();
  });
  await test("Mod title, artwork, noninteractive card area, Enter and Space open one accessible inspection", async () => {
    const { c, p } = await fixture();
    await p.goto(url);
    await nav(p, "mods");
    await p.locator("#mods-search").fill("Big Mag");
    const card = p.locator("#mods-results .equipment-card");
    for (const [selector, press] of [
      [".equipment-name", null],
      [".equipment-art-open", null],
      [".equipment-effect", null],
      [".equipment-name", "Enter"],
      [".equipment-name", "Space"],
    ]) {
      const n = card.locator(selector);
      if (press) {
        await n.focus();
        await p.keyboard.press("Tab");
        await p.keyboard.press("Shift+Tab");
        assert.ok(await n.evaluate((n) => n.matches(":focus-visible")));
        await n.press(press);
      } else await n.click();
      assert.equal(
        await p.locator("#equipment-title").textContent(),
        "Big Mag",
      );
      assert.equal(await p.locator("dialog[open]").count(), 1);
      assert.equal(
        await p.locator(".equipment-detail-identity img").count(),
        1,
      );
      await close(p);
    }
    await c.close();
  });
  await test("Compact compatibility browser paginates, combines search/class/technology/iconic/status and exposes restrictions", async () => {
    const { c, p } = await fixture();
    await p.goto(url);
    await nav(p, "mods");
    await p.locator("#mods-search").fill("Add-Vantage");
    await p.locator("#mods-results .equipment-name").click();
    assert.equal(await p.locator(".compatible-weapon-row").count(), 10);
    assert.match(
      await p.locator("#compatible-result-count").textContent(),
      /58 matches/,
    );
    await p.locator("[data-plan-action=more-compatible]").click();
    assert.equal(await p.locator(".compatible-weapon-row").count(), 20);
    await p.locator("#compatible-search").fill("Lexington x-MOD2");
    assert.equal(await p.locator(".compatible-weapon-row").count(), 1);
    assert.match(await p.locator(".compatible-status").textContent(), /fixed/i);
    assert.ok(
      await p.locator("[data-plan-action=plan-compatible]").isDisabled(),
    );
    await p.locator("#compatible-search").fill("");
    await p.locator("[data-compatible-filter=class]").selectOption("Pistol");
    await p
      .locator("[data-compatible-filter=technology]")
      .selectOption("Power");
    await p.locator("[data-compatible-filter=iconic]").selectOption("Standard");
    await p
      .locator("[data-compatible-filter=status]")
      .selectOption("compatible");
    assert.ok((await p.locator(".compatible-weapon-row").count()) > 0);
    assert.equal(
      await p.locator("[data-plan-action=plan-compatible]:disabled").count(),
      0,
    );
    await p.locator(".mod-compatible-browser").scrollIntoViewIfNeeded();
    await shot(p, "compatible-filtered-1920");
    await p.locator("[data-compatible-filter=class]").selectOption("");
    await p.locator("[data-compatible-filter=technology]").selectOption("");
    await p.locator("[data-compatible-filter=iconic]").selectOption("");
    await p.locator("[data-compatible-filter=status]").selectOption("");
    await p.locator("#compatible-tier").selectOption("1");
    assert.equal(
      await p
        .locator("[data-plan-action=plan-compatible]:not(:disabled)")
        .count(),
      0,
    );
    await p.locator("#mod-detail-tier").selectOption("1");
    assert.ok(
      (await p
        .locator("[data-plan-action=plan-compatible]:not(:disabled)")
        .count()) > 0,
    );
    await c.close();
  });
  await test("Plan from mod preselects exact equipment/weapon tiers and a real slot; higher-quality equipment is blocked", async () => {
    const { c, p } = await fixture();
    await p.goto(url);
    await nav(p, "mods");
    await p.locator("#mods-search").fill("Add-Vantage");
    await p.locator("#mods-results .equipment-name").click();
    await p.locator("#compatible-search").fill("Kyubi x-MOD2");
    await p.locator("#compatible-tier").selectOption("3");
    assert.ok(
      await p.locator("[data-plan-action=plan-compatible]").isDisabled(),
    );
    assert.match(
      await p.locator(".compatible-status").textContent(),
      /quality|tier/i,
    );
    await p.locator("#compatible-tier").selectOption("5+");
    await p.locator("#mod-detail-tier").selectOption("3");
    await p.locator("[data-plan-action=plan-compatible]").click();
    const b = await p.evaluate(() => NCAExpansion.getDraft());
    assert.equal(b.tier, "5+");
    assert.deepEqual(b.selections, [
      { slotId: "scope:1", modId: "mod.add-vantage", tier: "3" },
    ]);
    assert.equal(await p.locator(".equipment-slot.occupied img").count(), 1);
    assert.match(
      await p
        .locator(".equipment-slot.occupied .slot-effect-summary")
        .textContent(),
      /Zoom|range/i,
    );
    await c.close();
  });
  await test("Planner uses catalog labels, units and applicable stats at its own reference and tier", async () => {
    const { c, p } = await fixture();
    try {
      await p.goto(url);
      const original = await p.evaluate(() => JSON.stringify(Arsenal.data.weapons));
      for (const name of ["Her Majesty", "Satori", "Nehan", "Gwynbleidd"]) {
        await p.evaluate((name) => { void NCAExpansion.startPlan(Arsenal.data.weapons.find((w) => w.iconic && w.name === name).id); }, name);
        if (await p.locator("#plan-confirm").evaluate((n) => n.open))
          await p.locator("#plan-confirm-accept").click();
        await p.waitForFunction((name) => document.querySelector(".plan-identity h2")?.textContent === name, name);
        for (const profile of ["records", "nd"]) {
          await p.locator("#plan-profile").selectOption(profile);
          for (const tier of ["5++", "1+"]) {
            await p.locator("#plan-tier").selectOption(tier);
            const draft = await p.evaluate(() => NCAExpansion.getDraft());
            assert.equal(draft.profile, profile, `${name}: selected reference`);
            assert.equal(draft.tier, tier, `${name}: selected tier`);
            // Inspect the same published reference separately through the catalog UI.
            await p.evaluate(({ profile, tier }) => {
              for (const [id, value] of [["profile", profile], ["tier", tier]]) {
                const input = document.getElementById(id);
                input.value = value;
                input.dispatchEvent(new Event("change", { bubbles: true }));
              }
              Arsenal.openDetail(NCAExpansion.getDraft().weaponId);
            }, { profile, tier });
            const catalog = await p.locator(".detail-stat").evaluateAll((nodes) => Object.fromEntries(nodes.map((n) => [n.querySelector("span").textContent, n.querySelector("strong").textContent])));
            const planned = await p.locator(".plan-base-stats > div").evaluateAll((nodes) => Object.fromEntries(nodes.map((n) => [n.querySelector("span").textContent, n.querySelector("strong").textContent])));
            for (const [label, value] of Object.entries(planned)) assert.equal(value, catalog[label], `${name} ${profile} ${tier}: ${label}`);
            assert.ok(Object.keys(planned).includes(profile === "records" ? "DPS · game record" : "DPS · published"));
            assert.equal("Throw return time" in planned, name === "Nehan");
            assert.equal("Magazine" in planned, name === "Her Majesty");
            assert.equal("Attack stamina" in planned, name !== "Her Majesty");
            if ((profile === "records" && tier === "1+") || (profile === "nd" && name === "Gwynbleidd"))
              assert.ok(Object.values(planned).every((value) => value === "Unknown"));
            await p.evaluate(() => Arsenal.closeDetail());
          }
        }
      }
      assert.equal(await p.evaluate(() => JSON.stringify(Arsenal.data.weapons)), original);
    } finally {
      await c.close();
    }
  });
  await test("Picker displays imagery, exact selected tier, concise badges and expandable evidence without recalculating stats", async () => {
    const { c, p } = await fixture();
    await p.goto(url);
    await p.evaluate(() =>
      NCAExpansion.startPlan("Items.Preset_Kyubi_Legendary"),
    );
    const stats = await p.locator(".plan-base-stats").textContent();
    await p
      .locator('[data-plan-action=pick-slot][data-slot-id="normal-mod:1"]')
      .click();
    await p.locator("#equipment-search").fill("Big Mag");
    assert.equal(await p.locator("#equipment-picker-results img").count(), 1);
    await p.locator("[data-plan-action=select-equipment]").click();
    await p
      .locator('[data-plan-action=pick-slot][data-slot-id="normal-mod:1"]')
      .click();
    await p.locator("#equipment-search").fill("Big Mag");
    assert.equal(await p.locator(".equipment-selected").count(), 1);
    await p.locator("[data-picker-mod-tier]").selectOption("4");
    assert.equal(await p.locator(".equipment-selected").count(), 0);
    assert.match(
      await p.locator(".equipment-compat").textContent(),
      /Source \+ slot checked/,
    );
    await p.locator(".compat-evidence summary").click();
    assert.match(
      await p.locator(".compat-evidence").textContent(),
      /not game-tested/,
    );
    await shot(p, "picker-1920");
    await p.locator("[data-plan-action=select-equipment]").click();
    assert.equal(await p.locator(".plan-base-stats").textContent(), stats);
    await p.locator("#plan-name").fill("Equipment UX saved fixture");
    await p
      .locator("#plan-notes")
      .fill("A practical loadout.\nRemember to acquire Big Mag.");
    await p.locator("#plan-tags").fill("Stealth, Experiment");
    await p.locator("#plan-favorite").check();
    await p.locator("[data-plan-action=save-build]").click();
    await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
    await shot(p, "planner-1920");
    await nav(p, "builds");
    await shot(p, "builds-1920");
    const stored = await p.evaluate(() => NCAExpansion.getBuilds());
    assert.equal(stored.length, 1);
    assert.deepEqual(stored[0].selections, [
      { slotId: "normal-mod:1", modId: "mod.big-mag", tier: "4" },
    ]);
    for (const selector of [".equipment-name", ".build-art"]) {
      await p.locator(".build-card " + selector).click();
      assert.match(
        await p.locator(".build-notes-full").textContent(),
        /Remember to acquire/,
      );
      await nav(p, "builds");
    }
    assert.equal(await p.locator(".build-selection-summary img").count(), 1);
    await p.locator(".build-card .equipment-name").focus();
    await p.keyboard.press("Space");
    await p.locator("[data-plan-action=edit-current-build]").click();
    await p.locator("#plan-notes").fill("Edited without another build.");
    await p.locator("[data-plan-action=save-build]").click();
    await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
    await p.reload();
    assert.equal((await p.evaluate(() => NCAExpansion.getBuilds())).length, 1);
    assert.equal(
      (await p.evaluate(() => NCAExpansion.getBuilds()))[0].notes,
      "Edited without another build.",
    );
    await c.close();
  });
  await test("Original key persists on loopback HTTP too; file/host preferences and builds remain separate", async () => {
    server = http.createServer((req, res) => {
      res.setHeader("Content-Type", "text/html");
      res.end(fs.readFileSync(html));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const hosted = "http://127.0.0.1:" + server.address().port + "/index.html";
    const { c, p } = await fixture(
      { favorites: ["Items.Preset_Unity_Agent"], query: "", iconic: "all" },
      true,
    );
    await p.goto(hosted);
    await nav(p, "favorites");
    assert.equal(await p.locator(".weapon-card").count(), 1);
    await p
      .getByRole("button", { name: "Unfavorite Her Majesty", exact: true })
      .click();
    await p.reload();
    assert.equal(await p.locator("#favorite-count").textContent(), "0");
    await p.goto(url);
    assert.equal(await p.locator("#favorite-count").textContent(), "1");
    await p
      .getByRole("button", { name: "Unfavorite Her Majesty", exact: true })
      .click();
    await p.reload();
    assert.equal(await p.locator("#favorite-count").textContent(), "0");
    await c.close();
    await new Promise((r) => server.close(r));
    server = null;
  });
  await test("Responsive catalog, detail, picker and saved build artwork fit 390/2560 viewports without horizontal overflow", async () => {
    const { c, p } = await fixture();
    await p.goto(url);
    for (const width of [390, 2560]) {
      await p.setViewportSize({ width, height: width === 390 ? 844 : 1440 });
      await nav(p, "mods");
      await shot(p, "mods-" + width);
      await p.locator("#mods-search").fill("Add-Vantage");
      await p.locator("#mods-results .equipment-name").click();
      await shot(p, "compatibility-" + width);
      assert.ok(
        await p
          .locator(".exp-dialog-body")
          .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      );
      await p.locator("#compatible-search").fill("Kyubi x-MOD2");
      await p.locator("[data-plan-action=plan-compatible]").click();
      if (await p.locator("#plan-confirm").evaluate((n) => n.open))
        await p.locator("#plan-confirm-accept").click();
      await p
        .locator('[data-plan-action=pick-slot][data-slot-id="scope:1"]')
        .click();
      await p.locator("#equipment-search").fill("Add-Vantage");
      await shot(p, "picker-" + width);
      assert.ok(
        await p
          .locator(".exp-dialog-body")
          .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      );
      await close(p);
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.locator("[data-plan-action=save-build]").click();
      await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
      await nav(p, "builds");
      await shot(p, "builds-" + width);
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await nav(p, "mods");
      await p.locator("[data-plan-action=mods-reset]").click();
    }
    await c.close();
  });
  await test("No critical page errors or external runtime asset/network requests", async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
  });
  await browser.close();
  browser = null;
  const report = {
    method:
      "Exact production HTML; isolated headless Edge; GPU/compositing disabled; offline file and temporary loopback HTTP origin",
    productionSHA256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(html))
      .digest("hex"),
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
  writeReport("equipment-ux/results.json", report);
  if (report.failed) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  server?.close();
  process.exitCode = 1;
});
