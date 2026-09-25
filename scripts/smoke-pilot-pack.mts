/**
 * Smoke: pilot pack — example pack in docs/ validates, merge never replaces,
 * backup import path recognizes packs, settings defaults survive backup.
 * Run: npm run smoke:pack
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PILOT_PACK_KIND,
  isPilotPack,
  planPackMerge,
  slugify,
  validatePilotPack,
} from "../src/lib/pilot-pack.ts";
import { parseBackupJson, validateBackup, BACKUP_VERSION } from "../src/lib/backup.ts";
import type { CatalogClient, CatalogEquipment } from "../src/lib/types.ts";

const raw = JSON.parse(readFileSync("docs/pilot/cleantech-service-srl.querra.json", "utf8"));
assert.ok(isPilotPack(raw));
assert.equal(raw.pack.kind, PILOT_PACK_KIND);
assert.ok(!("fise" in raw), "pack has no fișe");
assert.ok(!("license" in raw) && !("session" in raw), "pack carries no licence/session");
const v = validatePilotPack(raw);
assert.ok(v.ok);
if (!v.ok) process.exit(1);
const pack = v.data;
assert.equal(pack.settings.companyName, "CleanTech Service SRL");
assert.match(pack.settings.logoDataUrl || "", /^data:image\/png;base64,/);
assert.equal(pack.settings.defaultTip, "Revizie");
assert.deepEqual(pack.settings.technicians, ["Andrei Pop", "Mihai Ionescu", "Elena Dumitru"]);
assert.ok(pack.clients.length >= 5 && pack.equipment.length >= 6);
assert.ok(pack.equipment.some((e) => e.model === "Nilfisk SC500" && e.serie === "SN-998877"));

assert.equal(slugify("Ślęża Czyszczenie Sp. z o.o."), "sleza-czyszczenie-sp-z-o-o");
assert.equal(slugify("Utilaje Curățenie SRL"), "utilaje-curatenie-srl");

// Invalid packs
assert.deepEqual(validatePilotPack({ version: 2 }), { ok: false, error: "not_pack" });
assert.equal(validatePilotPack({ ...raw, settings: { companyName: "" } }).ok, false);
assert.equal(validatePilotPack({ ...raw, pack: { ...raw.pack, version: 99 } }).ok, false);
const evil = validatePilotPack({ ...raw, settings: { ...raw.settings, logoDataUrl: "javascript:alert(1)" } });
assert.ok(evil.ok && evil.data.settings.logoDataUrl === undefined, "non-image logo dropped");

// Merge, never replace-all
const now = new Date().toISOString();
const localClients: CatalogClient[] = [
  { id: "l1", name: "HOTEL CONTINENTAL FORUM", updatedAt: now }, // same client, no location → filled
  { id: "l2", name: "Client local", locatie: "Iași", updatedAt: now }, // kept
];
const localEquip: CatalogEquipment[] = [
  { id: "le1", model: "Nilfisk SC500", serie: "SN-998877", updatedAt: now },
  { id: "le2", model: "Local machine", updatedAt: now },
];
const plan = planPackMerge(pack, {
  settings: { companyName: "Old name", cui: "", phone: "0700", technicians: ["Local Tech"] },
  clients: localClients,
  equipment: localEquip,
});
assert.equal(plan.settings.companyName, "CleanTech Service SRL");
assert.equal(plan.settings.packName, "CleanTech Service SRL");
assert.equal(plan.settings.phone, "+40 722 000 111");
assert.deepEqual(plan.settings.technicians, ["Andrei Pop", "Mihai Ionescu", "Elena Dumitru", "Local Tech"]);
assert.ok(plan.clients.some((c) => c.id === "l2"), "local client kept");
const cont = plan.clients.filter((c) => c.name.toLowerCase() === "hotel continental forum");
assert.equal(cont.length, 1, "no duplicate client");
assert.equal(cont[0].locatie, "Sibiu, Piața Unirii 10", "blank filled from pack");
assert.equal(plan.clients.length, localClients.length + pack.clients.length - 1);
assert.equal(plan.stats.clientsAdded, pack.clients.length - 1);
assert.equal(plan.stats.clientsUpdated, 1);
assert.ok(plan.equipment.some((e) => e.id === "le2"), "local equipment kept");
assert.equal(plan.equipment.filter((e) => e.serie === "SN-998877").length, 1, "no duplicate machine");
assert.equal(plan.stats.equipmentAdded, pack.equipment.length - 1);
// Re-importing the same pack is idempotent.
const again = planPackMerge(pack, plan);
assert.equal(again.stats.clientsAdded + again.stats.equipmentAdded + again.stats.clientsUpdated + again.stats.equipmentUpdated, 0);

// Backup import: a pack is not a backup (UI checks isPilotPack first → merge).
assert.equal(parseBackupJson(JSON.stringify(raw)).ok, false);
// Settings defaults survive a regular backup round-trip.
const b = validateBackup({ version: BACKUP_VERSION, fise: [], settings: plan.settings, clients: plan.clients, equipment: plan.equipment });
assert.ok(b.ok);
if (b.ok) {
  assert.equal(b.data.settings.defaultTip, "Revizie");
  assert.equal(b.data.settings.packName, "CleanTech Service SRL");
  assert.deepEqual(b.data.settings.technicians, plan.settings.technicians);
}
console.log("smoke-pilot-pack: OK");
