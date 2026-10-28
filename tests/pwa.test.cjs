/* Real generated PWA, isolated persistent headless Edge, loopback-only HTTP. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  crypto = require("node:crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const ROOT = path.resolve(__dirname, ".."),
  DIST = path.join(ROOT, "dist/pwa"),
  REPORT = path.join(ROOT, ".tmp/tests/pwa-test.json");
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const original = fs.readFileSync(path.join(DIST, "index.html")),
  worker = fs.readFileSync(path.join(DIST, "sw.js"), "utf8");
const originalVersion = worker.match(/const VERSION = "([^"]+)"/)[1];
fs.mkdirSync(path.join(ROOT, ".tmp/tests"), { recursive: true });
const profile = fs.mkdtempSync(path.join(ROOT, ".tmp/tests/pwa-profile-"));
function cleanupProfile() {
  if (path.dirname(profile) !== path.join(ROOT, ".tmp/tests") || !path.basename(profile).startsWith("pwa-profile-")) {
    throw new Error("Unexpected test profile cleanup path");
  }
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
const checks = [],
  errors = [],
  consoleErrors = [];
let context,
  server,
  port,
  revision = 1,
  broken = false,
  missingIcon = true;
const executablePath = process.env.BROWSER_EXECUTABLE;
const args = ["--disable-gpu", "--disable-gpu-compositing"];
const url = () => `http://localhost:${port}/arsenal/`;
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS", name);
}
function payload(file) {
  if (file === "index.html")
    return revision === 1
      ? original
      : Buffer.from(
          original
            .toString()
            .replace("<head>", "<head><!-- update fixture 2 -->"),
        );
  if (file === "sw.js")
    return Buffer.from(
      revision === 1
        ? worker
        : worker
            .replace(originalVersion, "test-version-2")
            .replace(hash(original), hash(payload("index.html"))),
    );
  return fs.readFileSync(path.join(DIST, file));
}
async function listen() {
  server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    let file = pathname.startsWith("/arsenal/")
      ? pathname.slice("/arsenal/".length)
      : pathname.slice(1);
    if (!file) file = "index.html";
    if (
      !/^(index\.html|sw\.js|manifest\.webmanifest|icons\/nc(?:-maskable)?-(?:16|32|48|192|512)\.png|icons\/nc\.svg)$/.test(
        file,
      )
    ) {
      res.writeHead(404);
      res.end();
      return;
    }
    if (
      (missingIcon && file === "icons/nc-48.png") ||
      (broken === "missing" && file === "index.html")
    ) {
      res.writeHead(503);
      res.end("intentional unavailable fixture");
      return;
    }
    res.writeHead(200, {
      "Content-Type": file.endsWith(".html")
        ? "text/html; charset=utf-8"
        : file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".webmanifest")
            ? "application/manifest+json"
            : file.endsWith(".svg")
              ? "image/svg+xml"
              : "image/png",
      "Cache-Control": "no-cache",
    });
    res.end(
      broken === "mismatch" && file === "index.html"
        ? Buffer.from("Incorrect deployment HTML")
        : payload(file),
    );
  });
  await new Promise((resolve) =>
    server.listen(port || 0, "127.0.0.1", resolve),
  );
  port = server.address().port;
}
async function launch() {
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath,
    args,
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  context.on("page", watch);
  const p = context.pages()[0] || (await context.newPage());
  watch(p);
  return p;
}
function watch(p) {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      /Content Security Policy|Refused to/.test(m.text())
    )
      consoleErrors.push(m.text());
  });
}
async function ready(p) {
  await p
    .locator("#pwa-status")
    .filter({ hasText: "Offline ready" })
    .waitFor({ timeout: 30000 });
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
}
async function navigate(p, view) {
  await p.locator(`.masthead [data-nav="${view}"]`).click();
  assert.equal(await p.evaluate(() => Arsenal.getView()), view);
}
async function images(p) {
  return p.evaluate(async () => {
    const items = [...Arsenal.data.weapons, ...NCAExpansion.data.modifications];
    await Promise.all(
      items.map(async (item) => {
        const image = new Image();
        image.src = item.image.src;
        await image.decode();
        if (!image.naturalWidth) throw Error(item.name);
      }),
    );
    return items.length;
  });
}
async function storage(p) {
  return p.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith("night-city-arsenal."))
        .map((k) => [k, localStorage.getItem(k)]),
    ),
  );
}
async function workerStatus(p) {
  return p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return new Promise((resolve) => {
      const c = new MessageChannel();
      c.port1.onmessage = (e) => resolve(e.data);
      r.active.postMessage({ type: "OFFLINE_STATUS" }, [c.port2]);
    });
  });
}
async function exportImport(p) {
  await navigate(p, "builds");
  let download = p.waitForEvent("download");
  await p.locator("[data-plan-action=export-builds]").click();
  const saved = await download;
  const content = JSON.parse(fs.readFileSync(await saved.path(), "utf8"));
  assert.ok(JSON.stringify(content).includes("Offline PWA plan"));
  const before = await storage(p);
  await p.locator("#builds-import-file").setInputFiles({
    name: "builds.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(content)),
  });
  if (await p.locator("#plan-confirm").evaluate((n) => n.open))
    await p.locator("#plan-confirm-accept").click();
  await p.waitForFunction(() => NCAExpansion.getBuilds().length === 2);
  await p.locator("[data-plan-action=close-equipment]").click();
  assert.equal(
    (await p.evaluate(() => NCAExpansion.getBuilds()))[0].notes,
    "Offline notes stay personal.",
  );
  await navigate(p, "data");
  download = p.waitForEvent("download");
  await p.locator("#export-preferences").click();
  const prefs = await download;
  const prefsBytes = fs.readFileSync(await prefs.path());
  await p.locator("#preference-file").setInputFiles({
    name: "preferences.json",
    mimeType: "application/json",
    buffer: prefsBytes,
  });
  assert.equal(
    (await storage(p))["night-city-arsenal.v1"],
    before["night-city-arsenal.v1"],
  );
}
(async () => {
  fs.mkdirSync(path.dirname(profile), { recursive: true });
  const manifest = JSON.parse(
    fs.readFileSync(path.join(DIST, "manifest.webmanifest"), "utf8"),
  );
  await check(
    "Manifest: stable relative ID, Arsenal start, scope, standalone display, colors and icon purposes",
    async () => {
      assert.equal(manifest.name, "Night City Arsenal");
      assert.equal(manifest.short_name, manifest.name);
      assert.ok(manifest.description);
      assert.equal(manifest.id, "./");
      assert.equal(manifest.start_url, "./index.html#arsenal");
      assert.equal(manifest.scope, "./");
      assert.equal(manifest.display, "standalone");
      assert.equal(manifest.background_color, "#090708");
      assert.equal(manifest.theme_color, "#251019");
      assert.deepEqual(
        manifest.icons.map((i) => [i.sizes, i.purpose]),
        [
          ["192x192", "any"],
          ["512x512", "any"],
          ["192x192", "maskable"],
          ["512x512", "maskable"],
        ],
      );
    },
  );
  await check(
    "Exact original NC vector and seven correctly sized raster icons; no desktop framework or external runtime",
    async () => {
      const template = fs.readFileSync(
          path.join(ROOT, "src/template.html"),
          "utf8",
        ),
        svg = fs.readFileSync(path.join(DIST, "icons/nc.svg"), "utf8");
      const paths = (markup) => [...markup.matchAll(/<path\b[^>]*>/g)].map(([tag]) => ({
        d: tag.match(/\bd="([^"]+)"/)[1],
        fill: tag.match(/\bfill="([^"]+)"/)[1],
      }));
      assert.deepEqual(paths(svg), paths(template.match(/<svg\b[^>]*class="brand-mark"[\s\S]*?<\/svg\s*>/)[0]));
      for (const [n, mask] of [
        [16, false],
        [32, false],
        [48, false],
        [192, false],
        [512, false],
        [192, true],
        [512, true],
      ]) {
        const b = fs.readFileSync(
          path.join(DIST, `icons/nc-${mask ? "maskable-" : ""}${n}.png`),
        );
        assert.equal(b.subarray(1, 4).toString(), "PNG");
        assert.equal(b.readUInt32BE(16), n);
        assert.equal(b.readUInt32BE(20), n);
      }
      assert.ok(!original.includes(Buffer.from("C:\\Users\\")));
      assert.ok(!original.includes(Buffer.from("/*__DATA__*/")));
    },
  );
  await listen();
  let p = await launch();
  await check(
    "Headless Edge accepts manifest with no installability errors; nested base path registers and fully precaches despite optional missing favicon",
    async () => {
      await p.goto(url());
      await ready(p);
      assert.equal(await p.locator(".weapon-card").count(), 115);
      assert.equal(await p.locator("#pwa-restart").isHidden(), true);
      const cdp = await context.newCDPSession(p);
      const app = await cdp.send("Page.getAppManifest");
      assert.deepEqual(app.errors, []);
      assert.equal(JSON.parse(app.data).name, manifest.name);
      const install = await cdp.send("Page.getInstallabilityErrors");
      assert.deepEqual(install.installabilityErrors, []);
      assert.equal((await workerStatus(p)).ready, true);
      const cached = await p.evaluate(async () => {
        const keys = await caches.keys();
        const own = keys.find((k) => k.startsWith("night-city-arsenal:"));
        const entries = await (await caches.open(own)).keys();
        return entries.map((r) => r.url);
      });
      assert.ok(cached.includes(url() + "index.html"));
      assert.ok(cached.includes(url() + "manifest.webmanifest"));
      assert.ok(!cached.some((u) => u.endsWith("nc-48.png")));
      const stats = await p.evaluate(async () => {
        const image = new Image();
        image.src = "./icons/nc-maskable-512.png";
        await image.decode();
        const c = document.createElement("canvas");
        c.width = c.height = 512;
        const ctx = c.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
        return { corner: pixel(0, 0), center: pixel(256, 256) };
      });
      assert.deepEqual(stats.corner, [252, 238, 10, 255]);
      assert.equal(stats.center.length, 4);
    },
  );
  await check(
    "Favorites, comparison, slot configuration, notes, tags and build favorites persist after reload",
    async () => {
      await p
        .getByRole("button", { name: "Favorite Her Majesty", exact: true })
        .click();
      await p.evaluate(() =>
        NCAExpansion.startPlan("Items.Preset_Kyubi_Legendary"),
      );
      await p
        .locator('[data-plan-action=pick-slot][data-slot-id="normal-mod:1"]')
        .click();
      await p.locator("#equipment-search").fill("Big Mag");
      await p
        .locator(
          "#equipment-picker-results [data-plan-action=select-equipment]",
        )
        .click();
      await p.locator("#plan-name").fill("Offline PWA plan");
      await p.locator("#plan-notes").fill("Offline notes stay personal.");
      await p.locator("#plan-tags").fill("Stealth, Offline");
      await p.locator("#plan-favorite").check();
      await p.locator("[data-plan-action=save-build]").click();
      await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
      await p.reload();
      await ready(p);
      assert.equal(await p.locator("#favorite-count").textContent(), "1");
      const builds = await p.evaluate(() => NCAExpansion.getBuilds());
      assert.equal(builds.length, 1);
      assert.equal(builds[0].selections[0].modId, "mod.big-mag");
      assert.deepEqual(builds[0].tags, ["Stealth", "Offline"]);
      assert.equal(builds[0].favorite, true);
    },
  );
  await check(
    "Offline all seven views, filters, search, sort, comparison, mod inspection, all 262 image decodes and JSON round trips",
    async () => {
      await context.setOffline(true);
      await p.reload();
      await ready(p);
      for (const view of [
        "arsenal",
        "compare",
        "favorites",
        "mods",
        "builds",
        "data",
      ])
        await navigate(p, view);
      await p.evaluate(() =>
        NCAExpansion.openBuild(NCAExpansion.getBuilds()[0].id, true),
      );
      assert.equal(
        await p.locator("#plan-name").inputValue(),
        "Offline PWA plan",
      );
      assert.equal(await images(p), 262);
      await navigate(p, "arsenal");
      await p.locator("#search").fill("Her Majesty");
      assert.equal(await p.locator(".weapon-card").count(), 1);
      await p.locator("#search").fill("");
      await p.locator("#filter-class summary").click();
      await p
        .locator("#filter-class")
        .getByRole("checkbox", { name: "Pistol", exact: true })
        .check();
      assert.ok((await p.locator(".weapon-card").count()) < 115);
      await p.locator("#reset").click();
      await p.locator("#sort").selectOption("reload");
      await p.locator("#direction").click();
      await p.evaluate(() => {
        const s = Arsenal.getState();
        s.compare = [
          "Items.Preset_Unity_Agent",
          "Items.Preset_Kyubi_Legendary",
        ];
        localStorage.setItem("night-city-arsenal.v1", JSON.stringify(s));
      });
      await p.reload();
      await navigate(p, "compare");
      assert.ok(
        await p
          .locator("#compare-panel")
          .textContent()
          .then((t) => t.includes("Her Majesty")),
      );
      await navigate(p, "mods");
      assert.equal(await p.locator(".equipment-card").count(), 72);
      await p.locator("#mods-search").fill("Big Mag");
      await p
        .locator(
          "#mods-results .equipment-card-actions [data-plan-action=mod-detail]",
        )
        .click();
      assert.equal(
        await p.locator("#equipment-title").textContent(),
        "Big Mag",
      );
      await p.locator("[data-plan-action=close-equipment]").click();
      await exportImport(p);
      await context.setOffline(false);
    },
  );
  await check(
    "Retry repairs a missing required cache entry without replacing user data",
    async () => {
      const before = await storage(p);
      await p.evaluate(async () => {
        const r = await navigator.serviceWorker.getRegistration();
        const key = (await caches.keys()).find((k) =>
          k.startsWith("night-city-arsenal:" + r.scope),
        );
        await (
          await caches.open(key)
        ).delete(new URL("manifest.webmanifest", r.scope).href);
      });
      await context.setOffline(true);
      await p.reload();
      await p.locator("#pwa-retry").waitFor();
      assert.match(await p.locator("#pwa-status").textContent(), /incomplete/);
      await context.setOffline(false);
      await p.locator("#pwa-retry").click();
      await ready(p);
      assert.deepEqual(await storage(p), before);
    },
  );
  await check(
    "Update waits without reload; unsaved plan and another open window block restart; explicit safe restart preserves storage",
    async () => {
      const before = await storage(p);
      await p.evaluate(async () => {
        await (
          await caches.open("unrelated-app")
        ).put("/unrelated", new Response("keep"));
        await (
          await caches.open("night-city-arsenal:http://other-scope/:keep")
        ).put("/other", new Response("keep"));
      });
      await p.evaluate(() =>
        NCAExpansion.openBuild(NCAExpansion.getBuilds()[0].id, true),
      );
      await p.locator("#plan-notes").fill("Unsaved edits must not reload.");
      revision = 2;
      missingIcon = false;
      await p.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration()).update();
      });
      await p.waitForFunction(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
      );
      await p.locator("#pwa-restart").waitFor();
      await p.locator("#pwa-restart").click();
      assert.match(
        await p.locator("#pwa-status").textContent(),
        /Save your plan/,
      );
      assert.equal(
        await p.locator("#plan-notes").inputValue(),
        "Unsaved edits must not reload.",
      );
      await p.locator("#plan-notes").fill("Offline notes stay personal.");
      await p.locator("[data-plan-action=save-build]").click();
      await p.waitForFunction(() => /Saved in/.test(document.getElementById("plan-save-status")?.textContent));
      await p.evaluate(() => Arsenal.openDetail("Items.Preset_Unity_Agent"));
      await p.locator("#pwa-restart").evaluate((n) => n.click());
      assert.match(
        await p.locator("#pwa-status").textContent(),
        /close open dialogs/,
      );
      assert.equal((await workerStatus(p)).version, originalVersion);
      await p.evaluate(() => Arsenal.closeDetail());
      const other = await context.newPage();
      await other.goto(url() + "#mods");
      await p.locator("#pwa-restart").click();
      await p
        .locator("#pwa-status")
        .filter({ hasText: "Close other Arsenal" })
        .waitFor();
      assert.equal((await workerStatus(p)).version, originalVersion);
      await other.close();
      await p.locator("#pwa-restart").click();
      await p.waitForFunction(async () => {
        const r = await navigator.serviceWorker.getRegistration();
        return !r.waiting && !!navigator.serviceWorker.controller;
      });
      await p.waitForFunction(() =>
        document.documentElement.outerHTML.includes("update fixture 2"),
      );
      await ready(p);
      assert.equal((await workerStatus(p)).version, "test-version-2");
      const after = await storage(p);
      const b1 = JSON.parse(before["night-city-arsenal.builds.v1"]),
        b2 = JSON.parse(after["night-city-arsenal.builds.v1"]);
      assert.equal(b1.builds[0].id, b2.builds[0].id);
      assert.equal(b2.builds[0].notes, "Offline notes stay personal.");
      assert.deepEqual(b2.builds[0].tags, ["Stealth", "Offline"]);
      assert.equal(
        after["night-city-arsenal.v1"],
        before["night-city-arsenal.v1"],
      );
      const keys = await p.evaluate(() => caches.keys());
      assert.ok(keys.includes("unrelated-app"));
      assert.ok(keys.includes("night-city-arsenal:http://other-scope/:keep"));
      assert.ok(!keys.some((k) => k.endsWith(originalVersion)));
    },
  );
  await check(
    "Failed/mismatched deployment keeps active offline application and user data intact",
    async () => {
      const before = await storage(p),
        handler = server.listeners("request")[0];
      for (const failure of ["missing", "mismatch"]) {
        broken = failure;
        server.removeAllListeners("request");
        server.on("request", (req, res) => {
          if (
            new URL(req.url, "http://localhost").pathname.endsWith("/sw.js")
          ) {
            res.writeHead(200, {
              "Content-Type": "text/javascript",
              "Cache-Control": "no-cache",
            });
            res.end(
              payload("sw.js")
                .toString()
                .replace("test-version-2", "test-version-failed-" + failure),
            );
          } else handler(req, res);
        });
        await p.evaluate(async () => {
          const r = await navigator.serviceWorker.getRegistration();
          await new Promise((resolve, reject) => {
            r.addEventListener(
              "updatefound",
              () => {
                const w = r.installing;
                w.addEventListener("statechange", () => {
                  if (w.state === "redundant") resolve(true);
                });
              },
              { once: true },
            );
            r.update().catch(reject);
          });
        });
        assert.equal((await workerStatus(p)).version, "test-version-2");
        assert.deepEqual(await storage(p), before);
        assert.ok(
          !(await p.evaluate(() => caches.keys())).some((k) =>
            k.includes("test-version-failed"),
          ),
        );
      }
      broken = false;
      server.removeAllListeners("request");
      server.on("request", handler);
    },
  );
  await check(
    "Browser process restart with server stopped loads from service worker and preserves saved personal data",
    async () => {
      const before = await storage(p);
      await context.close();
      context = null;
      await new Promise((resolve) => server.close(resolve));
      server = null;
      p = await launch();
      await p.goto(url() + "index.html#arsenal");
      await ready(p);
      assert.equal(await p.locator("#favorite-count").textContent(), "1");
      assert.deepEqual(await storage(p), before);
      assert.equal(await images(p), 262);
      await navigate(p, "builds");
      assert.match(
        await p.locator("#builds-results").textContent(),
        /Offline PWA plan/,
      );
      await navigate(p, "data");
      await p.goto(url() + "#mods");
      assert.equal(
        await p.locator("#mods-results .equipment-card").count(),
        72,
      );
    },
  );
  await check(
    "Root hosting also registers; cache cleanup is isolated by application scope",
    async () => {
      await listen();
      const rootPage = await context.newPage();
      await rootPage.goto(`http://localhost:${port}/`);
      await ready(rootPage);
      assert.equal((await workerStatus(rootPage)).ready, true);
      assert.equal((await workerStatus(p)).version, "test-version-2");
      assert.equal(await rootPage.locator("#pwa-restart").isHidden(), true);
      await rootPage.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await rootPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await rootPage.locator(".main-footer").scrollIntoViewIfNeeded();
      await rootPage.screenshot({
        path: path.join(ROOT, ".tmp/tests/pwa-footer.png"),
      });
      await rootPage.close();
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  await context.close();
  context = null;
  await new Promise((resolve) => server.close(resolve));
  server = null;
  fs.writeFileSync(
    REPORT,
    JSON.stringify(
      {
        passed: true,
        browser:
          "Installed Microsoft Edge, isolated headless persistent profile, GPU disabled",
        productionSHA256: hash(fs.readFileSync(path.join(ROOT, "dist/Night-City-Arsenal.html"))),
        pwaSHA256: hash(original),
        checks,
        limitations: [
          "Windows Start/taskbar installation and standalone OS window were not automated; manual verification required.",
          "Offline cache can be evicted by browser/OS storage policy; JSON backups remain necessary.",
        ],
      },
      null,
      2,
    ),
  );
  console.log(`RESULT ${checks.length} PWA groups passed`);
  cleanupProfile();
})().catch(async (error) => {
  console.error(error);
  if (context) await context.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  cleanupProfile();
  process.exitCode = 1;
});
