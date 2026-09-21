"use client";

import type { Fisa, TipFisa } from "@/lib/types";
import { TIPURI } from "@/lib/types";
import { Field, inputCls, textareaCls } from "./Field";
import DictateButton from "./DictateButton";

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

  const appendField = (key: "reclamatie" | "observatii", text: string) => {
    const cur = (fisa[key] || "").trim();
    set(key, cur ? `${cur} ${text}` : text);
  };

  return (
    <div className="space-y-1">
      <div className="qf-card p-3.5 mb-4 text-sm text-amber-950 bg-amber-50/90 border-amber-200/80">
        Verifică și editează toate câmpurile înainte de salvare. Revizia
        manuală este obligatorie.
      </div>

      <Field label="Tip fișă">
        <div className="grid grid-cols-2 gap-2">
          {TIPURI.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("tip", t as TipFisa)}
              className={`min-h-[48px] rounded-xl border px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fisa.tip === t
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-white border-stone-200 text-stone-800 active:bg-stone-50"
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
              className={`flex-1 min-h-[48px] rounded-xl border font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fisa.deplasareDaNu === v
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-white border-stone-200 active:bg-stone-50"
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
        <div className="mt-2">
          <DictateButton
            append
            onResult={(t) => appendField("reclamatie", t)}
          />
        </div>
      </Field>

      {fisa.photoDataUrl && (
        <div className="rounded-2xl overflow-hidden border border-stone-200 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fisa.photoDataUrl}
            alt="Foto utilaj"
            className="w-full max-h-48 object-contain bg-stone-50"
          />
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold text-stone-800 mb-2 text-sm">
          Piese și materiale
        </h3>
        <div className="space-y-3">
          {fisa.piese.slice(0, 15).map((p, idx) => (
            <div key={p.nr} className="qf-card p-3">
              <div className="text-xs font-medium text-stone-400 mb-1.5">
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

      <div className="grid grid-cols-1 gap-1">
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
        <div className="mt-2">
          <DictateButton
            append
            onResult={(t) => appendField("observatii", t)}
          />
        </div>
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
