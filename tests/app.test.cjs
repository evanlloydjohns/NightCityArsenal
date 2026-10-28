/* Development tests only. Run with Node and Playwright; the delivered app needs neither. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ROOT = path.resolve(__dirname, "..");
const validation = path.join(ROOT, ".tmp/tests");
fs.mkdirSync(validation, { recursive: true });
const DATA = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/weapons.json"), "utf8"),
);
const results = [];
let browser,
  context,
  page,
  consoleErrors = [],
  requests = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "passed" });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, status: "failed", error: e.stack });
    console.error("FAIL", name, e.message);
  }
}
const readState = () => page.evaluate(() => Arsenal.getState());
const count = () => page.locator(".weapon-card").count();
const weapon = (name) => DATA.weapons.find((w) => w.name === name && w.iconic);
const choose = async (name) => {
  await page.locator("#add-comparison").click();
  await page.locator("#picker-query").fill(name);
  await page.locator(`#picker-results [data-id="${weapon(name).id}"]`).click();
};
const checkCount = async () =>
  assert.equal(
    await count(),
    await page.evaluate(() => Arsenal.filtered().length),
  );
async function setFilter(key, values) {
  const selected = Array.isArray(values) ? values : [values];
  const node = page.locator("#filter-" + key);
  if (!(await node.evaluate((n) => n.open)))
    await node.locator("summary").click();
  const boxes = node.locator("input[data-multi-filter]");
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i);
    await box.setChecked(selected.includes(await box.inputValue()));
  }
  if (await node.evaluate((n) => n.open)) await node.locator("summary").click();
}

(async () => {
  await test("Canonical data: 115 unique iconics, valid game IDs, real classes and all notable cases", () => {
    const ws = DATA.weapons,
      iconics = ws.filter((w) => w.iconic);
    assert.equal(iconics.length, 115);
    assert.equal(ws.length, 190);
    assert.equal(new Set(ws.map((w) => w.id)).size, ws.length);
    assert.equal(new Set(iconics.map((w) => w.name.toLowerCase())).size, 115);
    assert.ok(
      ws.every(
        (w) =>
          /^Items\.[A-Za-z0-9_]+$/.test(w.id) &&
          w.name &&
          w.class &&
          w.technology,
      ),
    );
    for (const [name, cls, tech] of [
      ["Malorian Arms 3516", "Pistol", "Power"],
      ["Erebus", "Submachine Gun", "Power"],
      ["Her Majesty", "Pistol", "Power"],
      ["Guts", "Shotgun", "Power"],
      ["Satori", "Katana", "Blade"],
      ["Skippy", "Pistol", "Smart"],
      ["Yinglong", "Submachine Gun", "Smart"],
      ["Rasetsu", "Sniper Rifle", "Tech"],
      ["Byakko", "Katana", "Blade"],
      ["Widow Maker", "Precision Rifle", "Tech"],
      ["Nehan", "Knife", "Throwable"],
      ["Achilles x-MOD2", "Precision Rifle", "Tech"],
      ["Coronation", "Revolver", "Tech"],
      ["Sihil", "Sword", "Blade"],
    ]) {
      const w = weapon(name);
      assert.ok(w, name);
      assert.equal(w.class, cls, name);
      assert.equal(w.technology, tech, name);
      assert.ok(w.effect.length > 30, name);
    }
    assert.equal(iconics.filter((w) => w.addedIn === "2.5").length, 2);
    assert.ok(
      iconics.filter((w) => w.content === "Phantom Liberty").length > 50,
    );
    assert.ok(iconics.some((w) => w.group === "Throwable"));
    assert.ok(iconics.some((w) => w.group === "Melee"));
    assert.equal(iconics.filter((w) => w.content === "Rewards").length, 4);
    assert.ok(
      !ws.some((w) =>
        /gorilla arms|monowire|mantis blades|quickhack/i.test(w.name),
      ),
    );
  });
  await test("Data: source URLs, abilities, numeric units, tier coverage and no interpolation", () => {
    for (const w of DATA.weapons) {
      assert.ok(w.sources.every((s) => /^https:\/\//.test(s.url)));
      assert.ok(w.acquisition.hint);
      if (w.iconic) assert.ok(w.effect && w.effectStatus);
      for (const [profile, p] of Object.entries(w.profiles)) {
        for (const [tier, s] of Object.entries(p.tiers)) {
          assert.ok(DATA.meta.tiers.includes(tier));
          assert.ok(Object.values(s).every(Number.isFinite), w.name);
          for (const [key, val] of Object.entries(s))
            if (key !== "headshot") assert.ok(val >= 0, `${w.name} ${key}`);
        }
        if (profile === "records") assert.ok(!p.tiers["1+"]);
      }
    }
    assert.equal(
      DATA.weapons.filter((w) => w.iconic && w.profiles.nd).length,
      112,
    );
    assert.ok(
      DATA.weapons
        .filter((w) => w.iconic && w.profiles.nd)
        .every((w) => Object.keys(w.profiles.nd.tiers).length === 11),
    );
    assert.ok(
      DATA.weapons
        .filter((w) => w.iconic)
        .every((w) => Object.keys(w.profiles.records.tiers).length === 7),
    );
    for (const n of ["Gwynbleidd", "Coronation", "Sihil"])
      assert.ok(!weapon(n).profiles.nd);
    assert.equal(
      weapon("Malorian Arms 3516").profiles.nd.tiers["5++"].damage,
      123.8,
    );
    assert.equal(
      weapon("Malorian Arms 3516").profiles.records.tiers["5++"].magazine,
      10,
    );
    assert.equal(
      weapon("Coronation").slots.find((s) => s.type === "Weapon mod").count,
      4,
    );
  });
  browser = await chromium.launch({
    headless: true,
    args: ["--disable-gpu", "--disable-gpu-compositing"],
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : { channel: "msedge" }),
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    offline: true,
    acceptDownloads: true,
  });
  page = await context.newPage();
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("request", (r) => requests.push(r.url()));
  await test("Production launch: file://, offline, all 115 iconic cards, no errors or assets", async () => {
    await page.goto(
      pathToFileURL(path.join(ROOT, "dist/Night-City-Arsenal.html")).href,
    );
    await page.waitForURL(pathToFileURL(path.join(ROOT, "dist/Night-City-Arsenal.html")).href);
    assert.ok(page.url().startsWith("file:///"));
    assert.equal(await count(), 115);
    assert.equal(
      await page.title(),
      "Night City Arsenal · Cyberpunk 2077 Weapon Reference",
    );
    assert.equal(await page.evaluate(() => Arsenal.data.meta.totalCount), 190);
    assert.equal(consoleErrors.length, 0);
    assert.ok(requests.every((u) => u.startsWith("file:")));
  });
  await test("Weapon artwork: all 190 source-mapped images decode offline and travel with the HTML", async () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, "src/data/weapon-images.json"), "utf8"),
    );
    assert.equal(manifest.count, 190);
    assert.equal(manifest.iconicCount, 115);
    assert.equal(manifest.nonIconicCount, 75);
    assert.equal(Object.keys(manifest.images).length, 190);
    const images = await page.evaluate(async () => {
      const ws = Arsenal.data.weapons;
      const decoded = await Promise.all(
        ws.map(async (w) => {
          if (!/^data:image\/(png|webp);base64,/.test(w.image?.src || ""))
            throw Error("Missing embedded art: " + w.name);
          const img = new Image();
          img.src = w.image.src;
          await img.decode();
          if (!img.naturalWidth || !img.naturalHeight)
            throw Error("Broken art: " + w.name);
          return {
            id: w.id,
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
        }),
      );
      return decoded;
    });
    assert.equal(images.length, 190);
    assert.equal(
      await page.locator(".weapon-card img.weapon-image").count(),
      115,
    );
    for (const image of images) {
      assert.equal(image.width, manifest.images[image.id].width);
      assert.equal(image.height, manifest.images[image.id].height);
    }
    await page
      .getByRole("button", {
        name: "Details for Malorian Arms 3516",
        exact: true,
      })
      .click();
    await page.locator(".detail-art img").evaluate((img) => img.decode());
    assert.ok(await page.locator(".detail-art img").getAttribute("alt"));
    await page.locator(".detail-close").click();
    const portable = path.join(validation, "portable-index-check.html");
    fs.copyFileSync(path.join(ROOT, "dist/Night-City-Arsenal.html"), portable);
    const isolated = await context.newPage();
    await isolated.goto(pathToFileURL(portable).href);
    assert.equal(
      await isolated.locator(".weapon-card img.weapon-image").count(),
      115,
    );
    await isolated
      .locator(".weapon-card img")
      .first()
      .evaluate((img) => img.decode());
    await isolated.close();
    fs.unlinkSync(portable);
    await page.locator("#filter-iconic").selectOption("normal");
    assert.equal(
      await page.locator(".weapon-card img.weapon-image").count(),
      75,
    );
    for (const w of DATA.weapons.filter((w) => !w.iconic)) {
      await page.locator(`[data-weapon="${w.id}"] .details-small`).click();
      await page.locator(".detail-art img").evaluate((img) => img.decode());
      assert.equal(await page.locator("#detail-title").textContent(), w.name);
      await page.locator(".detail-close").click();
    }
    await page.locator("#view-table").click();
    assert.equal(await page.locator(".table-art img").count(), 75);
    await page.locator("#view-cards").click();
    for (const w of DATA.weapons.filter((w) => !w.iconic).slice(0, 2))
      await page
        .getByRole("button", {
          name: `Add ${w.name} to comparison`,
          exact: true,
        })
        .click();
    await page.locator('[data-nav="compare"]').first().click();
    assert.equal(await page.locator(".weapon-col img").count(), 2);
    await page.locator('[data-action="clear-compare"]').click();
    await page.locator('[data-nav="arsenal"]').first().click();
    await page.locator("#reset").click();
  });
  await test("Search: names, effect keywords, class, manufacturer, base model and all words", async () => {
    for (const query of [
      "Malorian Arms 3516",
      "Optical Camo",
      "katana",
      "Militech",
      "Unity",
      "Satori hemorrhaging",
    ]) {
      await page.locator("#search").fill(query);
      await checkCount();
      assert.ok((await count()) > 0, query);
    }
    await page.locator("#search").fill("no-such-weapon-8241");
    assert.equal(await count(), 0);
    assert.ok(
      await page.getByText("No search results.", { exact: true }).isVisible(),
    );
    await page.locator("#reset").click();
    assert.equal(await count(), 115);
  });
  await test("Filters: every select individually, combined filters, unknowns and reset", async () => {
    const samples = {
      content: "Phantom Liberty",
      group: "Melee",
      class: "Katana",
      technology: "Smart",
      manufacturer: "Arasaka",
      damageType: "Physical",
      missable: "missable",
    };
    for (const [key, val] of Object.entries(samples)) {
      await setFilter(key, val);
      await checkCount();
      assert.ok((await count()) > 0, key);
      await page.locator("#reset").click();
    }
    await setFilter("content", "Phantom Liberty");
    await setFilter("group", "Firearm");
    await setFilter("technology", "Power");
    await checkCount();
    assert.ok((await count()) > 0);
    assert.equal(
      await page.evaluate(() =>
        Arsenal.filtered().every(
          (w) =>
            w.content === "Phantom Liberty" &&
            w.group === "Firearm" &&
            w.technology === "Power",
        ),
      ),
      true,
    );
    await page.locator("#reset").click();
    await page.locator("#filter-iconic").selectOption("all");
    assert.equal(await count(), 190);
    await page.locator("#filter-iconic").selectOption("normal");
    assert.equal(await count(), 75);
    await page.locator("#reset").click();
  });
  await test("Filters: new 2.5 weapons, rewards and dual-wield class restriction", async () => {
    await page.locator("#filter-new").check();
    assert.equal(await count(), 2);
    assert.match(await page.locator("#catalog").textContent(), /Coronation/);
    assert.match(await page.locator("#catalog").textContent(), /Sihil/);
    await page.locator("#reset").click();
    await setFilter("content", "Rewards");
    assert.equal(await count(), 4);
    await page.locator("#reset").click();
    await page.locator("#filter-dual").check();
    assert.equal(
      await page.evaluate(() =>
        Arsenal.filtered().every(
          (w) =>
            w.technology === "Power" &&
            ["Pistol", "Revolver"].includes(w.class),
        ),
      ),
      true,
    );
    assert.ok((await count()) > 10);
    await page.locator("#reset").click();
  });
  await test("Multi-select: pistols OR revolvers, AND between categories, individual chip removal and persistence", async () => {
    await page.locator("#reset").click();
    await setFilter("class", ["Pistol", "Revolver"]);
    assert.equal(await count(), 38);
    assert.equal(
      await page.evaluate(() =>
        Arsenal.filtered().every((w) =>
          ["Pistol", "Revolver"].includes(w.class),
        ),
      ),
      true,
    );
    assert.match(
      await page.locator("#filter-class summary").textContent(),
      /Pistol.*Revolver/,
    );
    await setFilter("technology", ["Power", "Tech"]);
    await setFilter("content", ["Base Game", "Phantom Liberty"]);
    const expected = DATA.weapons.filter(
      (w) =>
        w.iconic &&
        ["Pistol", "Revolver"].includes(w.class) &&
        ["Power", "Tech"].includes(w.technology) &&
        ["Base Game", "Phantom Liberty"].includes(w.content),
    );
    assert.equal(await count(), expected.length);
    await checkCount();
    const before = await readState();
    await page.reload();
    assert.deepEqual(await readState(), before);
    assert.deepEqual((await readState()).class, ["Pistol", "Revolver"]);
    await page.locator('.chip[data-key="class"][data-value="Pistol"]').click();
    assert.deepEqual((await readState()).class, ["Revolver"]);
    assert.equal(
      await page.evaluate(() =>
        Arsenal.filtered().every((w) => w.class === "Revolver"),
      ),
      true,
    );
    await setFilter("missable", ["safe", "missable"]);
    assert.equal(
      await page.evaluate(() =>
        Arsenal.filtered().every((w) =>
          ["Safe", "Time window", "Choice-locked"].includes(
            w.acquisition.missRisk,
          ),
        ),
      ),
      true,
    );
    await page.locator("#reset").click();
    assert.equal(await count(), 115);
    assert.deepEqual((await readState()).class, []);
  });
  await test("Preference migration: previous single-choice filters become multi-selects without losing favorites", async () => {
    const result = await page.evaluate(
      (id) => ({
        old: Arsenal.sanitize({
          class: "Pistol",
          technology: "Power",
          favorites: [id],
          sort: "itemType",
        }),
        bad: Arsenal.sanitize({
          class: ["Pistol", "Pistol", "Not a class", null],
          missable: ["safe", "bad"],
        }),
      }),
      weapon("Her Majesty").id,
    );
    assert.deepEqual(result.old.class, ["Pistol"]);
    assert.deepEqual(result.old.technology, ["Power"]);
    assert.deepEqual(result.old.favorites, [weapon("Her Majesty").id]);
    assert.equal(result.old.sort, "itemType");
    assert.deepEqual(result.bad.class, ["Pistol"]);
    assert.deepEqual(result.bad.missable, ["safe"]);
  });
  await test("Slot data: source IDs distinguish muzzles, scopes and mod types; tier counts are retained", async () => {
    const w = (name) => DATA.weapons.find((x) => x.name === name);
    const liberty = w("Liberty");
    assert.equal(liberty.slots.find((g) => g.kind === "muzzle").count, 1);
    assert.equal(liberty.slots.find((g) => g.kind === "scope").count, 1);
    assert.deepEqual(
      liberty.slots.find((g) => g.kind === "normal-mod").countByTier,
      { 1: 0, 2: 1, 3: 2, 4: 2, 5: 2, "5+": 2, "5++": 2 },
    );
    assert.equal(
      w("Coronation").slots.find((g) => g.kind === "tech-mod").count,
      4,
    );
    assert.equal(w("Kappa").slots.find((g) => g.kind === "smart-mod").count, 2);
    assert.equal(
      w("Katana").slots.find((g) => g.kind === "melee-mod").count,
      2,
    );
    assert.equal(
      w("Knife").slots.find((g) => g.kind === "throwable-mod").count,
      2,
    );
    assert.ok(
      DATA.weapons.every((w) =>
        w.slots.every(
          (g) =>
            Array.isArray(g.sourceSlots) &&
            g.sourceSlots.length === g.count &&
            [
              "scope",
              "muzzle",
              "normal-mod",
              "tech-mod",
              "smart-mod",
              "melee-mod",
              "throwable-mod",
            ].includes(g.kind),
        ),
      ),
    );
  });
  await test("Slot visuals: one icon per slot, all views, tier updates, and unknown intermediate tiers", async () => {
    await page.locator("#filter-iconic").selectOption("all");
    await page.locator("#search").fill("Liberty");
    await page.locator("#tier").selectOption("5++");
    const liberty = DATA.weapons.find((w) => w.name === "Liberty"),
      card = page.locator(`.weapon-card[data-weapon="${liberty.id}"]`);
    assert.equal(await card.locator(".slot-token").count(), 4);
    assert.equal(await card.locator('[data-slot-kind="muzzle"]').count(), 1);
    assert.equal(await card.locator('[data-slot-kind="scope"]').count(), 1);
    assert.equal(
      await card.locator('[data-slot-kind="normal-mod"]').count(),
      2,
    );
    await page.locator("#tier").selectOption("1");
    assert.equal(await card.locator(".slot-token").count(), 2);
    await page.locator("#tier").selectOption("2");
    assert.equal(await card.locator(".slot-token").count(), 3);
    await page.locator("#tier").selectOption("2+");
    assert.equal(await card.locator(".slot-token").count(), 2);
    assert.match(await card.locator(".slot-unknown").textContent(), /unknown/);
    await page.locator("#tier").selectOption("5++");
    await card.locator(".details-small").click();
    assert.equal(await page.locator(".detail-slots .slot-token").count(), 4);
    await page.locator(".detail-close").click();
    await page.locator("#view-table").click();
    assert.equal(
      await page
        .locator(`tr[data-weapon="${liberty.id}"] .table-slots .slot-token`)
        .count(),
      4,
    );
    await page.locator("#view-cards").click();
    await page.locator("#reset").click();
    await page
      .getByRole("button", {
        name: "Add Coronation to comparison",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Add Her Majesty to comparison",
        exact: true,
      })
      .click();
    await page.locator('[data-nav="compare"]').first().click();
    assert.equal(
      await page.locator('.compare-table [data-slot-kind="tech-mod"]').count(),
      4,
    );
    assert.equal(
      await page.locator('.compare-table [data-slot-kind="scope"]').count(),
      1,
    );
    await page.locator('[data-action="clear-compare"]').click();
    await page.locator('[data-nav="arsenal"]').first().click();
  });
  await test("Item type sorting: table header, dropdown, ascending/descending and saved state", async () => {
    await page.locator("#view-table").click();
    await page.locator('button[data-sort="itemType"]').click();
    assert.equal(await page.locator("#sort").inputValue(), "itemType");
    assert.equal(
      await page
        .locator('th:has(button[data-sort="itemType"])')
        .getAttribute("aria-sort"),
      "ascending",
    );
    const check = async () =>
      assert.equal(
        await page.evaluate(() => {
          const rows = Arsenal.filtered(),
            s = Arsenal.getState();
          return rows.every(
            (w, i) =>
              !i ||
              (rows[i - 1].class.localeCompare(w.class, "en") ||
                rows[i - 1].technology.localeCompare(w.technology, "en")) *
                (s.direction === "asc" ? 1 : -1) <=
                0,
          );
        }),
        true,
      );
    await check();
    await page.locator('button[data-sort="itemType"]').click();
    assert.equal((await readState()).direction, "desc");
    await check();
    const before = await readState();
    await page.reload();
    assert.deepEqual(await readState(), before);
    await page.locator("#sort").selectOption("itemType");
    assert.equal((await readState()).direction, "asc");
    await check();
    await page.locator("#sort").selectOption("name");
    await page.locator("#view-cards").click();
  });
  await test("Sorting: all numerical fields both directions; missing values always last", async () => {
    for (const key of [
      "damage",
      "dps",
      "speed",
      "magazine",
      "reload",
      "range",
      "stamina",
      "returnTime",
    ]) {
      await page.locator("#sort").selectOption(key);
      for (let step = 0; step < 2; step++) {
        const sorted = await page.evaluate(() => {
          let s = Arsenal.getState();
          return {
            direction: s.direction,
            values: Arsenal.filtered().map(
              (w) => Arsenal.stats(w)[s.sort] ?? null,
            ),
          };
        });
        let missing = false,
          previous = null;
        for (const val of sorted.values) {
          if (val === null) {
            missing = true;
            continue;
          }
          assert.ok(!missing, `${key}: known after missing`);
          if (previous !== null)
            assert.ok(
              sorted.direction === "asc" ? val >= previous : val <= previous,
              `${key} ${sorted.direction}`,
            );
          previous = val;
        }
        await page.locator("#direction").click();
      }
    }
    assert.equal(
      await page.evaluate(() => Arsenal.compareNumbers(null, 0, "asc")),
      1,
    );
    assert.equal(
      await page.evaluate(() => Arsenal.compareNumbers(0, null, "desc")),
      -1,
    );
    await page.locator("#sort").selectOption("name");
  });
  await test("Tier changes: all 11 selections, exact published values, no hidden fallback", async () => {
    const id = weapon("Malorian Arms 3516").id;
    await page.locator("#search").fill("Malorian Arms 3516");
    await page.locator("#profile").selectOption("nd");
    for (const tier of DATA.meta.tiers) {
      await page.locator("#tier").selectOption(tier);
      const damage = await page.evaluate(
        (id) =>
          Arsenal.stats(Arsenal.data.weapons.find((w) => w.id === id)).damage,
        id,
      );
      assert.equal(
        damage,
        weapon("Malorian Arms 3516").profiles.nd.tiers[tier].damage,
      );
    }
    await page.locator("#profile").selectOption("records");
    await page.locator("#tier").selectOption("1+");
    assert.match(await page.locator("#catalog").textContent(), /Unknown/);
    await page.locator("#tier").selectOption("5++");
    await page.locator("#reset").click();
  });
  await test("Details: all 115 abilities, appropriate fields, acquisition and provenance render", async () => {
    for (const w of DATA.weapons.filter((w) => w.iconic)) {
      await page.locator(`[data-weapon="${w.id}"] .details-small`).click();
      assert.equal(await page.locator("#detail-title").textContent(), w.name);
      assert.ok(
        (await page.locator(".detail-ability p").textContent()).length > 30,
      );
      assert.ok((await page.locator(".detail-sources a").count()) > 0);
      assert.equal(await page.locator(".detail-columns").count(), 1);
      await page.locator(".detail-close").click();
    }
    await page
      .getByRole("button", { name: "Details for Nehan", exact: true })
      .click();
    assert.match(
      await page.locator(".detail-stats").textContent(),
      /Throw return time/,
    );
    assert.doesNotMatch(
      await page.locator(".detail-stats").textContent(),
      /Magazine/,
    );
    await page.locator("#detail-tier").selectOption("1+");
    assert.match(
      await page.locator(".notice").textContent(),
      /No Tier 1\+ data/,
    );
    await page.locator("#detail-tier").selectOption("5++");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#details").evaluate((d) => d.open), false);
  });
  await test("Cards/table view, favorites, preference persistence and keyboard search", async () => {
    await page
      .getByRole("button", { name: "Favorite Her Majesty", exact: true })
      .click();
    await page.locator("#view-table").click();
    assert.equal(await page.locator(".catalog-table tbody tr").count(), 115);
    assert.equal(await page.locator(".table-art img").count(), 115);
    await page.locator("#tier").selectOption("5+");
    await setFilter("content", "Phantom Liberty");
    await page.locator("#search").fill("Her Majesty");
    const before = await readState();
    await page.reload();
    assert.deepEqual(await readState(), before);
    assert.equal(await page.locator(".catalog-table tbody tr").count(), 1);
    await page.locator('[data-nav="favorites"]').first().click();
    assert.equal(await page.locator(".catalog-table tbody tr").count(), 1);
    await page.locator("#reset").click();
    await page.locator("#view-cards").click();
    await page.locator('[data-nav="arsenal"]').first().click();
    await page.locator("#tier").selectOption("5++");
    await page.locator("#search").blur();
    await page.keyboard.press("/");
    assert.equal(
      await page
        .locator("#search")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await page.locator("#search").blur();
  });
  await test("Comparison selection: 2–4 columns, adding, replacing, removing and four-item limit", async () => {
    await page.locator('[data-nav="compare"]').first().click();
    await choose("Malorian Arms 3516");
    await choose("Her Majesty");
    assert.equal(await page.locator(".weapon-col").count(), 2);
    await choose("Pride");
    await choose("Kongou");
    assert.equal(await page.locator(".weapon-col").count(), 4);
    assert.equal(await page.locator(".weapon-col img.weapon-image").count(), 4);
    assert.equal(await page.locator("#add-comparison").isDisabled(), true);
    await page.locator('[data-replace="3"]').click();
    await page.locator("#picker-query").fill("Amnesty");
    await page
      .locator(`#picker-results [data-id="${weapon("Amnesty").id}"]`)
      .click();
    assert.equal((await readState()).compare[3], weapon("Amnesty").id);
    await page.locator('[data-nav="arsenal"]').first().click();
    await page
      .getByRole("button", { name: "Add Satori to comparison", exact: true })
      .click();
    assert.equal((await readState()).compare.length, 4);
    assert.match(await page.locator("#toast").textContent(), /Four weapons/);
    await page.locator('[data-nav="compare"]').first().click();
    await page.locator(".col-remove").last().click();
    assert.equal(await page.locator(".weapon-col").count(), 3);
  });
  await test("Comparison math: higher damage, lower reload, ties, zero and missing values", async () => {
    await page.locator('[data-action="clear-compare"]').click();
    await choose("Malorian Arms 3516");
    await choose("Her Majesty");
    const result = await page.evaluate(() => {
      const a = Arsenal;
      const w = (n) => a.data.weapons.find((w) => w.name === n && w.iconic);
      const picks = [w("Malorian Arms 3516"), w("Her Majesty")];
      const s = { ...a.getState(), profile: "records", tier: "5++" };
      const damage = a.rankRow(picks, "damage", s),
        reload = a.rankRow(picks, "reload", s),
        tie = a.rankRow([picks[0], picks[0]], "magazine", s),
        missing = a.rankRow([w("Coronation"), picks[0]], "damage", {
          ...s,
          profile: "nd",
        });
      return {
        damage,
        reload,
        tie,
        missing,
        diff: a.difference(120, 100, "damage"),
        zero: a.difference(5, 0, "damage"),
      };
    });
    assert.equal(
      result.damage.best,
      weapon("Malorian Arms 3516").profiles.records.tiers["5++"].damage,
    );
    assert.equal(result.reload.best, 0.75);
    assert.equal(result.tie.best, 10);
    assert.equal(result.missing.canRank, false);
    assert.match(result.diff, /\+20/);
    assert.doesNotMatch(result.zero, /Infinity|%/);
    const mal = weapon("Malorian Arms 3516").id,
      her = weapon("Her Majesty").id;
    assert.equal(
      await page
        .locator(`td[data-stat="damage"][data-weapon="${mal}"]`)
        .evaluate((e) => e.classList.contains("best")),
      true,
    );
    assert.equal(
      await page
        .locator(`td[data-stat="reload"][data-weapon="${her}"]`)
        .evaluate((e) => e.classList.contains("best")),
      true,
    );
  });
  await test("Comparison: mixed families disable rankings and differences; projectile mismatch", async () => {
    await page.locator('[data-action="clear-compare"]').click();
    await choose("Satori");
    await choose("Her Majesty");
    assert.equal(await page.locator("td.best").count(), 0);
    assert.equal(await page.locator(".delta").count(), 0);
    assert.match(
      await page.locator(".notice").first().textContent(),
      /Different weapon families/,
    );
    await page.locator('[data-action="clear-compare"]').click();
    await choose("Guts");
    await choose("The Headsman");
    assert.equal(await page.locator('td[data-stat="damage"].best').count(), 0);
    await page.locator("#toast").waitFor({ state: "hidden" });
    await page.screenshot({
      path: path.join(validation, "comparison-desktop.png"),
      fullPage: false,
    });
  });
  await test("Comparison: absent source stays Unknown, common source/tier, selections persist", async () => {
    await page.locator('[data-action="clear-compare"]').click();
    await choose("Coronation");
    await choose("Malorian Arms 3516");
    await page.locator("#profile").selectOption("nd");
    assert.match(
      await page.locator(".notice").last().textContent(),
      /no 5\+\+ data/,
    );
    assert.equal(
      await page
        .locator(
          `td[data-stat="damage"][data-weapon="${weapon("Coronation").id}"] .comparison-value>span`,
        )
        .first()
        .textContent(),
      "Unknown",
    );
    const before = await readState();
    await page.reload();
    assert.deepEqual(await readState(), before);
    assert.equal(await page.locator(".weapon-col").count(), 2);
    await page.locator("#profile").selectOption("records");
  });
  await test("Data ledger and export/import: complete bundled dataset and preferences", async () => {
    await page.locator('[data-nav="data"]').first().click();
    assert.match(
      await page.locator("#data-panel").textContent(),
      /115 iconics/,
    );
    assert.match(await page.locator("#data-panel").textContent(), /Unknown/);
    const notes = await page.locator("#data-panel").textContent();
    assert.ok(notes.includes(`Dataset ${DATA.meta.datasetVersion}`));
    assert.ok(notes.includes(`Update ${DATA.meta.targetPatch}`));
    assert.ok(notes.includes("Individual source links and verification notes are included"));
    assert.doesNotMatch(notes, /documentation.*accompany|validation report/i);
    assert.ok(notes.includes("All 113 weapons in Vaexil’s 2.31 inventory"));
    assert.ok(notes.includes("104-iconic total could not be reconciled"));
    let pending = page.waitForEvent("download");
    await page.locator("#export-dataset").click();
    let download = await pending;
    const datasetPath = path.join(validation, "export-check.json");
    await download.saveAs(datasetPath);
    assert.equal(
      JSON.parse(fs.readFileSync(datasetPath, "utf8")).weapons.length,
      190,
    );
    fs.unlinkSync(datasetPath);
    pending = page.waitForEvent("download");
    await page.locator("#export-preferences").click();
    download = await pending;
    const preferencesPath = path.join(validation, "preferences-check.json");
    await download.saveAs(preferencesPath);
    const backup = JSON.parse(fs.readFileSync(preferencesPath, "utf8"));
    assert.equal(backup.application, "night-city-arsenal");
    await page.locator("#preference-file").setInputFiles(preferencesPath);
    await page.waitForFunction(
      () =>
        document.getElementById("toast").textContent ===
        "Preferences imported.",
    );
    fs.unlinkSync(preferencesPath);
  });
  await test("Current data labels follow metadata while historical provenance stays fixed", async () => {
    const isolated = await browser.newContext({ offline: true, timezoneId: "America/Los_Angeles" });
    const p = await isolated.newPage();
    try {
      await p.goto(pathToFileURL(path.join(ROOT, "dist/Night-City-Arsenal.html")).href);
      await p.evaluate(() => {
        Object.assign(Arsenal.data.meta, {
          targetPatch: "9.9", researchedOn: "2030-01-02", patchRelease: "2030-01-01",
          iconicCount: 116, totalCount: 192, weaponImageCount: 192,
        });
        Arsenal.navigate("data");
      });
      const notes = await p.locator("#data-panel").textContent();
      for (const text of ["Researched on January 2, 2030", "Update 9.9", "116 iconics, reconciled",
        "76 optional non-iconics", "confirms 9.9 on January 1, 2030", "/ 116 iconics",
        "View all 116 canonical iconic names", "All 192 weapons display",
        "All 113 weapons in Vaexil’s 2.31 inventory", "104-iconic total could not be reconciled"])
        assert.ok(notes.includes(text), text);
      assert.equal(await p.locator("#all-total").textContent(), "192");
      await p.evaluate(() => Arsenal.navigate("arsenal"));
      await p.locator("#filter-new").check();
      assert.equal(await p.locator(".weapon-card").count(), 0);
      assert.ok((await p.locator("#active-filters").textContent()).includes("Added in 9.9"));
    } finally {
      await isolated.close();
    }
  });
  await test("Responsive layouts: desktop, tablet and phone, with readable complete effects", async () => {
    await page.locator('[data-nav="arsenal"]').first().click();
    await page.locator("#reset").click();
    await page.locator("#view-cards").click();
    await page.locator("#toast").waitFor({ state: "hidden" });
    for (const [width, height, name] of [
      [1440, 1000, "arsenal-desktop"],
      [768, 1024, "arsenal-tablet"],
      [390, 844, "arsenal-phone"],
    ]) {
      await page.setViewportSize({ width, height });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        name,
      );
      if (width < 800)
        await page.locator("#catalog-heading").scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(validation, name + ".png"),
        fullPage: false,
      });
    }
    await page.locator("#mobile-filters").click();
    assert.equal(await page.locator("#filter-class").isVisible(), true);
    await page.locator("#mobile-filters").click();
    assert.equal(await page.locator("#filter-class").isVisible(), false);
    await page
      .getByRole("button", { name: "Details for Satori", exact: true })
      .click();
    assert.match(await page.locator(".detail-ability").textContent(), /Nehan/);
    assert.equal(
      await page
        .locator("#details")
        .evaluate((e) => e.scrollWidth > e.clientWidth),
      false,
    );
    await page.screenshot({ path: path.join(validation, "detail-phone.png") });
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await test("Blocked or corrupt local storage: app remains usable", async () => {
    const c = await browser.newContext({ offline: true });
    await c.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    const p = await c.newPage();
    let errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(pathToFileURL(path.join(ROOT, "dist/Night-City-Arsenal.html")).href);
    assert.equal(await p.locator(".weapon-card").count(), 115);
    assert.equal(errors.length, 0);
    await c.close();
    await page.evaluate(() =>
      localStorage.setItem("night-city-arsenal.v1", "{invalid json"),
    );
    await page.reload();
    assert.equal(await count(), 115);
  });
  await test("Final production page: zero console errors and zero network/asset dependencies", async () => {
    assert.deepEqual(consoleErrors, []);
    assert.ok(
      requests.every((u) => u.startsWith("file:") || u.startsWith("blob:")),
      requests.filter((u) => !u.startsWith("file:")),
    );
    assert.equal(
      await page
        .locator('script[src],link[rel="stylesheet"],img[src^="http"]')
        .count(),
      0,
    );
  });
  await browser.close();
  const report = {
    date: new Date().toISOString().slice(0, 10),
    method:
      "Production file:// opened in isolated headless Microsoft Edge; network offline",
    browser: "Microsoft Edge (Playwright)",
    iconicCount: 115,
    totalWeapons: 190,
    passed: results.filter((x) => x.status === "passed").length,
    failed: results.filter((x) => x.status === "failed").length,
    results,
  };
  fs.writeFileSync(
    path.join(validation, "test-results.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(`RESULT: ${report.passed} passed, ${report.failed} failed`);
  if (report.failed) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  if (browser) await browser.close();
  process.exitCode = 1;
});
