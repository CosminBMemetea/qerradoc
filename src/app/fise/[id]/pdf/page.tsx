"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { getFisa, getSettings } from "@/lib/db";
import { generateFisaPdf, downloadBlob, sharePdf } from "@/lib/pdf";
import type { Fisa, FirmSettings } from "@/lib/types";

export default function PdfPage() {
  const params = useParams();
  const id = String(params.id);
  const [fisa, setFisa] = useState<Fisa | null>(null);
  const [settings, setSettings] = useState<FirmSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([getFisa(id), getSettings()]).then(([f, s]) => {
      setFisa(f || null);
      setSettings(s);
    });
  }, [id]);

  async function makeBlob() {
    if (!fisa || !settings) throw new Error("missing");
    return generateFisaPdf(fisa, settings);
  }

  async function onDownload() {
    setBusy(true);
    setMsg("");
    try {
      const blob = await makeBlob();
      const name = `Fisa_${fisa!.nrFisa || fisa!.id.slice(0, 8)}.pdf`;
      downloadBlob(blob, name);
      setMsg("PDF descărcat.");
    } catch {
      setMsg("Eroare la generarea PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    setMsg("");
    try {
      const blob = await makeBlob();
      const name = `Fisa_${fisa!.nrFisa || fisa!.id.slice(0, 8)}.pdf`;
      const shared = await sharePdf(blob, name);
      setMsg(shared ? "Partajat." : "PDF descărcat (share indisponibil).");
    } catch {
      setMsg("Eroare la partajare.");
    } finally {
      setBusy(false);
    }
  }

  if (!fisa || !settings) {
    return (
      <AppShell title="PDF" backHref={`/fise/${id}`}>
        <p className="text-center py-10 text-slate-500">Se încarcă…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="PDF fișă" backHref={`/fise/${id}`}>
      {!fisa.reviewed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-sm mb-4 text-amber-900 font-medium">
          ⚠️ Fișa nu a fost încă salvată după revizie. Poți genera PDF, dar
          recomandăm să salvezi mai întâi din ecranul de editare.
        </div>
      )}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-4">
        <p className="text-xs font-bold text-slate-500 uppercase mb-1">
          Previzualizare sumar
        </p>
        <h2 className="text-lg font-bold text-blue-800">
          {settings.companyName}
        </h2>
        <p className="font-semibold mt-2">
          Fișă de {fisa.tip} · Nr. {fisa.nrFisa || "—"}
        </p>
        <dl className="mt-3 space-y-1 text-sm">
          <div>
            <span className="text-slate-500">Client: </span>
            {fisa.client || "—"}
          </div>
          <div>
            <span className="text-slate-500">Locație: </span>
            {fisa.locatie || "—"}
          </div>
          <div>
            <span className="text-slate-500">Utilaj: </span>
            {fisa.modelUtilaj || "—"} / {fisa.serie || "—"}
          </div>
          <div>
            <span className="text-slate-500">Manoperă: </span>
            {fisa.manoperaOre || "—"} h · Deplasare: {fisa.deplasareKm || "—"}{" "}
            km ({fisa.deplasareDaNu || "—"})
          </div>
          <div>
            <span className="text-slate-500">Reclamație: </span>
            {fisa.reclamatie || "—"}
          </div>
          <div>
            <span className="text-slate-500">Piese: </span>
            {fisa.piese.filter((p) => p.denumire).length} linii
          </div>
          {fisa.photoDataUrl && (
            <div className="pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fisa.photoDataUrl}
                alt="Foto"
                className="w-full max-h-40 object-contain rounded-lg bg-slate-50"
              />
            </div>
          )}
        </dl>
      </div>

      <div className="space-y-3">
        <BigButton onClick={onDownload} disabled={busy}>
          ⬇️ Descarcă PDF
        </BigButton>
        <BigButton variant="secondary" onClick={onShare} disabled={busy}>
          📤 Partajează PDF
        </BigButton>
      </div>
      {msg && (
        <p className="text-center text-sm font-medium text-emerald-700 mt-3">
          {msg}
        </p>
      )}
    </AppShell>
  );
}
