"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useI18n, type Locale } from "@/lib/i18n";
import { inputCls } from "./Field";

/**
 * In-app date picker, localized to the current UI language.
 *
 * Why not <input type="date">: the native picker (iOS/macOS Safari, Chrome)
 * always renders in the browser/OS locale and ignores the `lang` attribute,
 * so the calendar showed English even with the app in RO/PL.
 *
 * Value format is unchanged: "YYYY-MM-DD" (or "" when empty).
 */

type YMD = { y: number; m: number; d: number }; // m: 0-11

function parseIso(v: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = ({ y, m, d }: YMD) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

function todayYmd(): YMD {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
}

function addDays(a: YMD, delta: number): YMD {
  const dt = new Date(a.y, a.m, a.d + delta);
  return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
}

function addMonths(a: YMD, delta: number): YMD {
  const total = a.y * 12 + a.m + delta;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  return { y, m, d: Math.min(a.d, daysIn(y, m)) };
}

const same = (a: YMD | null, b: YMD | null) =>
  !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;

/** Field display: ro/pl dd.mm.yyyy, en dd/mm/yyyy */
export function formatDateForLocale(v: string, locale: Locale): string {
  const p = parseIso(v);
  if (!p) return "";
  const sep = locale === "en" ? "/" : ".";
  return `${pad(p.d)}${sep}${pad(p.m + 1)}${sep}${p.y}`;
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

function useCalendarNames(bcp47: string) {
  return useMemo(() => {
    const monthFmt = new Intl.DateTimeFormat(bcp47, {
      month: "long",
      year: "numeric",
    });
    const wdFmt = new Intl.DateTimeFormat(bcp47, { weekday: "short" });
    const fullFmt = new Intl.DateTimeFormat(bcp47, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // 2024-01-01 was a Monday → Monday-first week (ro/pl/en-GB)
    const weekdays = Array.from({ length: 7 }, (_, i) =>
      cap(wdFmt.format(new Date(2024, 0, 1 + i)).replace(/\.$/, ""))
    );
    return {
      monthLabel: (y: number, m: number) =>
        cap(monthFmt.format(new Date(y, m, 1))),
      fullLabel: (a: YMD) => fullFmt.format(new Date(a.y, a.m, a.d)),
      weekdays,
    };
  }, [bcp47]);
}

export default function DatePicker({
  value,
  onChange,
  label,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Accessible name for the trigger / dialog */
  label: string;
  id?: string;
}) {
  const { t, locale, dateLang } = useI18n();
  const names = useCalendarNames(dateLang);
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<YMD>(() => selected ?? todayYmd());
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const openPicker = () => {
    setFocus(parseIso(value) ?? todayYmd());
    setOpen(true);
  };

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const pick = (v: string) => {
    onChange(v);
    close();
  };

  // Lock background scroll + Escape to close while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Keep DOM focus on the roving day
  useEffect(() => {
    if (!open) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-iso="${toIso(focus)}"]`
    );
    el?.focus({ preventScroll: true });
  }, [open, focus]);

  const onGridKey = (e: ReactKeyboardEvent) => {
    let next: YMD | null = null;
    const dow = (new Date(focus.y, focus.m, focus.d).getDay() + 6) % 7; // Mon=0
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(focus, -1);
        break;
      case "ArrowRight":
        next = addDays(focus, 1);
        break;
      case "ArrowUp":
        next = addDays(focus, -7);
        break;
      case "ArrowDown":
        next = addDays(focus, 7);
        break;
      case "Home":
        next = addDays(focus, -dow);
        break;
      case "End":
        next = addDays(focus, 6 - dow);
        break;
      case "PageUp":
        next = addMonths(focus, e.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(focus, e.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    setFocus(next);
  };

  // 6×7 grid, Monday first
  const cells = useMemo(() => {
    const first = new Date(focus.y, focus.m, 1);
    const lead = (first.getDay() + 6) % 7;
    const start = addDays({ y: focus.y, m: focus.m, d: 1 }, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [focus.y, focus.m]);

  const today = todayYmd();
  const display = formatDateForLocale(value, locale);
  const placeholder = t("date.placeholder");

  const navBtn =
    "inline-flex items-center justify-center w-11 h-11 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition";

  const sheet = open ? (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={() => close()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full sm:w-[360px] bg-card text-foreground border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl px-4 pt-3"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        data-testid="date-picker-dialog"
      >
        <div
          className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-700 sm:hidden"
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-muted text-center mb-1">
          {label}
        </p>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            className={navBtn}
            aria-label={t("date.prevMonth")}
            onClick={() => setFocus((f) => addMonths(f, -1))}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h2
            id={titleId}
            className="text-base font-semibold tracking-tight"
            aria-live="polite"
          >
            {names.monthLabel(focus.y, focus.m)}
          </h2>
          <button
            type="button"
            className={navBtn}
            aria-label={t("date.nextMonth")}
            onClick={() => setFocus((f) => addMonths(f, 1))}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div role="grid" aria-labelledby={titleId} ref={gridRef} onKeyDown={onGridKey}>
          <div role="row" className="grid grid-cols-7 mb-1">
            {names.weekdays.map((w) => (
              <span
                key={w}
                role="columnheader"
                className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted py-1"
              >
                {w}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, r) => (
            <div role="row" key={r} className="grid grid-cols-7 gap-0.5">
              {cells.slice(r * 7, r * 7 + 7).map((c) => {
                const iso = toIso(c);
                const inMonth = c.m === focus.m;
                const isSel = same(c, selected);
                const isToday = same(c, today);
                const isFocus = same(c, focus);
                return (
                  <span role="gridcell" key={iso} aria-selected={isSel} className="flex justify-center">
                    <button
                      type="button"
                      data-iso={iso}
                      tabIndex={isFocus ? 0 : -1}
                      aria-label={names.fullLabel(c)}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => pick(iso)}
                      onFocus={() => {
                        if (!isFocus) setFocus(c);
                      }}
                      className={[
                        "w-11 h-11 rounded-xl text-[15px] tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card",
                        isSel
                          ? "bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700"
                          : isToday
                            ? "text-indigo-700 dark:text-indigo-300 font-semibold ring-1 ring-inset ring-indigo-400/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                            : inMonth
                              ? "text-foreground hover:bg-stone-100 dark:hover:bg-stone-800"
                              : "text-stone-300 dark:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800",
                      ].join(" ")}
                    >
                      {c.d}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => pick("")}
            className="min-h-[44px] rounded-xl border border-border text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition"
          >
            {t("date.clear")}
          </button>
          <button
            type="button"
            onClick={() => pick(toIso(todayYmd()))}
            className="min-h-[44px] rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-200 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition"
          >
            {t("date.today")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${display || placeholder}`}
        onClick={openPicker}
        className={`${inputCls} flex items-center justify-between text-left`}
        data-testid="date-picker-trigger"
      >
        <span className={display ? "tabular-nums" : "text-stone-400 dark:text-stone-500"}>
          {display || placeholder}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 dark:text-stone-500 shrink-0" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="3" />
          <path d="M3 9.5h18M8 3v3M16 3v3" />
        </svg>
      </button>
      {mounted && sheet ? createPortal(sheet, document.body) : null}
    </>
  );
}
