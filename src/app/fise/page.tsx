"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import NewFisaSheet from "@/components/NewFisaSheet";
import { listFise, getSession } from "@/lib/db";
import { seedDemoFisa } from "@/lib/seed";
import { loadDemo } from "@/lib/demos";
import type { Fisa, TemplateKind } from "@/lib/types";
import { resolveContentLocale } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { techExample } from "@/lib/defaults";

export default function FiseListPage() {
  const { t, locale } = useI18n();
  const [fise, setFise] = useState<Fisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  async function reload() {
    setLoading(true);
    const list = await listFise();
    setFise(list);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function withTech(fn: (name: string) => Promise<unknown>) {
    setSeeding(true);
    try {
      const s = await getSession();
      await fn(s?.technicianName || techExample(locale));
      await reload();
    } finally {
      setSeeding(false);
    }
  }

  async function onSeed() {
    await withTech((name) => seedDemoFisa(name, locale));
  }

  async function onDemo(kind: TemplateKind) {
    await withTech((name) => loadDemo(kind, locale, name));
  }

  return (
    <AppShell title={t("fise.title")}>
      <button
        type="button"
        onClick={() => setNewOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={newOpen}
        data-testid="big-new-fisa"
        className="group w-full flex items-center gap-4 rounded-3xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-5 py-5 min-h-[88px] shadow-lg shadow-indigo-600/25 dark:shadow-indigo-950/60 border border-indigo-700/30 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 mb-7"
      >
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 shrink-0">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="text-left min-w-0">
          <span className="block text-xl font-semibold tracking-tight">{t("fise.new")}</span>
          <span className="block text-sm text-indigo-100 mt-0.5">{t("home.newSub")}</span>
        </span>
      </button>
      <NewFisaSheet open={newOpen} onClose={() => setNewOpen(false)} />

      {loading ? (
        <p className="text-muted text-center py-10">{t("app.loadingShort")}</p>
      ) : fise.length === 0 ? (
        <div className="qf-card text-center py-10 px-5">
          <p className="font-semibold text-foreground text-lg">
            {t("fise.emptyTitle")}
          </p>
          <p className="text-sm mt-2 leading-relaxed text-muted">
            {t("fise.emptyFriendly")}
          </p>
          <div className="mt-5 space-y-2.5 text-left">
            <BigButton
              variant="secondary"
              onClick={() => onDemo("curatenie")}
              disabled={seeding}
            >
              {t("fise.emptyCtaDemo")}
            </BigButton>
            <BigButton href="/ghid" variant="secondary">
              {t("fise.emptyCtaGuide")}
            </BigButton>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {fise.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fise/${f.id}`}
                className="block qf-card p-4 active:bg-stone-50 dark:active:bg-stone-800 transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {f.nrFisa || t("fise.noNumber")}
                      <span className="text-stone-400 font-normal"> · </span>
                      <span className="text-indigo-700 dark:text-indigo-400 font-medium">
                        {t(`tip.${f.tip}`)}
                      </span>
                    </div>
                    <div className="text-sm text-stone-700 dark:text-stone-300 truncate mt-0.5">
                      {f.client || t("fise.unknownClient")}
                    </div>
                    <div className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">
                      {f.modelUtilaj || "—"} · {f.serie || t("fise.noSerie")}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {f.templateKind && (
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                          {t(`fise.badge.${f.templateKind}`)}
                        </span>
                      )}
                      {f.sentAt && (
                        <span
                          data-testid="sent-badge"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60"
                        >
                          <span aria-hidden="true">✓</span>
                          {t("send.badge")}
                        </span>
                      )}
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700">
                        {resolveContentLocale(f).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 dark:text-stone-500 whitespace-nowrap pt-0.5">
                    {f.dataInterventiei || f.updatedAt.slice(0, 10)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <details className="mt-8 group" data-testid="home-demos">
        <summary className="list-none cursor-pointer select-none inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-muted hover:text-foreground">
          <span className="transition group-open:rotate-90" aria-hidden="true">›</span>
          {t("home.demos")}
        </summary>
        <div className="space-y-2.5 mt-2">
          <BigButton variant="secondary" onClick={onSeed} disabled={seeding}>
            {t("fise.seed")}
          </BigButton>
          <BigButton variant="secondary" onClick={() => onDemo("curatenie")} disabled={seeding}>
            {t("fise.demoCuratenie")}
          </BigButton>
          <BigButton variant="secondary" onClick={() => onDemo("tamplarie")} disabled={seeding}>
            {t("fise.demoTamplarie")}
          </BigButton>
          <BigButton variant="secondary" onClick={() => onDemo("stoma")} disabled={seeding}>
            {t("fise.demoStoma")}
          </BigButton>
        </div>
      </details>
    </AppShell>
  );
}
