"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { clearSession, getSession } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

function MenuIcon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41",
  catalog: "M4 5h16M4 12h16M4 19h10",
  backup: "M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  guide: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  license: "M10.5 12.5 20 3m0 0h-3.5M20 3v3.5M8 17.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5z",
  logout: "M15 17l5-5-5-5M20 12H9M12 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6",
};

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (!s && pathname !== "/login" && pathname !== "/licenta") {
        router.replace("/login");
      } else if (s) {
        setTech(s.technicianName);
      }
    });
  }, [pathname, router]);

  const menu = [
    { href: "/setari", label: t("nav.settings"), icon: ICONS.settings },
    { href: "/setari#catalog", label: t("menu.catalog"), icon: ICONS.catalog },
    { href: "/setari#backup", label: t("menu.backup"), icon: ICONS.backup },
    { href: "/ghid", label: t("nav.guide"), icon: ICONS.guide },
    { href: "/licenta", label: t("nav.license"), icon: ICONS.license },
  ];
  const menuItemCls =
    "flex items-center gap-3 w-full min-h-[52px] px-3 rounded-xl text-[15px] font-medium text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-100 dark:active:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 transition";

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
          {!backHref && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/icons/icon-192.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg shrink-0 shadow-sm"
              draggable={false}
            />
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
                onClick={() => setMenuOpen(true)}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-border bg-card text-stone-600 dark:text-stone-300 active:bg-stone-50 dark:active:bg-stone-800"
                aria-label={t("menu.open")}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                data-testid="app-menu-button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-5 pb-12">{children}</main>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t("menu.open")} testId="app-menu">
        <nav className="space-y-1">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={menuItemCls}
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-indigo-600 dark:text-indigo-300">
                <MenuIcon d={m.icon} />
              </span>
              {m.label}
            </Link>
          ))}
          <div className="border-t border-border my-2" />
          <button
            type="button"
            className={`${menuItemCls} !text-red-700 dark:!text-red-300`}
            onClick={async () => {
              setMenuOpen(false);
              await clearSession();
              router.replace("/login");
            }}
          >
            <MenuIcon d={ICONS.logout} />
            {t("nav.logout")}
          </button>
        </nav>
      </Sheet>
    </div>
  );
}
