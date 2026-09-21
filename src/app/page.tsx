"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => {
    getSession().then((s) => {
      router.replace(s ? "/fise" : "/login");
    });
  }, [router]);
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background text-muted">
      <p className="text-base font-medium">{t("app.loading")}</p>
    </div>
  );
}
