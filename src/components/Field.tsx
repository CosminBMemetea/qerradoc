"use client";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-semibold text-slate-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full min-h-[48px] px-3 py-2 text-base rounded-xl border-2 border-slate-300 bg-white focus:border-blue-500 focus:outline-none";

export const textareaCls =
  "w-full min-h-[96px] px-3 py-2 text-base rounded-xl border-2 border-slate-300 bg-white focus:border-blue-500 focus:outline-none";
