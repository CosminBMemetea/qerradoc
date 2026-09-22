"use client";

import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { useI18n } from "@/lib/i18n";

export default function GhidPage() {
  const { t } = useI18n();

  const steps = [
    t("guide.step1"),
    t("guide.step2"),
    t("guide.step3"),
    t("guide.step4"),
  ];

  const glossary = [
    t("guide.g.tip"),
    t("guide.g.client"),
    t("guide.g.locatie"),
    t("guide.g.equipment"),
    t("guide.g.reclamatie"),
    t("guide.g.parts"),
    t("guide.g.dates"),
    t("guide.g.signatures"),
  ];

  return (
    <AppShell title={t("guide.title")} backHref="/fise">
      <div className="space-y-4">
        <section className="qf-card p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-2">
            {t("guide.whatTitle")}
          </h2>
          <p className="text-foreground leading-relaxed">{t("guide.what")}</p>
        </section>

        <section className="qf-card p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-3">
            {t("guide.stepsTitle")}
          </h2>
          <ol className="space-y-3 list-decimal list-inside text-foreground">
            {steps.map((s, i) => (
              <li key={i} className="leading-relaxed pl-1">
                {s}
              </li>
            ))}
          </ol>
        </section>

        <section className="qf-card p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-3">
            {t("guide.glossaryTitle")}
          </h2>
          <ul className="space-y-2.5">
            {glossary.map((g, i) => (
              <li
                key={i}
                className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed border-l-2 border-indigo-200 dark:border-indigo-800 pl-3"
              >
                {g}
              </li>
            ))}
          </ul>
        </section>

        <div className="qf-card p-4 text-sm text-indigo-900 dark:text-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-800/60 leading-relaxed">
          {t("guide.tipLang")}
        </div>

        <BigButton href="/fise" variant="secondary">
          {t("guide.back")}
        </BigButton>
      </div>
    </AppShell>
  );
}
