"use client";

import { useEffect, useRef, useState } from "react";

export function Field({
  label,
  children,
  hint,
  info,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  info?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="block mb-4">
      <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
        {label}
        {info && (
          <span className="relative inline-flex" ref={wrapRef}>
            <button
              type="button"
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none shrink-0 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              aria-label={info}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              i
            </button>
            {open && (
              <span
                role="tooltip"
                className="absolute left-0 top-full mt-1.5 z-20 w-56 max-w-[min(14rem,70vw)] rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-normal leading-snug px-2.5 py-2 shadow-lg"
              >
                {info}
              </span>
            )}
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span className="block text-xs text-stone-400 dark:text-stone-500 mt-1">
          {hint}
        </span>
      )}
    </div>
  );
}

export const inputCls =
  "w-full min-h-[48px] px-3.5 py-2.5 text-base rounded-xl border border-border bg-card text-foreground placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition";

export const textareaCls =
  "w-full min-h-[96px] px-3.5 py-2.5 text-base rounded-xl border border-border bg-card text-foreground placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition resize-y";
