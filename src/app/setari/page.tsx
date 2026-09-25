"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { Field, inputCls } from "@/components/Field";
import {
  getSettings,
  saveSettings,
  getSession,
  listFise,
  getCatalogClients,
  getCatalogEquipment,
  clearCatalogs,
} from "@/lib/db";
import type { FirmSettings } from "@/lib/types";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import { firmExample, cuiExample, isFirmExample } from "@/lib/defaults";
import { readAndCompressLogo } from "@/lib/logo";
import {
  BACKUP_SIZE_WARN_BYTES,
  exportBackupDownload,
  parseBackupJson,
  readFileAsText,
  restoreBackupReplaceAll,
} from "@/lib/backup";
import {
  importCatalogFile,
  exportCatalogDownload,
} from "@/lib/catalog-import";

export default function SetariPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [s, setS] = useState<FirmSettings>({
    companyName: "",
    cui: "",
    address: "",
    phone: "",
  });
  const [msg, setMsg] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState<"export" | "import" | null>(
    null
  );
  const [catalogCounts, setCatalogCounts] = useState({
    clients: 0,
    equipment: 0,
  });
  const [catalogBusy, setCatalogBusy] = useState<
    "import" | "export" | "clear" | null
  >(null);
  const [catalogReplace, setCatalogReplace] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);

  async function refreshCatalogCounts() {
    const [clients, equipment] = await Promise.all([
      getCatalogClients(),
      getCatalogEquipment(),
    ]);
    setCatalogCounts({ clients: clients.length, equipment: equipment.length });
  }

  // Deep links from the app menu: /setari#catalog, /setari#backup
  useEffect(() => {
    const go = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  useEffect(() => {
    Promise.all([getSettings(), getSession()]).then(([settings, session]) => {
      const name = settings.companyName?.trim() || "";
      // Seed from session firm when settings name is empty / still a demo example
      if ((!name || isFirmExample(name)) && session?.firmName?.trim()) {
        setS({ ...settings, companyName: session.firmName.trim() });
      } else {
        setS(settings);
      }
    });
    refreshCatalogCounts();
  }, []);

  async function onSave() {
    // Save firm settings only — do not overwrite login session
    await saveSettings(s);
    setMsg(t("settings.saved"));
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setLogoBusy(true);
    setMsg("");
    try {
      const dataUrl = await readAndCompressLogo(file);
      setS((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    } catch {
      setMsg(t("settings.logoErr"));
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onExportBackup() {
    setBackupBusy("export");
    setMsg("");
    try {
      const { count } = await exportBackupDownload();
      setMsg(t("settings.backupExported", { count }));
    } catch {
      setMsg(t("settings.backupErr"));
    } finally {
      setBackupBusy(null);
    }
  }

  async function onImportBackup(file: File | undefined) {
    if (!file) return;
    setBackupBusy("import");
    setMsg("");
    try {
      if (file.size > BACKUP_SIZE_WARN_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        if (!confirm(t("settings.backupHuge", { mb }))) {
          return;
        }
      }

      const text = await readFileAsText(file);
      const parsed = parseBackupJson(text);
      if (!parsed.ok) {
        setMsg(t("settings.backupInvalid"));
        return;
      }

      const local = await listFise();
      const ok = confirm(
        t("settings.backupConfirm", {
          count: local.length,
          backupCount: parsed.data.fise.length,
        })
      );
      if (!ok) return;

      const { fiseCount } = await restoreBackupReplaceAll(parsed.data);
      const settings = await getSettings();
      setS(settings);
      await refreshCatalogCounts();
      setMsg(t("settings.backupRestored", { count: fiseCount }));
      router.push("/fise");
    } catch {
      setMsg(t("settings.backupErr"));
    } finally {
      setBackupBusy(null);
      if (backupRef.current) backupRef.current.value = "";
    }
  }

  async function onImportCatalog(file: File | undefined) {
    if (!file) return;
    setCatalogBusy("import");
    setMsg("");
    try {
      const mode = catalogReplace ? "replace" : "upsert";
      if (mode === "replace") {
        const ok = confirm(t("settings.catalogReplaceConfirm"));
        if (!ok) return;
      }
      const r = await importCatalogFile(file, mode);
      await refreshCatalogCounts();
      setMsg(
        t("settings.catalogImported", {
          cAdd: r.clientsAdded,
          cUpd: r.clientsUpdated,
          eAdd: r.equipmentAdded,
          eUpd: r.equipmentUpdated,
        })
      );
    } catch {
      setMsg(t("settings.catalogErr"));
    } finally {
      setCatalogBusy(null);
      if (catalogRef.current) catalogRef.current.value = "";
    }
  }

  async function onExportCatalog() {
    setCatalogBusy("export");
    setMsg("");
    try {
      const r = await exportCatalogDownload();
      setMsg(
        t("settings.catalogExported", {
          clients: r.clients,
          equipment: r.equipment,
        })
      );
    } catch {
      setMsg(t("settings.catalogErr"));
    } finally {
      setCatalogBusy(null);
    }
  }

  async function onClearCatalogs() {
    if (!confirm(t("settings.catalogClearConfirm"))) return;
    setCatalogBusy("clear");
    setMsg("");
    try {
      await clearCatalogs();
      await refreshCatalogCounts();
      setMsg(t("settings.catalogCleared"));
    } catch {
      setMsg(t("settings.catalogErr"));
    } finally {
      setCatalogBusy(null);
    }
  }

  return (
    <AppShell title={t("settings.title")} backHref="/fise">
      <div className="qf-card p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          {t("settings.appearance")}
        </h2>
        <Field label={t("settings.language")}>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`min-h-[44px] rounded-xl border text-sm font-semibold transition ${
                  locale === l
                    ? "bg-indigo-600 text-white border-indigo-700"
                    : "bg-card border-border text-foreground active:bg-stone-50 dark:active:bg-stone-800"
                }`}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("settings.theme")}>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: "light" as Theme, label: t("settings.themeLight") },
                { v: "dark" as Theme, label: t("settings.themeDark") },
              ] as const
            ).map(({ v, label }) => (
              <button
                key={v}
                type="button"
                onClick={() => setTheme(v)}
                className={`min-h-[44px] rounded-xl border text-sm font-semibold transition ${
                  theme === v
                    ? "bg-indigo-600 text-white border-indigo-700"
                    : "bg-card border-border text-foreground active:bg-stone-50 dark:active:bg-stone-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mb-4">
        <BigButton href="/ghid" variant="secondary">
          {t("settings.openGuide")}
        </BigButton>
      </div>

      <div className="qf-card p-5 mb-2">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          {t("settings.pdfHeader")}
        </h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          {t("settings.pdfHeaderHint")}
        </p>

        {/* One-line PDF preview strip */}
        <div className="mb-4 rounded-xl border border-border bg-stone-50 dark:bg-stone-900/60 px-3 py-2.5 flex items-center gap-3 min-h-[52px]">
          {s.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logoDataUrl}
              alt=""
              className="h-10 w-10 object-contain rounded-lg border border-border bg-white shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg border border-dashed border-stone-300 dark:border-stone-600 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-stone-400 dark:text-stone-500 font-semibold">
              {t("settings.pdfPreview")}
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {s.companyName?.trim() || firmExample(locale)}
            </p>
          </div>
        </div>

        <Field
          label={t("settings.companyName")}
          info={t("settings.companyInfo")}
        >
          <input
            className={inputCls}
            value={s.companyName}
            onChange={(e) => setS({ ...s, companyName: e.target.value })}
            placeholder={firmExample(locale)}
          />
        </Field>
        <Field label={t("settings.cui")}>
          <input
            className={inputCls}
            value={s.cui}
            onChange={(e) => setS({ ...s, cui: e.target.value })}
            placeholder={cuiExample(locale)}
          />
        </Field>
        <Field label={t("settings.address")}>
          <input
            className={inputCls}
            value={s.address || ""}
            onChange={(e) => setS({ ...s, address: e.target.value })}
          />
        </Field>
        <Field label={t("settings.phone")}>
          <input
            className={inputCls}
            value={s.phone || ""}
            onChange={(e) => setS({ ...s, phone: e.target.value })}
          />
        </Field>

        <Field label={t("settings.logo")}>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
            className="hidden"
            onChange={(e) => onLogo(e.target.files?.[0])}
          />
          <BigButton
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={logoBusy}
          >
            {logoBusy ? t("settings.logoBusy") : t("settings.uploadLogo")}
          </BigButton>
          {s.logoDataUrl && (
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-border bg-white dark:bg-stone-900 p-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.logoDataUrl}
                  alt="Logo"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {t("settings.logoTip")}
              </p>
              <button
                type="button"
                className="text-sm text-red-600 dark:text-red-400 font-medium min-h-[44px] px-2"
                onClick={() => setS({ ...s, logoDataUrl: undefined })}
              >
                {t("settings.removeLogo")}
              </button>
            </div>
          )}
        </Field>
      </div>

      <BigButton onClick={onSave} className="mt-4">
        {t("settings.save")}
      </BigButton>

      <div id="catalog" className="qf-card p-5 mt-6 mb-2 scroll-mt-24">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          {t("settings.catalog")}
        </h2>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          {t("settings.catalogTip")}
        </p>
        <p className="text-sm text-foreground mb-4">
          {t("settings.catalogCounts", {
            clients: catalogCounts.clients,
            equipment: catalogCounts.equipment,
          })}
        </p>
        <input
          ref={catalogRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={(e) => onImportCatalog(e.target.files?.[0])}
        />
        <label className="flex items-center gap-2 mb-3 min-h-[44px] text-sm text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={catalogReplace}
            onChange={(e) => setCatalogReplace(e.target.checked)}
          />
          {t("settings.catalogReplace")}
        </label>
        <div className="space-y-3">
          <BigButton
            variant="secondary"
            onClick={() => catalogRef.current?.click()}
            disabled={catalogBusy !== null}
          >
            {catalogBusy === "import"
              ? t("settings.catalogImporting")
              : t("settings.catalogImport")}
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={() => {
              const a = document.createElement("a");
              a.href = "/templates/querra-catalog-template.xlsx";
              a.download = "querra-catalog-template.xlsx";
              a.click();
            }}
          >
            {t("settings.catalogTemplate")}
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={onExportCatalog}
            disabled={catalogBusy !== null}
          >
            {catalogBusy === "export"
              ? t("settings.catalogExporting")
              : t("settings.catalogExport")}
          </BigButton>
          <BigButton
            variant="danger"
            onClick={onClearCatalogs}
            disabled={catalogBusy !== null}
          >
            {catalogBusy === "clear"
              ? t("settings.catalogClearing")
              : t("settings.catalogClear")}
          </BigButton>
        </div>
      </div>

      <div id="backup" className="qf-card p-5 mt-6 mb-2 scroll-mt-24">
        <h2 className="text-sm font-semibold text-foreground mb-1">
          {t("settings.backup")}
        </h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          {t("settings.backupTip")}
        </p>
        <input
          ref={backupRef}
          type="file"
          accept="application/json,.json,.querra.json"
          className="hidden"
          onChange={(e) => onImportBackup(e.target.files?.[0])}
        />
        <div className="space-y-3">
          <BigButton
            variant="secondary"
            onClick={onExportBackup}
            disabled={backupBusy !== null}
          >
            {backupBusy === "export"
              ? t("settings.backupExporting")
              : t("settings.backupExport")}
          </BigButton>
          <BigButton
            variant="danger"
            onClick={() => backupRef.current?.click()}
            disabled={backupBusy !== null}
          >
            {backupBusy === "import"
              ? t("settings.backupImporting")
              : t("settings.backupImport")}
          </BigButton>
        </div>
      </div>

      {msg && (
        <p className="text-center text-teal-800 dark:text-teal-300 font-medium mt-3 text-sm">
          {msg}
        </p>
      )}
    </AppShell>
  );
}
