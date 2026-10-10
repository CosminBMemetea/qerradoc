import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Querra Flotă — demo", description: "Demo gestionare flotă camioane (date simulate)" };

const NAV = [
  { href: "/flota", label: "Panou" },
  { href: "/flota/harta", label: "Hartă" },
  { href: "/flota/alerte", label: "Alerte" },
  { href: "/flota/sofer", label: "Șofer" },
  { href: "/flota/despre", label: "Surse date" },
];

export default function FlotaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-amber-400 text-amber-950 text-center text-sm font-bold py-1.5 px-2" role="note">
        DATE DEMO — simulate · niciun camion sau card real
      </div>
      <header className="bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/flota" className="font-bold text-lg">Querra Flotă</Link>
          <nav className="flex gap-1 text-sm overflow-x-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-md hover:bg-blue-800 whitespace-nowrap">{n.label}</Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
