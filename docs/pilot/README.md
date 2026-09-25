# Pilot pack (pre-configuration on day one)

A pilot pack is a single `<slug>.querra.json` file that sets up the app for a
firm before the first technician opens it: firm name, logo, CUI/phone/address,
the client + equipment catalogs, the default fișă type, and the technician names
shown at login.

The format is the backup v2 shape without `fise` (and without licence/session),
plus a `pack` marker (`"kind": "querra-pilot-pack"`).

## Make one

```bash
npx tsx scripts/make-pilot-pack.mts \
  --firm "CleanTech Service SRL" \
  --logo docs/pilot/example-logo.png \
  --excel docs/pilot/example-catalog.xlsx \
  --tip Revizie --tech "Andrei Pop" --tech "Mihai Ionescu" \
  --phone "+40 722 000 111" --locale ro --out docs/pilot
```

`--excel` can be repeated. It accepts the same files as the in-app catalog
import: Clienti/Utilaje sheets (or Clients/Equipment, Klienci/Urządzenia), CSV,
or a filled classic RO fișă. `npm run pilot-pack:example` rebuilds
`cleantech-service-srl.querra.json` from the files in this folder.

## Load it in the app

- Login screen: **Ai primit un pachet de configurare? Încarcă-l**
- Empty home screen: the same card
- Menu → Backup și restaurare → import (packs are detected automatically)

The import asks for confirmation, then **merges**: the firm details come from the
pack, clients and machines are added (existing entries are kept and only have
blanks filled in), and existing fișe are left alone. Loading the same pack again
changes nothing.
