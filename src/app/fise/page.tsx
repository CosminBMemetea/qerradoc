"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { listFise, getSession } from "@/lib/db";
import { seedDemoFisa } from "@/lib/seed";
import {
  seedDemoCuratenie,
  seedDemoTamplarie,
  seedDemoStoma,
} from "@/lib/demos";
import type { Fisa, TemplateKind } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export default function FiseListPage() {
  const { t } = useI18n();
  const [fise, setFise] = useState<Fisa[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  async function reload() {
    setLoading(true);
    const list = await listFise();
    setFise(list);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function withTech(
    fn: (name: string) => Promise<unknown>
  ) {
    setSeeding(true);
    try {
      const s = await getSession();
      await fn(s?.technicianName || "Ion Popescu");
      await reload();
    } finally {
      setSeeding(false);
    }
  }

  async function onSeed() {
    await withTech((name) => seedDemoFisa(name));
  }

  async function onDemo(kind: TemplateKind) {
    await withTech((name) => {
      if (kind === "curatenie") return seedDemoCuratenie(name);
      if (kind === "tamplarie") return seedDemoTamplarie(name);
      return seedDemoStoma(name);
    });
  }

  return (
    <AppShell title={t("fise.title")}>
      <div className="space-y-3 mb-6">
        <BigButton href="/fise/nou" variant="primary">
          {t("fise.new")}
        </BigButton>
        <BigButton variant="secondary" onClick={onSeed} disabled={seeding}>
          {t("fise.seed")}
        </BigButton>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-stone-400 dark:text-stone-500 mb-3">
          {t("fise.demosTitle")}
        </h2>
        <div className="space-y-2.5">
          <BigButton
            variant="secondary"
            onClick={() => onDemo("curatenie")}
            disabled={seeding}
          >
            {t("fise.demoCuratenie")}
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={() => onDemo("tamplarie")}
            disabled={seeding}
          >
            {t("fise.demoTamplarie")}
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={() => onDemo("stoma")}
            disabled={seeding}
          >
            {t("fise.demoStoma")}
          </BigButton>
        </div>
      </div>

      {loading ? (
        <p className="text-muted text-center py-10">{t("app.loadingShort")}</p>
      ) : fise.length === 0 ? (
        <div className="qf-card text-center py-12 px-6 text-muted">
          <p className="font-medium text-foreground">{t("fise.emptyTitle")}</p>
          <p className="text-sm mt-1.5 leading-relaxed">{t("fise.emptyDesc")}</p>
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
                    {f.templateKind && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                        {t(`fise.badge.${f.templateKind}`)}
                      </span>
                    )}
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
    </AppShell>
  );
}
