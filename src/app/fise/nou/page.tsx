"use client";

import AppShell from "@/components/AppShell";
import BigButton from "@/components/BigButton";

export default function NewFisaChooser() {
  return (
    <AppShell title="Fișă nouă" backHref="/fise">
      <p className="text-slate-600 mb-6 text-center">
        Cum vrei să începi? După completare automată vei verifica obligatoriu
        formularul.
      </p>
      <div className="space-y-4">
        <BigButton href="/fise/nou/text" className="!min-h-[88px] !text-lg">
          📝 Din text (WhatsApp)
        </BigButton>
        <BigButton
          href="/fise/nou/foto"
          variant="secondary"
          className="!min-h-[88px] !text-lg"
        >
          📷 Din fotografie
        </BigButton>
      </div>
    </AppShell>
  );
}
