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
      <div className="space-y-3 mb-4">
        <BigButton href="/fise/nou" variant="primary">
          ➕ Fișă nouă
        </BigButton>
        <BigButton variant="secondary" onClick={onSeed}>
          🌱 Încarcă fișă demo (seed)
        </BigButton>
      </div>

      {loading ? (
        <p className="text-slate-500 text-center py-8">Se încarcă…</p>
      ) : fise.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p className="text-4xl mb-2">📭</p>
          <p className="font-medium">Nicio fișă încă.</p>
          <p className="text-sm mt-1">Creează una din text sau foto.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {fise.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fise/${f.id}`}
                className="block bg-white rounded-xl border-2 border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-blue-800 truncate">
                      {f.nrFisa || "Fără nr."} · {f.tip}
                    </div>
                    <div className="text-sm text-slate-700 truncate">
                      {f.client || "Client necunoscut"}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {f.modelUtilaj || "—"} · {f.serie || "fără serie"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">
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
