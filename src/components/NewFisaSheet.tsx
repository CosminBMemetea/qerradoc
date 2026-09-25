"use client";

import Link from "next/link";
import Sheet from "./Sheet";
import { useI18n } from "@/lib/i18n";
import {
  useExcelDraftImport,
  EXCEL_ERR_KEYS,
  EXCEL_ACCEPT,
} from "@/lib/use-excel-draft";

function IconMic() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
function IconSheet() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M4 9h16M4 14.5h16M10 9v11.5" />
    </svg>
  );
}

const cardBase =
  "flex items-center gap-4 w-full text-left rounded-2xl border p-4 min-h-[80px] transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const cardPrimary = `${cardBase} bg-indigo-600 text-white border-indigo-700 shadow-sm hover:bg-indigo-700`;
const cardSecondary = `${cardBase} bg-card text-foreground border-border shadow-sm hover:border-stone-300 dark:hover:border-stone-600 active:bg-stone-50 dark:active:bg-stone-800`;

export default function NewFisaSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const excel = useExcelDraftImport();

  const iconWrap = (primary: boolean) =>
    `inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
      primary
        ? "bg-white/15 text-white"
        : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
    }`;

  return (
    <Sheet open={open} onClose={onClose} title={t("home.newHow")} testId="new-fisa-sheet">
      <div className="space-y-3">
        <Link href="/fise/nou/text?dictate=1" className={cardPrimary} data-testid="new-speak">
          <span className={iconWrap(true)}><IconMic /></span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold tracking-tight">{t("home.newSpeak")}</span>
            <span className="block text-sm text-indigo-100 leading-snug mt-0.5">{t("home.newSpeakDesc")}</span>
          </span>
        </Link>
        <Link href="/fise/nou/foto" className={cardSecondary} data-testid="new-photo">
          <span className={iconWrap(false)}><IconCamera /></span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold tracking-tight">{t("home.newPhoto")}</span>
            <span className="block text-sm text-muted leading-snug mt-0.5">{t("home.newPhotoDesc")}</span>
          </span>
        </Link>
        <input
          ref={excel.fileRef}
          type="file"
          accept={EXCEL_ACCEPT}
          className="hidden"
          data-testid="home-excel-input"
          onChange={(e) => excel.onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={excel.busy}
          onClick={excel.pick}
          className={`${cardSecondary} disabled:opacity-60`}
          data-testid="new-excel"
        >
          <span className={iconWrap(false)}><IconSheet /></span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold tracking-tight">
              {excel.busy ? t("new.excelImporting") : t("home.newExcel")}
            </span>
            <span className="block text-sm text-muted leading-snug mt-0.5">{t("home.newExcelDesc")}</span>
          </span>
        </button>
        {excel.error && (
          <div
            role="alert"
            className="rounded-xl border p-3 text-sm text-red-800 dark:text-red-200 bg-red-50/90 dark:bg-red-950/40 border-red-200/80 dark:border-red-800/60 leading-relaxed"
          >
            {t(EXCEL_ERR_KEYS[excel.error])}
          </div>
        )}
        <div className="text-center pt-1">
          <Link
            href="/fise/nou/text"
            className="inline-flex items-center min-h-[44px] px-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 underline-offset-4 hover:underline"
            data-testid="new-text"
          >
            {t("home.newText")}
          </Link>
        </div>
      </div>
    </Sheet>
  );
}
