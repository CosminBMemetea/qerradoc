/**
 * Filled client Excel (classic RO intervention / fișă layout) → draft Fisa.
 *
 * Pure module (no IndexedDB / DOM) so it runs in the browser and in Node smoke
 * scripts. Uses the same `xlsx` lib as catalog import. The layout is Romanian,
 * so drafts are always created with contentLocale "ro"; UI language is never
 * consulted here.
 *
 * Label matching ignores diacritics, case, punctuation and trailing colons; the
 * value may be inline after the colon, in the next non-empty cell to the right
 * (after any merged range), or in the cell below.
 */
import * as XLSX from "xlsx";
import type { CurrencyCode } from "./currency";
import { isRoInterventionLayout, type RoFisaExtract } from "./catalog-ro-fisa";
import { EMPTY_PIESE, emptyFisa, type Fisa, type Piesa, type TipFisa } from "./types";

// ───────────────────────── text helpers ─────────────────────────

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Lowercase, no diacritics, collapsed spaces, no trailing colons/spaces. */
export function normLabel(s: unknown): string {
  return stripDiacritics(String(s ?? ""))
    .replace(/[\u00a0\u202f]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s:]+$/, "");
}

/** normLabel + punctuation removed ("Nr.Fisa:" → "nr fisa"). */
function loose(s: unknown): string {
  return normLabel(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ───────────────────────── number / date parsing ─────────────────────────

/**
 * Parse a number written the Romanian way ("345,50", "1.250,00", "2 ore",
 * "35 km", "89,90 lei") or the dot way ("242.50"). Returns null if no number.
 */
export function parseRoNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw == null) return null;
  let s = String(raw).replace(/[\s\u00a0\u202f]/g, "");
  s = s.replace(/[^0-9,.\-]/g, "");
  if (!/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const commas = (s.match(/,/g) || []).length;
    s = commas > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot >= 0) {
    // "1.250" / "12.500.000" → thousands; "242.50" / "2.5" → decimal
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtNum(n: number, decimals?: number): string {
  if (decimals != null) return n.toFixed(decimals);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function validYmd(y: number, m: number, d: number): string {
  if (y < 1950 || y > 2150 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** dd.mm.yyyy / dd/mm/yyyy / dd-mm-yy / yyyy-mm-dd / Excel serial → "YYYY-MM-DD" ("" if none). */
export function parseRoDate(raw: unknown): string {
  if (typeof raw === "number") {
    if (raw < 20000 || raw > 80000) return ""; // ~1954 … ~2119
    const dc = XLSX.SSF.parse_date_code(raw);
    return dc ? validYmd(dc.y, dc.m, dc.d) : "";
  }
  const s = String(raw ?? "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return validYmd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})(?!\d)/);
  if (m) {
    let y = +m[3];
    if (m[3].length === 2) y += 2000;
    return validYmd(y, +m[2], +m[1]);
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) return parseRoDate(Number(s));
  return "";
}

// ───────────────────────── grid ─────────────────────────

type Cell = { text: string; num?: number };

class Grid {
  readonly minR: number;
  readonly maxR: number;
  readonly minC: number;
  readonly maxC: number;
  private cells = new Map<string, Cell>();
  private merges: XLSX.Range[];

  constructor(sheet: XLSX.WorkSheet) {
    const ref = sheet["!ref"];
    const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: -1, c: -1 } };
    this.minR = range.s.r;
    this.maxR = range.e.r;
    this.minC = range.s.c;
    this.maxC = range.e.c;
    this.merges = (sheet["!merges"] as XLSX.Range[] | undefined) || [];
    for (let r = this.minR; r <= this.maxR; r++) {
      for (let c = this.minC; c <= this.maxC; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
        if (!cell || cell.v == null) continue;
        let text: string;
        let num: number | undefined;
        if (typeof cell.v === "number") {
          num = cell.v;
          text = String(cell.v);
        } else if (cell.v instanceof Date) {
          text = cell.v.toISOString().slice(0, 10);
        } else {
          text = String(cell.v).replace(/\r\n?/g, "\n").trim();
        }
        if (!text) continue;
        this.cells.set(`${r},${c}`, { text, num });
      }
    }
  }

  get(r: number, c: number): Cell | undefined {
    return this.cells.get(`${r},${c}`);
  }

  text(r: number, c: number): string {
    return this.get(r, c)?.text ?? "";
  }

  /** Bottom-right corner of the merge containing (r,c), or (r,c) itself. */
  mergeEnd(r: number, c: number): { r: number; c: number } {
    for (const m of this.merges) {
      if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) return { r: m.e.r, c: m.e.c };
    }
    return { r, c };
  }

  /** Rows as string[][] for the existing layout detector. */
  toRows(): string[][] {
    const out: string[][] = [];
    for (let r = this.minR; r <= this.maxR; r++) {
      const row: string[] = [];
      for (let c = this.minC; c <= this.maxC; c++) row.push(this.text(r, c));
      out.push(row);
    }
    return out;
  }
}

// ───────────────────────── labels ─────────────────────────

type FieldKey =
  | "nrFisa"
  | "proprietar"
  | "client"
  | "locatie"
  | "modelUtilaj"
  | "oreFunctionare"
  | "serie"
  | "manoperaOre"
  | "deplasareKm"
  | "reclamatie"
  | "observatii"
  | "motiveInlocuire"
  | "dataAnuntarii"
  | "dataInterventiei"
  | "semnaturaClient"
  | "semnaturaTehnician";

/** Sheet label (loose form) → Fisa field. Order matters only for readability. */
export const RO_SHEET_LABELS: Record<FieldKey, string[]> = {
  nrFisa: ["nr fisa", "nr fisei", "numar fisa", "fisa nr", "nr fisa interventie"],
  proprietar: ["proprietar"],
  client: ["client", "beneficiar"],
  locatie: ["locatie", "locatia", "adresa"],
  modelUtilaj: ["model utilaj", "model", "utilaj"],
  oreFunctionare: ["ore functionare", "ore de functionare"],
  serie: ["seria", "serie", "seria utilaj", "serie utilaj", "nr serie"],
  manoperaOre: ["manopera ore", "manopera"],
  deplasareKm: ["deplasare km", "deplasare"],
  reclamatie: [
    "reclamatie solicitare client",
    "reclamatie",
    "reclamatie client",
    "solicitare client",
  ],
  observatii: ["observatii"],
  motiveInlocuire: [
    "piesele mentionate au fost inlocuite din urmatoarele motive",
    "motive inlocuire",
  ],
  dataAnuntarii: ["data anuntarii defectiunii", "data anuntarii"],
  dataInterventiei: ["data interventiei tehnice", "data interventiei"],
  semnaturaClient: ["client receptionare constatare reparatie", "client receptionare"],
  semnaturaTehnician: ["tehnicieni", "tehnician"],
};

const TIP_TITLES: { tip: TipFisa; label: string }[] = [
  { tip: "Constatare", label: "fisa de constatare" },
  { tip: "Reparație", label: "fisa de reparatie" },
  { tip: "Revizie", label: "fisa de revizie" },
  { tip: "Punere în funcțiune", label: "punere in functiune" },
];

/** Printed hints under signature boxes: skipped when looking below a label. */
const HINT_LABELS = ["semnatura stampila nume b i c i", "nume semnatura"];

/** Other printed text of the template — acts as a boundary, never as a value. */
const OTHER_LABELS = [
  "utilaje profesionale pentru curatenie",
  "piese si materiale",
  "denumire piesa material",
  "nr",
  "cod",
  "cant",
  ...HINT_LABELS,
];

type LabelHit =
  | { kind: "field"; key: FieldKey; inline: string }
  | { kind: "tip"; tip: TipFisa }
  | { kind: "hint" }
  | { kind: "other" };

function classify(text: string): LabelHit | null {
  const L = loose(text);
  if (!L) return null;
  // 1) whole-cell label (longest wins, e.g. "client receptionare…" before "client")
  let best: { key: FieldKey; len: number } | null = null;
  for (const [key, labels] of Object.entries(RO_SHEET_LABELS) as [FieldKey, string[]][]) {
    for (const lab of labels) {
      if (L === lab && (!best || lab.length > best.len)) best = { key, len: lab.length };
    }
  }
  if (best) return { kind: "field", key: best.key, inline: "" };
  if (HINT_LABELS.includes(L)) return { kind: "hint" };
  for (const t of TIP_TITLES) if (L.includes(t.label)) return { kind: "tip", tip: t.tip };
  if (OTHER_LABELS.includes(L) || L.startsWith("pret ") || L === "pret") return { kind: "other" };
  // 2) "Label: value" in the same cell
  const idx = text.indexOf(":");
  if (idx > 0) {
    const head = loose(text.slice(0, idx));
    const rest = text.slice(idx + 1).trim();
    for (const [key, labels] of Object.entries(RO_SHEET_LABELS) as [FieldKey, string[]][]) {
      if (labels.includes(head)) return { kind: "field", key, inline: rest };
    }
  }
  return null;
}

// ───────────────────────── value lookup ─────────────────────────

type Accept = (cell: Cell) => boolean;

function findLabelCells(g: Grid, key: FieldKey): { r: number; c: number; inline: string }[] {
  const out: { r: number; c: number; inline: string }[] = [];
  for (let r = g.minR; r <= g.maxR; r++) {
    for (let c = g.minC; c <= g.maxC; c++) {
      const t = g.text(r, c);
      if (!t) continue;
      const hit = classify(t);
      if (hit?.kind === "field" && hit.key === key) out.push({ r, c, inline: hit.inline });
    }
  }
  return out;
}

/** Value for a label: inline → right (until next label) → below (skip hints). */
function valueNear(
  g: Grid,
  at: { r: number; c: number; inline: string },
  opts: { maxDown: number; accept?: Accept }
): Cell | undefined {
  const accept = opts.accept ?? (() => true);
  if (at.inline) {
    const inl: Cell = { text: at.inline };
    if (accept(inl)) return inl;
  }
  const end = g.mergeEnd(at.r, at.c);
  for (let c = end.c + 1; c <= g.maxC; c++) {
    const cell = g.get(at.r, c);
    if (!cell) continue;
    if (classify(cell.text)) break;
    if (accept(cell)) return cell;
  }
  let r = end.r + 1;
  let steps = 0;
  while (r <= g.maxR && steps < opts.maxDown) {
    const cell = g.get(r, at.c);
    const mEnd = g.mergeEnd(r, at.c);
    steps++;
    if (cell) {
      const hit = classify(cell.text);
      if (hit && hit.kind !== "hint") break;
      if (!hit && accept(cell)) return cell;
    }
    r = mEnd.r + 1;
  }
  return undefined;
}

function scalar(g: Grid, key: FieldKey, opts: { maxDown: number; accept?: Accept }): Cell | undefined {
  for (const at of findLabelCells(g, key)) {
    const v = valueNear(g, at, opts);
    if (v) return v;
  }
  return undefined;
}

/** Multi-line block (reclamație, observații, motive): inline + rest of row + rows below until a label. */
function block(g: Grid, key: FieldKey): string {
  for (const at of findLabelCells(g, key)) {
    const parts: string[] = [];
    if (at.inline) parts.push(at.inline);
    const end = g.mergeEnd(at.r, at.c);
    for (let c = end.c + 1; c <= g.maxC; c++) {
      const t = g.text(at.r, c);
      if (!t) continue;
      if (classify(t)) break;
      parts.push(t);
    }
    let blanks = 0;
    for (let r = end.r + 1; r <= Math.min(g.maxR, end.r + 12); r++) {
      const texts: string[] = [];
      let hitLabel = false;
      for (let c = g.minC; c <= g.maxC; c++) {
        const t = g.text(r, c);
        if (!t) continue;
        if (classify(t)) {
          hitLabel = true;
          break;
        }
        texts.push(t);
      }
      if (hitLabel) break;
      if (!texts.length) {
        if (parts.length && ++blanks >= 2) break;
        continue;
      }
      blanks = 0;
      parts.push(texts.join(" "));
    }
    const text = parts.join("\n").trim();
    if (text) return text;
  }
  return "";
}

// ───────────────────────── tip / deplasare / currency ─────────────────────────

const MARK_RE = /^(x|xx|v|da|1|\[x\]|\(x\)|[✓✔☑☒■●◼✗✘])$/i;

function hasMark(text: string, word: string): boolean {
  // "X FISA DE REPARATIE", "FISA DE REPARATIE X", "☑ …", "[x] …", "DA X"
  const n = normLabel(text).replace(word, " ").replace(/[.:]/g, " ").trim();
  if (!n) return false;
  return n.split(/\s+/).some((tok) => MARK_RE.test(tok) && tok !== "da" && tok !== "1") ||
    /[✓✔☑☒■●◼✗✘]/.test(n);
}

function isMarkCell(text: string | undefined): boolean {
  if (!text) return false;
  return MARK_RE.test(normLabel(text).replace(/\s+/g, ""));
}

function detectTip(g: Grid): TipFisa | "" {
  const found: { tip: TipFisa; marked: boolean }[] = [];
  for (let r = g.minR; r <= g.maxR; r++) {
    for (let c = g.minC; c <= g.maxC; c++) {
      const t = g.text(r, c);
      if (!t) continue;
      const hit = classify(t);
      if (hit?.kind !== "tip") continue;
      const lab = TIP_TITLES.find((x) => x.tip === hit.tip)!.label;
      const end = g.mergeEnd(r, c);
      const marked =
        hasMark(stripDiacritics(t).toLowerCase(), lab) ||
        isMarkCell(g.text(r, c - 1)) ||
        isMarkCell(g.text(r, end.c + 1));
      found.push({ tip: hit.tip, marked });
    }
  }
  const marked = found.filter((f) => f.marked);
  if (marked.length >= 1) return marked[0].tip;
  const unique = Array.from(new Set(found.map((f) => f.tip)));
  if (unique.length === 1) return unique[0]; // other titles deleted → the remaining one
  return "";
}

function detectDeplasareDaNu(g: Grid, km: number | null): "DA" | "NU" | "" {
  const at = findLabelCells(g, "deplasareKm")[0];
  if (!at) return "";
  type Opt = { v: "DA" | "NU"; c: number; marked: boolean };
  const opts: Opt[] = [];
  const inl = normLabel(at.inline);
  if (/\bda\b/.test(inl) && !/\bnu\b/.test(inl)) return "DA";
  if (/\bnu\b/.test(inl) && !/\bda\b/.test(inl)) return "NU";
  const end = g.mergeEnd(at.r, at.c);
  for (let c = end.c + 1; c <= g.maxC; c++) {
    const t = g.text(at.r, c);
    if (!t) continue;
    const n = normLabel(t);
    const isDa = /(^|[^a-z])da([^a-z]|$)/.test(n);
    const isNu = /(^|[^a-z])nu([^a-z]|$)/.test(n);
    if (isDa === isNu) continue;
    const v = isDa ? "DA" : "NU";
    opts.push({ v, c, marked: hasMark(n, v.toLowerCase()) });
  }
  const marked = opts.filter((o) => o.marked);
  if (marked.length === 1) return marked[0].v;
  // A lone mark cell right next to an option
  for (const o of opts) {
    if (isMarkCell(g.text(at.r, o.c + 1)) && !opts.some((p) => p.c === o.c + 1)) return o.v;
  }
  const kinds = Array.from(new Set(opts.map((o) => o.v)));
  if (kinds.length === 1) return kinds[0]; // the other option was deleted
  if (km != null && km > 0) return "DA";
  return "";
}

function currencyHint(text: string): CurrencyCode | null {
  const n = stripDiacritics(text).toLowerCase();
  if (/€|\beur\b|\beuro\b/.test(n)) return "EUR";
  if (/\blei\b|\bron\b/.test(n)) return "RON";
  return null;
}

// ───────────────────────── parts table ─────────────────────────

function parseParts(g: Grid): {
  piese: Piesa[];
  overflow: number;
  priceHeader: string;
  priceTexts: string[];
} {
  const empty = { piese: EMPTY_PIESE(), overflow: 0, priceHeader: "", priceTexts: [] };
  for (let r = g.minR; r <= g.maxR; r++) {
    let den = -1;
    for (let c = g.minC; c <= g.maxC; c++) {
      if (loose(g.text(r, c)).startsWith("denumire")) {
        den = c;
        break;
      }
    }
    if (den < 0) continue;
    let cod = -1;
    let cant = -1;
    let pret = -1;
    let headEnd = r;
    for (let c = g.minC; c <= g.maxC; c++) {
      const L = loose(g.text(r, c));
      if (!L) continue;
      if (cod < 0 && (L === "cod" || L.startsWith("cod "))) cod = c;
      else if (cant < 0 && (L.startsWith("cant") || L === "buc")) cant = c;
      else if (pret < 0 && (L.startsWith("pret") || L.startsWith("valoare"))) pret = c;
      headEnd = Math.max(headEnd, g.mergeEnd(r, c).r);
    }
    const denEnd = g.mergeEnd(r, den).c;
    const nextCol = [cod, cant, pret].filter((x) => x > den).sort((a, b) => a - b)[0] ?? denEnd + 1;
    const pretEndC = pret >= 0 ? g.mergeEnd(r, pret).c : -1;
    const rows: Piesa[] = [];
    const priceTexts: string[] = [];
    let overflow = 0;
    for (let rr = headEnd + 1; rr <= g.maxR; rr++) {
      // Stop at the next section of the template
      let stop = false;
      for (let c = g.minC; c <= g.maxC; c++) {
        const t = g.text(rr, c);
        const hit = t ? classify(t) : null;
        if (hit && hit.kind === "field") {
          stop = true;
          break;
        }
      }
      if (stop) break;
      const denParts: string[] = [];
      for (let c = den; c < Math.max(nextCol, den + 1); c++) {
        const t = g.text(rr, c);
        if (t) denParts.push(t);
      }
      const denumire = denParts.join(" ").trim();
      const codTxt = cod >= 0 ? g.text(rr, cod) : "";
      const qCell = cant >= 0 ? g.get(rr, cant) : undefined;
      let pCell = pret >= 0 ? g.get(rr, pret) : undefined;
      if (!pCell && pretEndC > pret) {
        for (let c = pret + 1; c <= pretEndC && !pCell; c++) pCell = g.get(rr, c);
      }
      if (!denumire && !codTxt) continue;
      if (rows.length >= 15) {
        overflow++;
        continue;
      }
      const q = qCell ? parseRoNumber(qCell.num ?? qCell.text) : null;
      const p = pCell ? parseRoNumber(pCell.num ?? pCell.text) : null;
      if (pCell) priceTexts.push(pCell.text);
      rows.push({
        nr: rows.length + 1,
        denumire,
        cod: codTxt,
        cantitate: q != null ? fmtNum(q) : qCell?.text ?? "",
        pretEur: p != null ? fmtNum(p, 2) : pCell?.text ?? "",
      });
    }
    const piese = EMPTY_PIESE();
    rows.forEach((p, i) => (piese[i] = p));
    return {
      piese,
      overflow,
      priceHeader: pret >= 0 ? g.text(r, pret) : "",
      priceTexts,
    };
  }
  return empty;
}

// ───────────────────────── public API ─────────────────────────

/** Everything read from one sheet, already in Fisa shapes. */
export type RoFisaDraftFields = {
  tip: TipFisa | "";
  nrFisa: string;
  proprietar: string;
  client: string;
  locatie: string;
  modelUtilaj: string;
  serie: string;
  oreFunctionare: string;
  manoperaOre: string;
  deplasareKm: string;
  deplasareDaNu: "DA" | "NU" | "";
  reclamatie: string;
  piese: Piesa[];
  dataAnuntarii: string;
  dataInterventiei: string;
  observatii: string;
  motiveInlocuire: string;
  semnaturaClient: string;
  semnaturaTehnician: string;
  /** EUR only when the sheet states €/EUR for filled prices; otherwise RON. */
  currency: CurrencyCode;
  /** True when the currency came from an explicit sheet statement. */
  currencyStated: boolean;
};

export type RoFisaDraftParse =
  | {
      ok: true;
      sheetName: string;
      fields: RoFisaDraftFields;
      warnings: string[];
    }
  | { ok: false; error: "not_fisa" | "empty" };

const numAccept: Accept = (c) => parseRoNumber(c.num ?? c.text) != null;
const dateAccept: Accept = (c) => parseRoDate(c.num ?? c.text) !== "";

function numField(g: Grid, key: FieldKey): { text: string; n: number | null } {
  const cell = scalar(g, key, { maxDown: 1, accept: numAccept });
  if (!cell) return { text: "", n: null };
  const n = parseRoNumber(cell.num ?? cell.text);
  return { text: n != null ? fmtNum(n) : cell.text, n };
}

function textField(g: Grid, key: FieldKey, maxDown = 1): string {
  return scalar(g, key, { maxDown })?.text.trim() ?? "";
}

function dateField(g: Grid, key: FieldKey): string {
  const cell = scalar(g, key, { maxDown: 4, accept: dateAccept });
  return cell ? parseRoDate(cell.num ?? cell.text) : "";
}

/** Parse one worksheet in the RO fișă layout (null if the layout is not recognised). */
export function parseRoFisaSheet(sheet: XLSX.WorkSheet): RoFisaDraftFields | null {
  const g = new Grid(sheet);
  if (!isRoInterventionLayout(g.toRows())) return null;

  const km = numField(g, "deplasareKm");
  const parts = parseParts(g);
  const filledPrices = parts.piese.some((p) => p.pretEur.trim());
  let currency: CurrencyCode = "RON";
  let currencyStated = false;
  const cellHints = parts.priceTexts.map(currencyHint).filter(Boolean) as CurrencyCode[];
  if (cellHints.length) {
    currency = cellHints.includes("EUR") && !cellHints.includes("RON") ? "EUR" : "RON";
    currencyStated = currency === "EUR";
  } else if (filledPrices && currencyHint(parts.priceHeader) === "EUR") {
    currency = "EUR";
    currencyStated = true;
  }

  return {
    tip: detectTip(g),
    nrFisa: textField(g, "nrFisa"),
    proprietar: textField(g, "proprietar"),
    client: textField(g, "client"),
    locatie: textField(g, "locatie"),
    modelUtilaj: textField(g, "modelUtilaj"),
    serie: textField(g, "serie"),
    oreFunctionare: numField(g, "oreFunctionare").text,
    manoperaOre: numField(g, "manoperaOre").text,
    deplasareKm: km.text,
    deplasareDaNu: detectDeplasareDaNu(g, km.n),
    reclamatie: block(g, "reclamatie"),
    piese: parts.piese,
    dataAnuntarii: dateField(g, "dataAnuntarii"),
    dataInterventiei: dateField(g, "dataInterventiei"),
    observatii: block(g, "observatii"),
    motiveInlocuire: block(g, "motiveInlocuire"),
    semnaturaClient: textField(g, "semnaturaClient", 5),
    semnaturaTehnician: textField(g, "semnaturaTehnician", 5),
    currency,
    currencyStated,
  };
}

/** True if the sheet carries at least one filled value (not just the printed template). */
export function hasDraftData(f: RoFisaDraftFields): boolean {
  const scalars = [
    f.nrFisa, f.proprietar, f.client, f.locatie, f.modelUtilaj, f.serie,
    f.oreFunctionare, f.manoperaOre, f.deplasareKm, f.reclamatie,
    f.dataAnuntarii, f.dataInterventiei, f.observatii, f.motiveInlocuire,
    f.semnaturaClient, f.semnaturaTehnician,
  ];
  return (
    scalars.some((s) => s.trim()) ||
    f.piese.some((p) => p.denumire.trim() || p.cod.trim())
  );
}

/** First sheet in the RO layout that carries data. */
export function parseRoFisaWorkbook(wb: XLSX.WorkBook): RoFisaDraftParse {
  let sawLayout = false;
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const fields = parseRoFisaSheet(sheet);
    if (!fields) continue;
    sawLayout = true;
    if (!hasDraftData(fields)) continue;
    const warnings: string[] = [];
    if (!fields.tip) warnings.push("tip_default");
    return { ok: true, sheetName: name, fields, warnings };
  }
  return { ok: false, error: sawLayout ? "empty" : "not_fisa" };
}

/** Read .xlsx/.xls/.csv bytes. CSV is read as plain text so "18.09.2026" / "345,50" stay intact. */
export function readRoWorkbook(data: ArrayBuffer | Uint8Array, filename = ""): XLSX.WorkBook {
  const isCsv = /\.(csv|txt)$/i.test(filename);
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  return XLSX.read(u8, { type: "array", codepage: 65001, raw: isCsv });
}

/** Normal numbering used by the other "new fișă" flows. */
export function nextFisaNumber(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getTime()).slice(-4)}`;
}

/**
 * Build a NEW draft Fisa from parsed fields via emptyFisa (fresh id, defaults,
 * 15 parts rows). contentLocale is always "ro"; drawn signatures stay empty.
 */
export function buildRoDraftFisa(
  f: RoFisaDraftFields,
  opts: { technicianName?: string; now?: Date } = {}
): Fisa {
  const now = opts.now ?? new Date();
  return emptyFisa({
    ...(f.tip ? { tip: f.tip } : {}),
    nrFisa: f.nrFisa || nextFisaNumber(now),
    proprietar: f.proprietar,
    client: f.client,
    locatie: f.locatie,
    modelUtilaj: f.modelUtilaj,
    serie: f.serie,
    oreFunctionare: f.oreFunctionare,
    manoperaOre: f.manoperaOre,
    deplasareKm: f.deplasareKm,
    deplasareDaNu: f.deplasareDaNu,
    reclamatie: f.reclamatie,
    piese: f.piese,
    dataAnuntarii: f.dataAnuntarii,
    ...(f.dataInterventiei ? { dataInterventiei: f.dataInterventiei } : {}),
    observatii: f.observatii,
    motiveInlocuire: f.motiveInlocuire,
    semnaturaClient: f.semnaturaClient,
    semnaturaTehnician: f.semnaturaTehnician || opts.technicianName || "",
    contentLocale: "ro",
    currency: f.currency,
    currencyManual: f.currencyStated,
    reviewed: false,
  });
}

/** Catalog-upsert shape (same as the Settings RO import). */
export function roExtractFromDraft(f: RoFisaDraftFields): RoFisaExtract {
  return {
    nrFisa: f.nrFisa,
    proprietar: f.proprietar,
    client: f.client || f.proprietar,
    locatie: f.locatie,
    model: f.modelUtilaj,
    serie: f.serie,
    oreFunctionare: f.oreFunctionare,
    reclamatie: f.reclamatie,
    observatii: f.observatii,
    tip: f.tip,
  };
}
