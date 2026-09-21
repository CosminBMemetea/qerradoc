"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export default function NewFisaChooser() {
  const { t } = useI18n();
  const cards = [
    {
      href: "/fise/nou/text?dictate=1",
      title: t("new.dictateTitle"),
      desc: t("new.dictateDesc"),
      primary: true,
    },
    {
      href: "/fise/nou/text",
      title: t("new.textTitle"),
      desc: t("new.textDesc"),
      primary: false,
    },
    {
      href: "/fise/nou/foto",
      title: t("new.photoTitle"),
      desc: t("new.photoDesc"),
      primary: false,
    },
  ];

  return (
    <AppShell title={t("new.title")} backHref="/fise">
      <p className="text-muted mb-6 text-[15px] leading-relaxed text-center">
        {t("new.intro")}
      </p>
      <div className="space-y-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`block rounded-2xl border p-5 min-h-[88px] transition active:scale-[0.99] ${
              c.primary
                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                : "bg-card text-foreground border-border shadow-sm active:bg-stone-50 dark:active:bg-stone-800"
            }`}
          >
            <div
              className={`text-lg font-semibold tracking-tight ${
                c.primary ? "text-white" : "text-foreground"
              }`}
            >
              {c.title}
            </div>
            <p
              className={`text-sm mt-1 leading-relaxed ${
                c.primary ? "text-indigo-100" : "text-muted"
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
