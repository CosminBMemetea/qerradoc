"use client";

import { useCallback, useRef, useState } from "react";
import { get } from "idb-keyval";
import type { FirmSettings } from "./types";
import {
  getCatalogClients,
  getCatalogEquipment,
  saveCatalogClients,
  saveCatalogEquipment,
  saveSettings,
} from "./db";
import { planPackMerge, validatePilotPack, type PilotPack } from "./pilot-pack";

export const SETTINGS_CHANGED_EVENT = "querra-settings-changed";
export const PACK_ACCEPT = "application/json,.json,.querra.json";

/** Stored settings (null when never saved — no demo placeholder). */
async function storedSettings(): Promise<FirmSettings | null> {
  return (await get<FirmSettings>("firm-settings")) ?? null;
}

export function notifySettingsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

/** Merge a validated pack into this device (settings + catalogs; fișe untouched). */
export async function applyPilotPack(pack: PilotPack) {
  const [settings, clients, equipment] = await Promise.all([
    storedSettings(),
    getCatalogClients(),
    getCatalogEquipment(),
  ]);
  const plan = planPackMerge(pack, {
    settings: settings ?? { companyName: "", cui: "" },
    clients,
    equipment,
  });
  await saveSettings(plan.settings);
  await Promise.all([saveCatalogClients(plan.clients), saveCatalogEquipment(plan.equipment)]);
  notifySettingsChanged();
  return plan;
}

type T = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Validate → localized confirmation → merge. Returns the applied pack or null
 * (cancelled / invalid). `raw` is the already-parsed JSON.
 */
export async function confirmAndApplyPack(raw: unknown, t: T) {
  const v = validatePilotPack(raw);
  if (!v.ok) return { ok: false as const, error: "invalid" as const };
  const p = v.data;
  const ok = window.confirm(
    t("pack.confirm", {
      name: p.pack.name,
      clients: p.clients.length,
      equipment: p.equipment.length,
      techs: p.settings.technicians?.length || 0,
    })
  );
  if (!ok) return { ok: false as const, error: "cancelled" as const };
  const plan = await applyPilotPack(p);
  return { ok: true as const, pack: p, plan };
}

/** File-picker flow used by login, home empty state and Setări. */
export function usePilotPackImport(t: T, onDone?: (pack: PilotPack) => void) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const onFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setBusy(true);
      setMsg(null);
      try {
        let raw: unknown;
        try {
          raw = JSON.parse(await file.text());
        } catch {
          setMsg({ kind: "err", text: t("pack.err") });
          return;
        }
        const res = await confirmAndApplyPack(raw, t);
        if (!res.ok) {
          if (res.error === "invalid") setMsg({ kind: "err", text: t("pack.err") });
          return;
        }
        setMsg({
          kind: "ok",
          text: t("pack.done", {
            name: res.pack.pack.name,
            clients: res.plan.stats.clientsAdded,
            equipment: res.plan.stats.equipmentAdded,
          }),
        });
        onDone?.(res.pack);
      } catch {
        setMsg({ kind: "err", text: t("pack.err") });
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [t, onDone]
  );
  const pick = useCallback(() => fileRef.current?.click(), []);
  return { fileRef, busy, msg, onFile, pick };
}
