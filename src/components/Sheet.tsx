"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Mobile-first modal: bottom sheet on phones, centered card on ≥sm.
 * Escape / backdrop close, body scroll lock, focus moves in and back out.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testId?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),[tabindex]:not([tabindex="-1"])'
        );
        const vis = Array.from(items).filter((el) => el.offsetParent !== null);
        if (!vis.length) return;
        const first = vis[0];
        const last = vis[vis.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        "a[href],button:not([disabled])"
      );
      first?.focus({ preventScroll: true });
    });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={() => onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        data-testid={testId}
        className="relative w-full max-w-lg sm:w-[420px] max-h-[88dvh] overflow-y-auto bg-card text-foreground border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl px-4 pt-3"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div
          className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-700 sm:hidden"
          aria-hidden="true"
        />
        {title && (
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-center mb-3">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
