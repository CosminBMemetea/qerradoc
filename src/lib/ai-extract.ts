/**
 * Voice/text → fișă fields via an LLM (server route /api/extract).
 * Isomorphic helpers: JSON schema, prompt, strict validation, mapping onto
 * Fisa, catalog fuzzy-matching. No browser/Node-only APIs here so the same
 * code is used by the route, the client and the smoke scripts.
 */
import type { CatalogClient, CatalogEquipment, ContentLocale, Fisa, Piesa, TipFisa } from "./types";
import { EMPTY_PIESE, TIPURI } from "./types";

export type ExtractedPart = {
  denumire: string;
  cod: string;
  cantitate: string;
  pret: string;
};

export type Extraction = {
  client: string;
  locatie: string;
  modelUtilaj: string;
  serie: string;
  oreFunctionare: string;
  tip: TipFisa | "";
  reclamatie: string;
  /** "Lucrări efectuate" — stored in Fisa.observatii (the "what was done" field). */
  observatii: string;
  manoperaOre: string;
  deplasareKm: string;
  piese: ExtractedPart[];
};

export type ExtractHints = { clients?: string[]; models?: string[] };

export type ExtractRequest = {
  text: string;
  locale: ContentLocale;
  hints?: ExtractHints;
};

/** Why the LLM path failed; returned to the client (not only logged). */
export type ExtractFailReason =
  | "rate_limited"
  | "timeout"
  | "network"
  | "auth"
  | "invalid_output"
  | `http_${number}`;

export type ExtractResponse =
  | { ok: true; source: "llm"; model: string; data: Extraction; attempts?: string[] }
  | {
      ok: false;
      error: "missing_key" | "bad_request" | "upstream" | "invalid_output";
      reason?: ExtractFailReason | "missing_key" | "bad_request";
      status?: number;
      attempts?: string[];
    };

export const EXTRACT_MAX_TEXT = 4000;
export const EXTRACT_MAX_HINTS = 150;

const TEXT_FIELDS = [
  "client",
  "locatie",
  "modelUtilaj",
  "serie",
  "oreFunctionare",
  "reclamatie",
  "observatii",
  "manoperaOre",
  "deplasareKm",
] as const;

/** JSON schema for Groq structured outputs (strict: all required, no extras). */
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...TEXT_FIELDS, "tip", "piese"],
  properties: {
    client: { type: "string" },
    locatie: { type: "string" },
    modelUtilaj: { type: "string" },
    serie: { type: "string" },
    oreFunctionare: { type: "string" },
    tip: { type: "string", enum: ["", ...TIPURI] },
    reclamatie: { type: "string" },
    observatii: { type: "string" },
    manoperaOre: { type: "string" },
    deplasareKm: { type: "string" },
    piese: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["denumire", "cod", "cantitate", "pret"],
        properties: {
          denumire: { type: "string" },
          cod: { type: "string" },
          cantitate: { type: "string" },
          pret: { type: "string" },
        },
      },
    },
  },
} as const;

const PROMPTS: Record<ContentLocale, string> = {
  ro: `Ești asistentul unui tehnician de service pentru utilaje de curățenie. Primești o frază dictată sau un mesaj și completezi câmpurile unei fișe de intervenție.
Reguli stricte:
- Folosește DOAR informații spuse explicit în text. Nu inventa, nu ghici, nu completa din cunoștințe generale. Dacă o informație lipsește, lasă câmpul "" (șir gol) și piese [].
- Scrie textul în limba română, exact cum l-a spus tehnicianul (nu traduce).
- client = firma/locul clientului (ex. hotel, magazin). locatie = oraș/adresă doar dacă e spusă.
- modelUtilaj = marca și modelul utilajului (ex. "Nilfisk SC500"). serie = seria/numărul de serie exact, fără cuvântul „seria”.
- tip: "Reparație" pentru reparații/înlocuiri de piese, "Revizie" pentru revizie/mentenanță periodică, "Constatare" pentru doar diagnostic, "Punere în funcțiune" pentru instalare/PIF; altfel "".
- reclamatie = problema raportată (defectul). observatii = lucrările efectuate (ce a făcut tehnicianul), în cuvintele lui.
- manoperaOre = numărul de ore de manoperă ca cifră (ex. "două ore" → "2", "o oră și jumătate" → "1.5"). deplasareKm = kilometri ca cifră. oreFunctionare = ore de funcționare ale utilajului (contor) ca cifră.
- piese = OBLIGATORIU fiecare piesă/componentă pe care tehnicianul spune că a schimbat-o, înlocuit-o sau montat-o (ex. „am schimbat peria și racleta” → două piese: "Perie", "Racletă"). Câmpuri: denumire (substantivul piesei, cu majusculă), cod (doar dacă e spus), cantitate ca cifră (implicit "1"), pret (doar dacă e spus, ca cifră). Piesele apar și în piese, și în observatii.
- Cifrele folosesc punct zecimal, fără unități.`,
  en: `You assist a service technician for cleaning equipment. You receive a dictated sentence or a message and fill in the fields of a service job sheet.
Strict rules:
- Use ONLY information stated explicitly in the text. Do not invent, guess or fill from general knowledge. If something is missing, leave the field "" (empty string) and piese [].
- Write text in English, as the technician said it (do not translate).
- client = the customer's company/site (e.g. hotel, shop). locatie = city/address only if stated.
- modelUtilaj = brand and model of the machine (e.g. "Nilfisk SC500"). serie = the exact serial number, without the word "serial".
- tip: "Reparație" for repairs/part replacements, "Revizie" for service/periodic maintenance, "Constatare" for diagnosis only, "Punere în funcțiune" for installation/commissioning; otherwise "". (These values are fixed codes — keep them exactly.)
- reclamatie = the reported problem (fault). observatii = the work done (what the technician did), in their words.
- manoperaOre = labour hours as a number (e.g. "two hours" → "2", "an hour and a half" → "1.5"). deplasareKm = kilometres as a number. oreFunctionare = machine hour-meter reading as a number.
- piese = REQUIRED: every part/component the technician says they replaced, changed or fitted (e.g. "replaced the brush and the squeegee" → two parts: "Brush", "Squeegee"). Fields: denumire (the part noun, capitalised), cod (only if stated), cantitate as a number (default "1"), pret (only if stated, as a number). Parts appear both in piese and in observatii.
- Numbers use a decimal point and no units.`,
  pl: `Pomagasz serwisantowi maszyn czyszczących. Otrzymujesz podyktowane zdanie lub wiadomość i wypełniasz pola karty serwisowej.
Ścisłe zasady:
- Używaj WYŁĄCZNIE informacji wyraźnie podanych w tekście. Nie wymyślaj, nie zgaduj, nie uzupełniaj z wiedzy ogólnej. Jeśli czegoś brakuje, zostaw pole "" (pusty ciąg) i piese [].
- Pisz tekst po polsku, tak jak powiedział serwisant (nie tłumacz).
- client = firma/obiekt klienta (np. hotel, sklep). locatie = miasto/adres tylko jeśli podano.
- modelUtilaj = marka i model maszyny (np. "Nilfisk SC500"). serie = dokładny numer seryjny, bez słowa „seria”/„numer”.
- tip: "Reparație" dla napraw/wymiany części, "Revizie" dla przeglądu/konserwacji okresowej, "Constatare" dla samej diagnozy, "Punere în funcțiune" dla instalacji/uruchomienia; w przeciwnym razie "". (To stałe kody — zachowaj je dokładnie.)
- reclamatie = zgłoszony problem (usterka). observatii = wykonane prace (co zrobił serwisant), jego słowami.
- manoperaOre = godziny robocizny jako liczba (np. „dwie godziny” → "2", „półtorej godziny” → "1.5"). deplasareKm = kilometry jako liczba. oreFunctionare = stan licznika motogodzin jako liczba.
- piese = OBOWIĄZKOWO każda część/podzespół, którą serwisant według swoich słów wymienił lub zamontował (np. „wymieniłem szczotkę i gumy” → dwie części: "Szczotka", "Gumy"). Pola: denumire (nazwa części w mianowniku, wielką literą), cod (tylko jeśli podano), cantitate jako liczba (domyślnie "1"), pret (tylko jeśli podano, jako liczba). Części występują zarówno w piese, jak i w observatii.
- Liczby z kropką dziesiętną, bez jednostek.`,
};

const HINT_LABEL: Record<ContentLocale, { clients: string; models: string; note: string }> = {
  ro: {
    clients: "Clienți cunoscuți",
    models: "Utilaje cunoscute",
    note: "Dacă textul numește unul dintre ei (chiar aproximativ), folosește forma exactă din listă. Nu alege din listă ceva ce nu apare în text.",
  },
  en: {
    clients: "Known clients",
    models: "Known machines",
    note: "If the text names one of them (even approximately), use the exact spelling from the list. Never pick a list entry that is not in the text.",
  },
  pl: {
    clients: "Znani klienci",
    models: "Znane maszyny",
    note: "Jeśli tekst wymienia któregoś z nich (nawet w przybliżeniu), użyj dokładnej pisowni z listy. Nie wybieraj z listy niczego, czego nie ma w tekście.",
  },
};

export function buildExtractMessages(req: ExtractRequest) {
  const loc = req.locale;
  let system = PROMPTS[loc];
  const clients = (req.hints?.clients || []).slice(0, EXTRACT_MAX_HINTS);
  const models = (req.hints?.models || []).slice(0, EXTRACT_MAX_HINTS);
  if (clients.length || models.length) {
    const h = HINT_LABEL[loc];
    system += `\n\n${h.note}`;
    if (clients.length) system += `\n${h.clients}: ${clients.join(" | ")}`;
    if (models.length) system += `\n${h.models}: ${models.join(" | ")}`;
  }
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: req.text },
  ];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Lowercase, strip diacritics and punctuation → space-separated tokens. */
export function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const compact = (s: string) => norm(s).replace(/ /g, "");

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Numeric field → "2" / "1.5"; anything non-numeric → "". */
export function numStr(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return v >= 0 ? String(v) : "";
  if (typeof v !== "string") return "";
  const m = v.replace(/\s/g, "").replace(",", ".").match(/^(\d+(?:\.\d+)?)[a-z]*$/i);
  if (!m) return "";
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? String(n) : "";
}

/**
 * Grounding check: a proper-noun value must be traceable to the source text
 * (or to a catalog hint that itself appears in the text). Guards against a
 * model "helpfully" inventing a client, model or serial.
 */
function grounded(value: string, source: string, hints: string[] = []): boolean {
  if (!value) return true;
  const src = norm(source);
  const srcCompact = src.replace(/ /g, "");
  const tokens = norm(value).split(" ").filter((t) => t.length >= 3 || /\d/.test(t));
  if (!tokens.length) return src.includes(norm(value));
  const hits = tokens.filter((t) => src.includes(t) || srcCompact.includes(t)).length;
  if (hits / tokens.length >= 0.5) return true;
  // Accept a catalog canonical spelling if the text mentions it approximately.
  const hv = hints.find((h) => compact(h) === compact(value));
  return !!hv && fuzzyContains(src, hv);
}

function fuzzyContains(srcNorm: string, name: string): boolean {
  const toks = norm(name).split(" ").filter((t) => t.length >= 3);
  if (!toks.length) return false;
  return toks.filter((t) => srcNorm.includes(t)).length / toks.length >= 0.5;
}

// ---------------------------------------------------------------------------
// Number traceability (digits or ro/en/pl number words)
// ---------------------------------------------------------------------------

const UNITS: Record<string, number> = {
  // ro (diacritics stripped by norm)
  zero: 0, unu: 1, una: 1, un: 1, o: 1, doi: 2, doua: 2, trei: 3, patru: 4, cinci: 5,
  sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10, unsprezece: 11, doisprezece: 12,
  douasprezece: 12, treisprezece: 13, paisprezece: 14, cincisprezece: 15,
  saisprezece: 16, saptesprezece: 17, optsprezece: 18, nouasprezece: 19,
  // en
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  // pl
  jeden: 1, jedna: 1, jedno: 1, jednej: 1, godzine: 1, dwa: 2, dwie: 2, dwoch: 2,
  trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9,
  dziesiec: 10, jedenascie: 11, dwanascie: 12, trzynascie: 13, czternascie: 14,
  pietnascie: 15, szesnascie: 16, siedemnascie: 17, osiemnascie: 18, dziewietnascie: 19,
};
const TENS: Record<string, number> = {
  douazeci: 20, treizeci: 30, patruzeci: 40, cincizeci: 50, saizeci: 60,
  saptezeci: 70, optzeci: 80, nouazeci: 90, suta: 100,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
  dwadziescia: 20, trzydziesci: 30, czterdziesci: 40, piecdziesiat: 50,
  szescdziesiat: 60, siedemdziesiat: 70, osiemdziesiat: 80, dziewiecdziesiat: 90, sto: 100,
};
const HALF = new Set(["jumatate", "half", "pol"]);
const ONE_AND_HALF = new Set(["poltora", "poltorej"]);
const JOIN = new Set(["si", "and", "i"]);

/** Every number the text states, as digits or number words (ro/en/pl). */
export function numbersInText(text: string): Set<number> {
  const out = new Set<number>();
  const digitSrc = (text || "").replace(/(\d),(\d)/g, "$1.$2");
  (digitSrc.match(/\d+(?:\.\d+)?/g) || []).forEach((d) => out.add(Number(d)));
  const toks = norm(text).split(" ");
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (ONE_AND_HALF.has(w)) out.add(1.5);
    if (HALF.has(w)) out.add(0.5);
    let v: number | undefined;
    let j = i;
    if (TENS[w] !== undefined) {
      v = TENS[w];
      // "douăzeci și cinci", "twenty five", "dwadzieścia pięć"
      let k = i + 1;
      if (JOIN.has(toks[k])) k++;
      if (UNITS[toks[k]] !== undefined && UNITS[toks[k]] < 10) {
        out.add(v);
        v += UNITS[toks[k]];
        j = k;
      }
    } else if (UNITS[w] !== undefined) {
      v = UNITS[w];
    } else if (/^\d+(\.\d+)?$/.test(w)) {
      v = Number(w);
    }
    if (v === undefined) continue;
    out.add(v);
    // "... și jumătate" / "... and a half" / "... i pół" within 4 tokens
    for (let k = j + 1; k <= j + 4 && k < toks.length; k++) {
      if (HALF.has(toks[k])) {
        out.add(v + 0.5);
        break;
      }
    }
  }
  return out;
}

function traceableNumber(value: string, nums: Set<number>): string {
  if (!value) return "";
  const n = Number(value);
  return Array.from(nums).some((x) => Math.abs(x - n) < 1e-9) ? value : "";
}

/** Meaningful words of a value must appear (as a stem) in the source text. */
function sharesWords(value: string, source: string): boolean {
  if (!value) return true;
  const srcToks = norm(source).split(" ").filter(Boolean);
  const toks = norm(value).split(" ").filter((t) => t.length >= 4);
  if (!toks.length) {
    const short = norm(value).split(" ").filter(Boolean);
    return short.every((t) => srcToks.includes(t));
  }
  return toks.some((t) => {
    const stem = t.slice(0, Math.max(4, Math.min(6, t.length - 2)));
    return srcToks.some((s) => s.startsWith(stem));
  });
}

/**
 * Validate raw LLM JSON → Extraction. Unknown/invalid values become "".
 * Returns null only when the payload is not an object at all.
 */
export function validateExtraction(
  raw: unknown,
  sourceText: string,
  hints?: ExtractHints
): Extraction | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const tipRaw = typeof r.tip === "string" ? r.tip.trim() : "";
  const tip = (TIPURI as string[]).includes(tipRaw) ? (tipRaw as TipFisa) : "";

  const client = str(r.client, 120);
  const modelUtilaj = str(r.modelUtilaj, 120);
  let serie = str(r.serie, 60).replace(/^(?:seria|serie|serial(?:\s+no\.?)?|s\/n|numer\s+seryjny|nr\.?)(?:\s*[:#]\s*|\s+)/i, "");
  // Serial must literally occur in the text (ignoring spaces/dashes/case).
  if (serie && !compact(sourceText).includes(compact(serie))) serie = "";

  const nums = numbersInText(sourceText);
  const piese: ExtractedPart[] = [];
  if (Array.isArray(r.piese)) {
    for (const p of r.piese.slice(0, 15)) {
      if (!p || typeof p !== "object") continue;
      const o = p as Record<string, unknown>;
      const denumire = str(o.denumire, 120);
      if (!denumire || !sharesWords(denumire, sourceText)) continue;
      let cod = str(o.cod, 60);
      if (cod && !compact(sourceText).includes(compact(cod))) cod = "";
      piese.push({
        denumire,
        cod,
        // A part named without a count is one piece; any other count must be stated.
        cantitate: (() => {
          const q = numStr(o.cantitate);
          return !q || q === "1" ? "1" : traceableNumber(q, nums) || "1";
        })(),
        pret: traceableNumber(numStr(o.pret), nums),
      });
    }
  }

  return {
    client: grounded(client, sourceText, hints?.clients) ? client : "",
    locatie: (() => {
      const l = str(r.locatie, 160);
      return grounded(l, sourceText) ? l : "";
    })(),
    modelUtilaj: grounded(modelUtilaj, sourceText, hints?.models) ? modelUtilaj : "",
    serie,
    oreFunctionare: traceableNumber(numStr(r.oreFunctionare), nums),
    tip,
    reclamatie: (() => {
      const rec = str(r.reclamatie, 600);
      return sharesWords(rec, sourceText) ? rec : "";
    })(),
    observatii: str(r.observatii, 1200),
    manoperaOre: traceableNumber(numStr(r.manoperaOre), nums),
    deplasareKm: traceableNumber(numStr(r.deplasareKm), nums),
    piese,
  };
}

// ---------------------------------------------------------------------------
// Catalog matching (client-side, on-device catalogs)
// ---------------------------------------------------------------------------

function dice(a: string, b: string): number {
  const A = compact(a);
  const B = compact(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      m.set(g, (m.get(g) || 0) + 1);
    }
    return m;
  };
  const ga = grams(A);
  const gb = grams(B);
  let inter = 0;
  ga.forEach((n, g) => {
    inter += Math.min(n, gb.get(g) || 0);
  });
  return (2 * inter) / (A.length - 1 + (B.length - 1));
}

export type CatalogMatch<T> = {
  item: T;
  score: number;
  /** Only one entry reached the threshold (or a single exact match). */
  unique: boolean;
};

/**
 * Score catalog entries for a spoken name. Never settles a tie by list order:
 * if two or more entries match about equally well the result is ambiguous
 * (unique=false) and callers must keep the spoken text.
 */
export function matchCatalog<T>(
  name: string,
  list: T[],
  key: (t: T) => string,
  threshold = 0.72
): CatalogMatch<T> | undefined {
  const n = compact(name);
  if (n.length < 3) return undefined;
  const scored: { item: T; score: number; exact: boolean }[] = [];
  for (const item of list) {
    const k = compact(key(item));
    if (!k) continue;
    const exact = k === n;
    let score = exact ? 1 : dice(name, key(item));
    if (!exact && k.length >= 4 && (n.includes(k) || k.includes(n))) score = Math.max(score, 0.9);
    if (score >= threshold) scored.push({ item, score, exact });
  }
  if (!scored.length) return undefined;
  const exacts = scored.filter((s) => s.exact);
  if (exacts.length === 1) return { item: exacts[0].item, score: 1, unique: true };
  if (exacts.length > 1) return { item: exacts[0].item, score: 1, unique: false };
  scored.sort((x, y) => y.score - x.score);
  const [top, second] = scored;
  const unique = !second || top.score - second.score >= 0.08;
  return { item: top.item, score: top.score, unique };
}

/** Unique, confident catalog entry for a spoken name — undefined on ties. */
export function bestMatch<T>(
  name: string,
  list: T[],
  key: (t: T) => string,
  threshold = 0.72
): T | undefined {
  const m = matchCatalog(name, list, key, threshold);
  return m && m.unique ? m.item : undefined;
}

/** Confidence needed before a catalog entry may also fill the location. */
const LOCATION_CONFIDENCE = 0.85;

export function applyCatalog(
  ex: Extraction,
  clients: CatalogClient[],
  equipment: CatalogEquipment[]
): Extraction {
  const out = { ...ex };
  // Serial is the strongest key: a single exact equipment match fills model/client.
  const bySerieAll = out.serie
    ? equipment.filter((e) => e.serie && compact(e.serie) === compact(out.serie))
    : [];
  const bySerie = bySerieAll.length === 1 ? bySerieAll[0] : undefined;
  if (bySerie) {
    out.modelUtilaj = bySerie.model;
    if (!out.client && bySerie.clientName) out.client = bySerie.clientName;
  } else if (out.modelUtilaj) {
    const m = bestMatch(out.modelUtilaj, equipment, (e) => e.model);
    if (m) out.modelUtilaj = m.model;
  }
  if (out.client) {
    const c = matchCatalog(out.client, clients, (x) => x.name);
    // Ambiguous (e.g. "Hotel Continental" → Forum Sibiu AND Oradea): keep the
    // spoken text and never pull a location from an arbitrary entry.
    if (c && c.unique) {
      out.client = c.item.name;
      if (!out.locatie && c.item.locatie && c.score >= LOCATION_CONFIDENCE) {
        out.locatie = c.item.locatie;
      }
    }
  }
  return out;
}

export function catalogHints(
  clients: CatalogClient[],
  equipment: CatalogEquipment[]
): ExtractHints {
  const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).slice(0, EXTRACT_MAX_HINTS);
  return {
    clients: uniq(clients.map((c) => c.name)),
    models: uniq(equipment.map((e) => e.model)),
  };
}

// ---------------------------------------------------------------------------
// Mapping onto Fisa
// ---------------------------------------------------------------------------

/** Field keys that the voice/AI filled — highlighted in the form until edited. */
export type AiFilledKey =
  | (typeof TEXT_FIELDS)[number]
  | "tip"
  | "piese"
  | "deplasareDaNu";

export function extractionToFisa(ex: Extraction): {
  patch: Partial<Fisa>;
  filled: AiFilledKey[];
} {
  const patch: Partial<Fisa> = {};
  const filled: AiFilledKey[] = [];
  for (const k of TEXT_FIELDS) {
    if (ex[k]) {
      (patch as Record<string, string>)[k] = ex[k];
      filled.push(k);
    }
  }
  if (ex.tip) {
    patch.tip = ex.tip;
    filled.push("tip");
  }
  if (ex.deplasareKm && Number(ex.deplasareKm) > 0) {
    patch.deplasareDaNu = "DA";
    filled.push("deplasareDaNu");
  }
  const piese: Piesa[] = EMPTY_PIESE();
  ex.piese.slice(0, 15).forEach((p, i) => {
    piese[i] = { nr: i + 1, denumire: p.denumire, cod: p.cod, cantitate: p.cantitate, pretEur: p.pret };
  });
  if (ex.piese.length) {
    patch.piese = piese;
    filled.push("piese");
  }
  return { patch, filled };
}

/** True if the extraction carries any real content. */
export function extractionHasContent(ex: Extraction): boolean {
  return extractionToFisa(ex).filled.length > 0;
}
