/**
 * Smoke: "Trimite clientului" — message text per contentLocale, share /
 * fallback / cancel outcomes, sentAt + aiFilled surviving backup restore.
 * Run: npm run smoke:send
 */
import assert from "node:assert/strict";
import { emptyFisa } from "../src/lib/types.ts";
import {
  canSendToClient,
  clientMessage,
  preopenFallbackWindow,
  sendPdfToClient,
  waLink,
  type WinLike,
} from "../src/lib/send-to-client.ts";
import { validateBackup, BACKUP_VERSION } from "../src/lib/backup.ts";

const settings = { companyName: "UTILAJE PRO SRL" };
const base = { nrFisa: "2026-0142", dataInterventiei: "2026-09-25" };

assert.equal(
  clientMessage(emptyFisa({ ...base, contentLocale: "ro" }), settings),
  "Bună ziua, vă trimitem atașat fișa de intervenție nr. 2026-0142 din data 25.09.2026. Mulțumim! — UTILAJE PRO SRL"
);
assert.equal(
  clientMessage(emptyFisa({ ...base, contentLocale: "en" }), settings),
  "Hello, please find attached our service job sheet no. 2026-0142 dated 25/09/2026. Thank you! — UTILAJE PRO SRL"
);
assert.equal(
  clientMessage(emptyFisa({ ...base, contentLocale: "pl" }), settings),
  "Dzień dobry, przesyłamy w załączniku protokół serwisowy nr 2026-0142 z dnia 25.09.2026. Dziękujemy! — UTILAJE PRO SRL"
);
// No firm name → no dangling dash; message follows contentLocale, not UI.
assert.ok(!clientMessage(emptyFisa({ ...base, contentLocale: "ro" }), { companyName: "" }).includes("—"));
assert.match(waLink("a b&c"), /^https:\/\/wa\.me\/\?text=a%20b%26c$/);

assert.equal(canSendToClient(emptyFisa()), false);
assert.equal(canSendToClient(emptyFisa({ semnaturaClientDataUrl: "data:image/png;base64,AAA" })), true);

const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
function harness(nav: Partial<Navigator> | undefined) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      nav: nav as Navigator | undefined,
      download: (_b: Blob, n: string) => calls.push(`download:${n}`),
      open: (u: string) => calls.push(`open:${u.slice(0, 18)}`),
    },
  };
}
// 1. Mobile: file share supported → shared, no fallback.
{
  let shared: ShareData | undefined;
  const h = harness({ canShare: () => true, share: async (d?: ShareData) => { shared = d; } });
  assert.equal(await sendPdfToClient(blob, "Fisa_1.pdf", "txt", h.deps), "shared");
  assert.equal(shared?.files?.[0].name, "Fisa_1.pdf");
  assert.equal(shared?.files?.[0].type, "application/pdf");
  assert.equal(shared?.text, "txt");
  assert.deepEqual(h.calls, []);
}
// 2. Desktop: no file share → download + wa.me.
{
  const h = harness({ canShare: () => false });
  assert.equal(await sendPdfToClient(blob, "Fisa_1.pdf", "txt", h.deps), "fallback");
  assert.deepEqual(h.calls, ["download:Fisa_1.pdf", "open:https://wa.me/?tex"]);
}
// 3. User cancels the share sheet → nothing else happens (not marked sent).
{
  const h = harness({ canShare: () => true, share: async () => { throw Object.assign(new Error("x"), { name: "AbortError" }); } });
  assert.equal(await sendPdfToClient(blob, "f.pdf", "t", h.deps), "cancelled");
  assert.deepEqual(h.calls, []);
}
// 4. Browser refuses (lost gesture) → fallback.
{
  const h = harness({ canShare: () => true, share: async () => { throw Object.assign(new Error("x"), { name: "NotAllowedError" }); } });
  assert.equal(await sendPdfToClient(blob, "f.pdf", "t", h.deps), "fallback");
  assert.equal(h.calls.length, 2);
}
// 5. Popup blockers: without file share the window is opened synchronously
//    (before any await) and only its location is set once the PDF is ready.
{
  const fakeWin = () => {
    const w = { location: { href: "about:blank" }, closed: false, opener: {} as unknown, closeCalls: 0, close() { this.closeCalls++; this.closed = true; } };
    return w;
  };
  let opened = 0;
  const w = fakeWin();
  const pre = preopenFallbackWindow({ canShare: () => false } as unknown as Navigator, () => { opened++; return w as WinLike; });
  assert.equal(opened, 1, "desktop: blank window opened on the tap");
  const h = harness({ canShare: () => false });
  assert.equal(await sendPdfToClient(blob, "f.pdf", "hello", { ...h.deps, win: pre }), "fallback");
  assert.equal(w.location.href, "https://wa.me/?text=hello", "pre-opened window navigated to wa.me");
  assert.equal(w.opener, null, "opener cut");
  assert.deepEqual(h.calls, ["download:f.pdf"], "no second window.open");
  // Mobile with file share: nothing pre-opened.
  const none = preopenFallbackWindow({ share: async () => {}, canShare: () => true } as unknown as Navigator, () => { opened++; return fakeWin() as WinLike; });
  assert.equal(none, null);
  assert.equal(opened, 1);
  // Share succeeded / cancelled → pre-opened window closed.
  const w2 = fakeWin();
  const h2 = harness({ canShare: () => true, share: async () => {} });
  assert.equal(await sendPdfToClient(blob, "f.pdf", "t", { ...h2.deps, win: w2 as WinLike }), "shared");
  assert.equal(w2.closeCalls, 1);
  const w3 = fakeWin();
  const h3 = harness({ canShare: () => true, share: async () => { throw Object.assign(new Error("x"), { name: "AbortError" }); } });
  assert.equal(await sendPdfToClient(blob, "f.pdf", "t", { ...h3.deps, win: w3 as WinLike }), "cancelled");
  assert.equal(w3.closeCalls, 1);
  // Blocked (no pre-opened window and window.open returns null) → "blocked".
  const h4 = harness({ canShare: () => false });
  assert.equal(await sendPdfToClient(blob, "f.pdf", "t", { ...h4.deps, open: () => false }), "blocked");
}

// Backup keeps sentAt + aiFilled; junk dropped.
const sent = emptyFisa({ ...base, sentAt: "2026-09-25T18:30:00.000Z", aiFilled: ["client", "piese"] });
const junk = { ...emptyFisa(), sentAt: 42, aiFilled: ["tip", 7, null] };
const res = validateBackup(JSON.parse(JSON.stringify({ version: BACKUP_VERSION, exportedAt: new Date().toISOString(), fise: [sent, junk], settings: { companyName: "X", cui: "" } })));
assert.ok(res.ok, "backup validates");
if (res.ok) {
  assert.equal(res.data.fise[0].sentAt, "2026-09-25T18:30:00.000Z");
  assert.deepEqual(res.data.fise[0].aiFilled, ["client", "piese"]);
  assert.equal(res.data.fise[1].sentAt, undefined);
  assert.deepEqual(res.data.fise[1].aiFilled, ["tip"]);
}
console.log("smoke-send: OK");
