"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/flota/i18n";

const setCookie = (k: string, v: string) => { document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`; };

export function Nav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flota-scroll flex gap-1 overflow-x-auto -mx-1 px-1 pb-1">
      {items.map((n) => {
        const active = n.href === "/flota" ? path === "/flota" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active ? "bg-white text-blue-900 shadow-sm" : "text-blue-100 hover:bg-white/10"}`}>
            <span aria-hidden className="mr-1">{n.icon}</span>{n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Prefs({ locale, theme, labels }: { locale: Locale; theme: "light" | "dark"; labels: { language: string; theme: string; light: string; dark: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <div role="group" aria-label={labels.language} className="flex rounded-full bg-white/10 p-0.5">
        {LOCALES.map((l) => (
          <button key={l} onClick={() => { setCookie(LOCALE_COOKIE, l); start(() => router.refresh()); }} aria-pressed={l === locale}
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase transition ${l === locale ? "bg-white text-blue-900" : "text-blue-100 hover:bg-white/10"}`}>{l}</button>
        ))}
      </div>
      <button aria-label={labels.theme} title={theme === "dark" ? labels.light : labels.dark}
        onClick={() => { setCookie("flota-theme", theme === "dark" ? "light" : "dark"); start(() => router.refresh()); }}
        className="rounded-full bg-white/10 hover:bg-white/20 w-8 h-8 grid place-items-center text-sm">{theme === "dark" ? "☀️" : "🌙"}</button>
    </div>
  );
}
