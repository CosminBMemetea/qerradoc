"use client";

import * as XLSX from "xlsx";
import type { CatalogClient, CatalogEquipment } from "./types";
import {
  getCatalogClients,
  getCatalogEquipment,
  saveCatalogClients,
  saveCatalogEquipment,
} from "./db";
import { downloadBlob } from "./pdf";

export type CatalogImportMode = "upsert" | "replace";

export type CatalogImportResult = {
  clientsAdded: number;
  clientsUpdated: number;
  clientsSkipped: number;
  equipmentAdded: number;
  equipmentUpdated: number;
  equipmentSkipped: number;
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normHeader(h: unknown): string {
  return stripDiacritics(String(h ?? ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function normKey(s: string): string {
  return stripDiacritics(s.trim().toLowerCase());
}

const CLIENT_SHEETS = new Set(
  ["clienti", "clients", "klienci", "client"].map(normHeader)
);
const EQUIP_SHEETS = new Set(
  [
    "utilaje",
    "equipment",
    "urzadzenia",
    "urządzenia",
    "equipments",
    "machines",
  ].map(normHeader)
);

const CLIENT_NAME_HEADERS = new Set(
  ["client", "nume", "name", "klient", "nazwa"].map(normHeader)
);
const CLIENT_LOC_HEADERS = new Set(
  ["locatie", "location", "adres", "adresa", "address", "lokalizacja"].map(
    normHeader
  )
);
const NOTE_HEADERS = new Set(
  ["note", "notes", "observatii", "uwagi", "observații"].map(normHeader)
);

const MODEL_HEADERS = new Set(
  [
    "model",
    "utilaj",
    "model utilaj",
    "equipment",
    "maszyna",
    "urzadzenie",
    "urządzenie",
  ].map(normHeader)
);
const SERIE_HEADERS = new Set(
  ["serie", "serial", "s/n", "sn", "nr seryjny", "numer seryjny"].map(
    normHeader
  )
);
const CLIENT_REF_HEADERS = new Set(
  ["client", "clientname", "client name", "klient", "nume client"].map(
    normHeader
  )
);

function mapColumns(
  headers: string[]
): Record<"name" | "locatie" | "note" | "model" | "serie" | "clientName", number | undefined> {
  const out: Record<string, number | undefined> = {};
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (out.name === undefined && CLIENT_NAME_HEADERS.has(n)) out.name = i;
    if (out.locatie === undefined && CLIENT_LOC_HEADERS.has(n)) out.locatie = i;
    if (out.note === undefined && NOTE_HEADERS.has(n)) out.note = i;
    if (out.model === undefined && MODEL_HEADERS.has(n)) out.model = i;
    if (out.serie === undefined && SERIE_HEADERS.has(n)) out.serie = i;
    if (out.clientName === undefined && CLIENT_REF_HEADERS.has(n))
      out.clientName = i;
  });
  return out as Record<
    "name" | "locatie" | "note" | "model" | "serie" | "clientName",
    number | undefined
  >;
}

function detectSheetKind(
  name: string,
  cols: ReturnType<typeof mapColumns>
): "clients" | "equipment" | null {
  const n = normHeader(name);
  if (CLIENT_SHEETS.has(n)) return "clients";
  if (EQUIP_SHEETS.has(n)) return "equipment";
  // Heuristic from columns
  if (cols.model !== undefined) return "equipment";
  if (cols.name !== undefined) return "clients";
  return null;
}

function rowsFromSheet(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];
  return rows.map((r) =>
    (Array.isArray(r) ? r : []).map((c) => cellStr(c))
  );
}

function parseClientsRows(
  rows: string[][],
  existing: CatalogClient[],
  mode: CatalogImportMode
): {
  list: CatalogClient[];
  added: number;
  updated: number;
  skipped: number;
} {
  if (rows.length === 0) {
    return {
      list: mode === "replace" ? [] : existing,
      added: 0,
      updated: 0,
      skipped: 0,
    };
  }
  const headers = rows[0];
  const cols = mapColumns(headers);
  if (cols.name === undefined) {
    return {
      list: mode === "replace" ? [] : existing,
      added: 0,
      updated: 0,
      skipped: rows.length - 1,
    };
  }

  const byKey = new Map<string, CatalogClient>();
  const base = mode === "replace" ? [] : [...existing];
  for (const c of base) byKey.set(normKey(c.name), c);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = cellStr(row[cols.name!]);
    if (!name) {
      skipped++;
      continue;
    }
    const locatie =
      cols.locatie !== undefined ? cellStr(row[cols.locatie]) : "";
    const note = cols.note !== undefined ? cellStr(row[cols.note]) : "";
    const key = normKey(name);
    const prev = byKey.get(key);
    if (prev) {
      byKey.set(key, {
        ...prev,
        name,
        locatie: locatie || prev.locatie,
        note: note || prev.note,
        updatedAt: now,
      });
      updated++;
    } else {
      byKey.set(key, {
        id: crypto.randomUUID(),
        name,
        locatie: locatie || undefined,
        note: note || undefined,
        updatedAt: now,
      });
      added++;
    }
  }

  return {
    list: Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    ),
    added,
    updated,
    skipped,
  };
}

function parseEquipmentRows(
  rows: string[][],
  existing: CatalogEquipment[],
  mode: CatalogImportMode
): {
  list: CatalogEquipment[];
  added: number;
  updated: number;
  skipped: number;
} {
  if (rows.length === 0) {
    return {
      list: mode === "replace" ? [] : existing,
      added: 0,
      updated: 0,
      skipped: 0,
    };
  }
  const headers = rows[0];
  const cols = mapColumns(headers);
  if (cols.model === undefined) {
    return {
      list: mode === "replace" ? [] : existing,
      added: 0,
      updated: 0,
      skipped: rows.length - 1,
    };
  }

  const byKey = new Map<string, CatalogEquipment>();
  const base = mode === "replace" ? [] : [...existing];
  for (const e of base) {
    byKey.set(`${normKey(e.model)}|${normKey(e.serie || "")}`, e);
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const model = cellStr(row[cols.model!]);
    if (!model) {
      skipped++;
      continue;
    }
    const serie =
      cols.serie !== undefined ? cellStr(row[cols.serie]) : "";
    const clientName =
      cols.clientName !== undefined ? cellStr(row[cols.clientName]) : "";
    const note = cols.note !== undefined ? cellStr(row[cols.note]) : "";
    const key = `${normKey(model)}|${normKey(serie)}`;
    const prev = byKey.get(key);
    if (prev) {
      byKey.set(key, {
        ...prev,
        model,
        serie: serie || undefined,
        clientName: clientName || prev.clientName,
        note: note || prev.note,
        updatedAt: now,
      });
      updated++;
    } else {
      byKey.set(key, {
        id: crypto.randomUUID(),
        model,
        serie: serie || undefined,
        clientName: clientName || undefined,
        note: note || undefined,
        updatedAt: now,
      });
      added++;
    }
  }

  return {
    list: Array.from(byKey.values()).sort((a, b) =>
      a.model.localeCompare(b.model, undefined, { sensitivity: "base" })
    ),
    added,
    updated,
    skipped,
  };
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("read_failed"));
    };
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Import clients + equipment from .xlsx / .xls / .csv.
 * Prefer workbook sheets Clienti/Utilaje (also Clients/Equipment, Klienci/Urzadzenia).
 * Single-sheet CSV: detect by columns (Model → equipment, Client/Nume → clients).
 */
export async function importCatalogFile(
  file: File,
  mode: CatalogImportMode = "upsert"
): Promise<CatalogImportResult> {
  const buf = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: "array", codepage: 65001 });

  const [existingClients, existingEquip] = await Promise.all([
    getCatalogClients(),
    getCatalogEquipment(),
  ]);

  let clientsResult = {
    list: mode === "replace" ? ([] as CatalogClient[]) : existingClients,
    added: 0,
    updated: 0,
    skipped: 0,
  };
  let equipResult = {
    list: mode === "replace" ? ([] as CatalogEquipment[]) : existingEquip,
    added: 0,
    updated: 0,
    skipped: 0,
  };

  let sawClients = false;
  let sawEquip = false;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = rowsFromSheet(sheet);
    if (rows.length < 1) continue;
    const cols = mapColumns(rows[0]);
    const kind = detectSheetKind(sheetName, cols);
    if (kind === "clients") {
      const r = parseClientsRows(
        rows,
        sawClients ? clientsResult.list : existingClients,
        mode === "replace" && !sawClients ? "replace" : "upsert"
      );
      clientsResult = {
        list: r.list,
        added: clientsResult.added + r.added,
        updated: clientsResult.updated + r.updated,
        skipped: clientsResult.skipped + r.skipped,
      };
      sawClients = true;
    } else if (kind === "equipment") {
      const r = parseEquipmentRows(
        rows,
        sawEquip ? equipResult.list : existingEquip,
        mode === "replace" && !sawEquip ? "replace" : "upsert"
      );
      equipResult = {
        list: r.list,
        added: equipResult.added + r.added,
        updated: equipResult.updated + r.updated,
        skipped: equipResult.skipped + r.skipped,
      };
      sawEquip = true;
    }
  }

  // Single unnamed / generic sheet (CSV often becomes "Sheet1")
  if (!sawClients && !sawEquip && wb.SheetNames.length >= 1) {
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = rowsFromSheet(sheet);
    if (rows.length >= 1) {
      const cols = mapColumns(rows[0]);
      if (cols.model !== undefined) {
        equipResult = parseEquipmentRows(rows, existingEquip, mode);
      } else if (cols.name !== undefined) {
        clientsResult = parseClientsRows(rows, existingClients, mode);
      }
    }
  }

  await Promise.all([
    saveCatalogClients(clientsResult.list),
    saveCatalogEquipment(equipResult.list),
  ]);

  return {
    clientsAdded: clientsResult.added,
    clientsUpdated: clientsResult.updated,
    clientsSkipped: clientsResult.skipped,
    equipmentAdded: equipResult.added,
    equipmentUpdated: equipResult.updated,
    equipmentSkipped: equipResult.skipped,
  };
}

/** Export current catalogs as a workbook with Clienti + Utilaje sheets. */
export async function exportCatalogDownload(): Promise<{
  clients: number;
  equipment: number;
  filename: string;
}> {
  const [clients, equipment] = await Promise.all([
    getCatalogClients(),
    getCatalogEquipment(),
  ]);
  const wb = XLSX.utils.book_new();
  const clientsAoa: (string | undefined)[][] = [
    ["Client", "Locatie", "Note"],
    ...clients.map((c) => [c.name, c.locatie || "", c.note || ""]),
  ];
  const equipAoa: (string | undefined)[][] = [
    ["Model", "Serie", "Client", "Note"],
    ...equipment.map((e) => [
      e.model,
      e.serie || "",
      e.clientName || "",
      e.note || "",
    ]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(clientsAoa),
    "Clienti"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(equipAoa),
    "Utilaje"
  );
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const y = new Date();
  const filename = `querra-catalog-${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}.xlsx`;
  downloadBlob(blob, filename);
  return { clients: clients.length, equipment: equipment.length, filename };
}
