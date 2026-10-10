/**
 * PDF for Camioane / Transport sheets (driver check, truck service, damage
 * report). A4 portrait, Noto Sans (RO/PL diacritics), photos embedded.
 * Called from generateFisaPdf() when fisa.truck is set, so preview, download
 * and "Send to client" all use it. Labels follow the fișă's contentLocale.
 */
import { jsPDF } from "jspdf";
import type { Fisa, FirmSettings } from "./types";
import { embedUnicodeFont, pdfFont } from "./pdf-font";
import { ensurePdfCompatibleImage } from "./logo";
import { docDate, docStamp } from "./date-format";
import { normalizeCurrency, defaultCurrencyForLocale, symbolForCurrency } from "./currency";
import {
  CHECK_ITEMS,
  DAMAGE_ZONES,
  ZONE_SHAPES,
  truckLabels,
  validateVin,
  type TruckData,
} from "./truck";

type Img = { dataUrl: string; format: "PNG" | "JPEG" };

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10;
const CW = PAGE_W - 2 * M;

function dateTimeText(dt: string | undefined, loc: string): string {
  if (!dt) return "";
  const [d, t] = dt.split("T");
  const dd = docDate(d, loc as "ro");
  return t ? `${dd} ${t.slice(0, 5)}` : dd;
}

export async function generateTruckPdf(fisa: Fisa, settings: FirmSettings, loc: "ro" | "en" | "pl"): Promise<Blob> {
  const T = fisa.truck as TruckData;
  const L = truckLabels(loc);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await embedUnicodeFont(doc);
  const F = pdfFont();
  let y = M;

  const ensure = (h: number) => {
    if (y + h > PAGE_H - 14) {
      doc.addPage();
      y = M;
    }
  };
  const img = async (u?: string): Promise<Img | null> => (u ? await ensurePdfCompatibleImage(u) : null);
  const drawImg = (im: Img, x: number, yy: number, maxW: number, maxH: number) => {
    try {
      const p = doc.getImageProperties(im.dataUrl);
      const a = p.width && p.height ? p.width / p.height : 1.5;
      let w = maxW;
      let h = w / a;
      if (h > maxH) {
        h = maxH;
        w = h * a;
      }
      doc.addImage(im.dataUrl, im.format, x, yy, w, h);
      return { w, h };
    } catch {
      return { w: 0, h: 0 };
    }
  };

  // —— Header ——
  const logo = await img(settings.logoDataUrl);
  let textX = M;
  if (logo) {
    const d = drawImg(logo, M, y, 30, 16);
    textX = M + d.w + 4;
  }
  doc.setTextColor(20);
  doc.setFont(F, "bold");
  doc.setFontSize(11);
  doc.text(settings.companyName || "", textX, y + 5);
  doc.setFont(F, "normal");
  doc.setFontSize(7.5);
  const sub = [settings.cui && (loc === "pl" ? `NIP: ${settings.cui}` : loc === "en" ? `Reg: ${settings.cui}` : `CUI: ${settings.cui}`), settings.address, settings.phone]
    .filter(Boolean)
    .join("  ·  ");
  if (sub) doc.text(doc.splitTextToSize(sub, PAGE_W - M - textX).slice(0, 2), textX, y + 9.5);
  y += logo ? 19 : 14;
  doc.setDrawColor(30);
  doc.setLineWidth(0.5);
  doc.line(M, y, PAGE_W - M, y);
  y += 6;
  doc.setFont(F, "bold");
  doc.setFontSize(13);
  doc.text(L.pdfTitle[T.kind], PAGE_W / 2, y, { align: "center" });
  y += 5;
  doc.setFont(F, "normal");
  doc.setFontSize(8);
  const nrLine = `${L.nr} ${fisa.nrFisa || fisa.id.slice(0, 8)}`;
  doc.text(nrLine, PAGE_W / 2, y, { align: "center" });
  y += 5;

  // —— Key/value grid (2 columns) ——
  const kv = (pairs: [string, string][]) => {
    const colW = CW / 2;
    const rowH = 9;
    for (let i = 0; i < pairs.length; i += 2) {
      ensure(rowH);
      for (let c = 0; c < 2; c++) {
        const p = pairs[i + c];
        if (!p) continue;
        const x = M + c * colW;
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.rect(x, y, colW, rowH);
        doc.setFont(F, "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(90);
        doc.text(p[0], x + 1.5, y + 3);
        doc.setTextColor(20);
        doc.setFont(F, "bold");
        doc.setFontSize(9);
        doc.text(doc.splitTextToSize(p[1] || "—", colW - 3)[0], x + 1.5, y + 7.2);
      }
      y += rowH;
    }
    y += 3;
  };
  const block = (title: string, text: string, minH = 12) => {
    doc.setFont(F, "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(text || "—", CW - 4);
    const h = Math.max(minH, lines.length * 3.8 + 4);
    ensure(h + 5);
    doc.setFont(F, "bold");
    doc.setFontSize(8);
    doc.text(title, M, y + 3);
    y += 4.5;
    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.rect(M, y, CW, h);
    doc.setFont(F, "normal");
    doc.setFontSize(8.5);
    doc.text(lines, M + 2, y + 4);
    y += h + 3;
  };
  const sectionTitle = (s: string) => {
    ensure(8);
    doc.setFont(F, "bold");
    doc.setFontSize(9);
    doc.text(s, M, y + 3);
    y += 5;
  };

  const vinChk = T.vin ? validateVin(T.vin) : null;
  const vinText = T.vin ? `${T.vin}${vinChk && !vinChk.valid ? `  (! ${L.vinInvalid})` : ""}` : "";
  const when = dateTimeText(T.dateTime, loc) || docDate(fisa.dataInterventiei, loc);

  if (T.kind === "check") {
    kv([
      [L.plate, T.plate],
      [L.trailer, T.trailer || ""],
      [L.driver, T.driver || ""],
      [L.km, T.km || ""],
      [L.dateTime, when],
      [L.direction, T.direction === "intoarcere" ? L.intoarcere : T.direction === "plecare" ? L.plecare : ""],
    ]);
    sectionTitle(L.checklist);
    // table header
    const cols = [62, 14, 14, 14, CW - 104];
    const head = [L.checklist, L.status.ok, L.status.defect, L.status.na, L.note];
    const drawRow = (cells: string[], bold: boolean, h: number, defect: boolean) => {
      let x = M;
      if (defect) {
        doc.setFillColor(254, 226, 226);
        doc.rect(M, y, CW, h, "F");
      }
      cells.forEach((c, i) => {
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.rect(x, y, cols[i], h);
        doc.setFont(F, bold ? "bold" : "normal");
        doc.setFontSize(i >= 1 && i <= 3 && !bold ? 10 : 7.5);
        const lines = doc.splitTextToSize(c, cols[i] - 2);
        doc.text(lines.slice(0, 3), i >= 1 && i <= 3 ? x + cols[i] / 2 : x + 1.2, y + 4, i >= 1 && i <= 3 ? { align: "center" } : undefined);
        x += cols[i];
      });
      y += h;
    };
    ensure(7);
    drawRow(head, true, 6, false);
    for (const key of CHECK_ITEMS) {
      const c = (T.checklist || []).find((x) => x.key === key);
      const st = c?.status || "";
      const note = c?.note || "";
      doc.setFontSize(7.5);
      const h = Math.max(6.5, doc.splitTextToSize(note, cols[4] - 2).slice(0, 3).length * 3.2 + 2.5);
      ensure(h);
      drawRow([L.item[key], st === "ok" ? "X" : "", st === "defect" ? "X" : "", st === "na" ? "X" : "", note], false, h, st === "defect");
    }
    y += 3;
    // defect photos
    const withPhotos = (T.checklist || []).filter((c) => c.status === "defect" && c.photoDataUrl);
    if (withPhotos.length) {
      sectionTitle(L.photos);
      const ims = await Promise.all(withPhotos.map((c) => img(c.photoDataUrl)));
      await photoGrid(ims.map((im, i) => ({ im, cap: `${L.item[withPhotos[i].key]}${withPhotos[i].note ? ` — ${withPhotos[i].note}` : ""}` })));
    }
    if (fisa.observatii) block(L.observatii, fisa.observatii);
    await signatures([[L.sigDriver, fisa.semnaturaClientDataUrl, T.driver || fisa.semnaturaClient]]);
  } else if (T.kind === "service") {
    kv([
      [L.plate, T.plate],
      [L.model, T.model || fisa.modelUtilaj || ""],
      [L.vin, vinText],
      [L.km, T.km || ""],
      [L.client, fisa.client],
      [L.date, when],
    ]);
    block(L.reclamatie, fisa.reclamatie);
    block(L.constatare, T.constatare || "");
    // parts table
    const parts = fisa.piese.filter((p) => p.denumire.trim());
    const cur = normalizeCurrency(fisa.currency) || defaultCurrencyForLocale(loc);
    const sym = symbolForCurrency(cur);
    sectionTitle(L.piese);
    const cols = [8, CW - 8 - 34 - 14 - 24 - 24, 34, 14, 24, 24];
    const head = ["#", L.piese, L.cod, L.qty, `${L.price} (${sym})`, `Total (${sym})`];
    const row = (cells: string[], bold: boolean) => {
      ensure(6.5);
      let x = M;
      cells.forEach((c, i) => {
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.rect(x, y, cols[i], 6.5);
        doc.setFont(F, bold ? "bold" : "normal");
        doc.setFontSize(7.5);
        const right = i >= 3;
        doc.text(doc.splitTextToSize(c, cols[i] - 2)[0] || "", right ? x + cols[i] - 1.2 : x + 1.2, y + 4.3, right ? { align: "right" } : undefined);
        x += cols[i];
      });
      y += 6.5;
    };
    row(head, true);
    let total = 0;
    const num = (s: string) => Number(String(s || "").replace(",", "."));
    parts.forEach((p, i) => {
      const q = num(p.cantitate) || 1;
      const pr = num(p.pretEur);
      const tot = Number.isFinite(pr) && p.pretEur ? q * pr : NaN;
      if (Number.isFinite(tot)) total += tot;
      row([String(i + 1), p.denumire, p.cod, p.cantitate || "1", p.pretEur || "", Number.isFinite(tot) ? tot.toFixed(2) : ""], false);
    });
    if (!parts.length) row(["", "—", "", "", "", ""], false);
    row(["", L.total, "", "", "", total ? total.toFixed(2) : ""], true);
    y += 3;
    const lab = (T.labour || []).filter((l) => l.desc.trim() || l.ore.trim());
    if (lab.length) {
      sectionTitle(L.labour);
      const lc = [8, CW - 8 - 24, 24];
      const lrow = (cells: string[], bold: boolean) => {
        ensure(6.5);
        let x = M;
        cells.forEach((c, i) => {
          doc.setDrawColor(150);
          doc.setLineWidth(0.2);
          doc.rect(x, y, lc[i], 6.5);
          doc.setFont(F, bold ? "bold" : "normal");
          doc.setFontSize(7.5);
          const right = i === 2;
          doc.text(doc.splitTextToSize(c, lc[i] - 2)[0] || "", right ? x + lc[i] - 1.2 : x + 1.2, y + 4.3, right ? { align: "right" } : undefined);
          x += lc[i];
        });
        y += 6.5;
      };
      lab.forEach((l, i) => lrow([String(i + 1), l.desc, l.ore ? `${l.ore} h` : ""], false));
      lrow(["", L.manopera, fisa.manoperaOre ? `${fisa.manoperaOre} h` : ""], true);
      y += 3;
    } else {
      kv([[L.manopera, fisa.manoperaOre || ""]]);
    }
    block(L.observatii, fisa.observatii);
    const sp = [
      ...(fisa.photoDataUrl ? [{ dataUrl: fisa.photoDataUrl, caption: "" }] : []),
      ...(T.photos || []),
    ];
    if (sp.length) {
      sectionTitle(L.photos);
      const ims = await Promise.all(sp.map((p) => img(p.dataUrl)));
      await photoGrid(ims.map((im, i) => ({ im, cap: sp[i].caption })));
    }
    await signatures([
      [L.sigTech, fisa.semnaturaTehnicianDataUrl, fisa.semnaturaTehnician],
      [L.sigClient, fisa.semnaturaClientDataUrl, fisa.semnaturaClient],
    ]);
  } else {
    kv([
      [L.plate, T.plate],
      [L.trailer, T.trailer || ""],
      [L.dateTime, when],
      [L.place, T.place || ""],
      [L.driver, T.driver || ""],
      [L.km, T.km || ""],
    ]);
    block(L.description, T.description || "");
    // zones: schematic + list
    sectionTitle(L.zones);
    ensure(40);
    const sx = 1.3;
    const ox = M + 2;
    const oy = y + 1;
    doc.setFontSize(6);
    for (const z of DAMAGE_ZONES) {
      const on = (T.zones || []).includes(z);
      for (const [x, yy, w, h] of ZONE_SHAPES[z]) {
        if (on) doc.setFillColor(239, 68, 68);
        else doc.setFillColor(245, 245, 244);
        doc.setDrawColor(80);
        doc.setLineWidth(0.25);
        doc.rect(ox + x * sx, oy + yy * sx * 0.75, w * sx, h * sx * 0.75, "FD");
      }
    }
    doc.setTextColor(90);
    doc.text(loc === "en" ? "<< front" : loc === "pl" ? "<< przód" : "<< față", ox, oy + 40 * 0.75 * sx + 3);
    doc.setTextColor(20);
    const listX = ox + 100 * sx + 6;
    doc.setFont(F, "normal");
    doc.setFontSize(8);
    const sel = (T.zones || []).map((z) => `• ${L.zone[z]}`);
    doc.text(sel.length ? sel : ["—"], listX, oy + 3);
    y = oy + 40 * 0.75 * sx + 6;
    block(L.parties, T.parties || "", 10);
    const photos = T.photos || [];
    if (photos.length) {
      sectionTitle(L.photos);
      const ims = await Promise.all(photos.map((p) => img(p.dataUrl)));
      await photoGrid(ims.map((im, i) => ({ im, cap: photos[i].caption })));
    }
    await signatures([
      [L.sigReporter, fisa.semnaturaTehnicianDataUrl, fisa.semnaturaTehnician],
      [L.sigOther, fisa.semnaturaClientDataUrl, fisa.semnaturaClient],
    ]);
  }

  async function photoGrid(items: { im: Img | null; cap: string }[]) {
    const colW = (CW - 4) / 2;
    const maxH = 62;
    for (let i = 0; i < items.length; i += 2) {
      ensure(maxH + 10);
      let rowH = 0;
      for (let c = 0; c < 2; c++) {
        const it = items[i + c];
        if (!it) continue;
        const x = M + c * (colW + 4);
        let h = 0;
        if (it.im) h = drawImg(it.im, x, y, colW, maxH).h;
        doc.setFont(F, "normal");
        doc.setFontSize(7.5);
        const cap = doc.splitTextToSize(it.cap || "", colW).slice(0, 2);
        if (cap.length) doc.text(cap, x, y + h + 3.5);
        rowH = Math.max(rowH, h + 3.5 + cap.length * 3.2);
      }
      y += rowH + 3;
    }
  }

  async function signatures(sigs: [string, string | undefined, string | undefined][]) {
    ensure(42);
    y += 2;
    if (T.verifiedBy) {
      doc.setFont(F, "bold");
      doc.setFontSize(8);
      const at = T.verifiedAt ? ` · ${docStamp(new Date(T.verifiedAt), loc)}` : "";
      doc.text(`${L.verifiedBy}: ${T.verifiedBy}${at}`, M, y + 1);
      y += 6;
    }
    const w = (CW - 10) / 2;
    let maxH = 0;
    for (let i = 0; i < sigs.length; i++) {
      const [label, url, name] = sigs[i];
      const x = M + i * (w + 10);
      doc.setFont(F, "normal");
      doc.setFontSize(7.5);
      doc.text(label, x, y);
      let h = 0;
      const im = await img(url);
      if (im) h = drawImg(im, x, y + 1.5, 55, 20).h;
      const ly = y + 2 + Math.max(h, 14);
      doc.setDrawColor(60);
      doc.line(x, ly, x + w, ly);
      doc.setFontSize(7);
      doc.setTextColor(90);
      doc.text(name || "", x, ly + 3.5);
      doc.setTextColor(20);
      maxH = Math.max(maxH, ly + 4 - y);
    }
    y += maxH + 2;
  }

  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont(F, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(120);
    doc.text(`${L.footer} · ${docStamp(new Date(), loc)} · ${p}/${n}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
    doc.setTextColor(20);
  }
  return doc.output("blob");
}
