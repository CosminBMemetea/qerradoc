import type { Fisa, TipFisa } from "./types";
import { EMPTY_PIESE } from "./types";
import { localIsoDate } from "./date-format";

/*
 * Word-boundary helpers. JS `\b` is ASCII-only (it breaks on ă, ș, ł…) and
 * lookbehind is not available on older iOS Safari, so we consume one
 * non-letter char (or start of text) before a keyword instead.
 */
const WB = "(?:^|[^\\p{L}\\p{N}])";
const WE = "(?![\\p{L}\\p{N}])";
function kw(alts: string, tail: string, flags = "iu"): RegExp {
  return new RegExp(`${WB}(?:${alts})${tail}`, flags);
}
function earliest(text: string, re: RegExp): number {
  const m = re.exec(text);
  return m ? m.index : -1;
}

/** Type words that explicitly name the intervention type (ro/en/pl). */
const TIP_PATTERNS: [TipFisa, RegExp][] = [
  ["Punere în funcțiune", kw("punere\\s+[îi]n\\s+func\\p{L}*|pif|commissioning|commissioned|uruchomieni\\p{L}*|uruchomienie", WE)],
  ["Revizie", kw("reviz\\p{L}*|maintenance|servicing|periodic\\s+service|scheduled\\s+service|przegl[ąa]d\\p{L}*|konserwacj\\p{L}*", WE)],
  ["Constatare", kw("constat\\p{L}*|inspection|inspected|diagnos\\p{L}*|assessment|ekspertyz\\p{L}*|diagnoz\\p{L}*|ogl[ęe]dzin\\p{L}*", WE)],
  ["Reparație", kw("repara[tț]i\\p{L}*|reparat\\p{L}*|repair\\p{L}*|napraw\\p{L}*", WE)],
];

/**
 * Intervention type only when the text names it explicitly
 * (constatare / revizie / reparație / punere în funcțiune and en/pl
 * equivalents). The earliest mention wins. Otherwise undefined, so the
 * firm's default type applies.
 */
export function explicitTip(text: string): TipFisa | undefined {
  let best: { tip: TipFisa; at: number } | undefined;
  for (const [tip, re] of TIP_PATTERNS) {
    const at = earliest(text || "", re);
    if (at >= 0 && (!best || at < best.at)) best = { tip, at };
  }
  return best?.tip;
}

/**
 * Type for a new sheet: an explicit type word in the text wins, then the
 * firm default (pilot pack), then whatever the parser/LLM guessed.
 */
export function resolveNewSheetTip(
  text: string,
  firmDefault: TipFisa | undefined,
  parsed: TipFisa | undefined
): TipFisa | undefined {
  return explicitTip(text) ?? firmDefault ?? parsed;
}

const NUM_WORDS: Record<string, number> = {
  o: 1, un: 1, unu: 1, una: 1, one: 1, a: 1, an: 1, jeden: 1, jedna: 1, "jedną": 1,
  "două": 2, doua: 2, doi: 2, two: 2, dwie: 2, dwa: 2,
  trei: 3, three: 3, trzy: 3,
  patru: 4, four: 4, cztery: 4,
  cinci: 5, five: 5, "pięć": 5, piec: 5,
  "șase": 6, sase: 6, six: 6, "sześć": 6,
  "șapte": 7, sapte: 7, seven: 7, siedem: 7,
  opt: 8, eight: 8, osiem: 8,
  "nouă": 9, noua: 9, nine: 9, "dziewięć": 9,
  zece: 10, ten: 10, "dziesięć": 10,
};
const NUM_WORD_ALTS = Object.keys(NUM_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|");
/** A number as digits or a (ro/en/pl) word, optionally "and a half". */
const NUM = `((?:\\d+(?:[.,]\\d+)?|p[óo][łl]tor(?:a|ej)|(?:${NUM_WORD_ALTS}))(?:\\s+(?:and\\s+a\\s+half|[șs]i\\s+jum[ăa]tate|i\\s+p[óo][łl]))?)${WE}`;

function numValue(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (/^p[óo][łl]tor/.test(s)) return "1.5";
  const half = /\s(?:half|jum[ăa]tate|p[óo][łl])$/.test(s);
  const first = s.split(/\s+/)[0];
  const base = /^\d/.test(first) ? Number(first.replace(",", ".")) : NUM_WORDS[first];
  if (base === undefined) return "";
  return String(half ? base + 0.5 : base);
}

function clean(v: string): string {
  return v.replace(/\s+/g, " ").replace(/[.;:,\s]+$/, "").trim();
}
function capFirst(v: string): string {
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}

const BRANDS = "K[aä]rcher|Nilfisk|Tennant|IPC|Hako|Comac|Fimap|Taski|Numatic|Ghibli|Wetrok|Lavor";
const SERIE_KW = "nr\\.?\\s*(?:de\\s*)?serie|num[ăa]r\\s+(?:de\\s+)?serie|numer\\s+seryjny|nr\\.?\\s*seryjny|seria|serie|serial(?:\\s+(?:no\\.?|number))?|s\\/n|sn";

/**
 * Heuristic parse of WhatsApp-style / dictated service messages (ro/en/pl)
 * into fișă fields. Used offline or when the AI route is unavailable.
 */
export function parseWhatsAppText(text: string): Partial<Fisa> {
  const t = text.replace(/\r\n/g, "\n").trim();
  const lower = t.toLowerCase();
  const segments = t.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
  const result: Partial<Fisa> = {
    reclamatie: t,
    piese: EMPTY_PIESE(),
  };

  const tip = explicitTip(t);
  if (tip) result.tip = tip;

  // Client: keyword, else a leading "Proper Name" segment (2–5 capitalised words).
  const clientKw = kw(
    "client(?:ul)?|beneficiar(?:ul)?|customer|klient|pentru|pt\\.",
    "\\s*[:\\-]?\\s*([^\\n,;]{3,60})"
  ).exec(t);
  if (clientKw && new RegExp("^[\\p{Lu}0-9]", "u").test(clientKw[1].trim())) {
    result.client = clean(clientKw[1]);
  } else if (segments[0]) {
    const words = segments[0].split(/\s+/);
    const brand = new RegExp(`^(?:${BRANDS})$`, "i");
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      words.every((w) => new RegExp("^[\\p{Lu}0-9&]", "u").test(w)) &&
      !words.some((w) => brand.test(w))
    ) {
      result.client = clean(segments[0]);
    }
  }

  // Locație — explicit keyword only (no bare "la": it matched inside words).
  const locMatch = kw(
    "loca[tț]i[ea]|loca[tț]ia|adres[aă]|adres|address|site|sediu|sediul|lokalizacja|miejsce",
    "\\s*[:\\-]?\\s+([^\\n,;]{3,60})"
  ).exec(t);
  if (locMatch) {
    const loc = clean(locMatch[1]);
    if (loc.length > 3 && !/client/i.test(loc)) result.locatie = loc;
  }

  // Model utilaj — keyword, else brand + up to 3 model tokens.
  const stopAtSerie = new RegExp(`\\s+(?:${SERIE_KW})${WE}.*$`, "iu");
  const modelKw = kw(
    "model|utilaj(?:ul)?|ma[sș]in[aă]|machine|urz[ąa]dzenie|aspirator|scrubber|extractor|injector",
    "\\s*[:\\-]\\s*([^\\n,;]{2,40})"
  ).exec(t);
  const brandMatch = new RegExp(
    `${WB}(${BRANDS})\\s+([A-Za-z0-9][A-Za-z0-9\\-\\/]*(?:\\s+[A-Z0-9][A-Za-z0-9\\-\\/]*){0,3})`,
    "u"
  ).exec(t);
  if (modelKw) {
    result.modelUtilaj = clean(modelKw[1].replace(stopAtSerie, ""));
  } else if (brandMatch) {
    result.modelUtilaj = clean(`${brandMatch[1]} ${brandMatch[2].replace(stopAtSerie, "")}`);
  }

  // Serie — "seria SN-998877" → "SN-998877" (the keyword must be followed by
  // a separator, so the "SN" of the value is never eaten as a keyword).
  const serieMatch = kw(SERIE_KW, "(?:\\s*[:#]\\s*|\\s+)([A-Z0-9][A-Z0-9\\-\\/.]{3,29})", "iu").exec(t);
  if (serieMatch && /\d/.test(serieMatch[1])) result.serie = clean(serieMatch[1]);

  // Ore funcționare (hour meter) — keyword before the number ("contor 1842",
  // "ore funcționare 1842", "hour meter 2105", "licznik 1842") or after it
  // ("1842 ore de funcționare", "2105 hours on the meter", "1842 godzin pracy",
  // "1842 motogodzin").
  const METER_BEFORE =
    "ore\\s*(?:de\\s*)?func\\p{L}*|(?:operating|running|engine)\\s+hours?|ore|contor(?:ul)?|licznik\\p{L}*|hours?\\s*meter|hour-meter|meter|hours|motogodzin\\p{L}*";
  const METER_AFTER =
    "(?:ore|or[ăa]|h|hours?|godzin\\p{L}*)\\s+(?:de\\s+)?(?:func\\p{L}*|pracy|meter|counter|on\\s+the\\s+(?:hour\\s+)?meter|on\\s+the\\s+counter|la\\s+contor|(?:na\\s+)?liczniku)|(?:operating|running|engine)\\s+hours?|motogodzin\\p{L}*|mth";
  // A number followed by km is distance; "4 ore 99 km" = 4 h labour + 99 km,
  // so a bare "ore"/"hours" keyword that itself follows a number is a unit,
  // not the hour-meter keyword.
  const KM_NEXT = new RegExp(`^\\s*(?:km|kilometr\\p{L}*|kilometer\\p{L}*|kilometre\\p{L}*)${WE}`, "iu");
  let meterBefore: RegExpExecArray | null = null;
  {
    const re = new RegExp(`${WB}(${METER_BEFORE})\\s*[:\\-]?\\s*(\\d+(?:[.,]\\d+)?)(?![\\d.,]*\\d)`, "giu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const kwStart = m.index + m[0].indexOf(m[1]);
      const after = t.slice(m.index + m[0].length);
      if (KM_NEXT.test(after)) continue;
      const bareUnit = /^(?:ore|hours)$/i.test(m[1]);
      if (bareUnit && new RegExp(`${NUM.replace(WE, "")}\\s*$`, "iu").test(t.slice(0, kwStart))) continue;
      meterBefore = m;
      break;
    }
  }
  const meterAfter = new RegExp(`${WB}(\\d+(?:[.,]\\d+)?)\\s*(?:${METER_AFTER})${WE}`, "iu").exec(t);
  const meter = meterBefore?.[2] ?? meterAfter?.[1];
  if (meter) result.oreFunctionare = meter.replace(",", ".");

  // Manoperă — "manoperă 2", "Labour 1.5 h", "două ore manoperă", "dwie godziny robocizny".
  const UNIT_H = "(?:h|ore|or[ăa]|hours?|godzin\\p{L}*|godz)";
  const HALF_AFTER = /^\s+(?:and\s+a\s+half|[șs]i\s+jum[ăa]tate|i\s+p[óo][łl])/i;
  const withHalf = (raw: string, rest: string) => {
    const v = numValue(raw);
    return v && HALF_AFTER.test(rest) && !/\.5$/.test(v) ? String(Number(v) + 0.5) : v;
  };
  let man = "";
  const manBefore = kw("manoper[aă]|ore\\s*lucru|labou?r|robocizn\\p{L}*", `\\s*[:\\-]?\\s*${NUM}`).exec(t);
  const manAfter = kw(
    NUM.replace(WE, ""),
    `\\s*${UNIT_H}${WE}\\s*(?:de\\s+)?(?:manoper\\p{L}*|labou?r|robocizn\\p{L}*|lucru|work)`
  ).exec(t);
  if (manBefore) man = numValue(manBefore[1]);
  else if (manAfter) man = numValue(manAfter[1]);
  else {
    // "two hours" / "dwie godziny" / "an hour and a half" with no labour word
    // → labour, unless it is the hour meter (keyword before or after) or a
    // value of 100+ h (that is a meter reading, never labour).
    const bare = new RegExp(`${WB}${NUM.replace(WE, "")}\\s*${UNIT_H}${WE}`, "giu");
    // Bare "ore"/"hours" before the number isn't a meter keyword here ("1842 ore 2 ore").
    const METER_STRONG = METER_BEFORE.split("|").filter((k) => k !== "ore" && k !== "hours").join("|");
    const meterNear = new RegExp(`(?:${METER_STRONG})\\s*[:\\-]?\\s*$`, "iu");
    const meterNext = new RegExp(`^\\s*(?:de\\s+)?(?:func\\p{L}*|pracy|on\\s+the|meter|counter|contor|la\\s+contor|(?:na\\s+)?liczniku)`, "iu");
    let m: RegExpExecArray | null;
    while ((m = bare.exec(t))) {
      const before = t.slice(Math.max(0, m.index - 25), m.index + (m[0].length - m[0].trimStart().length));
      const rest = t.slice(m.index + m[0].length);
      if (meterNear.test(before) || meterNext.test(rest)) continue;
      const v = withHalf(m[1], rest);
      if (!v || Number(v) >= 100) continue;
      man = v;
      break;
    }
  }
  if (man) result.manoperaOre = man;

  // Deplasare km.
  const kmMatch =
    kw("deplasare|travel|dojazd", `\\s*[:\\-]?\\s*(\\d+(?:[.,]\\d+)?)`).exec(t) ||
    new RegExp(`${WB}(\\d+(?:[.,]\\d+)?)\\s*(?:km|kilometr\\p{L}*|kilometer\\p{L}*|kilometre\\p{L}*)${WE}`, "iu").exec(t);
  if (kmMatch) {
    result.deplasareKm = kmMatch[1].replace(",", ".");
    result.deplasareDaNu = "DA";
  } else if (/f[aă]r[aă]\s*deplasare|nu\s*deplas|no\s+travel|bez\s+dojazdu/i.test(lower)) {
    result.deplasareDaNu = "NU";
  }

  // Proprietar
  const propMatch = kw("proprietar|owner|w[łl]a[śs]ciciel", "\\s*[:\\-]?\\s*([^\\n,;]{2,40})").exec(t);
  if (propMatch) result.proprietar = clean(propMatch[1]);

  // Data anunțării
  const dataAnunt = kw(
    "anun[tț]\\p{L}*|reclamat|sesizat|apel|reported|zg[łl]oszon\\p{L}*",
    "\\s*(?:pe|din|la|on|dnia)?\\s*(\\d{1,2}[.\\/\\-]\\d{1,2}[.\\/\\-]\\d{2,4})"
  ).exec(t);
  if (dataAnunt) result.dataAnuntarii = normalizeDate(dataAnunt[1]);

  // Data intervenției
  const dataInt = kw(
    "interven[tț]\\p{L}*|azi|data|job|visit|wizyta",
    "\\s*[:\\-]?\\s*(\\d{1,2}[.\\/\\-]\\d{1,2}[.\\/\\-]\\d{2,4})"
  ).exec(t);
  if (dataInt) result.dataInterventiei = normalizeDate(dataInt[1]);

  // Piese — (1) list lines under "Piese:/Parts:/Części:" or bullets,
  //         (2) otherwise "am schimbat X și Y" / "replaced X and Y" / "wymieniłem X i Y".
  const piese = EMPTY_PIESE();
  let pi = 0;
  const push = (denumire: string, cod = "", cantitate = "1") => {
    const den = capFirst(clean(denumire)).slice(0, 80);
    if (pi >= 15 || den.length < 3) return;
    piese[pi] = { nr: pi + 1, denumire: den, cod, cantitate, pretEur: "" };
    pi++;
  };
  let inList = false;
  for (const line of t.split("\n")) {
    const l = line.trim();
    if (/^(?:piese|parts|cz[ęe][śs]ci|materiale?|materials?)\s*:?\s*$/i.test(l)) {
      inList = true;
      continue;
    }
    const bullet = l.match(/^[\-*•]\s*(.+)$/);
    if (!bullet && !(inList && l)) {
      if (inList && !l) inList = false;
      continue;
    }
    if (!bullet && inList && new RegExp("^[\\p{L} ]+:", "u").test(l)) {
      inList = false; // next "Label:" line ends the list
      continue;
    }
    const body = bullet ? bullet[1] : l;
    const qty = body.match(/\s[xX×]\s*(\d+)/)?.[1] || "1";
    const cod = body.match(/(?:cod|code|kod)\s*[:\-]?\s*([A-Za-z0-9][\w.\-\/]*[A-Za-z0-9])/i)?.[1] || "";
    const den = body.split(/\s[xX×]\s*\d+|\s(?:cod|code|kod)\s/i)[0];
    push(den, cod, qty);
  }
  if (!pi) {
    const swap = kw(
      "am\\s+schimbat|am\\s+[îi]nlocuit|schimbat|[îi]nlocuit|replaced|changed|fitted|wymieni[łl]em|wymieniono|wymieniona|wymiana",
      "\\s+([^\\n,;.]{3,120})"
    ).exec(t);
    if (swap) {
      swap[1]
        .split(/\s+(?:și|si|and|i|oraz|plus)\s+/i)
        .map((x) => x.replace(/^(?:the|a|an|new|nou[aă]?)\s+/i, ""))
        .forEach((x) => push(x));
    }
  }
  result.piese = piese;

  // Reclamație — explicit keyword, else a negated symptom segment
  // ("nu aspiră apa" / "not picking up water" / "nie zbiera wody").
  const recMatch = kw(
    "reclama[tț]i[ea]|problem[aă]|problem|defect|fault|issue|usterka|awaria|solicitare",
    "\\s*[:\\-]\\s*([^\\n]{5,200})"
  ).exec(t);
  const symptom = segments.find((sg) =>
    /^(?:nu|not|no|nie|doesn'?t|does\s+not|won'?t|isn'?t)\s/i.test(sg)
  );
  if (recMatch) result.reclamatie = clean(recMatch[1]);
  else if (symptom) result.reclamatie = capFirst(clean(symptom));

  return result;
}

function normalizeDate(d: string): string {
  const parts = d.split(/[\.\/\-]/);
  if (parts.length !== 3) return d;
  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  let year = parts[2];
  if (year.length === 2) year = "20" + year;
  return `${year}-${month}-${day}`;
}

export type SampleLocale = "ro" | "en" | "pl";

const SAMPLE_WHATSAPP_BY_LOCALE: Record<SampleLocale, string> = {
  ro: `Bună, client Hotel Belvedere Oradea, locație str. Republicii 12.
Utilaj: Kärcher B 60 W Bp, serie KBH2045678, ore 1842.
Reclamație: nu aspiră bine, filtru colmatat, perie uzată.
Anunțat pe 18.09.2026, intervenție azi.
Manoperă 1.5 ore, deplasare 14 km.
Piese:
- Filtru HEPA x1 cod 6.414-631.0
- Perie cilindrică x1
Tehnician: Ion Popescu`,
  en: `Hi, customer CityGate Business Centre Manchester, site Deansgate 120.
Machine: Nilfisk SC500 53 B, serial NF-SC500-55102, hours 2105.
Fault: poor suction, clogged filter, worn cylindrical brush.
Reported 18.09.2026, job today.
Labour 1.5 h, travel 14 km.
Parts:
- HEPA filter x1 code 6.414-631.0
- Cylindrical brush x1
Engineer: James Wilson`,
  pl: `Dzień dobry, klient Hotel Piast Wrocław, adres ul. Świdnicka 15.
Urządzenie: Kärcher B 60 W Bp, nr seryjny KB60-2024-77103, motogodziny 1760.
Usterka: słabe ssanie, filtr zatkany, zużyta szczotka cylindryczna.
Zgłoszono 18.09.2026, naprawa dziś.
Robocizna 1.5 h, dojazd 9 km.
Części:
- Filtr HEPA x1 kod 6.414-631.0
- Szczotka cylindryczna x1
Technik: Jan Kowalski`,
};

/** @deprecated Prefer sampleWhatsApp(locale) — kept as RO default for older imports. */
export const SAMPLE_WHATSAPP = SAMPLE_WHATSAPP_BY_LOCALE.ro;

export function sampleWhatsApp(locale: string = "ro"): string {
  if (locale === "en" || locale === "pl") return SAMPLE_WHATSAPP_BY_LOCALE[locale];
  return SAMPLE_WHATSAPP_BY_LOCALE.ro;
}

export function demoFillFromPhoto(
  filename?: string,
  locale: string = "ro"
): Partial<Fisa> {
  const tip: TipFisa = /revizie|service|przegl[aą]d/i.test(filename || "")
    ? "Revizie"
    : /pif|punere|commission/i.test(filename || "")
      ? "Punere în funcțiune"
      : "Reparație";

  const brandFromName = filename?.match(/nilfisk|kärcher|karcher|tennant/i)
    ? filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")
    : null;

  if (locale === "en") {
    return {
      tip,
      client: "Northern Facilities Ltd",
      proprietar: "Northern Facilities Ltd",
      locatie: "Deansgate 120, Manchester M3 2GA",
      modelUtilaj: brandFromName || "Nilfisk SC500",
      serie: "NF" + String(Math.floor(100000 + Math.random() * 899999)),
      oreFunctionare: "2156",
      manoperaOre: "2",
      deplasareKm: "22",
      deplasareDaNu: "DA",
      reclamatie:
        "Machine not vacuuming properly; check filter and vacuum system. Filled from photo (demo).",
      dataAnuntarii: localIsoDate(new Date(Date.now() - 86400000 * 2)),
      dataInterventiei: localIsoDate(),
      observatii: "Asset photo attached to job sheet.",
      motiveInlocuire: "Normal filter wear after operating hours.",
      piese: (() => {
        const p = EMPTY_PIESE();
        p[0] = {
          nr: 1,
          denumire: "Panel filter",
          cod: "56116026",
          cantitate: "1",
          pretEur: "38.00",
        };
        p[1] = {
          nr: 2,
          denumire: "Tank gasket",
          cod: "G-SC500",
          cantitate: "1",
          pretEur: "12.50",
        };
        return p;
      })(),
    };
  }

  if (locale === "pl") {
    return {
      tip,
      client: "CleanPro Wrocław Sp. z o.o.",
      proprietar: "CleanPro Wrocław Sp. z o.o.",
      locatie: "ul. Świdnicka 15, Wrocław",
      modelUtilaj: brandFromName || "Nilfisk SC500",
      serie: "NF" + String(Math.floor(100000 + Math.random() * 899999)),
      oreFunctionare: "2156",
      manoperaOre: "2",
      deplasareKm: "22",
      deplasareDaNu: "DA",
      reclamatie:
        "Urządzenie słabo odsysa; sprawdzić filtr i układ ssący. Uzupełnione ze zdjęcia (demo).",
      dataAnuntarii: localIsoDate(new Date(Date.now() - 86400000 * 2)),
      dataInterventiei: localIsoDate(),
      observatii: "Zdjęcie urządzenia dołączone do protokołu.",
      motiveInlocuire: "Naturalne zużycie filtra po motogodzinach.",
      piese: (() => {
        const p = EMPTY_PIESE();
        p[0] = {
          nr: 1,
          denumire: "Filtr panelowy",
          cod: "56116026",
          cantitate: "1",
          pretEur: "38.00",
        };
        p[1] = {
          nr: 2,
          denumire: "Uszczelka zbiornika",
          cod: "G-SC500",
          cantitate: "1",
          pretEur: "12.50",
        };
        return p;
      })(),
    };
  }

  return {
    tip,
    client: "SC Curățenie Plus SRL",
    proprietar: "SC Curățenie Plus SRL",
    locatie: "Oradea, str. Independenței 45",
    modelUtilaj: brandFromName || "Nilfisk SC500",
    serie: "NF" + String(Math.floor(100000 + Math.random() * 899999)),
    oreFunctionare: "2156",
    manoperaOre: "2",
    deplasareKm: "22",
    deplasareDaNu: "DA",
    reclamatie:
      "Utilaj nu aspiră corect; verificare filtru și sistem vid. Completat din fotografie (demo).",
    dataAnuntarii: localIsoDate(new Date(Date.now() - 86400000 * 2)),
    dataInterventiei: localIsoDate(),
    observatii: "Fotografie utilaj atașată la fișă.",
    motiveInlocuire: "Uzura normală a filtrului după orele de funcționare.",
    piese: (() => {
      const p = EMPTY_PIESE();
      p[0] = {
        nr: 1,
        denumire: "Filtru panou",
        cod: "56116026",
        cantitate: "1",
        pretEur: "190.00",
      };
      p[1] = {
        nr: 2,
        denumire: "Garnitură rezervor",
        cod: "G-SC500",
        cantitate: "1",
        pretEur: "62.50",
      };
      return p;
    })(),
  };
}
