"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FisaEditor from "@/components/FisaEditor";
import { useI18n } from "@/lib/i18n";

/**
 * Static, offline-safe editor route: /fise/edit?id=<id>.
 * Precached by the service worker (next.config.mjs), so drafts created
 * offline (text / speak / photo) open without the network.
 */
function Inner() {
  const search = useSearchParams();
  const { t } = useI18n();
  const id = search.get("id") || "";
  if (!id) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-muted">
        {t("edit.notFound")}
      </div>
    );
  }
  return <FisaEditor id={id} />;
}

function Fallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background text-muted">
      {t("app.loadingShort")}
    </div>
  );
}

export default function OfflineSafeEditPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <Inner />
    </Suspense>
  );
}
