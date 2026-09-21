"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { listFise, getSession } from "@/lib/db";
import { seedDemoFisa } from "@/lib/seed";
import type { Fisa } from "@/lib/types";

export default function FiseListPage() {
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
    <AppShell title="Fișele mele">
      <div className="space-y-3 mb-6">
        <BigButton href="/fise/nou" variant="primary">
          Fișă nouă
        </BigButton>
        <BigButton variant="secondary" onClick={onSeed}>
          Încarcă fișă demo
        </BigButton>
      </div>

      {loading ? (
        <p className="text-stone-500 text-center py-10">Se încarcă…</p>
      ) : fise.length === 0 ? (
        <div className="qf-card text-center py-12 px-6 text-stone-500">
          <p className="font-medium text-stone-800">Nicio fișă încă</p>
          <p className="text-sm mt-1.5 leading-relaxed">
            Creează una din text, dictare sau fotografie.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {fise.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fise/${f.id}`}
                className="block qf-card p-4 active:bg-stone-50 transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-stone-900 truncate">
                      {f.nrFisa || "Fără nr."}
                      <span className="text-stone-400 font-normal"> · </span>
                      <span className="text-indigo-700 font-medium">
                        {f.tip}
                      </span>
                    </div>
                    <div className="text-sm text-stone-700 truncate mt-0.5">
                      {f.client || "Client necunoscut"}
                    </div>
                    <div className="text-xs text-stone-400 truncate mt-0.5">
                      {f.modelUtilaj || "—"} · {f.serie || "fără serie"}
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 whitespace-nowrap pt-0.5">
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
