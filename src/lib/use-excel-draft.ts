"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExcelDraftError } from "./excel-draft-import";

/** i18n key per import error (kept here so xlsx is only loaded on demand). */
export const EXCEL_ERR_KEYS: Record<ExcelDraftError, string> = {
  numbers: "excel.errNumbers",
  not_fisa: "excel.errNotFisa",
  empty: "excel.errEmpty",
  read_failed: "excel.errRead",
};

export const EXCEL_ACCEPT =
  ".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

/** Shared "import a filled client Excel as a new draft" flow. */
export function useExcelDraftImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Stable error code — translated at render so a UI language switch re-localizes it.
  const [error, setError] = useState<ExcelDraftError | null>(null);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setBusy(true);
      try {
        const { importExcelAsDraft } = await import("./excel-draft-import");
        const res = await importExcelAsDraft(file);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/fise/${res.fisa.id}?review=1&from=excel`);
      } catch {
        setError("read_failed");
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [router]
  );

  const pick = useCallback(() => fileRef.current?.click(), []);
  return { fileRef, busy, error, onFile, pick };
}
