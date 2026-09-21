"use client";

import { get, set, del, keys } from "idb-keyval";
import type { Fisa, FirmSettings, LicenseState, Session } from "./types";

const FISA_PREFIX = "fisa:";
const SETTINGS_KEY = "firm-settings";
const LICENSE_KEY = "license";
const SESSION_KEY = "session";

export async function saveFisa(fisa: Fisa): Promise<void> {
  const updated = { ...fisa, updatedAt: new Date().toISOString() };
  await set(FISA_PREFIX + fisa.id, updated);
}

export async function getFisa(id: string): Promise<Fisa | undefined> {
  return get(FISA_PREFIX + id);
}

export async function deleteFisa(id: string): Promise<void> {
  await del(FISA_PREFIX + id);
}

export async function listFise(): Promise<Fisa[]> {
  const allKeys = await keys();
  const fisaKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(FISA_PREFIX)
  );
  const items = await Promise.all(fisaKeys.map((k) => get<Fisa>(k)));
  return items
    .filter((f): f is Fisa => !!f)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSettings(): Promise<FirmSettings> {
  const s = await get<FirmSettings>(SETTINGS_KEY);
  return (
    s || {
      companyName: "UTILAJE PROFESIONALE PENTRU CURATENIE",
      cui: "",
      address: "",
      phone: "",
    }
  );
}

export async function saveSettings(s: FirmSettings): Promise<void> {
  await set(SETTINGS_KEY, s);
}

export async function getLicense(): Promise<LicenseState> {
  const l = await get<LicenseState>(LICENSE_KEY);
  return (
    l || {
      activated: false,
      licenseKey: "",
      maxUsers: 5,
    }
  );
}

export async function saveLicense(l: LicenseState): Promise<void> {
  await set(LICENSE_KEY, l);
}

export async function getSession(): Promise<Session | null> {
  return (await get<Session>(SESSION_KEY)) || null;
}

export async function saveSession(s: Session): Promise<void> {
  await set(SESSION_KEY, s);
}

export async function clearSession(): Promise<void> {
  await del(SESSION_KEY);
}
