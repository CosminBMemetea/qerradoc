"use client";

import { jsPDF } from "jspdf";
import type { Fisa, FirmSettings, TipFisa } from "./types";
import { firmExample } from "./defaults";
import { embedUnicodeFont, pdfFont } from "./pdf-font";
import { currencyCode, currencySymbol } from "./currency";
import { ensurePdfCompatibleImage } from "./logo";

export type PdfLocale = "ro" | "en" | "pl";

type Labels = {
  /** Document identity subtitle under company (optional) */
  docIdentity: string;
  tipBoxes: [string, string, string, string];
  nrFisa: string;
  proprietar: string;
  client: string;
  locatie: string;
  modelUtilaj: string;
  oreFunctionare: string;
  seria: string;
  manopera: string;
  deplasare: string;
  yes: string;
  no: string;
  reclamatie: string;
  pieseTitle: string;
  colNr: string;
  colDenumire: string;
  colCod: string;
  colCant: string;
  colPret: string;
  dataAnuntarii: string;
  clientReceptionare: string;
  clientSigHint: string;
  tehnicieni: string;
  techSigHint: string;
  dataInterventiei: string;
  observatii: string;
  motive: string;
  foto: string;
  footer: string;
  currencyNote: string;
};

const LABELS: Record<PdfLocale, Labels> = {
  ro: {
    docIdentity: "",
    tipBoxes: [
      "FIȘĂ DE CONSTATARE",
      "FIȘĂ DE REPARAȚIE",
      "FIȘĂ DE REVIZIE",
      "PUNERE ÎN FUNCȚIUNE",
    ],
    nrFisa: "Nr.Fisa",
    proprietar: "PROPRIETAR",
    client: "CLIENT",
    locatie: "Locatie",
    modelUtilaj: "MODEL UTILAJ",
    oreFunctionare: "Ore funcționare",
    seria: "SERIA",
    manopera: "MANOPERA - ORE",
    deplasare: "DEPLASARE (km)",
    yes: "DA",
    no: "NU",
    reclamatie: "RECLAMATIE /SOLICITARE CLIENT",
    pieseTitle: "PIESE SI MATERIALE",
    colNr: "Nr.",
    colDenumire: "DENUMIRE PIESA/MATERIAL",
    colCod: "COD",
    colCant: "Cant.",
    colPret: `PREȚ ${currencySymbol("ro")} FĂRĂ Tva/buc.`,
    dataAnuntarii: "DATA ANUNTARII DEFECTIUNII",
    clientReceptionare: "CLIENT: RECEPTIONARE CONSTATARE/REPARATIE",
    clientSigHint: "SEMNATURA/STAMPILA/NUME/B.I./C.I.",
    tehnicieni: "TEHNICIENI",
    techSigHint: "NUME/SEMNATURA",
    dataInterventiei: "DATA INTERVENTIEI TEHNICE",
    observatii: "OBSERVATII",
    motive:
      "Piesele mentionate, au fost inlocuite din urmatoarele motive:",
    foto: "FOTO UTILAJ",
    footer: "Generat cu Querra Fișă",
    currencyNote: currencyCode("ro"),
  },
  en: {
    docIdentity: "Engineer's Job Sheet / Service Report",
    tipBoxes: [
      "INSPECTION / FAULT REPORT",
      "REPAIR",
      "PLANNED SERVICE",
      "COMMISSIONING",
    ],
    nrFisa: "Job No",
    proprietar: "Owner / Account",
    client: "Customer",
    locatie: "Site",
    modelUtilaj: "Asset make / model",
    oreFunctionare: "Hours / meter",
    seria: "Serial",
    manopera: "Labour hours",
    deplasare: "Travel (km)",
    yes: "YES",
    no: "NO",
    reclamatie: "Fault reported / customer request",
    pieseTitle: "Parts used",
    colNr: "No.",
    colDenumire: "Description",
    colCod: "Part No",
    colCant: "Qty",
    colPret: `Price ${currencySymbol("en")} ex VAT each`,
    dataAnuntarii: "Date fault reported",
    clientReceptionare: "Customer sign-off",
    clientSigHint: "Signature / name / company stamp",
    tehnicieni: "Engineer sign-off",
    techSigHint: "Name / signature",
    dataInterventiei: "Date of technical intervention",
    observatii: "Work carried out / notes",
    motive: "Parts listed above were replaced for the following reasons:",
    foto: "Asset photo",
    footer: "Generated with Querra Job Sheet",
    currencyNote: currencyCode("en"),
  },
  pl: {
    docIdentity: "Protokół serwisowy / przyjęcia do naprawy",
    tipBoxes: [
      "PROTOKÓŁ STWIERDZENIA",
      "PROTOKÓŁ NAPRAWY",
      "PROTOKÓŁ PRZEGLĄDU",
      "URUCHOMIENIE",
    ],
    nrFisa: "Nr protokołu",
    proprietar: "Właściciel",
    client: "Klient",
    locatie: "Adres",
    modelUtilaj: "Urządzenie model",
    oreFunctionare: "Motogodziny",
    seria: "Nr seryjny",
    manopera: "Robocizna",
    deplasare: "Dojazd (km)",
    yes: "TAK",
    no: "NIE",
    reclamatie: "Opis usterki",
    pieseTitle: "Części",
    colNr: "Lp.",
    colDenumire: "Nazwa części/materiału",
    colCod: "Kod",
    colCant: "Il.",
    colPret: `Cena ${currencySymbol("pl")} bez VAT/szt.`,
    dataAnuntarii: "Data zgłoszenia",
    clientReceptionare: "Podpis klienta",
    clientSigHint: "Podpis / pieczęć / imię i nazwisko",
    tehnicieni: "Podpis technika",
    techSigHint: "Imię i nazwisko / podpis",
    dataInterventiei: "Data naprawy",
    observatii: "Uwagi / wykonane prace",
    motive: "Wymienione części zostały zastąpione z następujących powodów:",
    foto: "Zdjęcie urządzenia",
    footer: "Wygenerowano w Querra Karta",
    currencyNote: currencyCode("pl"),
  },
};

/** Map app tip → checkbox index 0..3 */
function tipIndex(tip: TipFisa): number {
  switch (tip) {
    case "Constatare":
      return 0;
    case "Reparație":
      return 1;
    case "Revizie":
      return 2;
    case "Punere în funcțiune":
      return 3;
    default:
      return 1;
  }
}


function resolveLocale(locale?: string): PdfLocale {
  if (locale === "en" || locale === "pl" || locale === "ro") return locale;
  return "ro";
}

function drawCheckbox(
  doc: jsPDF,
  x: number,
  y: number,
  checked: boolean,
  size = 3.2
) {
  doc.setDrawColor(30);
  doc.setLineWidth(0.25);
  doc.rect(x, y - size + 0.6, size, size);
  if (checked) {
    doc.setFont(pdfFont(), "bold");
    doc.setFontSize(7);
    doc.text("X", x + 0.7, y);
    doc.setFont(pdfFont(), "normal");
  }
}

function boxedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { fontSize?: number; pad?: number }
) {
  const pad = opts?.pad ?? 1.5;
  const fontSize = opts?.fontSize ?? 7.5;
  doc.setDrawColor(30);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);
  doc.setFont(pdfFont(), "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize((text || " "), w - pad * 2);
  const maxLines = Math.max(1, Math.floor((h - pad * 2) / (fontSize * 0.4)));
  doc.text(lines.slice(0, maxLines), x + pad, y + pad + fontSize * 0.35);
}

/**
 * Generate A4 service sheet PDF.
 * Callers must pass locale from useI18n() (UI locale; fișă has no stored content language).
 * Embeds Noto Sans so RO/PL diacritics render without ASCII folding.
 */
export async function generateFisaPdf(
  fisa: Fisa,
  settings: FirmSettings,
  locale: PdfLocale | string = "ro"
): Promise<Blob> {
  const loc = resolveLocale(locale);
  const L = LABELS[loc];
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await embedUnicodeFont(doc);
  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const contentW = pageW - 2 * margin;
  let y = 7;

  const company =
    settings.companyName?.trim() ||
    (loc === "ro" ? firmExample("ro") : firmExample(loc));

  // —— Header band ——
  const headerTop = y;
  const pad = 2;
  const logoMaxH = 20; // mm (~18–22)
  const logoMaxW = 36; // mm

  const subBits: string[] = [];
  if (L.docIdentity) subBits.push(L.docIdentity);
  if (settings.cui) {
    subBits.push(
      loc === "en"
        ? `Reg: ${settings.cui}`
        : loc === "pl"
          ? `NIP: ${settings.cui}`
          : `CUI: ${settings.cui}`
    );
  }
  if (settings.address) subBits.push(settings.address);
  if (settings.phone) subBits.push(settings.phone);

  let logoDrawn = false;
  let logoW = 0;
  let logoH = 0;
  let logoFmt: "PNG" | "JPEG" | null = null;
  let logoUrl: string | null = null;

  if (settings.logoDataUrl) {
    const ready = await ensurePdfCompatibleImage(settings.logoDataUrl);
    if (ready) {
      logoUrl = ready.dataUrl;
      logoFmt = ready.format;
      try {
        const props = doc.getImageProperties(logoUrl);
        const aspect =
          props.width && props.height ? props.width / props.height : 1;
        logoH = logoMaxH;
        logoW = logoH * aspect;
        if (logoW > logoMaxW) {
          logoW = logoMaxW;
          logoH = logoW / aspect;
        }
      } catch {
        logoW = 22;
        logoH = 18;
      }
    }
  }

  // Taller header when logo is present so text doesn't clip
  const headerH = logoUrl
    ? Math.max(24, logoH + pad * 2 + 1)
    : subBits.length > 2
      ? 20
      : 18;

  doc.setDrawColor(30);
  doc.setLineWidth(0.4);
  doc.rect(margin, headerTop, contentW, headerH);

  if (logoUrl && logoFmt) {
    try {
      const lx = margin + pad;
      const ly = headerTop + (headerH - logoH) / 2;
      doc.addImage(logoUrl, logoFmt, lx, ly, logoW, logoH);
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }

  doc.setTextColor(20);

  if (logoDrawn) {
    const textX = margin + pad + logoW + 3;
    const textMaxW = contentW - (logoW + pad + 3) - pad;
    const textCenterX = textX + textMaxW / 2;

    doc.setFont(pdfFont(), "bold");
    doc.setFontSize(10);
    const nameLines = doc.splitTextToSize(company, textMaxW);
    const nameBlockH = nameLines.length * 4.2;
    const subLine = subBits.length ? subBits.join("  ·  ") : "";
    const subLines = subLine
      ? doc.splitTextToSize(subLine, textMaxW)
      : [];
    doc.setFontSize(7);
    const subBlockH = subLines.length * 3.2;
    const blockH = nameBlockH + (subLines.length ? 1.2 + subBlockH : 0);
    let ty = headerTop + Math.max(pad + 1, (headerH - blockH) / 2) + 3.2;

    doc.setFont(pdfFont(), "bold");
    doc.setFontSize(10);
    doc.text(nameLines.slice(0, 2), textCenterX, ty, {
      align: "center",
      maxWidth: textMaxW,
    });
    ty += Math.min(nameLines.length, 2) * 4.2 + 1.2;

    if (subLines.length) {
      doc.setFont(pdfFont(), "normal");
      doc.setFontSize(7);
      doc.text(subLines.slice(0, 3), textCenterX, ty, {
        align: "center",
        maxWidth: textMaxW,
      });
    }
  } else {
    doc.setFont(pdfFont(), "bold");
    doc.setFontSize(10);
    doc.text(company, pageW / 2, headerTop + 6, { align: "center" });

    if (subBits.length) {
      doc.setFont(pdfFont(), "normal");
      doc.setFontSize(7);
      doc.text(subBits.join("  ·  "), pageW / 2, headerTop + 11.5, {
        align: "center",
        maxWidth: contentW - 8,
      });
    }
  }

  y = headerTop + headerH + 3;

  // —— Left tip checkboxes + right meta ——
  const metaTop = y;
  const leftW = 62;
  const rightX = margin + leftW + 2;
  const rightW = contentW - leftW - 2;
  const tipH = 5.2;
  const tipChecked = tipIndex(fisa.tip);

  doc.setFontSize(7.5);
  L.tipBoxes.forEach((label, i) => {
    const ty = metaTop + i * tipH;
    drawCheckbox(doc, margin, ty + 2.5, tipChecked === i);
    doc.setFont(pdfFont(), tipChecked === i ? "bold" : "normal");
    doc.setFontSize(7.2);
    doc.text((label), margin + 5, ty + 2.5);
  });

  const metaRows: Array<{ label: string; value: string; extra?: string }> = [
    { label: L.nrFisa, value: fisa.nrFisa || "—" },
    { label: L.proprietar, value: fisa.proprietar || "—" },
    { label: L.client, value: fisa.client || "—" },
    { label: L.locatie, value: fisa.locatie || "—" },
    {
      label: L.modelUtilaj,
      value: fisa.modelUtilaj || "—",
      extra: fisa.oreFunctionare
        ? `${L.oreFunctionare}: ${fisa.oreFunctionare}`
        : undefined,
    },
    { label: L.seria, value: fisa.serie || "—" },
  ];

  let my = metaTop;
  metaRows.forEach((row) => {
    doc.setDrawColor(40);
    doc.setLineWidth(0.25);
    const rowH = 5.2;
    doc.rect(rightX, my, rightW, rowH);
    doc.setFont(pdfFont(), "bold");
    doc.setFontSize(6.5);
    doc.text((row.label) + ":", rightX + 1.2, my + 3.5);
    const labelW = doc.getTextWidth((row.label) + ":") + 2;
    doc.setFont(pdfFont(), "normal");
    doc.setFontSize(7);
    const valMax = rightW - labelW - (row.extra ? 42 : 3);
    const valLines = doc.splitTextToSize((row.value), Math.max(20, valMax));
    doc.text(valLines[0] || "", rightX + labelW, my + 3.5);
    if (row.extra) {
      doc.setFont(pdfFont(), "bold");
      doc.setFontSize(6);
      doc.text((row.extra), rightX + rightW - 1.5, my + 3.5, {
        align: "right",
      });
    }
    my += rowH;
  });

  y = Math.max(metaTop + 4 * tipH, my) + 3;

  // —— Manopera / Deplasare ——
  doc.setDrawColor(30);
  doc.setLineWidth(0.3);
  const bandH = 7;
  doc.rect(margin, y, contentW, bandH);
  doc.setFont(pdfFont(), "bold");
  doc.setFontSize(8);
  doc.text(
    `${(L.manopera)}:  ${(fisa.manoperaOre || "—")}`,
    margin + 2,
    y + 4.5
  );
  const depX = margin + contentW * 0.42;
  doc.text(
    `${(L.deplasare)}:  ${(fisa.deplasareKm || "—")}`,
    depX,
    y + 4.5
  );
  const yesX = margin + contentW - 38;
  drawCheckbox(doc, yesX, y + 4.5, fisa.deplasareDaNu === "DA");
  doc.setFont(pdfFont(), "normal");
  doc.setFontSize(7.5);
  doc.text((L.yes), yesX + 4.5, y + 4.5);
  drawCheckbox(doc, yesX + 16, y + 4.5, fisa.deplasareDaNu === "NU");
  doc.text((L.no), yesX + 20.5, y + 4.5);
  y += bandH + 2.5;

  // —— Reclamatie boxed ——
  doc.setFont(pdfFont(), "bold");
  doc.setFontSize(7.5);
  doc.text((L.reclamatie) + ":", margin, y);
  y += 1.5;
  const recH = 18;
  boxedText(doc, fisa.reclamatie || "", margin, y, contentW, recH, {
    fontSize: 7,
  });
  y += recH + 2;

  // Optional photo (compact)
  if (fisa.photoDataUrl) {
    try {
      doc.setFont(pdfFont(), "bold");
      doc.setFontSize(7);
      doc.text((L.foto) + ":", margin, y + 3);
      doc.addImage(fisa.photoDataUrl, "JPEG", margin + 28, y, 28, 20);
      y += 22;
    } catch {
      /* skip */
    }
  }

  // —— Piese table (15 rows like Excel) ——
  doc.setFont(pdfFont(), "bold");
  doc.setFontSize(8);
  doc.text((L.pieseTitle) + ":", margin, y + 3);
  y += 4.5;

  const colW = [8, 88, 28, 16, contentW - 8 - 88 - 28 - 16];
  const colX = [
    margin,
    margin + colW[0],
    margin + colW[0] + colW[1],
    margin + colW[0] + colW[1] + colW[2],
    margin + colW[0] + colW[1] + colW[2] + colW[3],
  ];
  const headers = [L.colNr, L.colDenumire, L.colCod, L.colCant, L.colPret];
  const headH = 6;
  doc.setFillColor(235, 235, 235);
  doc.setDrawColor(30);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentW, headH, "FD");
  doc.setFont(pdfFont(), "bold");
  doc.setFontSize(6.2);
  headers.forEach((h, i) => {
    doc.text((h), colX[i] + 0.8, y + 4);
  });
  y += headH;

  const rowH = 5;
  const piese = fisa.piese?.length ? fisa.piese : [];
  // Always 15 rows like Excel
  for (let i = 0; i < 15; i++) {
    if (y + rowH > pageH - 12) {
      doc.addPage();
      y = 12;
    }
    const p = piese[i] || {
      nr: i + 1,
      denumire: "",
      cod: "",
      cantitate: "",
      pretEur: "",
    };
    doc.setDrawColor(40);
    doc.rect(margin, y, contentW, rowH);
    // vertical lines
    for (let c = 1; c < colX.length; c++) {
      doc.line(colX[c], y, colX[c], y + rowH);
    }
    doc.setFont(pdfFont(), "normal");
    doc.setFontSize(6.5);
    doc.text(String(p.nr ?? i + 1), colX[0] + 1.5, y + 3.5);
    doc.text(
      ((p.denumire || "").slice(0, 55)),
      colX[1] + 0.8,
      y + 3.5
    );
    doc.text(((p.cod || "").slice(0, 16)), colX[2] + 0.8, y + 3.5);
    doc.text((p.cantitate || ""), colX[3] + 0.8, y + 3.5);
    doc.text((p.pretEur || ""), colX[4] + 0.8, y + 3.5);
    y += rowH;
  }
  y += 3;

  // —— Dates + sign-off blocks ——
  if (y > pageH - 70) {
    doc.addPage();
    y = 12;
  }

  const blockH = 16;
  const gap = 2;
  const col3 = (contentW - 2 * gap) / 3;

  const drawLabeledBox = (
    x: number,
    yy: number,
    w: number,
    h: number,
    title: string,
    body: string,
    hint?: string
  ) => {
    doc.setDrawColor(30);
    doc.setLineWidth(0.3);
    doc.rect(x, yy, w, h);
    doc.setFont(pdfFont(), "bold");
    doc.setFontSize(5.8);
    doc.text((title), x + 1.2, yy + 3.2);
    doc.setFont(pdfFont(), "normal");
    doc.setFontSize(7.5);
    const bodyLines = doc.splitTextToSize((body || ""), w - 2.5);
    doc.text(bodyLines.slice(0, 2), x + 1.2, yy + 7.5);
    if (hint) {
      doc.setFontSize(5.5);
      doc.setTextColor(90);
      doc.text((hint), x + 1.2, yy + h - 2);
      doc.setTextColor(20);
    }
  };

  drawLabeledBox(
    margin,
    y,
    col3,
    blockH,
    L.dataAnuntarii,
    fisa.dataAnuntarii || ""
  );
  drawLabeledBox(
    margin + col3 + gap,
    y,
    col3,
    blockH,
    L.clientReceptionare,
    fisa.semnaturaClient || "",
    L.clientSigHint
  );
  drawLabeledBox(
    margin + 2 * (col3 + gap),
    y,
    col3,
    blockH,
    L.tehnicieni,
    fisa.semnaturaTehnician || "",
    L.techSigHint
  );
  y += blockH + 2.5;

  drawLabeledBox(
    margin,
    y,
    contentW * 0.4,
    10,
    L.dataInterventiei,
    fisa.dataInterventiei || ""
  );
  y += 12.5;

  // Observatii
  doc.setFont(pdfFont(), "bold");
  doc.setFontSize(7.5);
  doc.text((L.observatii) + ":", margin, y);
  y += 1.2;
  const obsH = 16;
  if (y + obsH > pageH - 28) {
    doc.addPage();
    y = 12;
  }
  boxedText(doc, fisa.observatii || "", margin, y, contentW, obsH, {
    fontSize: 7,
  });
  y += obsH + 2.5;

  // Motive inlocuire
  doc.setFont(pdfFont(), "bold");
  doc.setFontSize(7);
  doc.text((L.motive), margin, y);
  y += 1.2;
  const motH = 12;
  if (y + motH > pageH - 18) {
    doc.addPage();
    y = 12;
  }
  boxedText(doc, fisa.motiveInlocuire || "", margin, y, contentW, motH, {
    fontSize: 7,
  });
  y += motH + 4;

  // Signature underline lines (extra clarity)
  if (y > pageH - 16) {
    doc.addPage();
    y = 14;
  }
  doc.setFont(pdfFont(), "normal");
  doc.setFontSize(7);
  doc.setDrawColor(60);
  doc.line(margin, y + 6, margin + 70, y + 6);
  doc.text((L.clientReceptionare), margin, y);
  doc.line(margin + contentW - 70, y + 6, margin + contentW, y + 6);
  doc.text((L.tehnicieni), margin + contentW - 70, y);
  doc.setFontSize(6);
  doc.setTextColor(100);
  doc.text((fisa.semnaturaClient || ""), margin, y + 9);
  doc.text(
    (fisa.semnaturaTehnician || ""),
    margin + contentW - 70,
    y + 9
  );
  doc.setTextColor(20);

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont(pdfFont(), "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    const stamp = new Date().toLocaleString(
      loc === "en" ? "en-GB" : loc === "pl" ? "pl-PL" : "ro-RO"
    );
    doc.text(
      `${(L.footer)} · ${stamp}`,
      pageW / 2,
      pageH - 5,
      { align: "center" }
    );
    doc.setTextColor(20);
  }

  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Locale-aware PDF download basename prefix (without trailing underscore). */
export function pdfFilePrefix(locale: PdfLocale | string): string {
  const loc = resolveLocale(locale);
  if (loc === "en") return "JobSheet";
  if (loc === "pl") return "Protokol";
  return "Fisa";
}

export function pdfShareText(locale: PdfLocale | string): string {
  const loc = resolveLocale(locale);
  if (loc === "en") return "Querra job sheet";
  if (loc === "pl") return "Protokół serwisowy Querra";
  return "Fișă service Querra";
}

export async function sharePdf(
  blob: Blob,
  filename: string,
  shareText?: string
) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: filename,
      text: shareText || "Querra",
    });
    return true;
  }
  downloadBlob(blob, filename);
  return false;
}
