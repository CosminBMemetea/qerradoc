"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ro" | "en" | "pl";

export const SPEECH_LANG: Record<Locale, string> = {
  ro: "ro-RO",
  en: "en-US",
  pl: "pl-PL",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  ro: "Română",
  en: "English",
  pl: "Polski",
};

const STORAGE_KEY = "querra-locale";

type Dict = Record<string, string>;

const ro: Dict = {
  "app.name": "Querra Fișă",
  "app.loading": "Se încarcă Querra Fișă…",
  "app.loadingShort": "Se încarcă…",
  "nav.fise": "Fișe",
  "nav.new": "Nou",
  "nav.settings": "Setări",
  "nav.license": "Licență",
  "nav.logout": "Ieșire",
  "nav.back": "Înapoi",

  "login.tagline": "Fișă de service pe telefon — calmă, rapidă, offline.",
  "login.firm": "Firmă (nume)",
  "login.tech": "Tehnician (nume)",
  "login.submit": "Intră în aplicație",
  "login.busy": "Se conectează…",
  "login.errRequired": "Completează firma și numele tehnicianului.",
  "login.errGeneric": "Eroare la autentificare (local). Reîncearcă.",
  "login.language": "Limbă",

  "fise.title": "Fișele mele",
  "fise.new": "Fișă nouă",
  "fise.seed": "Încarcă fișă demo",
  "fise.emptyTitle": "Nicio fișă încă",
  "fise.emptyDesc": "Creează una din text, dictare sau fotografie.",
  "fise.noNumber": "Fără nr.",
  "fise.unknownClient": "Client necunoscut",
  "fise.noSerie": "fără serie",

  "new.title": "Fișă nouă",
  "new.intro":
    "Alege cum începi. După completare automată verifici obligatoriu formularul.",
  "new.dictateTitle": "Dictează fișa",
  "new.dictateDesc":
    "Vorbește — textul se completează automat, apoi revizie.",
  "new.textTitle": "Din text",
  "new.textDesc": "Lipește mesaj WhatsApp sau notițe.",
  "new.photoTitle": "Din fotografie",
  "new.photoDesc": "Capturează utilajul și completează din model.",

  "text.title": "Din text",
  "text.label": "Lipește mesajul WhatsApp / notițe",
  "text.placeholder": "Ex: client Hotel… utilaj Kärcher… serie…",
  "text.parse": "Completează automat → Revizie",
  "text.sample": "Încarcă text exemplu",
  "text.hint":
    "Parser heuristic local (fără cloud). Apoi editezi manual — nu poți sări peste revizie.",

  "photo.title": "Din fotografie",
  "photo.pick": "Alege / captura foto",
  "photo.none": "Nicio imagine selectată",
  "photo.preview": "Previzualizare",
  "photo.fromModel": "Completează din model → Revizie",
  "photo.ocr": "Simulează OCR (demo offline)",
  "photo.empty": "Continuă doar cu foto (formular gol)",
  "photo.hint":
    "v1: fără API OCR. Foto se salvează pe fișă și apare în PDF. „Simulează OCR” umple date demo pentru prezentări pe telefon.",
  "photo.obsOcr": "Completat prin Simulează OCR (demo offline).",
  "photo.obsModel":
    "Completat din model pe baza fotografiei (fără OCR API).",

  "edit.reviewTitle": "Revizie obligatorie",
  "edit.fisaTitle": "Fișă",
  "edit.errorTitle": "Eroare",
  "edit.notFound": "Fișa nu a fost găsită.",
  "edit.saved": "Salvat local",
  "edit.save": "Salvează fișa",
  "edit.pdf": "PDF — previzualizare / descărcare",
  "edit.pdfLocked":
    "Salvează mai întâi după revizie ca să deblochezi PDF-ul.",
  "edit.delete": "Șterge fișa",
  "edit.deleteConfirm": "Ștergi această fișă?",

  "form.reviewBanner":
    "Verifică și editează toate câmpurile înainte de salvare. Revizia manuală este obligatorie.",
  "form.tip": "Tip fișă",
  "form.nrFisa": "Nr. fișă",
  "form.nrPlaceholder": "ex. 2026-0042",
  "form.proprietar": "Proprietar",
  "form.client": "Client",
  "form.locatie": "Locație",
  "form.modelUtilaj": "Model utilaj",
  "form.serie": "Serie",
  "form.oreFunctionare": "Ore funcționare",
  "form.manoperaOre": "Manoperă (ore)",
  "form.deplasareKm": "Deplasare km",
  "form.deplasareDaNu": "Deplasare DA / NU",
  "form.yes": "DA",
  "form.no": "NU",
  "form.reclamatie": "Reclamație / solicitare client",
  "form.photoAlt": "Foto utilaj",
  "form.piese": "Piese și materiale",
  "form.piesaNr": "Nr.",
  "form.denumire": "Denumire",
  "form.cod": "Cod",
  "form.cant": "Cant.",
  "form.pret": "Preț €",
  "form.dataAnuntarii": "Data anunțării defecțiunii",
  "form.dataInterventiei": "Data intervenției tehnice",
  "form.observatii": "Observații",
  "form.motiveInlocuire": "Motive înlocuire piese",
  "form.semnaturaClient": "Semnătură client (nume)",
  "form.semnaturaClientPh": "Numele persoanei care recepționează",
  "form.semnaturaTehnician": "Semnătură tehnician (nume)",
  "tip.Constatare": "Constatare",
  "tip.Reparație": "Reparație",
  "tip.Revizie": "Revizie",
  "tip.Punere în funcțiune": "Punere în funcțiune",

  "pdf.title": "PDF fișă",
  "pdf.warnReview":
    "Fișa nu a fost încă salvată după revizie. Poți genera PDF, dar recomandăm să salvezi mai întâi din ecranul de editare.",
  "pdf.summary": "Previzualizare sumar",
  "pdf.fisaOf": "Fișă de",
  "pdf.nr": "Nr.",
  "pdf.client": "Client:",
  "pdf.locatie": "Locație:",
  "pdf.utilaj": "Utilaj:",
  "pdf.manopera": "Manoperă:",
  "pdf.deplasare": "Deplasare:",
  "pdf.reclamatie": "Reclamație:",
  "pdf.piese": "Piese:",
  "pdf.pieseLines": "linii",
  "pdf.download": "Descarcă PDF",
  "pdf.share": "Partajează PDF",
  "pdf.downloaded": "PDF descărcat.",
  "pdf.shared": "Partajat.",
  "pdf.downloadedFallback": "PDF descărcat (share indisponibil).",
  "pdf.errGen": "Eroare la generarea PDF.",
  "pdf.errShare": "Eroare la partajare.",

  "settings.title": "Setări firmă",
  "settings.companyName": "Nume firmă (antet PDF)",
  "settings.cui": "CUI (stub)",
  "settings.address": "Adresă",
  "settings.phone": "Telefon",
  "settings.logo": "Logo firmă",
  "settings.uploadLogo": "Încarcă logo",
  "settings.removeLogo": "Elimină",
  "settings.save": "Salvează setările",
  "settings.saved": "Setări salvate.",
  "settings.language": "Limbă",
  "settings.theme": "Temă",
  "settings.themeLight": "Deschis",
  "settings.themeDark": "Întunecat",
  "settings.appearance": "Aspect",

  "license.title": "Licență",
  "license.pricing":
    "Activare firmă · ~200 EUR / an (~999 RON) · până la ~5 tehnicieni",
  "license.active": "Activă · cheie {key} · max {max} useri",
  "license.inactive":
    "Neactivată — poți demoua aplicația; activarea e stub",
  "license.activatedAt": "Activată:",
  "license.key": "Cheie licență",
  "license.keyPh": "DEMO-QUERRA sau cheie ≥8 caractere",
  "license.activate": "Activează licența",
  "license.deactivate": "Dezactivează (test)",
  "license.errKey":
    "Cheia trebuie să aibă cel puțin 8 caractere (sau DEMO).",
  "license.ok":
    "Licență activată (stub). Valabilitate demonstrativă 1 an.",
  "license.deactivated": "Licență dezactivată.",
  "license.stub":
    "Stub: nu există server de validare. Pentru producție se va conecta un endpoint de activare. Fără SoftBill / e-Factura / OAK.",

  "dictate.listen": "Dictează",
  "dictate.listening": "Ascult… · Atinge pentru stop",
  "dictate.startAria": "Pornește dictarea",
  "dictate.stopAria": "Oprește dictarea",
  "dictate.unsupported": "Dictarea nu e disponibilă pe acest browser",
  "dictate.micDenied": "Permite accesul la microfon pentru dictare.",
  "dictate.network": "Eroare de rețea la dictare. Încearcă din nou.",
  "dictate.service": "Serviciul de dictare nu e disponibil.",
  "dictate.appendHint": "Textul se adaugă la finalul câmpului",

  "offline.title": "Offline",
  "offline.desc":
    "Nu există conexiune. Fișele salvate local rămân disponibile după reconectare.",
  "offline.retry": "Reîncearcă",
};

const en: Dict = {
  "app.name": "Querra Sheet",
  "app.loading": "Loading Querra Sheet…",
  "app.loadingShort": "Loading…",
  "nav.fise": "Sheets",
  "nav.new": "New",
  "nav.settings": "Settings",
  "nav.license": "License",
  "nav.logout": "Log out",
  "nav.back": "Back",

  "login.tagline": "Service sheet on your phone — calm, fast, offline.",
  "login.firm": "Company (name)",
  "login.tech": "Technician (name)",
  "login.submit": "Enter the app",
  "login.busy": "Signing in…",
  "login.errRequired": "Fill in company and technician name.",
  "login.errGeneric": "Local sign-in error. Try again.",
  "login.language": "Language",

  "fise.title": "My sheets",
  "fise.new": "New sheet",
  "fise.seed": "Load demo sheet",
  "fise.emptyTitle": "No sheets yet",
  "fise.emptyDesc": "Create one from text, dictation, or photo.",
  "fise.noNumber": "No no.",
  "fise.unknownClient": "Unknown client",
  "fise.noSerie": "no serial",

  "new.title": "New sheet",
  "new.intro":
    "Choose how to start. After auto-fill you must review the form.",
  "new.dictateTitle": "Dictate the sheet",
  "new.dictateDesc": "Speak — text fills in automatically, then review.",
  "new.textTitle": "From text",
  "new.textDesc": "Paste a WhatsApp message or notes.",
  "new.photoTitle": "From photo",
  "new.photoDesc": "Capture the machine and fill from the model.",

  "text.title": "From text",
  "text.label": "Paste WhatsApp message / notes",
  "text.placeholder": "E.g. client Hotel… machine Kärcher… serial…",
  "text.parse": "Auto-fill → Review",
  "text.sample": "Load sample text",
  "text.hint":
    "Local heuristic parser (no cloud). Then edit manually — you cannot skip review.",

  "photo.title": "From photo",
  "photo.pick": "Choose / capture photo",
  "photo.none": "No image selected",
  "photo.preview": "Preview",
  "photo.fromModel": "Fill from model → Review",
  "photo.ocr": "Simulate OCR (offline demo)",
  "photo.empty": "Continue with photo only (empty form)",
  "photo.hint":
    "v1: no OCR API. Photo is saved on the sheet and appears in the PDF. “Simulate OCR” fills demo data for phone demos.",
  "photo.obsOcr": "Filled via Simulate OCR (offline demo).",
  "photo.obsModel": "Filled from model based on the photo (no OCR API).",

  "edit.reviewTitle": "Mandatory review",
  "edit.fisaTitle": "Sheet",
  "edit.errorTitle": "Error",
  "edit.notFound": "Sheet not found.",
  "edit.saved": "Saved locally",
  "edit.save": "Save sheet",
  "edit.pdf": "PDF — preview / download",
  "edit.pdfLocked": "Save after review first to unlock the PDF.",
  "edit.delete": "Delete sheet",
  "edit.deleteConfirm": "Delete this sheet?",

  "form.reviewBanner":
    "Check and edit all fields before saving. Manual review is required.",
  "form.tip": "Sheet type",
  "form.nrFisa": "Sheet no.",
  "form.nrPlaceholder": "e.g. 2026-0042",
  "form.proprietar": "Owner",
  "form.client": "Client",
  "form.locatie": "Location",
  "form.modelUtilaj": "Machine model",
  "form.serie": "Serial",
  "form.oreFunctionare": "Operating hours",
  "form.manoperaOre": "Labour (hours)",
  "form.deplasareKm": "Travel km",
  "form.deplasareDaNu": "Travel YES / NO",
  "form.yes": "YES",
  "form.no": "NO",
  "form.reclamatie": "Complaint / client request",
  "form.photoAlt": "Machine photo",
  "form.piese": "Parts and materials",
  "form.piesaNr": "No.",
  "form.denumire": "Name",
  "form.cod": "Code",
  "form.cant": "Qty",
  "form.pret": "Price €",
  "form.dataAnuntarii": "Fault reported date",
  "form.dataInterventiei": "Service intervention date",
  "form.observatii": "Notes",
  "form.motiveInlocuire": "Reasons for part replacement",
  "form.semnaturaClient": "Client signature (name)",
  "form.semnaturaClientPh": "Name of person receiving the work",
  "form.semnaturaTehnician": "Technician signature (name)",
  "tip.Constatare": "Inspection",
  "tip.Reparație": "Repair",
  "tip.Revizie": "Service",
  "tip.Punere în funcțiune": "Commissioning",

  "pdf.title": "Sheet PDF",
  "pdf.warnReview":
    "Sheet not saved after review yet. You can generate a PDF, but we recommend saving from the edit screen first.",
  "pdf.summary": "Summary preview",
  "pdf.fisaOf": "Sheet of",
  "pdf.nr": "No.",
  "pdf.client": "Client:",
  "pdf.locatie": "Location:",
  "pdf.utilaj": "Machine:",
  "pdf.manopera": "Labour:",
  "pdf.deplasare": "Travel:",
  "pdf.reclamatie": "Complaint:",
  "pdf.piese": "Parts:",
  "pdf.pieseLines": "lines",
  "pdf.download": "Download PDF",
  "pdf.share": "Share PDF",
  "pdf.downloaded": "PDF downloaded.",
  "pdf.shared": "Shared.",
  "pdf.downloadedFallback": "PDF downloaded (share unavailable).",
  "pdf.errGen": "Error generating PDF.",
  "pdf.errShare": "Error sharing.",

  "settings.title": "Company settings",
  "settings.companyName": "Company name (PDF header)",
  "settings.cui": "Tax ID (stub)",
  "settings.address": "Address",
  "settings.phone": "Phone",
  "settings.logo": "Company logo",
  "settings.uploadLogo": "Upload logo",
  "settings.removeLogo": "Remove",
  "settings.save": "Save settings",
  "settings.saved": "Settings saved.",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "settings.appearance": "Appearance",

  "license.title": "License",
  "license.pricing":
    "Company activation · ~200 EUR / year (~999 RON) · up to ~5 technicians",
  "license.active": "Active · key {key} · max {max} users",
  "license.inactive":
    "Not activated — you can demo the app; activation is a stub",
  "license.activatedAt": "Activated:",
  "license.key": "License key",
  "license.keyPh": "DEMO-QUERRA or key ≥8 characters",
  "license.activate": "Activate license",
  "license.deactivate": "Deactivate (test)",
  "license.errKey": "Key must be at least 8 characters (or DEMO).",
  "license.ok":
    "License activated (stub). Demo validity 1 year.",
  "license.deactivated": "License deactivated.",
  "license.stub":
    "Stub: no validation server. Production will connect an activation endpoint. No SoftBill / e-Invoice / OAK.",

  "dictate.listen": "Dictate",
  "dictate.listening": "Listening… · Tap to stop",
  "dictate.startAria": "Start dictation",
  "dictate.stopAria": "Stop dictation",
  "dictate.unsupported": "Dictation is not available in this browser",
  "dictate.micDenied": "Allow microphone access for dictation.",
  "dictate.network": "Network error during dictation. Try again.",
  "dictate.service": "Dictation service is not available.",
  "dictate.appendHint": "Text is appended to the end of the field",

  "offline.title": "Offline",
  "offline.desc":
    "No connection. Locally saved sheets remain available after reconnecting.",
  "offline.retry": "Retry",
};

const pl: Dict = {
  "app.name": "Querra Karta",
  "app.loading": "Ładowanie Querra Karta…",
  "app.loadingShort": "Ładowanie…",
  "nav.fise": "Karty",
  "nav.new": "Nowa",
  "nav.settings": "Ustawienia",
  "nav.license": "Licencja",
  "nav.logout": "Wyloguj",
  "nav.back": "Wstecz",

  "login.tagline": "Karta serwisowa w telefonie — spokojna, szybka, offline.",
  "login.firm": "Firma (nazwa)",
  "login.tech": "Technik (imię)",
  "login.submit": "Wejdź do aplikacji",
  "login.busy": "Logowanie…",
  "login.errRequired": "Uzupełnij firmę i imię technika.",
  "login.errGeneric": "Błąd logowania lokalnego. Spróbuj ponownie.",
  "login.language": "Język",

  "fise.title": "Moje karty",
  "fise.new": "Nowa karta",
  "fise.seed": "Wczytaj kartę demo",
  "fise.emptyTitle": "Brak kart",
  "fise.emptyDesc": "Utwórz z tekstu, dyktowania lub zdjęcia.",
  "fise.noNumber": "Bez nr",
  "fise.unknownClient": "Nieznany klient",
  "fise.noSerie": "bez numeru seryjnego",

  "new.title": "Nowa karta",
  "new.intro":
    "Wybierz sposób startu. Po auto-wypełnieniu obowiązkowa jest weryfikacja.",
  "new.dictateTitle": "Dyktuj kartę",
  "new.dictateDesc": "Mów — tekst uzupełni się automatycznie, potem przegląd.",
  "new.textTitle": "Z tekstu",
  "new.textDesc": "Wklej wiadomość WhatsApp lub notatki.",
  "new.photoTitle": "Ze zdjęcia",
  "new.photoDesc": "Zrób zdjęcie maszyny i uzupełnij z modelu.",

  "text.title": "Z tekstu",
  "text.label": "Wklej wiadomość WhatsApp / notatki",
  "text.placeholder": "Np. klient Hotel… maszyna Kärcher… seria…",
  "text.parse": "Uzupełnij automatycznie → Przegląd",
  "text.sample": "Wczytaj przykładowy tekst",
  "text.hint":
    "Lokalny parser heurystyczny (bez chmury). Potem edytujesz ręcznie — nie można pominąć przeglądu.",

  "photo.title": "Ze zdjęcia",
  "photo.pick": "Wybierz / zrób zdjęcie",
  "photo.none": "Nie wybrano obrazu",
  "photo.preview": "Podgląd",
  "photo.fromModel": "Uzupełnij z modelu → Przegląd",
  "photo.ocr": "Symuluj OCR (demo offline)",
  "photo.empty": "Kontynuuj tylko ze zdjęciem (pusty formularz)",
  "photo.hint":
    "v1: bez API OCR. Zdjęcie jest zapisywane na karcie i pojawia się w PDF. „Symuluj OCR” wypełnia dane demo na prezentacje.",
  "photo.obsOcr": "Uzupełniono przez Symuluj OCR (demo offline).",
  "photo.obsModel":
    "Uzupełniono z modelu na podstawie zdjęcia (bez API OCR).",

  "edit.reviewTitle": "Obowiązkowy przegląd",
  "edit.fisaTitle": "Karta",
  "edit.errorTitle": "Błąd",
  "edit.notFound": "Nie znaleziono karty.",
  "edit.saved": "Zapisano lokalnie",
  "edit.save": "Zapisz kartę",
  "edit.pdf": "PDF — podgląd / pobieranie",
  "edit.pdfLocked":
    "Najpierw zapisz po przeglądzie, aby odblokować PDF.",
  "edit.delete": "Usuń kartę",
  "edit.deleteConfirm": "Usunąć tę kartę?",

  "form.reviewBanner":
    "Sprawdź i edytuj wszystkie pola przed zapisem. Ręczny przegląd jest obowiązkowy.",
  "form.tip": "Typ karty",
  "form.nrFisa": "Nr karty",
  "form.nrPlaceholder": "np. 2026-0042",
  "form.proprietar": "Właściciel",
  "form.client": "Klient",
  "form.locatie": "Lokalizacja",
  "form.modelUtilaj": "Model maszyny",
  "form.serie": "Numer seryjny",
  "form.oreFunctionare": "Godziny pracy",
  "form.manoperaOre": "Robocizna (godz.)",
  "form.deplasareKm": "Dojazd km",
  "form.deplasareDaNu": "Dojazd TAK / NIE",
  "form.yes": "TAK",
  "form.no": "NIE",
  "form.reclamatie": "Reklamacja / zlecenie klienta",
  "form.photoAlt": "Zdjęcie maszyny",
  "form.piese": "Części i materiały",
  "form.piesaNr": "Nr",
  "form.denumire": "Nazwa",
  "form.cod": "Kod",
  "form.cant": "Ilość",
  "form.pret": "Cena €",
  "form.dataAnuntarii": "Data zgłoszenia usterki",
  "form.dataInterventiei": "Data interwencji technicznej",
  "form.observatii": "Uwagi",
  "form.motiveInlocuire": "Powody wymiany części",
  "form.semnaturaClient": "Podpis klienta (imię)",
  "form.semnaturaClientPh": "Imię osoby odbierającej",
  "form.semnaturaTehnician": "Podpis technika (imię)",
  "tip.Constatare": "Ekspertyza",
  "tip.Reparație": "Naprawa",
  "tip.Revizie": "Przegląd",
  "tip.Punere în funcțiune": "Uruchomienie",

  "pdf.title": "PDF karty",
  "pdf.warnReview":
    "Karta nie została jeszcze zapisana po przeglądzie. Możesz wygenerować PDF, ale zalecamy najpierw zapis z ekranu edycji.",
  "pdf.summary": "Podgląd podsumowania",
  "pdf.fisaOf": "Karta",
  "pdf.nr": "Nr",
  "pdf.client": "Klient:",
  "pdf.locatie": "Lokalizacja:",
  "pdf.utilaj": "Maszyna:",
  "pdf.manopera": "Robocizna:",
  "pdf.deplasare": "Dojazd:",
  "pdf.reclamatie": "Reklamacja:",
  "pdf.piese": "Części:",
  "pdf.pieseLines": "pozycji",
  "pdf.download": "Pobierz PDF",
  "pdf.share": "Udostępnij PDF",
  "pdf.downloaded": "PDF pobrany.",
  "pdf.shared": "Udostępniono.",
  "pdf.downloadedFallback": "PDF pobrany (udostępnianie niedostępne).",
  "pdf.errGen": "Błąd generowania PDF.",
  "pdf.errShare": "Błąd udostępniania.",

  "settings.title": "Ustawienia firmy",
  "settings.companyName": "Nazwa firmy (nagłówek PDF)",
  "settings.cui": "NIP (stub)",
  "settings.address": "Adres",
  "settings.phone": "Telefon",
  "settings.logo": "Logo firmy",
  "settings.uploadLogo": "Wczytaj logo",
  "settings.removeLogo": "Usuń",
  "settings.save": "Zapisz ustawienia",
  "settings.saved": "Ustawienia zapisane.",
  "settings.language": "Język",
  "settings.theme": "Motyw",
  "settings.themeLight": "Jasny",
  "settings.themeDark": "Ciemny",
  "settings.appearance": "Wygląd",

  "license.title": "Licencja",
  "license.pricing":
    "Aktywacja firmy · ~200 EUR / rok (~999 RON) · do ~5 techników",
  "license.active": "Aktywna · klucz {key} · max {max} użytkowników",
  "license.inactive":
    "Nieaktywna — możesz demo aplikacji; aktywacja to stub",
  "license.activatedAt": "Aktywowano:",
  "license.key": "Klucz licencji",
  "license.keyPh": "DEMO-QUERRA lub klucz ≥8 znaków",
  "license.activate": "Aktywuj licencję",
  "license.deactivate": "Dezaktywuj (test)",
  "license.errKey": "Klucz musi mieć co najmniej 8 znaków (lub DEMO).",
  "license.ok":
    "Licencja aktywowana (stub). Ważność demo 1 rok.",
  "license.deactivated": "Licencja dezaktywowana.",
  "license.stub":
    "Stub: brak serwera walidacji. W produkcji będzie endpoint aktywacji. Bez SoftBill / e-Faktura / OAK.",

  "dictate.listen": "Dyktuj",
  "dictate.listening": "Słucham… · Dotknij, by zatrzymać",
  "dictate.startAria": "Rozpocznij dyktowanie",
  "dictate.stopAria": "Zatrzymaj dyktowanie",
  "dictate.unsupported": "Dyktowanie niedostępne w tej przeglądarce",
  "dictate.micDenied": "Zezwól na dostęp do mikrofonu do dyktowania.",
  "dictate.network": "Błąd sieci przy dyktowaniu. Spróbuj ponownie.",
  "dictate.service": "Usługa dyktowania niedostępna.",
  "dictate.appendHint": "Tekst jest dodawany na końcu pola",

  "offline.title": "Offline",
  "offline.desc":
    "Brak połączenia. Lokalnie zapisane karty pozostaną dostępne po ponownym połączeniu.",
  "offline.retry": "Spróbuj ponownie",
};

const DICTS: Record<Locale, Dict> = { ro, en, pl };

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "ro";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "ro" || v === "en" || v === "pl") return v;
  } catch {
    /* ignore */
  }
  return "ro";
}

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  speechLang: string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ro");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale, ready]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[locale] || DICTS.ro;
      let s = dict[key] ?? DICTS.ro[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      speechLang: SPEECH_LANG[locale],
    }),
    [locale, setLocale, t]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
