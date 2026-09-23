"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, getSettings, saveSettings, getLicense } from "@/lib/db";
import { Field, inputCls } from "@/components/Field";
import BigButton from "@/components/BigButton";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  firmExample,
  techExample,
  isFirmExample,
  isTechExample,
} from "@/lib/defaults";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [firm, setFirm] = useState(() => firmExample(locale));
  const [tech, setTech] = useState(() => techExample(locale));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setFirm((prev) => (isFirmExample(prev) ? firmExample(locale) : prev));
    setTech((prev) => (isTechExample(prev) ? techExample(locale) : prev));
  }, [locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!firm.trim() || !tech.trim()) {
      setErr(t("login.errRequired"));
      return;
    }
    setBusy(true);
    try {
      const lic = await getLicense();
      const settings = await getSettings();
      const existing = settings.companyName?.trim() || "";
      // Seed PDF firm name only when empty / still a demo placeholder —
      // never overwrite a custom name the user set in Setări.
      if (!existing || isFirmExample(existing)) {
        await saveSettings({ ...settings, companyName: firm.trim() });
      }
      await saveSession({
        firmName: firm.trim(),
        technicianName: tech.trim(),
        loggedInAt: new Date().toISOString(),
      });
      void lic;
      router.replace("/fise");
    } catch {
      setErr(t("login.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <div className="flex-1 flex flex-col justify-center px-5 py-10 max-w-lg mx-auto w-full">
        <div className="flex justify-end gap-2 mb-4">
          <select
            aria-label={t("login.language")}
            className="text-xs font-medium rounded-xl border border-border bg-card text-foreground px-2.5 py-2 min-h-[36px]"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-xs font-medium rounded-xl border border-border bg-card text-foreground px-3 py-2 min-h-[36px]"
            aria-label={t("settings.theme")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>

        <div className="text-center mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt=""
            width={88}
            height={88}
            className="mx-auto mb-5 h-[88px] w-[88px] rounded-[22px] shadow-md shadow-indigo-500/20"
            draggable={false}
          />
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-indigo-600 dark:text-indigo-400 mb-3">
            Querra
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("app.name")}
          </h1>
          <p className="text-muted mt-2 text-[15px] leading-relaxed max-w-xs mx-auto">
            {t("login.tagline")}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-1"
        >
          <Field label={t("login.firm")} info={t("login.firmInfo")}>
            <input
              className={inputCls}
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              autoComplete="organization"
            />
          </Field>
          <Field label={t("login.tech")} info={t("login.techInfo")}>
            <input
              className={inputCls}
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              autoComplete="name"
            />
          </Field>
          {err && (
            <p className="text-red-600 dark:text-red-400 text-sm font-medium py-1">
              {err}
            </p>
          )}
          <div className="pt-1">
            <BigButton type="submit" disabled={busy}>
              {busy ? t("login.busy") : t("login.submit")}
            </BigButton>
          </div>
        </form>
      </div>
    </div>
  );
}
