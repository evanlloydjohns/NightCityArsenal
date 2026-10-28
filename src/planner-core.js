      /* Information-only planner. No modified-stat calculations or weapon mutations. */
      (function (root, factory) {
        const api = factory();
        if (typeof module === "object" && module.exports) module.exports = api;
        else root.NCAPlannerCore = api;
      })(globalThis, function () {
        "use strict";
        const clone = (x) => JSON.parse(JSON.stringify(x));
        const uid = () =>
          globalThis.crypto?.randomUUID?.() ||
          "build-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2);
        const kinds = {
          "normal-mod": "Weapon mod",
          "tech-mod": "Tech mod",
          "smart-mod": "Smart mod",
          "melee-mod": "Melee mod",
          "throwable-mod": "Throwable mod",
          scope: "Scope",
          muzzle: "Muzzle",
        };
        function createEngine(weaponDB, modDB) {
          const weapons = new Map(weaponDB.weapons.map((w) => [w.id, w])),
            mods = new Map(modDB.modifications.map((m) => [m.id, m]));
          const fits = new Map(
            modDB.modifications.map((m) => [
              m.id,
              new Set(m.compatibleWeaponIds),
            ]),
          );
          const tiers = weaponDB.meta.tiers,
            knownWeapons = new Set(modDB.meta.knownWeaponIds || []);
          function slotsFor(weaponId, tier) {
            const w = weapons.get(weaponId),
              slots = [],
              unknown = [];
            if (!w) return { slots, unknown: ["Weapon reference is missing."] };
            if (!Array.isArray(w.slots))
              return {
                slots,
                unknown: ["Published slot data is unavailable."],
              };
            for (const group of w.slots) {
              const count = group.countByTier
                ? group.countByTier[tier]
                : group.count;
              if (!Number.isInteger(count)) {
                unknown.push(
                  (kinds[group.kind] || group.type) +
                    " capacity is unverified at Tier " +
                    tier +
                    ".",
                );
                continue;
              }
              for (let i = 1; i <= count; i++)
                slots.push({
                  id: group.kind + ":" + i,
                  kind: group.kind,
                  label:
                    (kinds[group.kind] || group.type) +
                    (count > 1 ? " " + i : ""),
                  sourceSlots: group.sourceSlots || [],
                  fixed:
                    modDB.meta.fixedAttachments?.[weaponId]?.[group.kind] ||
                    null,
                });
            }
            return { slots, unknown };
          }
          function compatibility(
            modId,
            weaponId,
            tier,
            slotId,
            modTier,
            selections = [],
          ) {
            const m = mods.get(modId),
              w = weapons.get(weaponId),
              answer = (status, reason) => ({ status, reason });
            if (!m || !w)
              return answer(
                "unknown",
                "The weapon or modification reference is missing.",
              );
            if (!tiers.includes(tier))
              return answer("unknown", "Weapon tier is not recognized.");
            const layout = slotsFor(weaponId, tier),
              slot = layout.slots.find((s) => s.id === slotId);
            if (!slot)
              return answer(
                layout.unknown.length ? "unknown" : "incompatible",
                layout.unknown[0] ||
                  "This weapon has no such published slot at the selected tier.",
              );
            if (slot.fixed)
              return answer(
                slot.fixed.status === "fixed" ? "incompatible" : "unknown",
                slot.fixed.status === "fixed"
                  ? "Factory attachment is fixed and cannot be swapped."
                  : "Dedicated attachment replacement is unverified; no selection is permitted.",
              );
            const attachment = slot.kind === "scope" || slot.kind === "muzzle";
            if (attachment ? m.slotKind !== slot.kind : m.slotKind !== "mod")
              return answer(
                "incompatible",
                "This modification uses a different equipment slot.",
              );
            if (!m.tiers.includes(String(modTier)))
              return answer(
                "incompatible",
                "The reference does not publish this modification at that tier.",
              );
            if (Number(modTier) > parseInt(tier, 10))
              return answer(
                "incompatible",
                "Modification quality cannot exceed weapon quality.",
              );
            if (!fits.get(modId).has(weaponId))
              return answer(
                m.compatibilityComplete && knownWeapons.has(weaponId)
                  ? "incompatible"
                  : "unknown",
                "No positive individual compatibility evidence for this weapon.",
              );
            if (
              m.uniqueGroup &&
              selections.some(
                (s) =>
                  s.slotId !== slotId &&
                  mods.get(s.modId)?.uniqueGroup === m.uniqueGroup,
              )
            )
              return answer(
                "incompatible",
                "One Active Chimera Core crafts one iconic modification in a normal playthrough.",
              );
            return answer(
              "compatible",
              `Source-listed weapon and slot; base stats stay unchanged. Individual patch ${modDB.meta.targetPatch} behavior is not game-tested.`,
            );
          }
          function issues(build) {
            const out = [];
            if (!weapons.has(build.weaponId))
              out.push("Missing weapon: " + build.weaponId);
            if (build.patchTarget !== modDB.meta.targetPatch)
              out.push(
                "Build patch target differs from the current equipment snapshot.",
              );
            if (build.dataVersion !== modDB.meta.dataVersion)
              out.push(
                "Build uses a different equipment-data snapshot; review its selections.",
              );
            out.push(...slotsFor(build.weaponId, build.tier).unknown);
            const seen = new Set();
            for (const s of build.selections) {
              if (seen.has(s.slotId))
                out.push("More than one selection references " + s.slotId);
              seen.add(s.slotId);
              const c = compatibility(
                s.modId,
                build.weaponId,
                build.tier,
                s.slotId,
                s.tier,
                build.selections,
              );
              if (c.status !== "compatible")
                out.push(
                  (mods.get(s.modId)?.name || s.modId) + ": " + c.reason,
                );
            }
            return [...new Set(out)];
          }
          function rejectUnsafe(v, depth = 0) {
            if (depth > 30) throw Error("Import is nested too deeply.");
            if (v && typeof v === "object") {
              for (const key of Object.keys(v)) {
                if (["__proto__", "prototype", "constructor"].includes(key))
                  throw Error("Unsafe object key in imported file.");
                rejectUnsafe(v[key], depth + 1);
              }
            }
          }
          const str = (v, name, max = 1000000) => {
            if (typeof v !== "string" || v.length > max)
              throw Error(
                name + " must be text within the supported file size.",
              );
            return v;
          };
          function sanitizeBuild(raw) {
            if (!raw || typeof raw !== "object" || Array.isArray(raw))
              throw Error("Each build must be an object.");
            const id = str(raw.id, "Build ID", 200),
              name = str(raw.name, "Build name", 300),
              weaponId = str(raw.weaponId, "Weapon ID", 200);
            if (!id || !name.trim() || !weaponId)
              throw Error("A build needs an ID, name and weapon reference.");
            if (!tiers.includes(raw.tier)) throw Error("Invalid weapon tier.");
            if (!Array.isArray(raw.selections) || raw.selections.length > 32)
              throw Error("Invalid equipment selections.");
            const selections = raw.selections.map((s) => {
              if (!s || typeof s !== "object")
                throw Error("Invalid equipment selection.");
              return {
                slotId: str(s.slotId, "Slot ID", 100),
                modId: str(s.modId, "Modification ID", 200),
                tier: str(s.tier, "Modification tier", 20),
              };
            });
            if (!Array.isArray(raw.tags) || raw.tags.length > 50)
              throw Error("Tags must be an array with at most 50 entries.");
            const tags = [
              ...new Set(
                raw.tags.map((t) => str(t, "Tag", 120).trim()).filter(Boolean),
              ),
            ];
            for (const k of ["createdAt", "updatedAt"])
              if (
                typeof raw[k] !== "string" ||
                !Number.isFinite(Date.parse(raw[k]))
              )
                throw Error("Invalid build date.");
            if (typeof raw.favorite !== "boolean")
              throw Error("Invalid favorite flag.");
            return {
              id,
              name: name.trim(),
              weaponId,
              tier: raw.tier,
              profile: ["nd", "records"].includes(raw.profile)
                ? raw.profile
                : "records",
              selections,
              notes: str(raw.notes, "Notes"),
              tags,
              favorite: raw.favorite,
              createdAt: raw.createdAt,
              updatedAt: raw.updatedAt,
              dataVersion: str(raw.dataVersion, "Data version", 100),
              patchTarget: str(raw.patchTarget, "Patch target", 30),
            };
          }
          function sanitizeBundle(raw) {
            rejectUnsafe(raw);
            if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.builds))
              throw Error(
                "Expected a Night City Arsenal builds file with schemaVersion 1.",
              );
            if (raw.builds.length > 1000)
              throw Error("Import limit is 1000 builds per file.");
            return raw.builds.map(sanitizeBuild);
          }
          function importBundle(raw, existing) {
            const incoming = sanitizeBundle(raw),
              ids = new Set(existing.map((b) => b.id));
            let duplicates = 0;
            for (const b of incoming) {
              if (ids.has(b.id)) {
                b.id = uid();
                duplicates++;
              }
              ids.add(b.id);
            }
            if (existing.length + incoming.length > 1000)
              throw Error(
                "The build library supports up to 1000 builds; export an archive before importing more.",
              );
            return {
              builds: [...existing, ...incoming],
              imported: incoming.length,
              duplicates,
              warnings: incoming.flatMap((b) =>
                issues(b).map((x) => b.name + ": " + x),
              ),
            };
          }
          function newBuild(weaponId, tier = "5++", profile = "records") {
            const now = new Date().toISOString();
            return {
              id: uid(),
              name: (weapons.get(weaponId)?.name || "Weapon") + " plan",
              weaponId,
              tier,
              profile,
              selections: [],
              notes: "",
              tags: [],
              favorite: false,
              createdAt: now,
              updatedAt: now,
              dataVersion: modDB.meta.dataVersion,
              patchTarget: modDB.meta.targetPatch,
            };
          }
          const exportBundle = (builds) => ({
            application: "Night City Arsenal",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            equipmentDataVersion: modDB.meta.dataVersion,
            builds: clone(builds),
          });
          return Object.freeze({
            weapons,
            mods,
            slotsFor,
            compatibility,
            issues,
            sanitizeBuild,
            sanitizeBundle,
            importBundle,
            newBuild,
            exportBundle,
            clone,
            uid,
            kinds,
          });
        }
        return Object.freeze({ createEngine });
      });
