"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import FisaForm from "@/components/FisaForm";
import { getFisa, saveFisa, deleteFisa } from "@/lib/db";
import type { Fisa } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

function EditInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = String(params.id);
  const mustReview = search.get("review") === "1";
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
      <FisaForm fisa={fisa} onChange={setFisa} />

      <div className="sticky bottom-20 mt-6 space-y-3 bg-background/95 backdrop-blur-sm pt-3 pb-2 -mx-1 px-1">
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
