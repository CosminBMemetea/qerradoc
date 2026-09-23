"use client";

import type { Fisa, TipFisa } from "@/lib/types";
import { TIPURI } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { currencySymbol } from "@/lib/currency";
import { Field, inputCls, textareaCls } from "./Field";
import DictateButton from "./DictateButton";

export default function FisaForm({
  fisa,
  onChange,
}: {
  fisa: Fisa;
  onChange: (f: Fisa) => void;
}) {
  const { t, dateLang, locale } = useI18n();
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
      <div className="qf-card p-3.5 mb-4 text-sm text-amber-950 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/60">
        {t("form.reviewBanner")}
      </div>

      <Field label={t("form.tip")} hint={t("hint.tip")}>
        <div className="grid grid-cols-2 gap-2">
          {TIPURI.map((tip) => (
            <button
              key={tip}
              type="button"
              onClick={() => set("tip", tip as TipFisa)}
              className={`min-h-[48px] rounded-xl border px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fisa.tip === tip
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-card border-border text-foreground active:bg-stone-50 dark:active:bg-stone-800"
              }`}
            >
              {t(`tip.${tip}`)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("form.nrFisa")}>
        <input
          className={inputCls}
          value={fisa.nrFisa}
          onChange={(e) => set("nrFisa", e.target.value)}
          placeholder={t("form.nrPlaceholder")}
        />
      </Field>

      <Field label={t("form.proprietar")}>
        <input
          className={inputCls}
          value={fisa.proprietar}
          onChange={(e) => set("proprietar", e.target.value)}
        />
      </Field>

      <Field label={t("form.client")} hint={t("hint.client")}>
        <input
          className={inputCls}
          value={fisa.client}
          onChange={(e) => set("client", e.target.value)}
        />
      </Field>

      <Field label={t("form.locatie")} hint={t("hint.locatie")}>
        <input
          className={inputCls}
          value={fisa.locatie}
          onChange={(e) => set("locatie", e.target.value)}
        />
      </Field>

      <Field label={t("form.modelUtilaj")} hint={t("hint.modelUtilaj")}>
        <input
          className={inputCls}
          value={fisa.modelUtilaj}
          onChange={(e) => set("modelUtilaj", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.serie")}>
          <input
            className={inputCls}
            value={fisa.serie}
            onChange={(e) => set("serie", e.target.value)}
          />
        </Field>
        <Field label={t("form.oreFunctionare")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.oreFunctionare}
            onChange={(e) => set("oreFunctionare", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.manoperaOre")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.manoperaOre}
            onChange={(e) => set("manoperaOre", e.target.value)}
          />
        </Field>
        <Field label={t("form.deplasareKm")}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={fisa.deplasareKm}
            onChange={(e) => set("deplasareKm", e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("form.deplasareDaNu")}>
        <div className="flex gap-2">
          {(
            [
              { v: "DA" as const, label: t("form.yes") },
              { v: "NU" as const, label: t("form.no") },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => set("deplasareDaNu", v)}
              className={`flex-1 min-h-[48px] rounded-xl border font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                fisa.deplasareDaNu === v
                  ? "bg-indigo-600 text-white border-indigo-700"
                  : "bg-card border-border active:bg-stone-50 dark:active:bg-stone-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("form.reclamatie")} hint={t("hint.reclamatie")}>
        <textarea
          className={textareaCls}
          value={fisa.reclamatie}
          placeholder={t("hint.reclamatie")}
          onChange={(e) => set("reclamatie", e.target.value)}
        />
        <div className="mt-2">
          <DictateButton
            append
            onResult={(txt) => appendField("reclamatie", txt)}
            onAudioNote={(dataUrl) => set("audioNoteDataUrl", dataUrl)}
          />
        </div>
      </Field>

      {fisa.photoDataUrl && (
        <div className="rounded-2xl overflow-hidden border border-border mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fisa.photoDataUrl}
            alt={t("form.photoAlt")}
            className="w-full max-h-48 object-contain bg-stone-50 dark:bg-stone-900"
          />
        </div>
      )}

      {fisa.audioNoteDataUrl && (
        <div className="qf-card p-3 mb-4">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            {t("form.audioNote")}
          </p>
          <audio controls src={fisa.audioNoteDataUrl} className="w-full" />
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold text-foreground mb-1 text-sm">
          {t("form.piese")}
        </h3>
        <p className="text-xs text-stone-400 dark:text-stone-500 mb-2">
          {t("hint.piese")}
        </p>
        <div className="space-y-3">
          {fisa.piese.slice(0, 15).map((p, idx) => (
            <div key={p.nr} className="qf-card p-3">
              <div className="text-xs font-medium text-stone-400 dark:text-stone-500 mb-1.5">
                {t("form.piesaNr")} {p.nr}
              </div>
              <input
                className={`${inputCls} mb-2`}
                placeholder={t("form.denumire")}
                value={p.denumire}
                onChange={(e) => setPiesa(idx, "denumire", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={inputCls}
                  placeholder={t("form.cod")}
                  value={p.cod}
                  onChange={(e) => setPiesa(idx, "cod", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder={t("form.cant")}
                  inputMode="decimal"
                  value={p.cantitate}
                  onChange={(e) => setPiesa(idx, "cantitate", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder={t("form.pret", { currency: currencySymbol(locale) })}
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
        <Field label={t("form.dataAnuntarii")} hint={t("hint.dates")}>
          <input
            type="date"
            lang={dateLang}
            className={inputCls}
            value={fisa.dataAnuntarii}
            onChange={(e) => set("dataAnuntarii", e.target.value)}
          />
        </Field>
        <Field label={t("form.dataInterventiei")}>
          <input
            type="date"
            lang={dateLang}
            className={inputCls}
            value={fisa.dataInterventiei}
            onChange={(e) => set("dataInterventiei", e.target.value)}
          />
        </Field>
      </div>

      <Field label={t("form.observatii")} hint={t("hint.observatii")}>
        <textarea
          className={textareaCls}
          value={fisa.observatii}
          placeholder={t("hint.observatii")}
          onChange={(e) => set("observatii", e.target.value)}
        />
        <div className="mt-2">
          <DictateButton
            append
            onResult={(txt) => appendField("observatii", txt)}
            onAudioNote={(dataUrl) => set("audioNoteDataUrl", dataUrl)}
          />
        </div>
      </Field>

      <Field label={t("form.motiveInlocuire")} hint={t("hint.motiveInlocuire")}>
        <textarea
          className={textareaCls}
          value={fisa.motiveInlocuire}
          placeholder={t("hint.motiveInlocuire")}
          onChange={(e) => set("motiveInlocuire", e.target.value)}
        />
      </Field>

      <Field label={t("form.semnaturaClient")} hint={t("hint.semnaturi")}>
        <input
          className={inputCls}
          value={fisa.semnaturaClient}
          onChange={(e) => set("semnaturaClient", e.target.value)}
          placeholder={t("form.semnaturaClientPh")}
        />
      </Field>

      <Field label={t("form.semnaturaTehnician")} hint={t("hint.semnaturi")}>
        <input
          className={inputCls}
          value={fisa.semnaturaTehnician}
          onChange={(e) => set("semnaturaTehnician", e.target.value)}
        />
      </Field>
    </div>
  );
}
