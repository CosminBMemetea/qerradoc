"use client";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="block mb-4">
      <span className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
        {label}
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
