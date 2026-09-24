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
  pdfCurrency,
} from "@/lib/pdf";
import { symbolForCurrency } from "@/lib/currency";
import { docLabels } from "@/lib/pdf-summary";
import type { ContentLocale, Fisa, FirmSettings } from "@/lib/types";
import { resolveContentLocale } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export default function PdfPage() {
  const params = useParams();
  const { t } = useI18n();
  const id = String(params.id);
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [settings, setSettings] = useState<FirmSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFisa(id), getSettings()]).then(([f, s]) => {
      if (cancelled) return;
      if (!f) {
        setNotFound(true);
        setFisa(null);
        setSettings(s);
        return;
      }
      setNotFound(false);
      setFisa(f);
      setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Always re-read IndexedDB so PDF / badge use locked contentLocale, never UI locale. */
  async function loadFreshFromIdb(): Promise<{
    fisa: Fisa;
    settings: FirmSettings;
    contentLocale: ContentLocale;
  }> {
    const [f, s] = await Promise.all([getFisa(id), getSettings()]);
    if (!f) {
      setNotFound(true);
      setFisa(null);
      throw new Error("fisa not found");
    }
    setNotFound(false);
    setFisa(f);
    setSettings(s);
    return {
      fisa: f,
      settings: s,
      contentLocale: resolveContentLocale(f),
    };
  }

  const contentLocale = resolveContentLocale(fisa);
  const contentLocaleLabel =
    contentLocale === "en" ? "EN" : contentLocale === "pl" ? "PL" : "RO";
  const L = docLabels(contentLocale);
  const currency = fisa ? pdfCurrency(fisa, contentLocale) : null;
  const downloadName = fisa
    ? `${pdfFilePrefix(contentLocale)}_${fisa.nrFisa || fisa.id.slice(0, 8)}.pdf`
    : "";

  /** Real PDF blob preview — follows contentLocale, not UI Settings. */
  useEffect(() => {
    if (!fisa || !settings) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setPreviewLoading(true);
    setPreviewErr(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    const locale = resolveContentLocale(fisa);
    generateFisaPdf(fisa, settings, locale)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setPreviewLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPreviewErr(true);
        setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fisa, settings, previewTick]);

  async function onDownload() {
    setBusy(true);
    setMsg("");
    try {
      const fresh = await loadFreshFromIdb();
      const blob = await generateFisaPdf(
        fresh.fisa,
        fresh.settings,
        fresh.contentLocale
      );
      const name = `${pdfFilePrefix(fresh.contentLocale)}_${fresh.fisa.nrFisa || fresh.fisa.id.slice(0, 8)}.pdf`;
      downloadBlob(blob, name);
      setMsg(t("pdf.downloaded"));
      setPreviewTick((n) => n + 1);
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
      const fresh = await loadFreshFromIdb();
      const blob = await generateFisaPdf(
        fresh.fisa,
        fresh.settings,
        fresh.contentLocale
      );
      const name = `${pdfFilePrefix(fresh.contentLocale)}_${fresh.fisa.nrFisa || fresh.fisa.id.slice(0, 8)}.pdf`;
      const shared = await sharePdf(
        blob,
        name,
        pdfShareText(fresh.contentLocale)
      );
      setMsg(shared ? t("pdf.shared") : t("pdf.downloadedFallback"));
      setPreviewTick((n) => n + 1);
    } catch {
      setMsg(t("pdf.errShare"));
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <AppShell title="PDF" backHref="/fise">
        <p className="text-center py-10 text-red-600 dark:text-red-400">
          {t("edit.notFound")}
        </p>
      </AppShell>
    );
  }

  if (!fisa || !settings) {
    return (
      <AppShell title="PDF" backHref={`/fise/${id}`}>
        <p className="text-center py-10 text-muted">{t("app.loadingShort")}</p>
      </AppShell>
    );
  }

  const deplasareYn =
    fisa.deplasareDaNu === "DA"
      ? L.yes
      : fisa.deplasareDaNu === "NU"
        ? L.no
        : "—";

  return (
    <AppShell title={t("pdf.title")} backHref={`/fise/${id}`}>
      {!fisa.reviewed && (
        <div className="qf-card p-3.5 text-sm mb-4 text-amber-950 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60">
          {t("pdf.warnReview")}
        </div>
      )}
      <div className="qf-card p-5 mb-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500">
            {t("pdf.summary")}
          </p>
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700"
            title={t("form.contentLocaleHint")}
          >
            {t("form.documentLang")}: {contentLocaleLabel}
          </span>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
          {t("pdf.langFollowsDoc")}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {settings.companyName}
        </h2>
        <p className="font-medium mt-2 text-foreground">
          {L.fisaOf} {L.tip[fisa.tip]} · {L.nr} {fisa.nrFisa || "—"}
        </p>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {L.client}{" "}
            </span>
            {fisa.client || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {L.locatie}{" "}
            </span>
            {fisa.locatie || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {L.utilaj}{" "}
            </span>
            {fisa.modelUtilaj || "—"} / {fisa.serie || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {L.manopera}{" "}
            </span>
            {fisa.manoperaOre || "—"} h · {L.deplasare}{" "}
            {fisa.deplasareKm || "—"} km ({deplasareYn})
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {L.reclamatie}{" "}
            </span>
            {fisa.reclamatie || "—"}
          </div>
          <div>
            <span className="text-stone-400 dark:text-stone-500">
              {L.piese}{" "}
            </span>
            {fisa.piese.filter((p) => p.denumire).length} {L.pieseLines}
          </div>
          {currency && (
            <div>
              <span className="text-stone-400 dark:text-stone-500">
                {L.currency}{" "}
              </span>
              {symbolForCurrency(currency)} ({currency})
            </div>
          )}
          {(fisa.semnaturaClient ||
            fisa.semnaturaTehnician ||
            fisa.semnaturaClientDataUrl ||
            fisa.semnaturaTehnicianDataUrl) && (
            <div className="pt-2 space-y-2">
              <div>
                <span className="text-stone-400 dark:text-stone-500">
                  {L.clientSig}{" "}
                </span>
                {fisa.semnaturaClient || "—"}
                {fisa.semnaturaClientDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fisa.semnaturaClientDataUrl}
                    alt=""
                    className="mt-1 h-12 max-w-[10rem] object-contain rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700"
                  />
                )}
              </div>
              <div>
                <span className="text-stone-400 dark:text-stone-500">
                  {L.techSig}{" "}
                </span>
                {fisa.semnaturaTehnician || "—"}
                {fisa.semnaturaTehnicianDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fisa.semnaturaTehnicianDataUrl}
                    alt=""
                    className="mt-1 h-12 max-w-[10rem] object-contain rounded-lg bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700"
                  />
                )}
              </div>
            </div>
          )}
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

      <div className="qf-card p-5 mb-5">
        <p className="text-[11px] font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-2">
          {t("pdf.preview")}
        </p>
        {previewLoading && (
          <p className="text-sm text-muted py-8 text-center">
            {t("pdf.previewLoading")}
          </p>
        )}
        {previewErr && !previewLoading && (
          <p className="text-sm text-red-600 dark:text-red-400 py-8 text-center">
            {t("pdf.previewErr")}
          </p>
        )}
        {previewUrl && !previewLoading && (
          <iframe
            title={t("pdf.preview")}
            src={previewUrl}
            className="w-full h-[28rem] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
          />
        )}
      </div>

      <p className="text-center text-xs text-stone-500 dark:text-stone-400 mb-3 font-mono break-all">
        {t("pdf.downloadAs", { name: downloadName })}
      </p>

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
