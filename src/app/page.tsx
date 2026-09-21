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
    <div className="min-h-dvh flex items-center justify-center bg-blue-700 text-white">
      <p className="text-lg font-bold">Se încarcă Querra Fișă…</p>
    </div>
  );
}
