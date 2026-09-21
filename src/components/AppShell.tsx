"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "@/lib/db";

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
    { href: "/fise", label: "Fișe", icon: "📋" },
    { href: "/fise/nou", label: "Nou", icon: "➕" },
    { href: "/setari", label: "Setări", icon: "⚙️" },
    { href: "/licenta", label: "Licență", icon: "🔑" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-900 max-w-lg mx-auto">
      <header className="sticky top-0 z-20 bg-blue-700 text-white px-4 py-3 shadow">
        <div className="flex items-center gap-3">
          {backHref && (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="text-2xl leading-none px-2 py-1 rounded-lg active:bg-blue-800"
              aria-label="Înapoi"
            >
              ←
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {title || "Querra Fișă"}
            </h1>
            {tech && (
              <p className="text-xs text-blue-100 truncate">{tech}</p>
            )}
          </div>
          {showNav && (
            <button
              type="button"
              className="text-xs bg-blue-800 px-3 py-2 rounded-lg"
              onClick={async () => {
                await clearSession();
                router.replace("/login");
              }}
            >
              Ieșire
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 safe-bottom">
          <div className="max-w-lg mx-auto grid grid-cols-4">
            {nav.map((n) => {
              const active =
                pathname === n.href ||
                (n.href !== "/fise" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex flex-col items-center py-3 text-xs font-semibold min-h-[56px] justify-center ${
                    active ? "text-blue-700 bg-blue-50" : "text-slate-600"
                  }`}
                >
                  <span className="text-xl">{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
