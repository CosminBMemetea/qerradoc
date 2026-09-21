"use client";

import { useI18n } from "@/lib/i18n";

export default function OfflinePage() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background text-center">
      <h1 className="text-2xl font-semibold tracking-tight mb-2 text-foreground">
        {t("offline.title")}
      </h1>
      <p className="text-muted mb-6 max-w-xs leading-relaxed">
        {t("offline.desc")}
      </p>
      <a
        href="/"
        className="text-indigo-600 dark:text-indigo-400 font-semibold min-h-[48px] inline-flex items-center px-4"
      >
        {t("offline.retry")}
      </a>
    </div>
  );
}
