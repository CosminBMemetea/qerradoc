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
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 border border-indigo-700/20 shadow-sm",
  secondary:
    "bg-card text-foreground border border-border hover:border-stone-300 dark:hover:border-stone-600 active:bg-stone-50 dark:active:bg-stone-800 shadow-sm",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-red-700/20 shadow-sm",
  success:
    "bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 border border-teal-800/20 shadow-sm",
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
  const cls = `inline-flex items-center justify-center gap-2 min-h-[52px] px-5 py-3 rounded-2xl text-base font-semibold transition disabled:opacity-45 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900 ${
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
