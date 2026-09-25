"use client";

import { useI18n } from "@/lib/i18n";
import { usePilotPackImport, PACK_ACCEPT } from "@/lib/pilot-pack-import";
import type { PilotPack } from "@/lib/pilot-pack";

/** "Ai primit un pachet de configurare? Încarcă-l" — compact card or link. */
export default function PilotPackCta({
  variant = "card",
  onDone,
}: {
  variant?: "card" | "link";
  onDone?: (pack: PilotPack) => void;
}) {
  const { t } = useI18n();
  const pack = usePilotPackImport(t, onDone);
  const input = (
    <input
      ref={pack.fileRef}
      type="file"
      accept={PACK_ACCEPT}
      className="hidden"
      data-testid="pilot-pack-input"
      onChange={(e) => pack.onFile(e.target.files?.[0])}
    />
  );
  const msg = pack.msg && (
    <p
      role="status"
      data-testid="pilot-pack-msg"
      className={`text-sm mt-2 leading-relaxed ${
        pack.msg.kind === "ok" ? "text-teal-800 dark:text-teal-300" : "text-red-700 dark:text-red-300"
      }`}
    >
      {pack.msg.text}
    </p>
  );

  if (variant === "link") {
    return (
      <div className="text-center">
        {input}
        <button
          type="button"
          onClick={pack.pick}
          disabled={pack.busy}
          data-testid="pilot-pack-cta"
          className="inline-flex items-center gap-2 min-h-[44px] px-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 underline-offset-4 hover:underline disabled:opacity-60"
        >
          <span aria-hidden="true">📦</span>
          {pack.busy ? t("pack.loading") : t("pack.cta")}
        </button>
        {msg}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 p-4">
      {input}
      <button
        type="button"
        onClick={pack.pick}
        disabled={pack.busy}
        data-testid="pilot-pack-cta"
        className="w-full flex items-center gap-3 text-left min-h-[56px] rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
      >
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 shadow-sm shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">
            {pack.busy ? t("pack.loading") : t("pack.cta")}
          </span>
          <span className="block text-xs text-muted mt-0.5 leading-snug">{t("pack.ctaDesc")}</span>
        </span>
      </button>
      {msg}
    </div>
  );
}
