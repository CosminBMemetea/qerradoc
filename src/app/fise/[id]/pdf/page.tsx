"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { getFisa, getSettings } from "@/lib/db";
import {
  generateFisaPdf,
  downloadBlob,
  sharePdf,
  pdfFilePrefix,
  pdfShareText,
} from "@/lib/pdf";
import type { Fisa, FirmSettings } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export default function PdfPage() {
  const params = useParams();
  const { t, locale } = useI18n();
  const id = String(params.id);
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [settings, setSettings] = useState<FirmSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([getFisa(id), getSettings()]).then(([f, s]) => {
      setFisa(f || null);
      setSettings(s);
    });
  }, [id]);

  async function makeBlob() {
    if (!fisa || !settings) throw new Error("missing");
    return generateFisaPdf(fisa, settings, locale);
  }

  async function onDownload() {
    setBusy(true);
    setMsg("");
    try {
      const blob = await makeBlob();
      const name = `${pdfFilePrefix(locale)}_${fisa!.nrFisa || fisa!.id.slice(0, 8)}.pdf`;
      downloadBlob(blob, name);
      setMsg(t("pdf.downloaded"));
    } catch {
      setMsg(t("pdf.errGen"));
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    setMsg("");
    try {
      const blob = await makeBlob();
      const name = `${pdfFilePrefix(locale)}_${fisa!.nrFisa || fisa!.id.slice(0, 8)}.pdf`;
      const shared = await sharePdf(blob, name, pdfShareText(locale));
      setMsg(shared ? t("pdf.shared") : t("pdf.downloadedFallback"));
    } catch {
      setMsg(t("pdf.errShare"));
    } finally {
      setBusy(false);
    }
  }

  if (!fisa || !settings) {
    return (
      <AppShell title="PDF" backHref={`/fise/${id}`}>
        <p className="text-center py-10 text-muted">{t("app.loadingShort")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("pdf.title")} backHref={`/fise/${id}`}>
      {!fisa.reviewed && (
        <div className="qf-card p-3.5 text-sm mb-4 text-amber-950 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60">
          {t("pdf.warnReview")}
        </div>
      )}
      <div className="qf-card p-5 mb-5">
        <p className="text-[11px] font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-1">
          {t("pdf.summary")}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {settings.companyName}
        </h2>
        <p className="font-medium mt-2 text-foreground">
          {t("pdf.fisaOf")} {t(`tip.${fisa.tip}`)} · {t("pdf.nr")}{" "}
          {fisa.nrFisa || "—"}
        </p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {t("pdf.client")}{" "}
            </span>
            {fisa.client || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {t("pdf.locatie")}{" "}
            </span>
            {fisa.locatie || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {t("pdf.utilaj")}{" "}
            </span>
            {fisa.modelUtilaj || "—"} / {fisa.serie || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {t("pdf.manopera")}{" "}
            </span>
            {fisa.manoperaOre || "—"} h · {t("pdf.deplasare")}{" "}
            {fisa.deplasareKm || "—"} km (
            {fisa.deplasareDaNu === "DA"
              ? t("form.yes")
              : fisa.deplasareDaNu === "NU"
                ? t("form.no")
                : "—"}
            )
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {t("pdf.reclamatie")}{" "}
            </span>
            {fisa.reclamatie || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {t("pdf.piese")}{" "}
            </span>
            {fisa.piese.filter((p) => p.denumire).length} {t("pdf.pieseLines")}
          </div>
          {fisa.photoDataUrl && (
            <div className="pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fisa.photoDataUrl}
                alt="Foto"
                className="w-full max-h-40 object-contain rounded-xl bg-stone-50 dark:bg-stone-900"
              />
            </div>
          )}
          {fisa.audioNoteDataUrl && (
            <div className="pt-3">
              <p className="text-stone-400 dark:text-stone-500 mb-1.5">
                {t("pdf.audioNote")}
              </p>
              <audio controls src={fisa.audioNoteDataUrl} className="w-full" />
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-3">
        <BigButton onClick={onDownload} disabled={busy}>
          {t("pdf.download")}
        </BigButton>
        <BigButton variant="secondary" onClick={onShare} disabled={busy}>
          {t("pdf.share")}
        </BigButton>
      </div>
      {msg && (
        <p className="text-center text-sm font-medium text-teal-800 dark:text-teal-300 mt-3">
          {msg}
        </p>
      )}
    </AppShell>
  );
}
