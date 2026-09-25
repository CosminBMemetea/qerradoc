"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import type { ExcelDraftError } from "@/lib/excel-draft-import";

/** i18n key per import error (kept here so xlsx is only loaded on demand). */
const EXCEL_ERR_KEYS: Record<ExcelDraftError, string> = {
  numbers: "excel.errNumbers",
  not_fisa: "excel.errNotFisa",
  empty: "excel.errEmpty",
  read_failed: "excel.errRead",
};

export default function NewFisaChooser() {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Stable error code — translated at render so a UI language switch re-localizes it.
  const [excelErr, setExcelErr] = useState<ExcelDraftError | null>(null);

  const cards = [
    {
      href: "/fise/nou/text?dictate=1",
      title: t("new.dictateTitle"),
      desc: t("new.dictateDesc"),
      primary: true,
    },
    {
      href: "/fise/nou/text",
      title: t("new.textTitle"),
      desc: t("new.textDesc"),
      primary: false,
    },
    {
      href: "/fise/nou/foto",
      title: t("new.photoTitle"),
      desc: t("new.photoDesc"),
      primary: false,
    },
  ];

  async function onExcel(file: File | undefined) {
    if (!file) return;
    setExcelErr(null);
    setBusy(true);
    try {
      // Lazy-load the xlsx parser only when a file is picked.
      const { importExcelAsDraft } = await import("@/lib/excel-draft-import");
      const res = await importExcelAsDraft(file);
      if (!res.ok) {
        setExcelErr(res.error);
        return;
      }
      router.push(`/fise/${res.fisa.id}?review=1&from=excel`);
    } catch {
      setExcelErr("read_failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <AppShell title={t("new.title")} backHref="/fise">
      <p className="text-muted mb-6 text-[15px] leading-relaxed text-center">
        {t("new.intro")}
      </p>
      <div className="space-y-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`block rounded-2xl border p-5 min-h-[88px] transition active:scale-[0.99] ${
              c.primary
                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                : "bg-card text-foreground border-border shadow-sm active:bg-stone-50 dark:active:bg-stone-800"
            }`}
          >
            <div
              className={`text-lg font-semibold tracking-tight ${
                c.primary ? "text-white" : "text-foreground"
              }`}
            >
              {c.title}
            </div>
            <p
              className={`text-sm mt-1 leading-relaxed ${
                c.primary ? "text-indigo-100" : "text-muted"
              }`}
            >
              {c.desc}
            </p>
          </Link>
        ))}

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          data-testid="excel-draft-input"
          onChange={(e) => onExcel(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="block w-full text-left rounded-2xl border p-5 min-h-[88px] transition active:scale-[0.99] bg-card text-foreground border-border shadow-sm active:bg-stone-50 dark:active:bg-stone-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <div className="text-lg font-semibold tracking-tight text-foreground">
            {busy ? t("new.excelImporting") : t("new.excelTitle")}
          </div>
          <p className="text-sm mt-1 leading-relaxed text-muted">
            {t("new.excelDesc")}
          </p>
          <p className="text-xs mt-1.5 leading-snug text-muted">
            {t("excel.numbersHint")}
          </p>
        </button>

        {excelErr && (
          <div
            role="alert"
            className="qf-card p-3.5 text-sm text-red-800 dark:text-red-200 bg-red-50/90 dark:bg-red-950/40 border-red-200/80 dark:border-red-800/60 leading-relaxed"
          >
            {t(EXCEL_ERR_KEYS[excelErr])}
          </div>
        )}
      </div>
    </AppShell>
  );
}
