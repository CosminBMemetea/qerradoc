"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import FisaForm from "@/components/FisaForm";
import { getFisa, saveFisa, deleteFisa } from "@/lib/db";
import type { Fisa } from "@/lib/types";

function EditInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = String(params.id);
  const mustReview = search.get("review") === "1";
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getFisa(id).then((f) => {
      if (!f) {
        setErr("Fișa nu a fost găsită.");
        return;
      }
      setFisa(f);
    });
  }, [id]);

  async function onSave() {
    if (!fisa) return;
    const next = { ...fisa, reviewed: true };
    await saveFisa(next);
    setFisa(next);
    setSaved(true);
  }

  async function onDelete() {
    if (!confirm("Ștergi această fișă?")) return;
    await deleteFisa(id);
    router.replace("/fise");
  }

  if (err) {
    return (
      <AppShell title="Eroare" backHref="/fise">
        <p className="text-red-600">{err}</p>
      </AppShell>
    );
  }

  if (!fisa) {
    return (
      <AppShell title="Fișă" backHref="/fise">
        <p className="text-center text-stone-500 py-10">Se încarcă…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={
        mustReview && !fisa.reviewed
          ? "Revizie obligatorie"
          : `Fișă ${fisa.nrFisa || ""}`
      }
      backHref="/fise"
    >
      <FisaForm fisa={fisa} onChange={setFisa} />

      <div className="sticky bottom-20 mt-6 space-y-3 bg-[#F7F7F5]/95 backdrop-blur-sm pt-3 pb-2 -mx-1 px-1">
        {saved && (
          <p className="text-center text-teal-800 font-medium text-sm">
            Salvat local
          </p>
        )}
        <BigButton onClick={onSave} variant="success">
          Salvează fișa
        </BigButton>
        <BigButton
          href={`/fise/${fisa.id}/pdf`}
          disabled={!fisa.reviewed && mustReview}
          variant="primary"
        >
          PDF — previzualizare / descărcare
        </BigButton>
        {!fisa.reviewed && mustReview && (
          <p className="text-xs text-amber-900 text-center">
            Salvează mai întâi după revizie ca să deblochezi PDF-ul.
          </p>
        )}
        <BigButton variant="danger" onClick={onDelete}>
          Șterge fișa
        </BigButton>
      </div>
    </AppShell>
  );
}

export default function EditFisaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[#F7F7F5] text-stone-500">
          Se încarcă…
        </div>
      }
    >
      <EditInner />
    </Suspense>
  );
}
