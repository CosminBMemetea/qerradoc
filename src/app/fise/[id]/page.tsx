"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import FisaForm from "@/components/FisaForm";
import { getFisa, saveFisa, deleteFisa, upsertCatalogFromFisa } from "@/lib/db";
import type { Fisa } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

function EditInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = String(params.id);
  const mustReview = search.get("review") === "1";
  const fromExcel = search.get("from") === "excel";
  const [excelBannerOpen, setExcelBannerOpen] = useState(fromExcel);
  const fromVoice = search.get("from") === "voice";
  const voiceBasic = search.get("src") === "heuristic";
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    getFisa(id).then((f) => {
      if (cancelled) return;
      if (!f) {
        // Stable sentinel — translate at render so UI language switch does not re-fetch.
        setErr("NOT_FOUND");
        return;
      }
      setFisa(f);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSave() {
    if (!fisa) return;
    const next = { ...fisa, reviewed: true };
    await saveFisa(next);
    try {
      await upsertCatalogFromFisa(next);
    } catch {
      /* catalog learn is best-effort */
    }
    setFisa(next);
    setSaved(true);
  }

  async function onDelete() {
    if (!confirm(t("edit.deleteConfirm"))) return;
    await deleteFisa(id);
    router.replace("/fise");
  }

  if (err) {
    return (
      <AppShell title={t("edit.errorTitle")} backHref="/fise">
        <p className="text-red-600 dark:text-red-400">
          {err === "NOT_FOUND" ? t("edit.notFound") : err}
        </p>
      </AppShell>
    );
  }

  if (!fisa) {
    return (
      <AppShell title={t("edit.fisaTitle")} backHref="/fise">
        <p className="text-center text-muted py-10">{t("app.loadingShort")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        mustReview && !fisa.reviewed
          ? t("edit.reviewTitle")
          : `${t("edit.fisaTitle")} ${fisa.nrFisa || ""}`
      }
      backHref="/fise"
    >
      {excelBannerOpen && (
        <div
          role="status"
          className="qf-card mb-3 p-3.5 flex items-start gap-3 text-sm text-teal-950 dark:text-teal-100 bg-teal-50/90 dark:bg-teal-950/40 border-teal-200/80 dark:border-teal-800/60"
        >
          <div className="flex-1 leading-relaxed">
            <p className="font-semibold">{t("excel.importedBanner")}</p>
            <p className="text-xs mt-0.5 opacity-80">{t("excel.importedNote")}</p>
          </div>
          <button
            type="button"
            aria-label={t("excel.dismiss")}
            title={t("excel.dismiss")}
            onClick={() => {
              setExcelBannerOpen(false);
              router.replace(
                mustReview ? `/fise/${id}?review=1` : `/fise/${id}`
              );
            }}
            className="shrink-0 min-h-[36px] min-w-[36px] rounded-lg border border-teal-300/70 dark:border-teal-700 text-base leading-none font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ×
          </button>
        </div>
      )}
      {fromVoice && voiceBasic && (
        <div
          role="status"
          data-testid="voice-banner"
          className="rounded-2xl border shadow-sm mb-3 p-3.5 text-sm text-amber-950 dark:text-amber-100 bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60 leading-relaxed"
        >
          {t("voice.bannerBasic")}
        </div>
      )}
      <FisaForm fisa={fisa} onChange={setFisa} />

      <div className="sticky bottom-0 mt-6 space-y-3 bg-background/95 backdrop-blur-sm pt-3 pb-2 -mx-1 px-1">
        {saved && (
          <p className="text-center text-teal-800 dark:text-teal-300 font-medium text-sm">
            {t("edit.saved")}
          </p>
        )}
        <BigButton onClick={onSave} variant="success">
          {t("edit.save")}
        </BigButton>
        <BigButton
          href={`/fise/${fisa.id}/pdf`}
          disabled={!fisa.reviewed && mustReview}
          variant="primary"
        >
          {t("edit.pdf")}
        </BigButton>
        {!fisa.reviewed && mustReview && (
          <p className="text-xs text-amber-900 dark:text-amber-200 text-center">
            {t("edit.pdfLocked")}
          </p>
        )}
        <BigButton variant="danger" onClick={onDelete}>
          {t("edit.delete")}
        </BigButton>
      </div>
    </AppShell>
  );
}

function EditFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background text-muted">
      {t("app.loadingShort")}
    </div>
  );
}

export default function EditFisaPage() {
  return (
    <Suspense fallback={<EditFallback />}>
      <EditInner />
    </Suspense>
  );
}
