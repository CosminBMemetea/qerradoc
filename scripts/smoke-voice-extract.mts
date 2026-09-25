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
import { readFileSync } from "node:fs";
import {
  EXTRACTION_JSON_SCHEMA,
  applyCatalog,
  buildExtractMessages,
  extractionToFisa,
  matchCatalog,
  numbersInText,
  numStr,
  validateExtraction,
  type ExtractResponse,
} from "../src/lib/ai-extract.ts";
import type { CatalogClient, CatalogEquipment, ContentLocale } from "../src/lib/types.ts";

import { SENTENCES } from "./voice-sentences.mts";
export { SENTENCES };

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

  // Client guard: a catalog hint the text doesn't name ("Forum") is not grabbed…
  const hinted = validateExtraction({ ...llmRo, client: "HOTEL CONTINENTAL FORUM", locatie: "" }, SENTENCES.ro, { clients: ["HOTEL CONTINENTAL FORUM"] })!;
  assert.equal(hinted.client, "", "grabbed catalog client dropped");
  const grabbed = applyCatalog({ ...hinted, serie: "" }, clients, equipment);
  assert.equal(grabbed.client, "", "…and no catalog location comes with it");
  assert.equal(grabbed.locatie, "");
  // …but the canonical spelling is accepted when the text names it.
  const named = validateExtraction({ ...llmRo, client: "HOTEL CONTINENTAL FORUM", locatie: "" }, "Hotel Continental Forum, " + SENTENCES.ro.split(", ").slice(1).join(", "), { clients: ["HOTEL CONTINENTAL FORUM"] })!;
  assert.equal(named.client, "HOTEL CONTINENTAL FORUM");
  assert.equal(validateExtraction({ ...llmRo, client: "Continental" }, SENTENCES.ro)!.client, "Continental");
  assert.equal(validateExtraction({ ...llmRo, client: "Hotel Belvedere" }, SENTENCES.ro)!.client, "", "generic word 'Hotel' alone doesn't trace");

  // EN/PL mocked outputs stay in their language (validator never translates).
  const en = validateExtraction({ client: "Grand Hotel Leeds", locatie: "", modelUtilaj: "Kärcher B 40", serie: "KB-445566", oreFunctionare: "", tip: "Reparație", reclamatie: "Not picking up water", observatii: "Replaced the squeegee blade and the vacuum hose", manoperaOre: "1.5", deplasareKm: "22", piese: [{ denumire: "Squeegee blade", cod: "", cantitate: "1", pret: "" }, { denumire: "Vacuum hose", cod: "", cantitate: "1", pret: "" }] }, SENTENCES.en)!;
  assert.equal(en.modelUtilaj, "Kärcher B 40");
  assert.equal(en.manoperaOre, "1.5");
  assert.equal(en.piese[1].denumire, "Vacuum hose");
  const pl = validateExtraction({ client: "Hotel Marriott Warszawa", locatie: "Warszawa", modelUtilaj: "Tennant T300", serie: "TN-112233", oreFunctionare: "", tip: "Reparație", reclamatie: "Nie zbiera wody", observatii: "Wymieniłem szczotkę walcową i gumy ssawy", manoperaOre: "2", deplasareKm: "18", piese: [{ denumire: "Szczotka walcowa", cod: "", cantitate: "1", pret: "" }] }, SENTENCES.pl)!;
  assert.equal(pl.locatie, "Warszawa");
  assert.equal(pl.reclamatie, "Nie zbiera wody");
  // 3d: numbers must be traceable (digits or ro/en/pl number words).
  const has = (t: string, n: number) => numbersInText(t).has(n);
  assert.ok(has(SENTENCES.ro, 2) && has(SENTENCES.ro, 35), "două / 35");
  assert.ok(has(SENTENCES.en, 1.5) && has(SENTENCES.en, 22), "one and a half");
  assert.ok(has(SENTENCES.pl, 2) && has(SENTENCES.pl, 18), "dwie");
  assert.ok(has("o oră și jumătate", 1.5));
  assert.ok(has("półtorej godziny", 1.5));
  assert.ok(has("douăzeci și cinci de km", 25));
  assert.ok(has("twenty five km", 25));
  assert.ok(has("dwadzieścia pięć km", 25));
  assert.ok(has("1,5 ore", 1.5));
  assert.ok(!has(SENTENCES.ro, 3));
  const blank = { client: "", locatie: "", modelUtilaj: "", serie: "", oreFunctionare: "", tip: "", reclamatie: "", observatii: "", manoperaOre: "", deplasareKm: "", piese: [] };
  const inv = validateExtraction(
    { ...blank, oreFunctionare: "1200", manoperaOre: "3", deplasareKm: "40",
      reclamatie: "Motor ars, zgomot puternic",
      piese: [
        { denumire: "Perie cilindrică", cod: "", cantitate: "4", pret: "250" },
        { denumire: "Motor ventilator", cod: "", cantitate: "1", pret: "" },
      ] },
    SENTENCES.ro
  )!;
  assert.equal(inv.oreFunctionare, "", "invented hour meter dropped");
  assert.equal(inv.manoperaOre, "", "invented labour dropped");
  assert.equal(inv.deplasareKm, "", "invented km dropped");
  assert.equal(inv.reclamatie, "", "complaint unrelated to the text dropped");
  assert.equal(inv.piese.length, 1, "part not mentioned in the text dropped");
  assert.equal(inv.piese[0].cantitate, "1", "untraceable qty → 1 piece");
  assert.equal(inv.piese[0].pret, "", "untraceable price dropped");
  const ok2 = validateExtraction(
    { ...blank, manoperaOre: "1.5", deplasareKm: "22", reclamatie: "Not picking up water",
      piese: [{ denumire: "Squeegee blade", cod: "", cantitate: "2", pret: "" }] },
    "Not picking up water, replaced two squeegee blades, one and a half hours, 22 km"
  )!;
  assert.equal(ok2.manoperaOre, "1.5");
  assert.equal(ok2.deplasareKm, "22");
  assert.equal(ok2.piese[0].cantitate, "2", "two → 2");
  assert.equal(ok2.reclamatie, "Not picking up water");
  const pl2 = validateExtraction({ ...blank, piese: [{ denumire: "Szczotka walcowa", cod: "", cantitate: "1", pret: "120" }] }, "wymieniłem szczotkę walcową za 120 zł")!;
  assert.equal(pl2.piese[0].denumire, "Szczotka walcowa", "inflected PL name matches");
  assert.equal(pl2.piese[0].pret, "120");

  // Testing repro (ac5): invented parts must not survive a shared stem.
  {
    const txt = "Hotel Continental, Nilfisk SC500 seria SN-998877, nu aspiră apa, am schimbat racleta, două ore manoperă, 35 km";
    const out = validateExtraction(
      { ...blank, client: "Hotel Continental", modelUtilaj: "Nilfisk SC500",
        piese: [
          { denumire: "Motor aspirație", cod: "", cantitate: "2", pret: "" },
          { denumire: "Racletă spate", cod: "", cantitate: "2", pret: "" },
          { denumire: "Hotel racleta", cod: "", cantitate: "2", pret: "" },
          { denumire: "Continental motor", cod: "", cantitate: "2", pret: "" },
          { denumire: "Filtru HEPA", cod: "", cantitate: "1", pret: "" },
          { denumire: "Racletă", cod: "", cantitate: "2", pret: "" },
        ] },
      txt
    )!;
    assert.deepEqual(out.piese.map((p) => p.denumire), ["Racletă"], "only the part actually named survives");
    assert.equal(out.piese[0].cantitate, "1", "'două ore' is not the part quantity");
    const q = validateExtraction({ ...blank, piese: [{ denumire: "Perie cilindrică", cod: "", cantitate: "2", pret: "" }, { denumire: "Filtru HEPA", cod: "", cantitate: "3", pret: "" }] },
      "am schimbat două perii cilindrice, filtru HEPA x3")!;
    assert.deepEqual(q.piese.map((p) => p.cantitate), ["2", "3"], "stated part quantities kept");
    const en = validateExtraction({ ...blank, piese: [{ denumire: "Squeegee blade", cod: "", cantitate: "2", pret: "" }] }, "replaced two squeegee blades")!;
    assert.equal(en.piese[0].cantitate, "2");
    // 1 needs a digit, a real "one" word, or article + unit.
    const one = (t: string) => numbersInText(t).has(1);
    assert.ok(!one("nu aspiră apa, o problemă la motor"), "RO article 'o' alone ≠ 1");
    assert.ok(!one("replaced a blade"), "EN article 'a' alone ≠ 1");
    assert.ok(!one("un client nou"), "RO 'un' alone ≠ 1");
    assert.ok(one("o oră manoperă") && one("an hour of labour") && one("un km") && one("1 h") && one("one hour"));
    assert.ok(numbersInText("an hour and a half").has(1.5));
    const h = validateExtraction({ ...blank, manoperaOre: "1", deplasareKm: "1", oreFunctionare: "1" }, "a fost o problemă, am schimbat o racletă")!;
    assert.deepEqual([h.manoperaOre, h.deplasareKm, h.oreFunctionare], ["", "", ""], "1 via articles dropped");
  }

  console.log("smoke-voice-extract: mocked OK");
}

// ---------------------------------------------------------------- catalog ties
function catalogTies() {
  const pack = JSON.parse(readFileSync("docs/pilot/cleantech-service-srl.querra.json", "utf8"));
  // The pilot pack itself holds both "Hotel Continental Forum" (Sibiu) and
  // "Hotel Continental Oradea" (from the RO fișă fixture) — the QA case.
  const base: CatalogClient[] = pack.clients;
  assert.ok(base.some((c) => /oradea/i.test(c.name)) && base.some((c) => /forum/i.test(c.name)));
  const oradea = base.find((c) => /continental oradea/i.test(c.name))!;
  const withoutOradea = base.filter((c) => c !== oradea);
  const equipment: CatalogEquipment[] = pack.equipment;
  const ex = validateExtraction(
    { client: "Hotel Continental", locatie: "", modelUtilaj: "Nilfisk SC500", serie: "", oreFunctionare: "", tip: "", reclamatie: "", observatii: "", manoperaOre: "", deplasareKm: "", piese: [] },
    SENTENCES.ro
  )!;
  for (const [label, list] of [
    ["pack-order", base],
    ["reversed", [...base].reverse()],
  ] as const) {
    const out = applyCatalog(ex, [...list], equipment);
    assert.equal(out.client, "Hotel Continental", `${label}: ambiguous → spoken text kept`);
    assert.equal(out.locatie, "", `${label}: no location from an ambiguous match`);
    assert.equal(matchCatalog("Hotel Continental", [...list], (c) => c.name)?.unique, false, `${label}: tie detected`);
  }
  // Unique match (pack only has Forum) → canonical name + location.
  for (const list of [withoutOradea, [...withoutOradea].reverse()]) {
    const out = applyCatalog(ex, list, equipment);
    assert.equal(out.client, "Hotel Continental Forum");
    assert.equal(out.locatie, "Sibiu, Piața Unirii 10");
  }
  // Exact name wins even when another entry contains it.
  const exact = applyCatalog({ ...ex, client: oradea.name }, base, equipment);
  assert.equal(exact.client, oradea.name);
  assert.equal(exact.locatie, oradea.locatie || "");
  // Serial shared by two machines → no guess.
  const now = new Date().toISOString();
  const dupSerie = applyCatalog({ ...ex, modelUtilaj: "", serie: "SN-998877" }, base, [
    ...equipment,
    { id: "dup", model: "Other model", serie: "SN998877", updatedAt: now },
  ]);
  assert.equal(dupSerie.modelUtilaj, "");
  console.log("smoke-voice-extract: catalog ties OK");
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
catalogTies();
await live();

// ── 3b: Groq resilience chain (retry once honouring Retry-After, then smaller model) ──
{
  const { groqExtract, parseRetryAfter, PRIMARY_MODEL, FALLBACK_MODEL, RETRY_CAP_MS } = await import("../src/lib/groq-extract.ts");
  const good = { client: "Hotel Continental", locatie: "", modelUtilaj: "Nilfisk SC500", serie: "SN-998877", oreFunctionare: "", tip: "", reclamatie: "Nu aspiră apa", observatii: "", manoperaOre: "2", deplasareKm: "35", piese: [] };
  const okRes = () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(good) } }] }), { status: 200 });
  const err = (status: number, headers: Record<string, string> = {}) => new Response("upstream says no", { status, headers });
  const run = async (script: ((model: string) => Response | Promise<Response>)[]) => {
    const calls: string[] = [];
    const sleeps: number[] = [];
    let i = 0;
    const r = await groqExtract(
      { text: SENTENCES.ro, locale: "ro", hints: { clients: [], models: [] } },
      { url: "http://mock/chat", apiKey: "k" },
      {
        fetch: (async (_u: unknown, init?: RequestInit) => {
          const model = JSON.parse(String(init?.body)).model;
          calls.push(model);
          return script[Math.min(i++, script.length - 1)](model);
        }) as typeof fetch,
        sleep: async (ms: number) => { sleeps.push(ms); },
        log: () => {},
      }
    );
    return { r, calls, sleeps };
  };
  assert.equal(parseRetryAfter("1"), 1000);
  assert.equal(parseRetryAfter("0.5"), 500);
  assert.equal(parseRetryAfter(null), null);

  let x = await run([() => okRes()]);
  assert.ok(x.r.ok && x.r.model === PRIMARY_MODEL && x.calls.length === 1);

  x = await run([() => err(429, { "retry-after": "1" }), () => okRes()]);
  assert.ok(x.r.ok && x.r.model === PRIMARY_MODEL, "429 → retry primary");
  assert.deepEqual(x.sleeps, [1000], "honours Retry-After");

  x = await run([() => err(429, { "retry-after": "30" }), () => err(429), () => okRes()]);
  assert.deepEqual(x.sleeps, [RETRY_CAP_MS], "Retry-After capped");
  assert.deepEqual(x.calls, [PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL]);
  assert.ok(x.r.ok && x.r.model === FALLBACK_MODEL, "then smaller model");

  x = await run([() => err(502), () => err(502), () => err(502)]);
  assert.ok(!x.r.ok && x.r.reason === "http_502" && x.r.status === 502, "real reason returned");
  assert.equal(x.calls.length, 3);
  if (!x.r.ok) assert.deepEqual(x.r.attempts, [`${PRIMARY_MODEL}:http_502`, `${PRIMARY_MODEL}:http_502`, `${FALLBACK_MODEL}:http_502`]);

  x = await run([() => err(401)]);
  assert.ok(!x.r.ok && x.r.reason === "auth" && x.calls.length === 1, "auth: no retry / no fallback model");

  x = await run([() => new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] })), () => okRes()]);
  assert.ok(x.r.ok && x.r.model === FALLBACK_MODEL && x.sleeps.length === 0, "invalid output → smaller model, no retry");

  x = await run([() => { throw new TypeError("fetch failed"); }, () => okRes()]);
  assert.ok(x.r.ok && x.r.model === PRIMARY_MODEL, "network error → one retry");
  console.log("smoke-voice-extract: groq retry/fallback chain OK");
}
