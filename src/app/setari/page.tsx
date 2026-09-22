"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { Field, inputCls } from "@/components/Field";
import { getSettings, saveSettings } from "@/lib/db";
import type { FirmSettings } from "@/lib/types";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

export default function SetariPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [s, setS] = useState<FirmSettings>({
    companyName: "",
    cui: "",
    address: "",
    phone: "",
  });
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  async function onSave() {
    await saveSettings(s);
    setMsg(t("settings.saved"));
  }

  function onLogo(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setS((prev) => ({ ...prev, logoDataUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title={t("settings.title")}>
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
        <Field label={t("settings.companyName")}>
          <input
            className={inputCls}
            value={s.companyName}
            onChange={(e) => setS({ ...s, companyName: e.target.value })}
          />
        </Field>
        <Field label={t("settings.cui")}>
          <input
            className={inputCls}
            value={s.cui}
            onChange={(e) => setS({ ...s, cui: e.target.value })}
            placeholder="RO12345678"
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
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogo(e.target.files?.[0])}
          />
          <BigButton
            variant="secondary"
            onClick={() => fileRef.current?.click()}
          >
            {t("settings.uploadLogo")}
          </BigButton>
          {s.logoDataUrl && (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.logoDataUrl}
                alt="Logo"
                className="h-16 w-16 object-contain rounded-xl border border-border"
              />
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
      {msg && (
        <p className="text-center text-teal-800 dark:text-teal-300 font-medium mt-3 text-sm">
          {msg}
        </p>
      )}
    </AppShell>
  );
}
