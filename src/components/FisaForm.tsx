"use client";

import type { Fisa, TipFisa } from "@/lib/types";
import { TIPURI } from "@/lib/types";
import { Field, inputCls, textareaCls } from "./Field";

export default function FisaForm({
  fisa,
  onChange,
}: {
  fisa: Fisa;
  onChange: (f: Fisa) => void;
}) {
  const set = <K extends keyof Fisa>(key: K, value: Fisa[K]) =>
    onChange({ ...fisa, [key]: value });

  const setPiesa = (
    idx: number,
    key: "denumire" | "cod" | "cantitate" | "pretEur",
    value: string
  ) => {
    const piese = fisa.piese.map((p, i) =>
      i === idx ? { ...p, [key]: value } : p
    );
    onChange({ ...fisa, piese });
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-sm font-medium text-amber-900">
        ⚠️ Verifică și editează toate câmpurile înainte de salvare. Revizia
        manuală este obligatorie.
      </div>

      <Field label="Tip fișă">
        <div className="grid grid-cols-2 gap-2">
          {TIPURI.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("tip", t as TipFisa)}
              className={`min-h-[48px] rounded-xl border-2 px-2 text-sm font-bold ${
                fisa.tip === t
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-white border-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Nr. fișă">
        <input
          className={inputCls}
          value={fisa.nrFisa}
          onChange={(e) => set("nrFisa", e.target.value)}
          placeholder="ex. 2026-0042"
        />
      </Field>

      <Field label="Proprietar">
        <input
          className={inputCls}
          value={fisa.proprietar}
          onChange={(e) => set("proprietar", e.target.value)}
        />
      </Field>

      <Field label="Client">
        <input
          className={inputCls}
          value={fisa.client}
          onChange={(e) => set("client", e.target.value)}
        />
      </Field>

      <Field label="Locație">
        <input
          className={inputCls}
          value={fisa.locatie}
          onChange={(e) => set("locatie", e.target.value)}
        />
      </Field>

      <Field label="Model utilaj">
        <input
          className={inputCls}
          value={fisa.modelUtilaj}
          onChange={(e) => set("modelUtilaj", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Serie">
          <input
            className={inputCls}
            value={fisa.serie}
            onChange={(e) => set("serie", e.target.value)}
          />
        </Field>
        <Field label="Ore funcționare">
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.oreFunctionare}
            onChange={(e) => set("oreFunctionare", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Manoperă (ore)">
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.manoperaOre}
            onChange={(e) => set("manoperaOre", e.target.value)}
          />
        </Field>
        <Field label="Deplasare km">
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.deplasareKm}
            onChange={(e) => set("deplasareKm", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Deplasare DA / NU">
        <div className="flex gap-2">
          {(["DA", "NU"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("deplasareDaNu", v)}
              className={`flex-1 min-h-[48px] rounded-xl border-2 font-bold ${
                fisa.deplasareDaNu === v
                  ? "bg-blue-600 text-white border-blue-700"
                  : "bg-white border-slate-300"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Reclamație / solicitare client">
        <textarea
          className={textareaCls}
          value={fisa.reclamatie}
          onChange={(e) => set("reclamatie", e.target.value)}
        />
      </Field>

      {fisa.photoDataUrl && (
        <div className="rounded-xl overflow-hidden border-2 border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fisa.photoDataUrl}
            alt="Foto utilaj"
            className="w-full max-h-48 object-contain bg-slate-100"
          />
        </div>
      )}

      <div>
        <h3 className="font-bold text-slate-800 mb-2">Piese și materiale</h3>
        <div className="space-y-3">
          {fisa.piese.slice(0, 15).map((p, idx) => (
            <div
              key={p.nr}
              className="bg-white border border-slate-200 rounded-xl p-3"
            >
              <div className="text-xs font-bold text-slate-500 mb-1">
                Nr. {p.nr}
              </div>
              <input
                className={`${inputCls} mb-2`}
                placeholder="Denumire"
                value={p.denumire}
                onChange={(e) => setPiesa(idx, "denumire", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={inputCls}
                  placeholder="Cod"
                  value={p.cod}
                  onChange={(e) => setPiesa(idx, "cod", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Cant."
                  inputMode="decimal"
                  value={p.cantitate}
                  onChange={(e) => setPiesa(idx, "cantitate", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Preț €"
                  inputMode="decimal"
                  value={p.pretEur}
                  onChange={(e) => setPiesa(idx, "pretEur", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Field label="Data anunțării defecțiunii">
          <input
            type="date"
            className={inputCls}
            value={fisa.dataAnuntarii}
            onChange={(e) => set("dataAnuntarii", e.target.value)}
          />
        </Field>
        <Field label="Data intervenției tehnice">
          <input
            type="date"
            className={inputCls}
            value={fisa.dataInterventiei}
            onChange={(e) => set("dataInterventiei", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Observații">
        <textarea
          className={textareaCls}
          value={fisa.observatii}
          onChange={(e) => set("observatii", e.target.value)}
        />
      </Field>

      <Field label="Motive înlocuire piese">
        <textarea
          className={textareaCls}
          value={fisa.motiveInlocuire}
          onChange={(e) => set("motiveInlocuire", e.target.value)}
        />
      </Field>

      <Field label="Semnătură client (nume)">
        <input
          className={inputCls}
          value={fisa.semnaturaClient}
          onChange={(e) => set("semnaturaClient", e.target.value)}
          placeholder="Numele persoanei care recepționează"
        />
      </Field>

      <Field label="Semnătură tehnician (nume)">
        <input
          className={inputCls}
          value={fisa.semnaturaTehnician}
          onChange={(e) => set("semnaturaTehnician", e.target.value)}
        />
      </Field>
    </div>
  );
}
