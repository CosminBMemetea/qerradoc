"use client";

import type {
  Fisa,
  FirmSettings,
  LicenseState,
  Session,
  CatalogClient,
  CatalogEquipment,
} from "./types";
import { resolveContentLocale } from "./types";
import {
  listFise,
  getSettings,
  getLicense,
  getSession,
  saveSettings,
  saveLicense,
  saveSession,
  putFisa,
  deleteFisa,
  getCatalogClients,
  getCatalogEquipment,
  saveCatalogClients,
  saveCatalogEquipment,
} from "./db";
import { downloadBlob } from "./pdf";

export const BACKUP_VERSION = 2;

/** Warn in UI when backup JSON is larger than this (bytes). */
export const BACKUP_SIZE_WARN_BYTES = 8 * 1024 * 1024; // 8 MB

export type BackupPayload = {
  version: number;
  exportedAt: string;
  fise: Fisa[];
  settings: FirmSettings;
  license?: LicenseState;
  session?: Session | null;
  /** v2+: local client catalog (empty if absent in older backups). */
  clients?: CatalogClient[];
  /** v2+: local equipment catalog (empty if absent in older backups). */
  equipment?: CatalogEquipment[];
};

export type BackupValidation =
  | { ok: true; data: BackupPayload }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function softNormalizeFisa(raw: unknown): Fisa | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  const f = raw as unknown as Fisa;
  const optStr = (v: unknown): string | undefined =>
    typeof v === "string" && v ? v : undefined;
  return {
    ...f,
    contentLocale: resolveContentLocale(f),
    // Soft-normalize optional image fields — ignore non-string junk
    photoDataUrl: optStr(raw.photoDataUrl),
    audioNoteDataUrl: optStr(raw.audioNoteDataUrl),
    semnaturaClientDataUrl: optStr(raw.semnaturaClientDataUrl),
    semnaturaTehnicianDataUrl: optStr(raw.semnaturaTehnicianDataUrl),
  };
}

function softNormalizeSettings(raw: unknown): FirmSettings | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.companyName !== "string") return null;
  if (typeof raw.cui !== "string") return null;
  return {
    companyName: raw.companyName,
    cui: raw.cui,
    address: typeof raw.address === "string" ? raw.address : undefined,
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    logoDataUrl:
      typeof raw.logoDataUrl === "string" ? raw.logoDataUrl : undefined,
  };
}

function softNormalizeClient(raw: unknown): CatalogClient | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  return {
    id: raw.id,
    name: raw.name.trim(),
    locatie: typeof raw.locatie === "string" ? raw.locatie : undefined,
    note: typeof raw.note === "string" ? raw.note : undefined,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

function softNormalizeEquipment(raw: unknown): CatalogEquipment | null {
  if (!isPlainObject(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.model !== "string" || !raw.model.trim()) return null;
  return {
    id: raw.id,
    model: raw.model.trim(),
    serie: typeof raw.serie === "string" ? raw.serie : undefined,
    clientName: typeof raw.clientName === "string" ? raw.clientName : undefined,
    note: typeof raw.note === "string" ? raw.note : undefined,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

/** Validate and normalize a parsed backup JSON value. */
export function validateBackup(raw: unknown): BackupValidation {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "not_object" };
  }
  const version = raw.version;
  if (typeof version !== "number" || !Number.isFinite(version) || version < 1) {
    return { ok: false, error: "bad_version" };
  }
  if (!Array.isArray(raw.fise)) {
    return { ok: false, error: "bad_fise" };
  }
  const fise: Fisa[] = [];
  for (const item of raw.fise) {
    const f = softNormalizeFisa(item);
    if (!f) return { ok: false, error: "bad_fisa_item" };
    fise.push(f);
  }
  const settings = softNormalizeSettings(raw.settings);
  if (!settings) return { ok: false, error: "bad_settings" };

  const data: BackupPayload = {
    version: Math.floor(version),
    exportedAt:
      typeof raw.exportedAt === "string" && raw.exportedAt
        ? raw.exportedAt
        : new Date().toISOString(),
    fise,
    settings,
  };

  if (isPlainObject(raw.license)) {
    data.license = raw.license as unknown as LicenseState;
  }
  if (raw.session === null) {
    data.session = null;
  } else if (isPlainObject(raw.session)) {
    data.session = raw.session as unknown as Session;
  }

  // v2 catalogs — optional so v1 backups still restore (empty catalogs)
  if (Array.isArray(raw.clients)) {
    const clients: CatalogClient[] = [];
    for (const item of raw.clients) {
      const c = softNormalizeClient(item);
      if (c) clients.push(c);
    }
    data.clients = clients;
  } else {
    data.clients = [];
  }

  if (Array.isArray(raw.equipment)) {
    const equipment: CatalogEquipment[] = [];
    for (const item of raw.equipment) {
      const e = softNormalizeEquipment(item);
      if (e) equipment.push(e);
    }
    data.equipment = equipment;
  } else {
    data.equipment = [];
  }

  return { ok: true, data };
}

export function parseBackupJson(text: string): BackupValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  return validateBackup(parsed);
}

export async function buildBackup(): Promise<BackupPayload> {
  const [fise, settings, license, session, clients, equipment] =
    await Promise.all([
      listFise(),
      getSettings(),
      getLicense(),
      getSession(),
      getCatalogClients(),
      getCatalogEquipment(),
    ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    fise,
    settings,
    license,
    session,
    clients,
    equipment,
  };
}

export function backupFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `querra-fisa-backup-${y}-${m}-${d}.json`;
}

export async function exportBackupDownload(): Promise<{
  count: number;
  bytes: number;
  filename: string;
}> {
  const payload = await buildBackup();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const filename = backupFilename();
  downloadBlob(blob, filename);
  return { count: payload.fise.length, bytes: blob.size, filename };
}

/**
 * Replace-all restore: write settings + all sheets + catalogs from backup,
 * then delete local sheets that are not in the backup. contentLocale is kept
 * as stored. Does not wipe first (avoids empty half-state if write fails mid-way).
 * Older backups without catalogs restore empty catalogs.
 */
export async function restoreBackupReplaceAll(
  data: BackupPayload
): Promise<{ fiseCount: number }> {
  const existing = await listFise();
  const keepIds = new Set(data.fise.map((f) => f.id));

  await saveSettings(data.settings);

  for (const f of data.fise) {
    await putFisa({
      ...f,
      contentLocale: resolveContentLocale(f),
    });
  }

  for (const old of existing) {
    if (!keepIds.has(old.id)) {
      await deleteFisa(old.id);
    }
  }

  await saveCatalogClients(data.clients ?? []);
  await saveCatalogEquipment(data.equipment ?? []);

  if (data.license) {
    await saveLicense(data.license);
  }
  if (data.session !== undefined) {
    if (data.session) await saveSession(data.session);
  }

  return { fiseCount: data.fise.length };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("read_failed"));
    };
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsText(file);
  });
}
