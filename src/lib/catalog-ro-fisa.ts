import type { CatalogClient, CatalogEquipment, TipFisa } from "./types";

type CatalogImportMode = "upsert" | "replace";

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

/** Parsed fields from a classic RO intervention / fișă sheet layout. */
export type RoFisaExtract = {
  nrFisa: string;
  proprietar: string;
  client: string;
  locatie: string;
  model: string;
  serie: string;
  oreFunctionare: string;
  reclamatie: string;
  observatii: string;
  tip: TipFisa | "";
};

const RO_FISA_MARKERS = [
  "utilaje profesionale",
  "fisa de constatare",
  "fisa de reparatie",
  "model utilaj",
  "reclamatie",
  "piese si materiale",
];

function isRoSectionStop(cell: string): boolean {
  const n = normHeader(cell);
  if (!n) return false;
  const stops = [
    "manopera",
    "deplasare",
    "reclamatie",
    "piese si materiale",
    "observatii",
    "data anuntarii",
    "data interventiei",
    "client: receptionare",
    "tehnicieni",
    "piesele mentionate",
    "fisa de constatare",
    "fisa de reparatie",
    "fisa de revizie",
    "punere in functiune",
    "utilaje profesionale",
  ];
  return stops.some(
    (s) =>
      n === s ||
      n.startsWith(s + " ") ||
      n.startsWith(s + ":") ||
      n.startsWith(s + ",") ||
      n.startsWith(s)
  );
}

/** Detect classic RO intervention sheet (label/value layout, not Clienti/Utilaje tables). */
export function isRoInterventionLayout(rows: string[][]): boolean {
  if (!rows.length) return false;
  const blob = rows
    .flat()
    .map((c) => normHeader(c))
    .filter(Boolean)
    .join(" || ");
  const hits = RO_FISA_MARKERS.filter((m) => blob.includes(m)).length;
  const hasModelOrSerie =
    blob.includes("model utilaj") || blob.includes("seria");
  return hits >= 2 && hasModelOrSerie;
}

function labelNorms(labels: string[]): string[] {
  return labels.map((l) => normHeader(l));
}

function cellLabelKind(
  cell: string,
  labels: string[]
): "exact" | "prefixed" | null {
  const n = normHeader(cell);
  if (!n) return null;
  for (const nl of labelNorms(labels)) {
    if (n === nl || n === `${nl}:`) return "exact";
    if (n.startsWith(`${nl}:`) || n.startsWith(`${nl} :`)) return "prefixed";
  }
  return null;
}

function valueAfterColon(raw: string, labels: string[]): string {
  const kind = cellLabelKind(raw, labels);
  if (!kind) return "";
  const idx = raw.indexOf(":");
  if (idx < 0) return "";
  return raw.slice(idx + 1).trim();
}

function isOtherFieldLabel(cell: string): boolean {
  return (
    cellLabelKind(cell, [
      "Nr.Fisa",
      "Nr Fisa",
      "PROPRIETAR",
      "CLIENT",
      "Locatie",
      "Locație",
      "MODEL UTILAJ",
      "Ore functionare",
      "Ore funcționare",
      "SERIA",
      "SERIE",
    ]) !== null
  );
}

/** Find value for a field label: same-cell after colon, else first non-empty cell to the right. */
function findLabeledValue(
  rows: string[][],
  labels: string[],
  opts?: { skipReceptionare?: boolean }
): string {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      const kind = cellLabelKind(cell, labels);
      if (!kind) continue;
      if (opts?.skipReceptionare && /receptionare/i.test(cell)) continue;
      const same = valueAfterColon(cell, labels);
      if (same) {
        if (opts?.skipReceptionare && /receptionare/i.test(same)) continue;
        return same;
      }
      for (let c2 = c + 1; c2 < row.length; c2++) {
        const v = cellStr(row[c2]);
        if (!v) continue;
        if (isOtherFieldLabel(v)) continue;
        if (opts?.skipReceptionare && /receptionare/i.test(v)) continue;
        return v;
      }
    }
  }
  return "";
}

function collectBlockText(rows: string[][], startLabels: string[]): string {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (!cellLabelKind(row[c], startLabels)) continue;
      const parts: string[] = [];
      const same = valueAfterColon(row[c], startLabels);
      if (same) parts.push(same);
      for (let c2 = c + 1; c2 < row.length; c2++) {
        const v = cellStr(row[c2]);
        if (v && !isRoSectionStop(v)) parts.push(v);
      }
      for (let r2 = r + 1; r2 < Math.min(rows.length, r + 10); r2++) {
        const row2 = rows[r2];
        const joined = row2.map(cellStr).filter(Boolean);
        if (!joined.length) {
          if (parts.length) break;
          continue;
        }
        if (joined.some((v) => isRoSectionStop(v) || isOtherFieldLabel(v)))
          break;
        parts.push(joined.join(" ").trim());
      }
      return parts.join("\n").trim();
    }
  }
  return "";
}

function detectRoTip(rows: string[][]): TipFisa | "" {
  const tipMap: { labels: string[]; tip: TipFisa }[] = [
    { labels: ["FISA DE CONSTATARE", "FIȘA DE CONSTATARE"], tip: "Constatare" },
    {
      labels: ["FISA DE REPARATIE", "FIȘA DE REPARAȚIE", "FISA DE REPARAȚIE"],
      tip: "Reparație",
    },
    { labels: ["FISA DE REVIZIE", "FIȘA DE REVIZIE"], tip: "Revizie" },
    {
      labels: ["PUNERE IN FUNCTIUNE", "PUNERE ÎN FUNCȚIUNE"],
      tip: "Punere în funcțiune",
    },
  ];
  const marks = new Set([
    "x",
    "xx",
    "da",
    "yes",
    "1",
    "✓",
    "✔",
    "☑",
    "[x]",
    "(x)",
  ]);

  for (const { labels, tip } of tipMap) {
    for (const row of rows) {
      for (let c = 0; c < row.length; c++) {
        const cell = cellStr(row[c]);
        if (!cell) continue;
        const n = normHeader(cell);
        for (const lab of labels) {
          const nl = normHeader(lab);
          if (n === nl || n === `${nl}:`) {
            for (const nb of [row[c - 1], row[c + 1]]) {
              if (nb && marks.has(normHeader(nb))) return tip;
            }
          }
          if (
            n.includes(nl) &&
            (n.startsWith("x ") || n.endsWith(" x") || n.startsWith("x\t"))
          ) {
            return tip;
          }
        }
      }
    }
  }
  return "";
}

/** Extract catalog-relevant fields from a RO fișă / intervention sheet. */
export function extractRoInterventionFields(rows: string[][]): RoFisaExtract {
  const early = rows.slice(0, 30);
  const proprietar = findLabeledValue(early, ["PROPRIETAR"]);
  const client =
    findLabeledValue(early, ["CLIENT"], { skipReceptionare: true }) || "";
  const reclamatie = collectBlockText(rows, [
    "RECLAMATIE /SOLICITARE CLIENT",
    "RECLAMATIE / SOLICITARE CLIENT",
    "RECLAMAȚIE / SOLICITARE CLIENT",
    "RECLAMATIE",
    "RECLAMAȚIE",
  ]);
  const observatii = collectBlockText(rows, [
    "OBSERVATII",
    "OBSERVAȚII",
    "Observatii",
  ]);

  return {
    nrFisa: findLabeledValue(early, [
      "Nr.Fisa",
      "Nr Fisa",
      "Nr. Fișa",
      "Nr.Fişa",
    ]),
    proprietar,
    client: client || proprietar,
    locatie: findLabeledValue(early, ["Locatie", "Locație"]),
    model: findLabeledValue(early, ["MODEL UTILAJ", "Model utilaj"]),
    serie: findLabeledValue(early, ["SERIA", "SERIE", "Serie"]),
    oreFunctionare: findLabeledValue(early, [
      "Ore functionare",
      "Ore funcționare",
    ]),
    reclamatie,
    observatii,
    tip: detectRoTip(rows),
  };
}

export function upsertClientFromRo(
  extracted: RoFisaExtract,
  existing: CatalogClient[],
  mode: CatalogImportMode
): {
  list: CatalogClient[];
  added: number;
  updated: number;
  skipped: number;
} {
  const name = extracted.client.trim();
  if (!name) {
    return {
      list: mode === "replace" ? [] : existing,
      added: 0,
      updated: 0,
      skipped: 1,
    };
  }
  const note = [extracted.reclamatie, extracted.observatii]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
  const byKey = new Map<string, CatalogClient>();
  const base = mode === "replace" ? [] : [...existing];
  for (const c of base) byKey.set(normKey(c.name), c);
  const now = new Date().toISOString();
  const key = normKey(name);
  const prev = byKey.get(key);
  let added = 0;
  let updated = 0;
  if (prev) {
    byKey.set(key, {
      ...prev,
      name,
      locatie: extracted.locatie || prev.locatie,
      note: note || prev.note,
      updatedAt: now,
    });
    updated = 1;
  } else {
    byKey.set(key, {
      id: crypto.randomUUID(),
      name,
      locatie: extracted.locatie || undefined,
      note: note || undefined,
      updatedAt: now,
    });
    added = 1;
  }
  return {
    list: Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    ),
    added,
    updated,
    skipped: 0,
  };
}

export function upsertEquipmentFromRo(
  extracted: RoFisaExtract,
  existing: CatalogEquipment[],
  mode: CatalogImportMode
): {
  list: CatalogEquipment[];
  added: number;
  updated: number;
  skipped: number;
} {
  const model = extracted.model.trim();
  if (!model) {
    return {
      list: mode === "replace" ? [] : existing,
      added: 0,
      updated: 0,
      skipped: 1,
    };
  }
  const serie = extracted.serie.trim();
  const clientName = extracted.client.trim();
  const note = [extracted.reclamatie, extracted.observatii]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
  const byKey = new Map<string, CatalogEquipment>();
  const base = mode === "replace" ? [] : [...existing];
  for (const e of base) {
    byKey.set(`${normKey(e.model)}|${normKey(e.serie || "")}`, e);
  }
  const now = new Date().toISOString();
  const key = `${normKey(model)}|${normKey(serie)}`;
  const prev = byKey.get(key);
  let added = 0;
  let updated = 0;
  if (prev) {
    byKey.set(key, {
      ...prev,
      model,
      serie: serie || undefined,
      clientName: clientName || prev.clientName,
      note: note || prev.note,
      updatedAt: now,
    });
    updated = 1;
  } else {
    byKey.set(key, {
      id: crypto.randomUUID(),
      model,
      serie: serie || undefined,
      clientName: clientName || undefined,
      note: note || undefined,
      updatedAt: now,
    });
    added = 1;
  }
  return {
    list: Array.from(byKey.values()).sort((a, b) =>
      a.model.localeCompare(b.model, undefined, { sensitivity: "base" })
    ),
    added,
    updated,
    skipped: 0,
  };
}
