"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import FisaForm from "@/components/FisaForm";
import SendToClient from "@/components/SendToClient";
import { canSendToClient } from "@/lib/send-to-client";
import { getFisa, saveFisa, deleteFisa, upsertCatalogFromFisa } from "@/lib/db";
import type { Fisa } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

/** Fallback reason from voiceFill → i18n key for the amber notice. */
function voiceWhyKey(why: string) {
  if (why === "offline") return "voice.why.offline" as const;
  if (why === "rate_limited") return "voice.why.busy" as const;
  if (why === "timeout") return "voice.why.timeout" as const;
  if (why === "empty") return "voice.why.empty" as const;
  return "voice.why.unavailable" as const;
}

/**
 * The fișă editor. Used by /fise/[id] and by the offline-safe static route
 * /fise/edit?id=… (precached by the service worker).
 */
export default function FisaEditor({ id }: { id: string }) {
  const search = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const selfHref = typeof window !== "undefined" && window.location.pathname === "/fise/edit" ? `/fise/edit?id=${encodeURIComponent(id)}` : `/fise/${id}`;
  const mustReview = search.get("review") === "1";
  const fromExcel = search.get("from") === "excel";
  const [excelBannerOpen, setExcelBannerOpen] = useState(fromExcel);
  const fromVoice = search.get("from") === "voice";
  const voiceBasic = search.get("src") === "heuristic";
  const voiceWhy = search.get("why") || "";
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

  async function persist(next: Fisa): Promise<Fisa> {
    await saveFisa(next);
    try {
      await upsertCatalogFromFisa(next);
    } catch {
      /* catalog learn is best-effort */
    }
    setFisa(next);
    return next;
  }

  async function onSave() {
    if (!fisa) return;
    await persist({ ...fisa, reviewed: true });
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
                mustReview ? `${selfHref}${selfHref.includes("?") ? "&" : "?"}review=1` : selfHref
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
          <p className="font-semibold">{t("voice.bannerBasic")}</p>
          {voiceWhy && (
            <p className="text-xs mt-0.5 opacity-80" data-testid="voice-banner-why">
              {t(voiceWhyKey(voiceWhy))}
              {voiceWhy !== "offline" && voiceWhy !== "empty" ? ` (${voiceWhy})` : ""}
            </p>
          )}
        </div>
      )}
      <FisaForm fisa={fisa} onChange={setFisa} />

      <div className="sticky bottom-0 z-10 mt-6 bg-background/95 backdrop-blur-sm pt-3 pb-3 -mx-1 px-1">
        {canSendToClient(fisa) ? (
          <SendToClient fisa={fisa} persist={persist} />
        ) : (
          <BigButton onClick={onSave} variant="success">
            {t("edit.save")}
          </BigButton>
        )}
        {saved && (
          <p className="mt-2 text-center text-teal-800 dark:text-teal-300 font-medium text-sm">
            {t("edit.saved")}
          </p>
        )}
      </div>
      <div className="mt-3 space-y-3">
        {canSendToClient(fisa) ? (
          <BigButton onClick={onSave} variant="success">
            {t("edit.save")}
          </BigButton>
        ) : (
          <p className="text-xs text-muted text-center">{t("send.signFirst")}</p>
        )}
        <BigButton
          href={`/fise/${fisa.id}/pdf`}
          disabled={!fisa.reviewed && mustReview}
          variant="secondary"
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
