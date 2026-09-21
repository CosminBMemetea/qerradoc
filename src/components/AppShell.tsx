"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

function IconList({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity={active ? 1 : 0.85}
      />
    </svg>
  );
}

function IconPlus({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity={active ? 1 : 0.85}
      />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={active ? 1 : 0.85}
      />
      <path
        d="M12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity={active ? 1 : 0.85}
      />
    </svg>
  );
}

function IconKey({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="14"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity={active ? 1 : 0.85}
      />
      <path
        d="M10.5 12.5 20 3m0 0h-3.5M20 3v3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.85}
      />
    </svg>
  );
}

export default function AppShell({
  children,
  title,
  showNav = true,
  backHref,
}: {
  children: React.ReactNode;
  title?: string;
  showNav?: boolean;
  backHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [tech, setTech] = useState("");

  useEffect(() => {
    getSession().then((s) => {
      if (!s && pathname !== "/login" && pathname !== "/licenta") {
        router.replace("/login");
      } else if (s) {
        setTech(s.technicianName);
      }
    });
  }, [pathname, router]);

  const nav = [
    { href: "/fise", label: t("nav.fise"), Icon: IconList },
    { href: "/fise/nou", label: t("nav.new"), Icon: IconPlus },
    { href: "/setari", label: t("nav.settings"), Icon: IconSettings },
    { href: "/licenta", label: t("nav.license"), Icon: IconKey },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground max-w-lg mx-auto">
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {backHref && (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-stone-700 dark:text-stone-300 active:bg-stone-100 dark:active:bg-stone-800 text-xl leading-none"
              aria-label={t("nav.back")}
            >
              ←
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold tracking-tight truncate text-foreground">
              {title || t("app.name")}
            </h1>
            {tech && (
              <p className="text-xs text-muted truncate">{tech}</p>
            )}
          </div>
          {showNav && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-border bg-card text-stone-600 dark:text-stone-300 active:bg-stone-50 dark:active:bg-stone-800"
                aria-label={theme === "dark" ? t("settings.themeLight") : t("settings.themeDark")}
                title={theme === "dark" ? t("settings.themeLight") : t("settings.themeDark")}
              >
                {theme === "dark" ? "☀" : "☾"}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-stone-600 dark:text-stone-300 px-3 py-2 rounded-xl border border-border bg-card active:bg-stone-50 dark:active:bg-stone-800 min-h-[40px]"
                onClick={async () => {
                  await clearSession();
                  router.replace("/login");
                }}
              >
                {t("nav.logout")}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-28">{children}</main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
          <div className="max-w-lg mx-auto grid grid-cols-4 px-1">
            {nav.map((n) => {
              const active =
                pathname === n.href ||
                (n.href !== "/fise" && pathname.startsWith(n.href));
              const Icon = n.Icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-[11px] font-medium rounded-xl mx-0.5 transition ${
                    active
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-stone-500 dark:text-stone-400"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 ${
                      active ? "bg-indigo-50 dark:bg-indigo-950/60" : ""
                    }`}
                  >
                    <Icon active={active} />
                  </span>
                  <span
                    className={
                      active
                        ? "border-b-2 border-indigo-600 dark:border-indigo-400 pb-0.5"
                        : "pb-0.5 border-b-2 border-transparent"
                    }
                  >
                    {n.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
