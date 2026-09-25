"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { emptyFisa } from "@/lib/types";
import { demoFillFromPhoto } from "@/lib/parse-text";
import { saveFisa, getSession, getSettings } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Downscale large images for IndexedDB */
async function compressImage(dataUrl: string, maxW = 1280): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function NewFromPhotoPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFilename(file.name);
    const raw = await readFileAsDataUrl(file);
    const compressed = await compressImage(raw);
    setPreview(compressed);
  }

  async function create(mode: "model" | "ocr" | "empty") {
    if (!preview && mode !== "empty") return;
    setBusy(true);
    try {
      const [session, firm] = await Promise.all([getSession(), getSettings()]);
      const year = new Date().getFullYear();
      let partial = {};
      if (mode === "model" || mode === "ocr") {
        partial = demoFillFromPhoto(filename, locale);
      }
      const contentLocale =
        locale === "en" || locale === "pl" || locale === "ro" ? locale : "ro";
      const fisa = emptyFisa({
        ...(firm.defaultTip ? { tip: firm.defaultTip } : {}),
        ...partial,
        photoDataUrl: preview || undefined,
        nrFisa: `${year}-${String(Date.now()).slice(-4)}`,
        semnaturaTehnician: session?.technicianName || "",
        reviewed: false,
        contentLocale,
        observatii:
          mode === "ocr"
            ? t("photo.obsOcr")
            : mode === "model"
              ? t("photo.obsModel")
              : "",
      });
      await saveFisa(fisa);
      router.push(`/fise/${fisa.id}?review=1`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={t("photo.title")} backHref="/fise/nou">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <BigButton
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        className="!min-h-[72px] mb-4"
      >
        {t("photo.pick")}
      </BigButton>

      {preview ? (
        <div className="rounded-2xl overflow-hidden border border-border mb-4 bg-stone-50 dark:bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={t("photo.preview")}
            className="w-full max-h-64 object-contain"
          />
          <p className="text-xs text-stone-400 dark:text-stone-500 p-2.5 truncate">
            {filename}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-600 p-10 text-center text-stone-400 dark:text-stone-500 mb-4 text-sm">
          {t("photo.none")}
        </div>
      )}

      <div className="space-y-3">
        <BigButton onClick={() => create("model")} disabled={!preview || busy}>
          {t("photo.fromModel")}
        </BigButton>
        <BigButton
          variant="success"
          onClick={() => create("ocr")}
          disabled={!preview || busy}
        >
          {t("photo.ocr")}
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => create("empty")}
          disabled={!preview || busy}
        >
          {t("photo.empty")}
        </BigButton>
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-5 leading-relaxed">
        {t("photo.hint")}
      </p>
    </AppShell>
  );
}
