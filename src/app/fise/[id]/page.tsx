"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import FisaEditor from "@/components/FisaEditor";
import { useI18n } from "@/lib/i18n";

function EditInner() {
  const params = useParams();
  return <FisaEditor id={String(params.id)} />;
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
