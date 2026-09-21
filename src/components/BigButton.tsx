"use client";

import Link from "next/link";

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
};

const variants = {
  primary: "bg-blue-600 text-white active:bg-blue-800",
  secondary: "bg-white text-slate-800 border-2 border-slate-300 active:bg-slate-100",
  danger: "bg-red-600 text-white active:bg-red-800",
  success: "bg-emerald-600 text-white active:bg-emerald-800",
};

export default function BigButton({
  children,
  onClick,
  href,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  fullWidth = true,
}: Props) {
  const cls = `inline-flex items-center justify-center gap-2 min-h-[52px] px-5 py-3 rounded-xl text-base font-bold shadow-sm transition disabled:opacity-50 ${
    fullWidth ? "w-full" : ""
  } ${variants[variant]} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
