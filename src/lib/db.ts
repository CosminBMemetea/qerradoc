"use client";

import { get, set, del, keys } from "idb-keyval";
import type {
  Fisa,
  FirmSettings,
  LicenseState,
  Session,
  CatalogClient,
  CatalogEquipment,
} from "./types";
import { resolveContentLocale } from "./types";
import { firmExample } from "./defaults";

/** Soft-migrate / normalize contentLocale (legacy missing → RO; PL/pl-PL → pl). */
function withContentLocale(f: Fisa): Fisa {
  const resolved = resolveContentLocale(f);
  if (f.contentLocale === resolved) return f;
  return { ...f, contentLocale: resolved };
}

const FISA_PREFIX = "fisa:";
const SETTINGS_KEY = "firm-settings";
const LICENSE_KEY = "license";
const SESSION_KEY = "session";

export async function saveFisa(fisa: Fisa): Promise<void> {
  const updated = {
    ...fisa,
    contentLocale: resolveContentLocale(fisa),
    updatedAt: new Date().toISOString(),
  };
  await set(FISA_PREFIX + fisa.id, updated);
}

export async function getFisa(id: string): Promise<Fisa | undefined> {
  const f = await get<Fisa>(FISA_PREFIX + id);
  return f ? withContentLocale(f) : undefined;
}

export async function deleteFisa(id: string): Promise<void> {
  await del(FISA_PREFIX + id);
}

/** Write fișă as-is (keeps updatedAt) — used by backup restore. */
export async function putFisa(fisa: Fisa): Promise<void> {
  await set(FISA_PREFIX + fisa.id, withContentLocale(fisa));
}

/** Delete every stored fișă (settings / license / session untouched). */
export async function clearAllFise(): Promise<void> {
  const allKeys = await keys();
  const fisaKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(FISA_PREFIX)
  );
  await Promise.all(fisaKeys.map((k) => del(k)));
}

export async function listFise(): Promise<Fisa[]> {
  const allKeys = await keys();
  const fisaKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(FISA_PREFIX)
  );
  const items = await Promise.all(fisaKeys.map((k) => get<Fisa>(k)));
  return items
    .filter((f): f is Fisa => !!f)
    .map(withContentLocale)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSettings(): Promise<FirmSettings> {
  const s = await get<FirmSettings>(SETTINGS_KEY);
  const lang =
    typeof document !== "undefined"
      ? document.documentElement.lang || "ro"
      : "ro";
  return (
    s || {
      companyName: firmExample(lang),
      cui: "",
      address: "",
      phone: "",
    }
  );
}

export async function saveSettings(s: FirmSettings): Promise<void> {
  await set(SETTINGS_KEY, s);
}

export async function getLicense(): Promise<LicenseState> {
  const l = await get<LicenseState>(LICENSE_KEY);
  return (
    l || {
      activated: false,
      licenseKey: "",
      maxUsers: 5,
    }
  );
}

export async function saveLicense(l: LicenseState): Promise<void> {
  await set(LICENSE_KEY, l);
}

export async function getSession(): Promise<Session | null> {
  return (await get<Session>(SESSION_KEY)) || null;
}

export async function saveSession(s: Session): Promise<void> {
  await set(SESSION_KEY, s);
}

export async function clearSession(): Promise<void> {
  await del(SESSION_KEY);
}

const CATALOG_CLIENTS_KEY = "catalog-clients";
const CATALOG_EQUIPMENT_KEY = "catalog-equipment";

function normKey(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function getCatalogClients(): Promise<CatalogClient[]> {
  const list = await get<CatalogClient[]>(CATALOG_CLIENTS_KEY);
  return Array.isArray(list) ? list : [];
}

export async function saveCatalogClients(list: CatalogClient[]): Promise<void> {
  await set(CATALOG_CLIENTS_KEY, list);
}

export async function getCatalogEquipment(): Promise<CatalogEquipment[]> {
  const list = await get<CatalogEquipment[]>(CATALOG_EQUIPMENT_KEY);
  return Array.isArray(list) ? list : [];
}

export async function saveCatalogEquipment(
  list: CatalogEquipment[]
): Promise<void> {
  await set(CATALOG_EQUIPMENT_KEY, list);
}

export async function clearCatalogs(): Promise<void> {
  await Promise.all([
    set(CATALOG_CLIENTS_KEY, []),
    set(CATALOG_EQUIPMENT_KEY, []),
  ]);
}

/** Upsert client by normalized name. Returns the stored entry. */
export async function upsertCatalogClient(
  partial: Omit<CatalogClient, "id" | "updatedAt"> & { id?: string }
): Promise<CatalogClient> {
  const name = (partial.name || "").trim();
  if (!name) throw new Error("empty_client_name");
  const list = await getCatalogClients();
  const key = normKey(name);
  const idx = list.findIndex((c) => normKey(c.name) === key);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const prev = list[idx];
    const next: CatalogClient = {
      ...prev,
      name,
      locatie:
        partial.locatie !== undefined
          ? partial.locatie.trim() || undefined
          : prev.locatie,
      note:
        partial.note !== undefined
          ? partial.note.trim() || undefined
          : prev.note,
      updatedAt: now,
    };
    list[idx] = next;
    await saveCatalogClients(list);
    return next;
  }
  const created: CatalogClient = {
    id: partial.id || crypto.randomUUID(),
    name,
    locatie: partial.locatie?.trim() || undefined,
    note: partial.note?.trim() || undefined,
    updatedAt: now,
  };
  list.push(created);
  await saveCatalogClients(list);
  return created;
}

/** Upsert equipment by normalized model + serie. */
export async function upsertCatalogEquipment(
  partial: Omit<CatalogEquipment, "id" | "updatedAt"> & { id?: string }
): Promise<CatalogEquipment> {
  const model = (partial.model || "").trim();
  if (!model) throw new Error("empty_equipment_model");
  const serie = (partial.serie || "").trim();
  const list = await getCatalogEquipment();
  const mKey = normKey(model);
  const sKey = normKey(serie);
  const idx = list.findIndex(
    (e) => normKey(e.model) === mKey && normKey(e.serie || "") === sKey
  );
  const now = new Date().toISOString();
  if (idx >= 0) {
    const prev = list[idx];
    const next: CatalogEquipment = {
      ...prev,
      model,
      serie: serie || undefined,
      clientName:
        partial.clientName !== undefined
          ? partial.clientName.trim() || undefined
          : prev.clientName,
      note:
        partial.note !== undefined
          ? partial.note.trim() || undefined
          : prev.note,
      updatedAt: now,
    };
    list[idx] = next;
    await saveCatalogEquipment(list);
    return next;
  }
  const created: CatalogEquipment = {
    id: partial.id || crypto.randomUUID(),
    model,
    serie: serie || undefined,
    clientName: partial.clientName?.trim() || undefined,
    note: partial.note?.trim() || undefined,
    updatedAt: now,
  };
  list.push(created);
  await saveCatalogEquipment(list);
  return created;
}

/** After saving a fișă, learn client + utilaj into catalogs. */
export async function upsertCatalogFromFisa(fisa: {
  client?: string;
  locatie?: string;
  modelUtilaj?: string;
  serie?: string;
}): Promise<void> {
  const client = (fisa.client || "").trim();
  const model = (fisa.modelUtilaj || "").trim();
  if (client) {
    await upsertCatalogClient({
      name: client,
      locatie: fisa.locatie?.trim() || undefined,
    });
  }
  if (model) {
    await upsertCatalogEquipment({
      model,
      serie: fisa.serie?.trim() || undefined,
      clientName: client || undefined,
    });
  }
}
