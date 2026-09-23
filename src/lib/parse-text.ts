import type { Fisa, TipFisa } from "./types";
import { EMPTY_PIESE } from "./types";

/** Heuristic parse of WhatsApp-style Romanian service messages into fișă fields. */
export function parseWhatsAppText(text: string): Partial<Fisa> {
  const t = text.replace(/\r\n/g, "\n").trim();
  const lower = t.toLowerCase();
  const result: Partial<Fisa> = {
    reclamatie: t,
    piese: EMPTY_PIESE(),
  };

  // Tip
  if (/punere\s*[îi]n\s*func/i.test(t) || /\bpif\b/i.test(t)) {
    result.tip = "Punere în funcțiune";
  } else if (/revizie/i.test(t)) {
    result.tip = "Revizie";
  } else if (/constatare/i.test(t)) {
    result.tip = "Constatare";
  } else if (/repara[tț]ie|reparat|defect|stricat/i.test(t)) {
    result.tip = "Reparație";
  }

  // Client
  const clientMatch =
    t.match(/(?:client|beneficiar|pt\.?|pentru)\s*[:\-]?\s*([A-ZĂÂÎȘȚ][^\n,;]{2,40})/i) ||
    t.match(/(?:la|de la)\s+(SC\s+[^\n,;]{2,40}|[A-ZĂÂÎȘȚ][a-zăâîșț]+(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșț]+){0,3})/);
  if (clientMatch) result.client = clientMatch[1].trim();

  // Locație
  const locMatch = t.match(
    /(?:loca[tț]ie|adresa|adresă|sediu|la)\s*[:\-]?\s*([^\n]{5,60})/i
  );
  if (locMatch) {
    const loc = locMatch[1].replace(/[,;].*$/, "").trim();
    if (loc.length > 3 && !/client/i.test(loc)) result.locatie = loc;
  }

  // Model utilaj — brands + generic
  const modelMatch = t.match(
    /(?:model|utilaj|ma[sș]in[aă]|aspirator|scrubber|extractor|injector)\s*[:\-]?\s*([A-Za-z0-9ĂÂÎȘȚăâîșț\-\/\.\s]{2,40})/i
  );
  if (modelMatch) {
    result.modelUtilaj = modelMatch[1].replace(/[,;\n].*$/, "").trim();
  } else {
    const brand = t.match(
      /\b(K[aä]rcher|Nilfisk|Tennant|IPC|Hako|Comac|Fimap|Taski|Numatic|Ghibli)\s+([A-Za-z0-9\-\/]+)/i
    );
    if (brand) result.modelUtilaj = `${brand[1]} ${brand[2]}`.trim();
  }

  // Serie
  const serieMatch = t.match(
    /(?:serie|serial|s\/n|sn|nr\.?\s*serie)\s*[:\-]?\s*([A-Z0-9\-]{4,30})/i
  );
  if (serieMatch) result.serie = serieMatch[1].trim();

  // Ore funcționare
  const oreMatch = t.match(
    /(?:ore|ore\s*func|contor|hours?)\s*[:\-]?\s*(\d[\d\.,]*)/i
  );
  if (oreMatch) result.oreFunctionare = oreMatch[1].replace(",", ".");

  // Manoperă
  const manMatch = t.match(
    /(?:manoper[aă]|ore\s*lucru|timp)\s*[:\-]?\s*(\d[\d\.,]*)\s*(?:h|ore)?/i
  );
  if (manMatch) result.manoperaOre = manMatch[1].replace(",", ".");

  // Deplasare km
  const kmMatch = t.match(/(?:deplasare|km)\s*[:\-]?\s*(\d[\d\.,]*)\s*km?/i);
  if (kmMatch) {
    result.deplasareKm = kmMatch[1].replace(",", ".");
    result.deplasareDaNu = "DA";
  } else if (/f[aă]r[aă]\s*deplasare|nu\s*deplas/i.test(lower)) {
    result.deplasareDaNu = "NU";
  }

  // Proprietar
  const propMatch = t.match(/(?:proprietar|owner)\s*[:\-]?\s*([^\n,;]{2,40})/i);
  if (propMatch) result.proprietar = propMatch[1].trim();

  // Data anunțării
  const dataAnunt = t.match(
    /(?:anun[tț]|reclamat|somat|apel)\s*(?:pe|din|la)?\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/i
  );
  if (dataAnunt) result.dataAnuntarii = normalizeDate(dataAnunt[1]);

  // Data intervenției
  const dataInt = t.match(
    /(?:interven[tț]ie|azi|data)\s*[:\-]?\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/i
  );
  if (dataInt) result.dataInterventiei = normalizeDate(dataInt[1]);

  // Piese — lines like "filtru aer x2" or "cod ABC-123"
  const piese = EMPTY_PIESE();
  let pi = 0;
  const lines = t.split("\n");
  for (const line of lines) {
    if (pi >= 15) break;
    const piesaMatch = line.match(
      /(?:piesa?|material|filtru|curea|motor|pomp[aă]|furtun|perie|saci?|baterie|garnitur[aă])\s*[:\-]?\s*(.+)/i
    );
    const bullet = line.match(/^[\-\*•]\s*(.+)/);
    const qtyMatch = line.match(/(.+?)\s+[xX×]\s*(\d+)/);
    if (piesaMatch || (bullet && /piese|material/i.test(lower))) {
      const den = (piesaMatch?.[1] || bullet?.[1] || "").trim();
      if (den.length > 2) {
        piese[pi] = {
          nr: pi + 1,
          denumire: den.replace(/\s+[xX×]\s*\d+.*/, "").slice(0, 80),
          cod: (line.match(/\b([A-Z0-9]{2,}[\-][A-Z0-9\-]+)\b/) || [])[1] || "",
          cantitate: qtyMatch?.[2] || "1",
          pretEur: "",
        };
        pi++;
      }
    } else if (qtyMatch && /piese|material|schimb|înlocuit|inlocuit/i.test(lower)) {
      piese[pi] = {
        nr: pi + 1,
        denumire: qtyMatch[1].trim().slice(0, 80),
        cod: "",
        cantitate: qtyMatch[2],
        pretEur: "",
      };
      pi++;
    }
  }
  result.piese = piese;

  // Observații — keep original as reclamatie if we found structured fields
  if (result.client || result.modelUtilaj || result.serie) {
    // Extract complaint part
    const recMatch = t.match(
      /(?:reclam[aă][tț]ie|problem[aă]|defect|nu\s+porne[sș]te|solicitare)[:\s]+([^\n]{10,200})/i
    );
    if (recMatch) result.reclamatie = recMatch[1].trim();
  }

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
      dataAnuntarii: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
      dataInterventiei: new Date().toISOString().slice(0, 10),
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
      dataAnuntarii: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
      dataInterventiei: new Date().toISOString().slice(0, 10),
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
    dataAnuntarii: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    dataInterventiei: new Date().toISOString().slice(0, 10),
    observatii: "Fotografie utilaj atașată la fișă.",
    motiveInlocuire: "Uzura normală a filtrului după orele de funcționare.",
    piese: (() => {
      const p = EMPTY_PIESE();
      p[0] = {
        nr: 1,
        denumire: "Filtru panou",
        cod: "56116026",
        cantitate: "1",
        pretEur: "38.00",
      };
      p[1] = {
        nr: 2,
        denumire: "Garnitură rezervor",
        cod: "G-SC500",
        cantitate: "1",
        pretEur: "12.50",
      };
      return p;
    })(),
  };
}
