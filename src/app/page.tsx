"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/db";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    getSession().then((s) => {
      router.replace(s ? "/fise" : "/login");
    });
  }, [router]);
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F7F7F5] text-stone-600">
      <p className="text-base font-medium">Se încarcă Querra Fișă…</p>
    </div>
  );
}
