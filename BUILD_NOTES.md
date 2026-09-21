# BUILD_NOTES — Querra Fișă SKU1

## Ce funcționează (demo complet)

| Zonă | Status |
|------|--------|
| Login firmă + tehnician (local session IndexedDB) | OK |
| Listă fișe + seed demo | OK |
| Fișă nouă: Text → parse heuristic RO → formular | OK |
| Fișă nouă: Foto → stocare pe fișă + PDF | OK |
| „Completează din model” / „Simulează OCR” (offline) | OK |
| Revizie manuală obligatorie înainte de PDF (flux `?review=1`) | OK |
| Editare toate câmpurile template (15 rânduri piese, tipuri, semne typed) | OK |
| Salvare IndexedDB (client-only) | OK |
| Generare PDF jsPDF + download + Web Share API | OK |
| Setări firmă (nume, CUI stub, logo) | OK |
| Licență activare stub (~200€/an, max 5) | OK |
| PWA manifest + service worker (build prod) | OK |
| UI RO, mobile-first, butoane mari, ~360px | OK |
| Template Excel în `docs/` | OK |

## Stub / limitări v1

- **Autentificare**: fără parolă, fără server; session locală
- **Licență**: fără validare remote; orice cheie ≥8 sau `DEMO`
- **OCR**: fără API; „Simulează OCR” / „din model” umplu date demo
- **Parser text**: heuristic local (regex/keywords), nu LLM
- **Semnături**: doar nume tastat (fără canvas semnătură)
- **Multi-user sync**: nu există cloud; date doar pe dispozitiv
- **CUI / SoftBill / e-Factura**: intenționat absente
- **PWA SW**: dezactivat în `next dev`; activ după `npm run build`
- **Logo în PDF**: încearcă JPEG; PNG exotice pot eșua silent
- **Offline fallback**: pagină `/offline` minimală

## Decizii tehnice

- `@ducanh2912/next-pwa` în loc de `next-pwa` (întreținut pentru Next 14)
- `idb-keyval` pentru simplitate (nu Dexie)
- Compresie JPEG client-side pentru foto înainte de IndexedDB
- `crypto.randomUUID()` pentru id-uri fișă

## Cum verifici build-ul

```bash
cd /workspace/querra-fisa && npm run build
```

Trebuie să termine cu exit code 0.
