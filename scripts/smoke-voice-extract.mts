/**
 * Smoke: "speak one sentence, fields fill".
 *  1. Always: validator/mapper/catalog-matcher against mocked LLM JSON for
 *     RO/EN/PL sentences (incl. hallucinated values that must be dropped).
 *  2. Live: when GROQ_API_KEY is set (route running locally) or EXTRACT_URL is
 *     given (e.g. production), POST the sentences to /api/extract and check
 *     the key fields.
 * Run: npm run smoke:voice
 *      EXTRACT_URL=https://qerradoc.vercel.app/api/extract npm run smoke:voice
 */
import assert from "node:assert/strict";
import {
  EXTRACTION_JSON_SCHEMA,
  applyCatalog,
  buildExtractMessages,
  extractionToFisa,
  numStr,
  validateExtraction,
  type ExtractResponse,
} from "../src/lib/ai-extract.ts";
import type { CatalogClient, CatalogEquipment, ContentLocale } from "../src/lib/types.ts";

export const SENTENCES: Record<ContentLocale, string> = {
  ro: "Hotel Continental, Nilfisk SC500 seria SN-998877, nu aspiră apa, am schimbat peria cilindrică și racleta, două ore manoperă, 35 km",
  en: "Grand Hotel Leeds, Kärcher B 40 serial KB-445566, not picking up water, replaced the squeegee blade and the vacuum hose, one and a half hours labour, 22 km",
  pl: "Hotel Marriott Warszawa, Tennant T300 numer seryjny TN-112233, nie zbiera wody, wymieniłem szczotkę walcową i gumy ssawy, dwie godziny robocizny, 18 km",
};

const EXPECT: Record<ContentLocale, { client: RegExp; model: RegExp; serie: string; man: string; km: string; parts: number; reclamatie: RegExp }> = {
  ro: { client: /continental/i, model: /sc\s?500/i, serie: "SN-998877", man: "2", km: "35", parts: 2, reclamatie: /aspir/i },
  en: { client: /grand hotel leeds|leeds/i, model: /b\s?40/i, serie: "KB-445566", man: "1.5", km: "22", parts: 2, reclamatie: /water/i },
  pl: { client: /marriott/i, model: /t\s?300/i, serie: "TN-112233", man: "2", km: "18", parts: 2, reclamatie: /wod/i },
};

// ---------------------------------------------------------------- mocked
function mocked() {
  // Schema is strict-compatible: every object lists all properties as required.
  const s = EXTRACTION_JSON_SCHEMA;
  assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort());
  const item = s.properties.piese.items;
  assert.deepEqual([...item.required].sort(), Object.keys(item.properties).sort());
  assert.equal(s.additionalProperties, false);

  // Prompt language follows contentLocale; hints are passed through.
  const m = buildExtractMessages({ text: SENTENCES.pl, locale: "pl", hints: { clients: ["Hotel Marriott Warszawa"], models: ["Tennant T300"] } });
  assert.match(m[0].content, /Pisz tekst po polsku/);
  assert.match(m[0].content, /Hotel Marriott Warszawa/);
  assert.match(buildExtractMessages({ text: "x", locale: "ro" })[0].content, /limba română/);
  assert.match(buildExtractMessages({ text: "x", locale: "en" })[0].content, /in English/);

  assert.equal(numStr("2"), "2");
  assert.equal(numStr("1,5"), "1.5");
  assert.equal(numStr("35 km"), "35");
  assert.equal(numStr("35km"), "35");
  assert.equal(numStr("two"), "");
  assert.equal(numStr(-3), "");

  const llmRo = {
    client: "Hotel Continental",
    locatie: "București", // NOT in text → must be dropped
    modelUtilaj: "Nilfisk SC500",
    serie: "seria SN-998877",
    oreFunctionare: "", tip: "Reparație",
    reclamatie: "Nu aspiră apa",
    observatii: "Am schimbat peria cilindrică și racleta",
    manoperaOre: "2", deplasareKm: "35 km",
    piese: [
      { denumire: "Perie cilindrică", cod: "", cantitate: "", pret: "" },
      { denumire: "Racletă", cod: "NF-123", cantitate: "1", pret: "abc" }, // invented code
      { denumire: "", cod: "", cantitate: "1", pret: "" }, // junk row
    ],
    extra: "ignored",
  };
  const ro = validateExtraction(llmRo, SENTENCES.ro)!;
  assert.equal(ro.client, "Hotel Continental");
  assert.equal(ro.locatie, "", "invented location dropped");
  assert.equal(ro.serie, "SN-998877", "serial prefix stripped");
  assert.equal(validateExtraction({ ...llmRo, serie: "SN-998877" }, SENTENCES.ro)!.serie, "SN-998877", "SN- serial kept intact");
  assert.equal(validateExtraction({ ...llmRo, serie: "serial: SN-998877" }, SENTENCES.ro)!.serie, "SN-998877");
  assert.equal(ro.deplasareKm, "35");
  assert.equal(ro.piese.length, 2);
  assert.equal(ro.piese[0].cantitate, "1", "default qty 1");
  assert.equal(ro.piese[1].cod, "", "invented part code dropped");
  assert.equal(ro.piese[1].pret, "");
  assert.ok(!("extra" in ro));

  // Hallucinations: serial/client/model not in text → empty; bad tip → "".
  const bad = validateExtraction(
    { client: "Acme SRL", locatie: "", modelUtilaj: "Kärcher B 60", serie: "ZZ-000", oreFunctionare: "mult", tip: "Service", reclamatie: "", observatii: "", manoperaOre: "", deplasareKm: "", piese: "nope" },
    SENTENCES.ro
  )!;
  assert.equal(bad.client, "");
  assert.equal(bad.modelUtilaj, "");
  assert.equal(bad.serie, "");
  assert.equal(bad.oreFunctionare, "");
  assert.equal(bad.tip, "");
  assert.deepEqual(bad.piese, []);
  assert.equal(validateExtraction("nope", "x"), null);
  assert.equal(validateExtraction([1], "x"), null);

  // Mapping onto Fisa + highlight keys.
  const { patch, filled } = extractionToFisa(ro);
  assert.equal(patch.observatii, "Am schimbat peria cilindrică și racleta", "work done → observatii");
  assert.equal(patch.deplasareDaNu, "DA");
  assert.equal(patch.piese?.length, 15);
  assert.equal(patch.piese?.[0].denumire, "Perie cilindrică");
  assert.equal(patch.piese?.[1].nr, 2);
  assert.ok(!("locatie" in patch), "empty fields not written");
  for (const k of ["client", "modelUtilaj", "serie", "tip", "reclamatie", "observatii", "manoperaOre", "deplasareKm", "piese", "deplasareDaNu"]) {
    assert.ok(filled.includes(k as never), `filled has ${k}`);
  }

  // Catalog fuzzy match: spoken "hotel continental" → canonical name + location;
  // serial match fills canonical model.
  const now = new Date().toISOString();
  const clients: CatalogClient[] = [
    { id: "c1", name: "HOTEL CONTINENTAL FORUM", locatie: "Sibiu, Piața Unirii 10", updatedAt: now },
    { id: "c2", name: "Mega Image Titan", updatedAt: now },
  ];
  const equipment: CatalogEquipment[] = [
    { id: "e1", model: "Nilfisk SC500 53 B", serie: "SN998877", clientName: "HOTEL CONTINENTAL FORUM", updatedAt: now },
  ];
  const cat = applyCatalog(ro, clients, equipment);
  assert.equal(cat.client, "HOTEL CONTINENTAL FORUM");
  assert.equal(cat.locatie, "Sibiu, Piața Unirii 10");
  assert.equal(cat.modelUtilaj, "Nilfisk SC500 53 B");
  const noMatch = applyCatalog({ ...ro, client: "Spital Județean", serie: "" }, clients, equipment);
  assert.equal(noMatch.client, "Spital Județean", "no false catalog match");

  // Catalog canonical spelling accepted by grounding when text names it approximately.
  const hinted = validateExtraction({ ...llmRo, client: "HOTEL CONTINENTAL FORUM", locatie: "" }, SENTENCES.ro, { clients: ["HOTEL CONTINENTAL FORUM"] })!;
  assert.equal(hinted.client, "HOTEL CONTINENTAL FORUM");

  // EN/PL mocked outputs stay in their language (validator never translates).
  const en = validateExtraction({ client: "Grand Hotel Leeds", locatie: "", modelUtilaj: "Kärcher B 40", serie: "KB-445566", oreFunctionare: "", tip: "Reparație", reclamatie: "Not picking up water", observatii: "Replaced the squeegee blade and the vacuum hose", manoperaOre: "1.5", deplasareKm: "22", piese: [{ denumire: "Squeegee blade", cod: "", cantitate: "1", pret: "" }, { denumire: "Vacuum hose", cod: "", cantitate: "1", pret: "" }] }, SENTENCES.en)!;
  assert.equal(en.modelUtilaj, "Kärcher B 40");
  assert.equal(en.manoperaOre, "1.5");
  assert.equal(en.piese[1].denumire, "Vacuum hose");
  const pl = validateExtraction({ client: "Hotel Marriott Warszawa", locatie: "Warszawa", modelUtilaj: "Tennant T300", serie: "TN-112233", oreFunctionare: "", tip: "Reparație", reclamatie: "Nie zbiera wody", observatii: "Wymieniłem szczotkę walcową i gumy ssawy", manoperaOre: "2", deplasareKm: "18", piese: [{ denumire: "Szczotka walcowa", cod: "", cantitate: "1", pret: "" }] }, SENTENCES.pl)!;
  assert.equal(pl.locatie, "Warszawa");
  assert.equal(pl.reclamatie, "Nie zbiera wody");
  console.log("smoke-voice-extract: mocked OK");
}

// ---------------------------------------------------------------- live
async function live() {
  const url = process.env.EXTRACT_URL || (process.env.GROQ_API_KEY ? "http://localhost:3000/api/extract" : "");
  if (!url) {
    console.log("smoke-voice-extract: live SKIPPED (no GROQ_API_KEY / EXTRACT_URL)");
    return;
  }
  for (const loc of ["ro", "en", "pl"] as ContentLocale[]) {
    const t0 = Date.now();
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: SENTENCES[loc], locale: loc }) });
    const json = (await res.json()) as ExtractResponse;
    const ms = Date.now() - t0;
    assert.ok(json.ok, `${loc}: route ok (${res.status} ${JSON.stringify(json)})`);
    if (!json.ok) continue;
    const d = json.data;
    const e = EXPECT[loc];
    console.log(`[${loc}] ${ms}ms ${json.model}\n` + JSON.stringify(d, null, 1));
    assert.match(d.client, e.client, `${loc} client`);
    assert.match(d.modelUtilaj, e.model, `${loc} model`);
    assert.equal(d.serie.toUpperCase(), e.serie, `${loc} serie`);
    assert.equal(d.manoperaOre, e.man, `${loc} manopera`);
    assert.equal(d.deplasareKm, e.km, `${loc} km`);
    assert.ok(d.piese.length >= e.parts, `${loc} parts`);
    assert.match(d.reclamatie, e.reclamatie, `${loc} reclamatie in ${loc}`);
    assert.ok(d.observatii.length > 3, `${loc} work done`);
    assert.equal(d.tip, "Reparație", `${loc} tip`);
    assert.equal(d.locatie === "" || new RegExp(d.locatie.split(/[ ,]/)[0], "i").test(SENTENCES[loc]), true, `${loc} locatie grounded`);
  }
  console.log("smoke-voice-extract: live OK", url);
}

mocked();
await live();
