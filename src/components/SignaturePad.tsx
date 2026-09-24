"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const PAD_HEIGHT = 140; // CSS px — within 120–160

type Props = {
  value?: string;
  onChange: (dataUrl: string) => void;
  /** Accessible name for the pad */
  ariaLabel?: string;
};

/**
 * Phone-first signature canvas. High-DPI PNG data URLs, transparent bg,
 * dark stroke. Shows saved image until Clear; auto-saves on stroke end.
 */
export default function SignaturePad({ value, onChange, ariaLabel }: Props) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [editing, setEditing] = useState(!value);

  // External clear / empty restore → back to canvas; keep canvas while drawing
  // (auto-save must not flip to image mid multi-stroke signature).
  useEffect(() => {
    if (!value) setEditing(true);
  }, [value]);

  const setupCanvas = useCallback((preserve?: string | null) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const snapshot =
      preserve !== undefined
        ? preserve
        : canvas.width > 0
          ? canvas.toDataURL("image/png")
          : valueRef.current || null;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = Math.max(1, Math.floor(wrap.clientWidth));
    const cssH = PAD_HEIGHT;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    const paintStrokeStyle = () => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1c1917"; // stone-900
      ctx.lineWidth = 2.25;
    };
    paintStrokeStyle();
    if (snapshot && snapshot.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.drawImage(img, 0, 0, cssW, cssH);
        paintStrokeStyle();
      };
      img.src = snapshot;
    }
  }, []);

  useEffect(() => {
    if (!editing) return;
    setupCanvas(valueRef.current || null);
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    let lastW = wrap.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (w === lastW) return;
      lastW = w;
      setupCanvas(); // preserve current canvas pixels
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [editing, setupCanvas]);

  const posFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let hasInk = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        hasInk = true;
        break;
      }
    }
    onChange(hasInk ? canvas.toDataURL("image/png") : "");
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = posFromEvent(e);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = posFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    drawing.current = false;
    last.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    exportPng();
  };

  const onClear = () => {
    onChange("");
    setEditing(true);
    requestAnimationFrame(() => setupCanvas(null));
  };

  const showImage = !!value && !editing;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs text-stone-500 dark:text-stone-400">
          {t("sig.drawTip")}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={!value && editing}
          className="min-h-[40px] px-3 text-sm font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300 disabled:opacity-40 disabled:pointer-events-none hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          {t("sig.clear")}
        </button>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full rounded-xl border border-stone-200 dark:border-stone-600 bg-white overflow-hidden"
        style={{ height: PAD_HEIGHT }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={ariaLabel || t("sig.draw")}
            className="w-full h-full object-contain bg-white"
          />
        ) : (
          <>
            {!value && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-stone-400 select-none">
                {t("sig.draw")}
              </span>
            )}
            <canvas
              ref={canvasRef}
              aria-label={ariaLabel || t("sig.draw")}
              className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
              style={{ touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </>
        )}
      </div>
    </div>
  );
}
