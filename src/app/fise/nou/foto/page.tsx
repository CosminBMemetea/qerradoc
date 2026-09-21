"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";
import { emptyFisa } from "@/lib/types";
import { demoFillFromPhoto } from "@/lib/parse-text";
import { saveFisa, getSession } from "@/lib/db";

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
      const session = await getSession();
      const year = new Date().getFullYear();
      let partial = {};
      if (mode === "model" || mode === "ocr") {
        partial = demoFillFromPhoto(filename);
      }
      const fisa = emptyFisa({
        ...partial,
        photoDataUrl: preview || undefined,
        nrFisa: `${year}-${String(Date.now()).slice(-4)}`,
        semnaturaTehnician: session?.technicianName || "",
        reviewed: false,
        observatii:
          mode === "ocr"
            ? "Completat prin Simulează OCR (demo offline)."
            : mode === "model"
              ? "Completat din model pe baza fotografiei (fără OCR API)."
              : "",
      });
      await saveFisa(fisa);
      router.push(`/fise/${fisa.id}?review=1`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Din fotografie" backHref="/fise/nou">
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
        Alege / captura foto
      </BigButton>

      {preview ? (
        <div className="rounded-2xl overflow-hidden border border-stone-200 mb-4 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Previzualizare"
            className="w-full max-h-64 object-contain"
          />
          <p className="text-xs text-stone-400 p-2.5 truncate">{filename}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-400 mb-4 text-sm">
          Nicio imagine selectată
        </div>
      )}

      <div className="space-y-3">
        <BigButton onClick={() => create("model")} disabled={!preview || busy}>
          Completează din model → Revizie
        </BigButton>
        <BigButton
          variant="success"
          onClick={() => create("ocr")}
          disabled={!preview || busy}
        >
          Simulează OCR (demo offline)
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => create("empty")}
          disabled={!preview || busy}
        >
          Continuă doar cu foto (formular gol)
        </BigButton>
      </div>
      <p className="text-xs text-stone-400 mt-5 leading-relaxed">
        v1: fără API OCR. Foto se salvează pe fișă și apare în PDF. „Simulează
        OCR” umple date demo pentru prezentări pe telefon.
      </p>
    </AppShell>
  );
}
