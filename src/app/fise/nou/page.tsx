"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";

export default function NewFisaChooser() {
  const cards = [
    {
      href: "/fise/nou/text?dictate=1",
      title: "Dictează fișa",
      desc: "Vorbește — textul se completează automat, apoi revizie.",
      primary: true,
    },
    {
      href: "/fise/nou/text",
      title: "Din text",
      desc: "Lipește mesaj WhatsApp sau notițe.",
      primary: false,
    },
    {
      href: "/fise/nou/foto",
      title: "Din fotografie",
      desc: "Capturează utilajul și completează din model.",
      primary: false,
    },
  ];

  return (
    <AppShell title="Fișă nouă" backHref="/fise">
      <p className="text-stone-500 mb-6 text-[15px] leading-relaxed text-center">
        Alege cum începi. După completare automată verifici obligatoriu
        formularul.
      </p>
      <div className="space-y-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`block rounded-2xl border p-5 min-h-[88px] transition active:scale-[0.99] ${
              c.primary
                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                : "bg-white text-stone-900 border-stone-200 shadow-sm active:bg-stone-50"
            }`}
          >
            <div
              className={`text-lg font-semibold tracking-tight ${
                c.primary ? "text-white" : "text-stone-900"
              }`}
            >
              {c.title}
            </div>
            <p
              className={`text-sm mt-1 leading-relaxed ${
                c.primary ? "text-indigo-100" : "text-stone-500"
              }`}
            >
              {c.desc}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
