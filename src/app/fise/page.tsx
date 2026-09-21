"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { listFise, getSession } from "@/lib/db";
import { seedDemoFisa } from "@/lib/seed";
import type { Fisa } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export default function FiseListPage() {
  const { t } = useI18n();
  const [fise, setFise] = useState<Fisa[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const list = await listFise();
    setFise(list);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSeed() {
    const s = await getSession();
    await seedDemoFisa(s?.technicianName || "Ion Popescu");
    await reload();
  }

  return (
    <AppShell title={t("fise.title")}>
      <div className="space-y-3 mb-6">
        <BigButton href="/fise/nou" variant="primary">
          {t("fise.new")}
        </BigButton>
        <BigButton variant="secondary" onClick={onSeed}>
          {t("fise.seed")}
        </BigButton>
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
