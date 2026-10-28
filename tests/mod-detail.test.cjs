/* Source-preserving modification inspection QA; isolated offline production file. */
const { launchBrowser, newContext } = require("./browser.cjs");
const { root, artifactDir, writeReport } = require("./support.cjs");
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  crypto = require("crypto"),
  { pathToFileURL } = require("url");
const out = artifactDir("mod-detail"),
  html = path.join(root, "dist/Night-City-Arsenal.html");
const data = JSON.parse(
    fs.readFileSync(path.join(root, "src/data/modifications.json")),
  ),
  results = [],
  errors = [],
  requests = [];
let browser;
async function fixture() {
  const c = await newContext(browser, {
      viewport: { width: 1920, height: 1080 },
      reducedMotion: "reduce",
    }),
    p = await c.newPage();
  p.setDefaultTimeout(7000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("request", (r) => requests.push(r.url()));
  await p.goto(pathToFileURL(html).href);
  await p.locator("[data-nav=mods]").click();
  return { c, p };
}
async function open(p, name) {
  if (await p.locator("#equipment-dialog").evaluate((n) => n.open))
    await p.locator("[data-plan-action=close-equipment]").click();
  await p.locator("#mods-search").fill(name);
  await p.getByRole("button", { name, exact: true }).click();
}
const rows = (p) =>
  p
    .locator(".mod-primary-effects .effect-stat-rows>div")
    .evaluateAll((ns) =>
      ns.map((n) => [
        n.querySelector("dt").textContent,
        n.querySelector("dd").textContent,
      ]),
    );
const shot = (p, name) =>
  p.screenshot({
    path: path.join(out, name + ".png"),
    animations: "disabled",
    style: ".toast{visibility:hidden!important}",
  });
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
  await test("Add-Vantage has separate exact source rows, compact inline tier control and immediately updated values", async () => {
    const { c, p } = await fixture();
    await open(p, "Add-Vantage");
    assert.deepEqual(await rows(p), [
      ["Scope Fov", "+26"],
      ["Zoom Level", "+0.35"],
      ["Effective Range", "+13%"],
    ]);
    assert.equal(
      await p.locator(".mod-primary-effects .effect-prose").count(),
      0,
    );
    const heading = await p.locator(".mod-effects-heading h3").boundingBox(),
      selector = await p.locator("#mod-detail-tier").boundingBox();
    assert.ok(selector.width < 100);
    assert.ok(Math.abs(heading.y - selector.y) < 15);
    for (const t of ["1", "2", "3", "4"]) {
      await p.locator("#mod-detail-tier").selectOption(t);
      assert.deepEqual(
        await rows(p),
        data.modifications
          .find((m) => m.name === "Add-Vantage")
          .tierEffects[t].fields.map((f) => [f.label, f.value]),
      );
      assert.equal(
        await p
          .locator("#mod-detail-tier")
          .evaluate((n) => n === document.activeElement),
        true,
      );
    }
    assert.deepEqual(
      await p.locator("#mod-detail-tier option").allTextContents(),
      ["1", "2", "3", "4"],
    );
    await shot(p, "add-vantage-1920");
    await c.close();
  });
  await test("Every one of 257 tiers retains source values/conventions or its complete conditional prose, without mutating data", async () => {
    const { c, p } = await fixture();
    const observed = await p.evaluate(() => {
      const initial = JSON.stringify(Arsenal.data.weapons),
        catalog = JSON.stringify(NCAExpansion.data.modifications),
        output = [];
      for (const m of NCAExpansion.data.modifications) {
        const search = document.getElementById("mods-search");
        search.value = m.name;
        search.dispatchEvent(new Event("input", { bubbles: true }));
        document
          .querySelector(`[data-open-mod="${m.id}"] .equipment-name`)
          .click();
        for (const tier of m.tiers) {
          const select = document.getElementById("mod-detail-tier");
          select.value = tier;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          output.push({
            id: m.id,
            tier,
            rows: [
              ...document.querySelectorAll(
                ".mod-primary-effects .effect-stat-rows>div",
              ),
            ].map((n) => [
              n.querySelector("dt").textContent,
              n.querySelector("dd").textContent,
            ]),
            prose:
              document.querySelector(".mod-primary-effects .effect-prose")
                ?.textContent || "",
            note:
              document.querySelector(".mod-primary-effects .effect-note")
                ?.textContent || "",
          });
        }
        document.querySelector("[data-plan-action=close-equipment]").click();
      }
      return {
        output,
        unchanged:
          JSON.stringify(Arsenal.data.weapons) === initial &&
          JSON.stringify(NCAExpansion.data.modifications) === catalog,
      };
    });
    assert.equal(observed.output.length, 257);
    assert.ok(observed.unchanged);
    for (const x of observed.output) {
      const m = data.modifications.find((m) => m.id === x.id),
        e = m.tierEffects[x.tier];
      if (m.slotKind !== "mod")
        assert.deepEqual(
          x.rows,
          e.fields.map((f) => [f.label, f.value]),
          x.id + " " + x.tier,
        );
      else if (m.id === "mod.big-mag") {
        assert.equal(
          x.rows[0][1],
          e.fields.find((f) => f.label === "Ammo Capacity").value,
        );
        assert.deepEqual(x.rows[1], ["Reload speed", "-20%"]);
        assert.ok(e.summary.includes("-20% reload speed"));
      } else if (m.id === "mod.zero-g") {
        assert.deepEqual(
          x.rows,
          e.fields.map((f) => [f.label, f.value]),
        );
        assert.equal(x.prose, "Gravity has no effect on trajectory.");
      } else if (
        [
          "mod.swiss-cheese",
          "mod.supercharger",
          "mod.condenser",
          "mod.headhopper",
          "mod.gambiteer",
        ].includes(m.id)
      ) {
        const display = data.meta.display;
        assert.deepEqual(
          x.rows,
          display.primaryModFields[m.id].descriptionRows[x.tier].map((f) => [
            f.label,
            f.value,
          ]),
        );
        for (const [label, value] of x.rows)
          assert.ok(e.summary.includes(value), label + " " + value);
      } else {
        assert.deepEqual(x.rows, []);
        assert.equal(x.prose, e.summary, x.id + " " + x.tier);
      }
    }
    await c.close();
  });
  await test("Big Mag separates documented reload speed from raw Reload Time; source conflicts and conditional notes remain prominent", async () => {
    const { c, p } = await fixture();
    await open(p, "Big Mag");
    assert.deepEqual(await rows(p), [
      ["Ammo Capacity", "+55%"],
      ["Reload speed", "-20%"],
    ]);
    assert.equal(
      await p.locator(".mod-raw-fields").evaluate((n) => n.open),
      false,
    );
    await p.locator(".mod-raw-fields summary").click();
    assert.match(
      await p.locator(".mod-raw-fields").textContent(),
      /Reload Time.*-20%/s,
    );
    assert.match(
      await p.locator(".mod-raw-fields").textContent(),
      /not treating|interchangeable/,
    );
    await p.locator("#mod-detail-tier").selectOption("1");
    assert.deepEqual(await rows(p), [
      ["Ammo Capacity", "+15%"],
      ["Reload speed", "-20%"],
    ]);
    await open(p, "Gaki");
    assert.deepEqual((await rows(p)).at(-1), ["Charge Min Value Bonus", "+25"]);
    assert.match(
      await p.locator(".mod-primary-effects .effect-note").textContent(),
      /50%.*not a conversion/s,
    );
    await open(p, "E305 Prospecta");
    assert.deepEqual(await rows(p), [
      ["Additional zoom", "+3.25"],
      ["Weapon sway", "-35%"],
      ["Full-charge requirement", "-25%"],
    ]);
    assert.match(
      await p.locator(".mod-primary-effects .effect-note").textContent(),
      /absent/,
    );
    await open(p, "XC-10 Cetus");
    assert.match(
      await p.locator(".mod-primary-effects .effect-note").textContent(),
      /While undetected.*guaranteed critical hits/,
    );
    await c.close();
  });
  await test("Compatibility classes/technologies are inert wrapping tags with their own slot icon, distinct from individual fit validation", async () => {
    const { c, p } = await fixture();
    await open(p, "Add-Vantage");
    assert.deepEqual(
      await p
        .locator('[aria-label="Supported weapon classes"] li')
        .allTextContents(),
      data.modifications.find((m) => m.name === "Add-Vantage").classes,
    );
    assert.deepEqual(
      await p
        .locator('[aria-label="Supported technologies"] li')
        .allTextContents(),
      ["Power", "Tech"],
    );
    assert.equal(
      await p
        .locator(
          ".compatibility-tags button,.compatibility-tags [role=button],.compatibility-tags [tabindex]",
        )
        .count(),
      0,
    );
    assert.equal(await p.locator(".required-slot svg").count(), 1);
    assert.match(await p.locator(".required-slot").textContent(), /Scope slot/);
    assert.match(
      await p.locator(".mod-category-caveat").textContent(),
      /Individual weapon, slot and tier checks/,
    );
    await p.locator("#compatible-search").fill("Lexington x-MOD2");
    assert.ok(
      await p.locator("[data-plan-action=plan-compatible]").isDisabled(),
    );
    assert.match(await p.locator(".compatible-status").textContent(), /fixed/);
    await c.close();
  });
  await test("Rules/raw/verification start collapsed; permanence, Chimera/core, pre-installed and unverified restrictions stay visible", async () => {
    const { c, p } = await fixture();
    await open(p, "Big Mag");
    for (const selector of [
      ".mod-installation-rules",
      ".mod-raw-fields",
      ".mod-verification",
    ])
      assert.equal(await p.locator(selector).evaluate((n) => n.open), false);
    assert.ok(
      await p
        .getByText(
          "Normally permanent once installed in game. x-MOD2 replacement is an exception.",
          { exact: true },
        )
        .isVisible(),
    );
    await p.locator(".mod-installation-rules summary").focus();
    await p.keyboard.press("Space");
    assert.equal(
      await p.locator(".mod-installation-rules").evaluate((n) => n.open),
      true,
    );
    assert.match(
      await p.locator(".mod-installation-rules").textContent(),
      /Equipment quality cannot exceed/,
    );
    await p.locator(".mod-verification summary").click();
    assert.ok((await p.locator(".mod-verification a").count()) >= 3);
    await open(p, "Firecracker");
    assert.ok(await p.locator(".mod-important-restrictions").isVisible());
    assert.match(
      await p.locator(".mod-important-restrictions").textContent(),
      /single Active Chimera Core/,
    );
    await open(p, "Disjunctor");
    assert.deepEqual(
      await p.locator("#mod-detail-tier option").allTextContents(),
      ["5"],
    );
    assert.match(
      await p.locator(".mod-important-restrictions").textContent(),
      /unverified/,
    );
    await open(p, "E305 Prospecta");
    assert.match(
      await p.locator(".mod-important-restrictions").textContent(),
      /Pre-installed/,
    );
    await open(p, "Add-Vantage");
    assert.match(
      await p.locator(".mod-important-restrictions").textContent(),
      /fixed or unverified/,
    );
    await c.close();
  });
  await test("Catalog previews label their reference tier, use compact effects, and preserve imagery, card clicks and filters", async () => {
    const { c, p } = await fixture();
    assert.equal(await p.locator("#mods-results img").count(), 72);
    assert.equal(
      await p.locator("#mods-results .equipment-reference").count(),
      72,
    );
    assert.equal(
      await p
        .locator("#mods-results .equipment-reference")
        .evaluateAll((ns) =>
          ns.every(
            (n) =>
              /Reference Tier [1-5]/.test(n.textContent) &&
              !n.textContent.includes("/"),
          ),
        ),
      true,
    );
    await p.locator("#mods-search").fill("Add-Vantage");
    assert.equal(
      await p.locator("#mods-results .effect-stat-rows>div").count(),
      3,
    );
    assert.ok(
      !(
        await p.locator("#mods-results .equipment-effect").textContent()
      ).includes(";"),
    );
    await p.locator("[data-mod-filter=tier]").selectOption("1");
    assert.match(
      await p.locator(".equipment-reference").textContent(),
      /Reference Tier 1/,
    );
    await p.locator("#mods-results .equipment-effect").click();
    assert.equal(await p.locator("#mod-detail-tier").inputValue(), "1");
    await p.locator("[data-plan-action=close-equipment]").click();
    await p.locator("[data-plan-action=mods-reset]").click();
    await p.locator("#mods-search").fill("recoil");
    assert.ok((await p.locator(".equipment-card").count()) > 1);
    await shot(p, "catalog-1920");
    await c.close();
  });
  await test("Desktop and narrow layouts preserve semantic hierarchy, readable values, clean tag wrapping and one bounded modal scroller", async () => {
    const { c, p } = await fixture();
    for (const width of [1920, 2560, 768, 390]) {
      await p.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
      await open(p, "Add-Vantage");
      const sequence = await p
        .locator(".exp-dialog-body")
        .evaluate((n) =>
          [
            ...n.querySelectorAll(
              ".mod-primary-effects,.mod-compatibility,.mod-acquisition,.mod-important-restrictions,.mod-compatible-browser,.mod-installation-rules,.mod-raw-fields,.mod-verification",
            ),
          ].map((n) => n.classList[0]),
        );
      assert.deepEqual(sequence, [
        "detail-ability",
        "mod-compatibility",
        "mod-acquisition",
        "mod-important-restrictions",
        "mod-compatible-browser",
        "mod-installation-rules",
        "mod-raw-fields",
        "mod-verification",
      ]);
      assert.ok(
        await p
          .locator(".exp-dialog-body")
          .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      );
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.ok(
        await p
          .locator(".mod-primary-effects .effect-stat-rows dd")
          .first()
          .evaluate((n) => getComputedStyle(n).color === "rgb(101, 228, 233)"),
      );
      await shot(p, "numeric-" + width);
      await p.locator(".mod-compatible-browser").scrollIntoViewIfNeeded();
      await shot(p, "weapon-browser-" + width);
      await open(p, "Airstrike");
      assert.match(
        await p.locator(".mod-primary-effects .effect-prose").textContent(),
        /midair.*Leap Attacks.*Superhero Landings/s,
      );
      assert.ok(
        await p
          .locator(".exp-dialog-body")
          .evaluate((n) => n.scrollWidth <= n.clientWidth + 1),
      );
      await shot(p, "conditional-" + width);
    }
    await c.close();
  });
  await test("Offline operation has no page errors or external asset requests", async () => {
    assert.deepEqual(errors, []);
    assert.ok(
      requests.every((u) => u.startsWith("file:") || u.startsWith("blob:")),
    );
  });
  await browser.close();
  browser = null;
  const report = {
    method:
      "Offline production file; isolated GPU/compositing-disabled headless Edge; exact source/tier comparisons, desktop and narrow screenshots",
    productionSHA256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(html))
      .digest("hex"),
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
  writeReport("mod-detail/results.json", report);
  if (report.failed) process.exitCode = 1;
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exitCode = 1;
});
