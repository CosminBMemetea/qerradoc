/**
 * smoke:heuristic — the on-device fallback parser (parse-text.ts) on the
 * smoke:voice example dictations + the WhatsApp samples, with expected
 * outputs, word-boundary regressions and explicit type detection.
 */
import assert from "node:assert/strict";
import { explicitTip, parseWhatsAppText, resolveNewSheetTip, sampleWhatsApp } from "../src/lib/parse-text.ts";
import { SENTENCES } from "./voice-sentences.mts";

const names = (r: ReturnType<typeof parseWhatsAppText>) =>
  (r.piese || []).filter((p) => p.denumire).map((p) => p.denumire);

const EXPECT = {
  ro: {
    client: "Hotel Continental", modelUtilaj: "Nilfisk SC500", serie: "SN-998877",
    manoperaOre: "2", deplasareKm: "35", reclamatie: "Nu aspiră apa",
    piese: ["Peria cilindrică", "Racleta"],
  },
  en: {
    client: "Grand Hotel Leeds", modelUtilaj: "Kärcher B 40", serie: "KB-445566",
    manoperaOre: "1.5", deplasareKm: "22", reclamatie: "Not picking up water",
    piese: ["Squeegee blade", "Vacuum hose"],
  },
  pl: {
    client: "Hotel Marriott Warszawa", modelUtilaj: "Tennant T300", serie: "TN-112233",
    manoperaOre: "2", deplasareKm: "18", reclamatie: "Nie zbiera wody",
    piese: ["Szczotkę walcową", "Gumy ssawy"],
  },
} as const;

for (const loc of ["ro", "en", "pl"] as const) {
  const r = parseWhatsAppText(SENTENCES[loc]);
  const e = EXPECT[loc];
  for (const k of ["client", "modelUtilaj", "serie", "manoperaOre", "deplasareKm", "reclamatie"] as const) {
    assert.equal(r[k], e[k], `${loc}.${k}`);
  }
  assert.deepEqual(names(r), e.piese, `${loc}.piese`);
  assert.equal(r.locatie, undefined, `${loc}: no locatie invented (no 'la' inside words)`);
  assert.equal(r.tip, undefined, `${loc}: no explicit type word → firm default`);
}

// Word-boundary regressions from Testing.
assert.equal(parseWhatsAppText("replaced the squeegee").locatie, undefined, "'replaced' ≠ la");
assert.equal(parseWhatsAppText("Labour 1.5 h").locatie, undefined, "'Labour' ≠ la");
assert.equal(parseWhatsAppText("am pus sare.").locatie, undefined);
assert.equal(parseWhatsAppText("utilaj pe sare, necesar curățare").locatie, undefined);
assert.equal(parseWhatsAppText("seria SN-998877").serie, "SN-998877");
assert.equal(parseWhatsAppText("serie: SN-998877").serie, "SN-998877");
assert.equal(parseWhatsAppText("S/N 12345678").serie, "12345678");
assert.equal(parseWhatsAppText("adresa: str. Mare 5, Cluj").locatie, "str. Mare 5");

// Labour hours without a labour keyword (ac5 item 5).
assert.equal(parseWhatsAppText("two hours").manoperaOre, "2");
assert.equal(parseWhatsAppText("Tennant T300 nr seryjny TN-112233, dwie godziny").manoperaOre, "2");
assert.equal(parseWhatsAppText("două ore").manoperaOre, "2");
assert.equal(parseWhatsAppText("one and a half hours").manoperaOre, "1.5");
assert.equal(parseWhatsAppText("utilaj cu 1842 ore de funcționare").manoperaOre, undefined, "hour meter ≠ labour");

// Hour meter vs labour (306 item 5): keyword before OR after the number.
const HM: [string, string | undefined, string | undefined][] = [
  // text, oreFunctionare, manoperaOre
  ["contor 1842 ore", "1842", undefined],
  ["2105 hours on the meter", "2105", undefined],
  ["1842 godzin pracy", "1842", undefined],
  ["1842 ore de funcționare", "1842", undefined],
  ["1842 motogodzin", "1842", undefined],
  ["licznik 1760, dwie godziny", "1760", "2"],
  ["hour meter 2105, two hours", "2105", "2"],
  ["contor 1842 ore, două ore manoperă", "1842", "2"],
  ["1842 ore de funcționare, 3 ore", "1842", "3"],
  ["utilaj cu 350 ore", undefined, undefined],
  ["150 hours", undefined, undefined],
  ["an hour and a half", undefined, "1.5"],
  ["o oră și jumătate", undefined, "1.5"],
  ["one and a half hours", undefined, "1.5"],
];
for (const [txt, meter, labour] of HM) {
  const r = parseWhatsAppText(txt);
  assert.equal(r.oreFunctionare, meter, `meter: ${txt}`);
  assert.equal(r.manoperaOre, labour, `labour: ${txt}`);
}

// WhatsApp samples (ro/en/pl).
const s = {
  ro: parseWhatsAppText(sampleWhatsApp("ro")),
  en: parseWhatsAppText(sampleWhatsApp("en")),
  pl: parseWhatsAppText(sampleWhatsApp("pl")),
};
assert.equal(s.ro.client, "Hotel Belvedere Oradea");
assert.equal(s.ro.locatie, "str. Republicii 12");
assert.equal(s.ro.modelUtilaj, "Kärcher B 60 W Bp");
assert.equal(s.ro.serie, "KBH2045678");
assert.equal(s.ro.oreFunctionare, "1842");
assert.equal(s.ro.manoperaOre, "1.5");
assert.equal(s.ro.deplasareKm, "14");
assert.equal(s.ro.dataAnuntarii, "2026-09-18");
assert.deepEqual(names(s.ro), ["Filtru HEPA", "Perie cilindrică"]);
assert.equal(s.ro.piese![0].cod, "6.414-631.0");
assert.equal(s.en.client, "CityGate Business Centre Manchester");
assert.equal(s.en.locatie, "Deansgate 120");
assert.equal(s.en.serie, "NF-SC500-55102");
assert.equal(s.en.oreFunctionare, "2105");
assert.deepEqual(names(s.en), ["HEPA filter", "Cylindrical brush"]);
assert.equal(s.pl.client, "Hotel Piast Wrocław");
assert.equal(s.pl.locatie, "ul. Świdnicka 15");
assert.equal(s.pl.serie, "KB60-2024-77103");
assert.equal(s.pl.oreFunctionare, "1760");
assert.equal(s.pl.deplasareKm, "9");

// Explicit type words only (3f).
const TIP: [string, string | undefined][] = [
  ["constatare la Hotel X", "Constatare"],
  ["revizie anuală", "Revizie"],
  ["reparație pompă", "Reparație"],
  ["punere în funcțiune utilaj nou", "Punere în funcțiune"],
  ["inspection of the scrubber", "Constatare"],
  ["annual maintenance", "Revizie"],
  ["repair of the vacuum motor", "Reparație"],
  ["commissioning of new machine", "Punere în funcțiune"],
  ["ekspertyza urządzenia", "Constatare"],
  ["przegląd okresowy", "Revizie"],
  ["naprawa szczotki", "Reparație"],
  ["uruchomienie maszyny", "Punere în funcțiune"],
  ["nu aspiră, am schimbat peria", undefined],
  ["defect, stricat", undefined],
  ["preparation of the area", undefined],
];
for (const [txt, want] of TIP) assert.equal(explicitTip(txt), want, `explicitTip(${txt})`);

// Firm default wins unless the text names the type; LLM guess only without a default.
assert.equal(resolveNewSheetTip(SENTENCES.ro, "Revizie", "Reparație"), "Revizie");
assert.equal(resolveNewSheetTip("constatare: " + SENTENCES.ro, "Revizie", "Reparație"), "Constatare");
assert.equal(resolveNewSheetTip("annual maintenance, " + SENTENCES.en, "Reparație", "Reparație"), "Revizie");
assert.equal(resolveNewSheetTip(SENTENCES.pl, undefined, "Reparație"), "Reparație");
assert.equal(resolveNewSheetTip(SENTENCES.pl, undefined, undefined), undefined);

console.log("smoke-heuristic: OK");
