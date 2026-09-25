"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { Field, inputCls } from "@/components/Field";
import { getLicense, saveLicense } from "@/lib/db";
import type { LicenseState } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export default function LicentaPage() {
  const { t, locale } = useI18n();
  const [lic, setLic] = useState<LicenseState>({
    activated: false,
    licenseKey: "",
    maxUsers: 5,
  });
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getLicense().then((l) => {
      setLic(l);
      setKey(l.licenseKey);
    });
  }, []);

  async function activate() {
    const trimmed = key.trim().toUpperCase();
    if (trimmed.length < 8 && trimmed !== "DEMO") {
      setMsg(t("license.errKey"));
      return;
    }
    const next: LicenseState = {
      activated: true,
      licenseKey: trimmed || "DEMO-QUERRA",
      activatedAt: new Date().toISOString(),
      maxUsers: 5,
    };
    await saveLicense(next);
    setLic(next);
    setMsg(t("license.ok"));
  }

  async function deactivate() {
    const next: LicenseState = {
      activated: false,
      licenseKey: "",
      maxUsers: 5,
    };
    await saveLicense(next);
    setLic(next);
    setKey("");
    setMsg(t("license.deactivated"));
  }

  const dateLocale =
    locale === "en" ? "en-US" : locale === "pl" ? "pl-PL" : "ro-RO";

  return (
    <AppShell title={t("license.title")} backHref="/fise">
      <div className="qf-card p-5 mb-5">
        <p className="text-sm text-muted leading-relaxed">
          {t("license.pricing")}
        </p>
        <div
          className={`mt-4 rounded-xl px-3.5 py-2.5 font-medium text-sm ${
            lic.activated
              ? "bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 border border-teal-200/80 dark:border-teal-800/60"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-200/80 dark:border-amber-800/60"
          }`}
        >
          {lic.activated
            ? t("license.active", {
                key: lic.licenseKey,
                max: lic.maxUsers,
              })
            : t("license.inactive")}
        </div>
        {lic.activatedAt && (
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-3">
            {t("license.activatedAt")}{" "}
            {new Date(lic.activatedAt).toLocaleString(dateLocale, {
              timeZone: "Europe/Bucharest",
            })}{" "}
            (EET/EEST)
          </p>
        )}
      </div>

      <Field label={t("license.key")}>
        <input
          className={inputCls}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t("license.keyPh")}
        />
      </Field>

      <div className="space-y-3">
        <BigButton onClick={activate}>{t("license.activate")}</BigButton>
        {lic.activated && (
          <BigButton variant="secondary" onClick={deactivate}>
            {t("license.deactivate")}
          </BigButton>
        )}
      </div>
      {msg && (
        <p className="text-center text-sm font-medium text-indigo-700 dark:text-indigo-300 mt-3">
          {msg}
        </p>
      )}
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-6 leading-relaxed">
        {t("license.stub")}
      </p>
    </AppShell>
  );
}
