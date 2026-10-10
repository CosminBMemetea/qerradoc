import type { Metadata } from "next";
import Link from "next/link";
import "./flota.css";
import { Nav, Prefs } from "@/components/flota/Shell";
import { t } from "@/lib/flota/i18n";
import { getLocale, getTheme } from "@/lib/flota/i18n/server";

export const metadata: Metadata = { title: "Querra Flotă — demo", description: "Fleet demo (simulated data)" };

export default function FlotaLayout({ children }: { children: React.ReactNode }) {
  const loc = getLocale();
  const theme = getTheme();
  const nav = [
    { href: "/flota", label: t(loc, "nav.dashboard"), icon: "📊" },
    { href: "/flota/harta", label: t(loc, "nav.map"), icon: "🗺️" },
    { href: "/flota/alerte", label: t(loc, "nav.alerts"), icon: "🚨" },
    { href: "/flota/import", label: t(loc, "nav.import"), icon: "⛽" },
    { href: "/flota/raport", label: t(loc, "nav.report"), icon: "📬" },
    { href: "/flota/sofer", label: t(loc, "nav.driver"), icon: "🚚" },
    { href: "/flota/preturi", label: t(loc, "nav.pricing"), icon: "💶" },
    { href: "/flota/despre", label: t(loc, "nav.sources"), icon: "ℹ️" },
  ];
  return (
    <div lang={loc} className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
        <div className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 text-amber-950 text-center text-xs font-semibold py-1 px-2 tracking-wide" role="note">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mr-2 align-middle animate-pulse" />{t(loc, "banner.demo")}<span className="hidden sm:inline font-normal"> · {t(loc, "banner.detail")}</span>
        </div>
        <header className="sticky top-0 z-[1000] bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 pt-3 pb-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Link href="/flota" className="flex items-center gap-2 font-bold text-lg"><span className="grid place-items-center w-8 h-8 rounded-xl bg-white/15">Q</span>{t(loc, "app.name")}</Link>
              <Prefs locale={loc} theme={theme} labels={{ language: t(loc, "ui.language"), theme: t(loc, "ui.theme"), light: t(loc, "ui.light"), dark: t(loc, "ui.dark") }} />
            </div>
            <Nav items={nav} />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
