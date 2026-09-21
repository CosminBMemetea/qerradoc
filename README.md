# Querra Fișă (SKU1)

PWA mobil-first (română) pentru tehnicieni: fișă digitală de **Constatare / Reparație / Revizie / Punere în funcțiune** pentru utilaje profesionale de curățenie.

**Flux:** Fișă nouă → Foto și/sau Text → Autocomplete → **Revizie manuală obligatorie** → Salvare → PDF (descărcare / partajare).

Fără App Store · fără voce · fără SoftBill/e-Factura · fără OAK/Jetson.

## Cerințe

- Node.js 18+ (testat pe 20)
- npm

## Instalare și rulare

```bash
cd /workspace/querra-fisa
npm install
npm run dev
```

Deschide pe desktop: [http://localhost:3000](http://localhost:3000)

### Demo pe telefon (același Wi‑Fi)

1. Pe Linux box, află IP-ul LAN:

```bash
hostname -I | awk '{print $1}'
```

2. Pornește serverul accesibil din rețea:

```bash
cd /workspace/querra-fisa
npm run dev -- -H 0.0.0.0 -p 3000
```

3. Pe telefonul Android (Chrome): `http://<IP>:3000`  
   Exemplu: `http://192.168.1.42:3000`

4. Opțional: meniu Chrome → **Adaugă pe ecranul principal** (PWA).

### Build producție

```bash
npm run build
npm start -- -H 0.0.0.0 -p 3000
```

## Parcurs demo (browser / telefon)

1. **Login** — firmă + nume tehnician (stub, fără parolă) → Intră
2. **Fișe** → **Fișă nouă** → **Din text**
3. **Încarcă text exemplu** (sau lipește propriul WhatsApp) → **Completează automat → Revizie**
4. Verifică/editează câmpurile → **Salvează fișa**
5. **PDF — previzualizare / descărcare** → Descarcă sau Partajează

### Cale foto

1. Fișă nouă → Din fotografie → alege/captură imagine
2. **Simulează OCR** (sau Completează din model) → revizie → salvează → PDF (cu foto)

### Seed

Pe lista de fișe: **Încarcă fișă demo (seed)**.

## Text exemplu WhatsApp (seed)

```
Bună, client Hotel Belvedere Oradea, locație str. Republicii 12.
Utilaj: Kärcher B 60 W Bp, serie KBH2045678, ore 1842.
Reclamație: nu aspiră bine, filtru colmatat, perie uzată.
Anunțat pe 18.09.2026, intervenție azi.
Manoperă 1.5 ore, deplasare 14 km.
Piese:
- Filtru HEPA x1 cod 6.414-631.0
- Perie cilindrică x1
Tehnician: Ion Popescu
```

## Licență (stub)

~**200 EUR/an** (~999 RON/an) · până la ~**5 tehnicieni**.  
Ecran **Licență**: cheie `DEMO` / `DEMO-QUERRA` sau orice ≥8 caractere.

## Template Excel

Copiat în `docs/fisa-template-curatenie.xlsx` (foaia **Fisa**).

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · IndexedDB (`idb-keyval`) · jsPDF · PWA (`@ducanh2912/next-pwa`)

## Documentație internă

Vezi `BUILD_NOTES.md` pentru ce funcționează vs. ce e stub.
