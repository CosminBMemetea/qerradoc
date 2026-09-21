"use client";

import { jsPDF } from "jspdf";
import type { Fisa, FirmSettings } from "./types";

export async function generateFisaPdf(
  fisa: Fisa,
  settings: FirmSettings
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 12;
  let y = 12;

  const header =
    settings.companyName || "UTILAJE PROFESIONALE PENTRU CURATENIE";

  // Logo
  if (settings.logoDataUrl) {
    try {
      doc.addImage(settings.logoDataUrl, "JPEG", margin, y, 22, 16);
    } catch {
      /* ignore bad logo */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(header, pageW / 2, y + 6, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (settings.cui) {
    doc.text(`CUI: ${settings.cui}`, pageW / 2, y + 11, { align: "center" });
  }
  y += 20;

  // Title + tip checkboxes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`FIȘĂ DE ${fisa.tip.toUpperCase()}`, margin, y);
  doc.setFontSize(10);
  doc.text(`Nr. fișă: ${fisa.nrFisa || "—"}`, pageW - margin, y, {
    align: "right",
  });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const tipuri = ["Constatare", "Reparație", "Revizie", "Punere în funcțiune"];
  tipuri.forEach((t, i) => {
    const x = margin + i * 48;
    doc.rect(x, y - 3, 3.5, 3.5);
    if (fisa.tip === t) {
      doc.setFont("helvetica", "bold");
      doc.text("X", x + 0.7, y);
      doc.setFont("helvetica", "normal");
    }
    doc.text(t, x + 5, y);
  });
  y += 8;

  // Meta box
  const line = (label: string, value: string, x: number, yy: number, w = 90) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "—", w - 2);
    doc.text(lines, x, yy + 4);
    return yy + 4 + lines.length * 3.5;
  };

  doc.setDrawColor(40);
  doc.rect(margin, y, pageW - 2 * margin, 38);
  let yLeft = y + 5;
  let yRight = y + 5;
  yLeft = line("PROPRIETAR:", fisa.proprietar, margin + 2, yLeft, 95);
  yLeft = line("CLIENT:", fisa.client, margin + 2, yLeft, 95);
  yLeft = line("LOCAȚIE:", fisa.locatie, margin + 2, yLeft, 95);
  yRight = line("MODEL UTILAJ:", fisa.modelUtilaj, margin + 100, yRight, 85);
  yRight = line("SERIE:", fisa.serie, margin + 100, yRight, 85);
  yRight = line("ORE FUNCȚIONARE:", fisa.oreFunctionare, margin + 100, yRight, 85);
  void yLeft;
  void yRight;
  y += 42;

  // Manoperă / deplasare
  doc.setFont("helvetica", "bold");
  doc.text(`MANOPERĂ — ORE: ${fisa.manoperaOre || "—"}`, margin, y);
  doc.text(
    `DEPLASARE (km): ${fisa.deplasareKm || "—"}  [${fisa.deplasareDaNu === "DA" ? "X" : " "}] DA  [${fisa.deplasareDaNu === "NU" ? "X" : " "}] NU`,
    margin + 70,
    y
  );
  y += 7;

  // Reclamație
  doc.setFont("helvetica", "bold");
  doc.text("RECLAMAȚIE / SOLICITARE CLIENT:", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  const recLines = doc.splitTextToSize(fisa.reclamatie || "—", pageW - 2 * margin);
  doc.text(recLines, margin, y);
  y += Math.max(12, recLines.length * 3.8 + 2);

  // Photo thumbnail
  if (fisa.photoDataUrl) {
    try {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("FOTO UTILAJ:", margin, y);
      y += 2;
      doc.addImage(fisa.photoDataUrl, "JPEG", margin, y, 40, 30);
      y += 34;
    } catch {
      /* skip */
    }
  }

  // Piese table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PIESE ȘI MATERIALE:", margin, y);
  y += 3;

  const colX = [margin, margin + 10, margin + 95, margin + 125, margin + 145];
  const headers = ["Nr.", "DENUMIRE PIESĂ/MATERIAL", "COD", "Cant.", "PREȚ € fără TVA"];
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, pageW - 2 * margin, 6, "F");
  doc.setFontSize(7);
  headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 4));
  y += 6;

  doc.setFont("helvetica", "normal");
  const filled = fisa.piese.filter((p) => p.denumire || p.cod);
  const rows = filled.length > 0 ? filled : fisa.piese.slice(0, 5);
  rows.forEach((p) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.rect(margin, y, pageW - 2 * margin, 6);
    doc.text(String(p.nr), colX[0] + 1, y + 4);
    doc.text((p.denumire || "").slice(0, 48), colX[1] + 1, y + 4);
    doc.text((p.cod || "").slice(0, 14), colX[2] + 1, y + 4);
    doc.text(p.cantitate || "", colX[3] + 1, y + 4);
    doc.text(p.pretEur || "", colX[4] + 1, y + 4);
    y += 6;
  });
  y += 6;

  // Dates
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    `DATA ANUNȚĂRII DEFECȚIUNII: ${fisa.dataAnuntarii || "—"}`,
    margin,
    y
  );
  y += 5;
  doc.text(
    `DATA INTERVENȚIEI TEHNICE: ${fisa.dataInterventiei || "—"}`,
    margin,
    y
  );
  y += 8;

  // Observații
  doc.text("OBSERVAȚII:", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  const obs = doc.splitTextToSize(fisa.observatii || "—", pageW - 2 * margin);
  doc.text(obs, margin, y);
  y += obs.length * 3.8 + 4;

  doc.setFont("helvetica", "bold");
  doc.text("Piesele menționate au fost înlocuite din următoarele motive:", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  const mot = doc.splitTextToSize(fisa.motiveInlocuire || "—", pageW - 2 * margin);
  doc.text(mot, margin, y);
  y += mot.length * 3.8 + 10;

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CLIENT — RECEPȚIE:", margin, y);
  doc.text("TEHNICIENI:", margin + 100, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(fisa.semnaturaClient || "________________", margin, y);
  doc.text(fisa.semnaturaTehnician || "________________", margin + 100, y);
  y += 4;
  doc.setFontSize(7);
  doc.text("(semnătură / nume)", margin, y);
  doc.text("(nume / semnătură)", margin + 100, y);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    `Generat cu Querra Fișă · ${new Date().toLocaleString("ro-RO")}`,
    pageW / 2,
    290,
    { align: "center" }
  );

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

export async function sharePdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: filename,
      text: "Fișă service Querra",
    });
    return true;
  }
  downloadBlob(blob, filename);
  return false;
}
