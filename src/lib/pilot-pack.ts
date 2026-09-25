/**
 * Pilot pack: a pre-configuration file (<slug>.querra.json) a firm receives on
 * day one — firm identity + logo, client/equipment catalogs, default fișă type
 * and technician names. Same shape as backup v2 without fișe, plus `pack`.
 * Pure module (no IndexedDB / DOM) — used by the app and by
 * scripts/make-pilot-pack.mts.
 */
import type {
  CatalogClient,
  CatalogEquipment,
  ContentLocale,
  FirmSettings,
  TipFisa,
} from "./types";
import { TIPURI } from "./types";

export const PILOT_PACK_KIND = "querra-pilot-pack";
export const PILOT_PACK_VERSION = 1;

export type PilotPackMeta = {
  kind: typeof PILOT_PACK_KIND;
  version: number;
  name: string;
  slug: string;
  createdAt: string;
  defaults: {
    tip?: TipFisa;
    technicians: string[];
    contentLocale?: ContentLocale;
  };
};

export type PilotPack = {
  version: 2;
  exportedAt: string;
  pack: PilotPackMeta;
  settings: FirmSettings;
  clients: CatalogClient[];
  equipment: CatalogEquipment[];
};

export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[łŁ]/g, "l")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "firma"
  );
}

export function packFilename(slug: string): string {
  return `${slug}.querra.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const optStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

export function isPilotPack(raw: unknown): boolean {
  return isObj(raw) && isObj(raw.pack) && raw.pack.kind === PILOT_PACK_KIND;
}

function cleanTechs(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = optStr(x);
    if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s.slice(0, 80));
  }
  return out.slice(0, 50);
}

export function buildPilotPack(input: {
  firmName: string;
  cui?: string;
  address?: string;
  phone?: string;
  logoDataUrl?: string;
  clients: CatalogClient[];
  equipment: CatalogEquipment[];
  defaultTip?: TipFisa;
  technicians?: string[];
  contentLocale?: ContentLocale;
  now?: Date;
}): PilotPack {
  const now = (input.now ?? new Date()).toISOString();
  const name = input.firmName.trim();
  const slug = slugify(name);
  const technicians = cleanTechs(input.technicians);
  const tip = input.defaultTip && TIPURI.includes(input.defaultTip) ? input.defaultTip : undefined;
  return {
    version: 2,
    exportedAt: now,
    pack: {
      kind: PILOT_PACK_KIND,
      version: PILOT_PACK_VERSION,
      name,
      slug,
      createdAt: now,
      defaults: { tip, technicians, contentLocale: input.contentLocale },
    },
    settings: {
      companyName: name,
      cui: input.cui?.trim() || "",
      address: input.address?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      logoDataUrl: input.logoDataUrl,
      defaultTip: tip,
      defaultContentLocale: input.contentLocale,
      technicians,
      packName: name,
    },
    clients: input.clients,
    equipment: input.equipment,
  };
}

export type PackValidation =
  | { ok: true; data: PilotPack }
  | { ok: false; error: "not_pack" | "bad_settings" | "bad_version" };

/** Validate + normalize a parsed pack JSON value. */
export function validatePilotPack(raw: unknown): PackValidation {
  if (!isPilotPack(raw)) return { ok: false, error: "not_pack" };
  const r = raw as Record<string, unknown>;
  const meta = r.pack as Record<string, unknown>;
  if (typeof meta.version !== "number" || meta.version < 1 || meta.version > PILOT_PACK_VERSION)
    return { ok: false, error: "bad_version" };
  if (!isObj(r.settings) || !optStr(r.settings.companyName))
    return { ok: false, error: "bad_settings" };
  const s = r.settings;
  const defaults = isObj(meta.defaults) ? meta.defaults : {};
  const tipRaw = optStr(defaults.tip) ?? optStr(s.defaultTip);
  const tip = tipRaw && (TIPURI as string[]).includes(tipRaw) ? (tipRaw as TipFisa) : undefined;
  const technicians = cleanTechs(
    Array.isArray(defaults.technicians) ? defaults.technicians : s.technicians
  );
  const loc = optStr(defaults.contentLocale) ?? optStr(s.defaultContentLocale);
  const contentLocale = loc === "ro" || loc === "en" || loc === "pl" ? loc : undefined;
  const logo = optStr(s.logoDataUrl);
  const name = optStr(meta.name) ?? String(s.companyName).trim();
  const now = new Date().toISOString();

  const clients: CatalogClient[] = [];
  for (const c of Array.isArray(r.clients) ? r.clients : []) {
    if (!isObj(c) || !optStr(c.name)) continue;
    clients.push({
      id: optStr(c.id) ?? `pack-c-${clients.length + 1}`,
      name: String(c.name).trim(),
      locatie: optStr(c.locatie),
      note: optStr(c.note),
      updatedAt: optStr(c.updatedAt) ?? now,
    });
  }
  const equipment: CatalogEquipment[] = [];
  for (const e of Array.isArray(r.equipment) ? r.equipment : []) {
    if (!isObj(e) || !optStr(e.model)) continue;
    equipment.push({
      id: optStr(e.id) ?? `pack-e-${equipment.length + 1}`,
      model: String(e.model).trim(),
      serie: optStr(e.serie),
      clientName: optStr(e.clientName),
      note: optStr(e.note),
      updatedAt: optStr(e.updatedAt) ?? now,
    });
  }
  return {
    ok: true,
    data: {
      version: 2,
      exportedAt: optStr(r.exportedAt) ?? now,
      pack: {
        kind: PILOT_PACK_KIND,
        version: meta.version,
        name,
        slug: optStr(meta.slug) ?? slugify(name),
        createdAt: optStr(meta.createdAt) ?? now,
        defaults: { tip, technicians, contentLocale },
      },
      settings: {
        companyName: String(s.companyName).trim(),
        cui: optStr(s.cui) ?? "",
        address: optStr(s.address),
        phone: optStr(s.phone),
        // Only accept image data URLs for the logo.
        logoDataUrl: logo && /^data:image\/(png|jpe?g|webp);base64,/i.test(logo) ? logo : undefined,
        defaultTip: tip,
        defaultContentLocale: contentLocale,
        technicians,
        packName: name,
      },
      clients,
      equipment,
    },
  };
}

const key = (s: string | undefined) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export type PackMergePlan = {
  settings: FirmSettings;
  clients: CatalogClient[];
  equipment: CatalogEquipment[];
  stats: {
    clientsAdded: number;
    clientsUpdated: number;
    equipmentAdded: number;
    equipmentUpdated: number;
  };
};

/**
 * Merge (never replace-all): firm identity comes from the pack where the pack
 * has a value; catalogs are upserted (clients by name, equipment by
 * model+serie) — pack fills blanks, local extras are kept. Fișe untouched.
 */
export function planPackMerge(
  pack: PilotPack,
  current: { settings: FirmSettings; clients: CatalogClient[]; equipment: CatalogEquipment[] }
): PackMergePlan {
  const ps = pack.settings;
  const cs = current.settings;
  const techs = cleanTechs([...(ps.technicians || []), ...(cs.technicians || [])]);
  const settings: FirmSettings = {
    ...cs,
    companyName: ps.companyName || cs.companyName,
    cui: ps.cui || cs.cui,
    address: ps.address || cs.address,
    phone: ps.phone || cs.phone,
    logoDataUrl: ps.logoDataUrl || cs.logoDataUrl,
    defaultTip: ps.defaultTip || cs.defaultTip,
    defaultContentLocale: ps.defaultContentLocale || pack.pack.defaults?.contentLocale || cs.defaultContentLocale,
    technicians: techs,
    packName: pack.pack.name,
  };

  const now = new Date().toISOString();
  const stats = { clientsAdded: 0, clientsUpdated: 0, equipmentAdded: 0, equipmentUpdated: 0 };

  const clients = current.clients.map((c) => ({ ...c }));
  for (const pc of pack.clients) {
    const i = clients.findIndex((c) => key(c.name) === key(pc.name));
    if (i < 0) {
      clients.push({ ...pc, updatedAt: now });
      stats.clientsAdded++;
    } else {
      const c = clients[i];
      const next = { ...c, locatie: c.locatie || pc.locatie, note: c.note || pc.note };
      if (next.locatie !== c.locatie || next.note !== c.note) {
        clients[i] = { ...next, updatedAt: now };
        stats.clientsUpdated++;
      }
    }
  }

  const equipment = current.equipment.map((e) => ({ ...e }));
  for (const pe of pack.equipment) {
    const i = equipment.findIndex(
      (e) => key(e.model) === key(pe.model) && key(e.serie) === key(pe.serie)
    );
    if (i < 0) {
      equipment.push({ ...pe, updatedAt: now });
      stats.equipmentAdded++;
    } else {
      const e = equipment[i];
      const next = { ...e, clientName: e.clientName || pe.clientName, note: e.note || pe.note };
      if (next.clientName !== e.clientName || next.note !== e.note) {
        equipment[i] = { ...next, updatedAt: now };
        stats.equipmentUpdated++;
      }
    }
  }
  return { settings, clients, equipment, stats };
}
