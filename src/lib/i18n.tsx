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

/** BCP-47 for <input type="date"> / native pickers */
export const DATE_LANG: Record<Locale, string> = {
  ro: "ro-RO",
  en: "en-GB",
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
  "login.firmExample": "UTILAJE PROFESIONALE PENTRU CURĂȚENIE",
  "login.techExample": "Ion Popescu",
  "login.firmInfo": "Numele firmei tale de service (apare pe PDF). Exemplu e doar demo — înlocuiește-l.",
  "login.techInfo": "Numele tehnicianului care semnează fișa. Exemplul e doar demo — înlocuiește-l.",

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
  "form.pret": "Preț {currency}",
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
  "pdf.defaultCompany": "UTILAJE PROFESIONALE PENTRU CURĂȚENIE",

  "settings.title": "Setări firmă",
  "settings.companyName": "Nume firmă",
  "settings.companyInfo": "Numele firmei tale de service (apare pe PDF). Exemplu e doar demo — înlocuiește-l.",
  "settings.cui": "CUI",
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
  "settings.pdfHeader": "Antet PDF",
  "settings.pdfHeaderHint": "Datele firmei și logo-ul apar în antetul fișei PDF.",
  "settings.pdfPreview": "Previzualizare antet",
  "settings.logoTip": "Logo-ul apare în stânga antetului PDF (redimensionat automat).",
  "settings.logoBusy": "Se procesează logo…",
  "settings.logoErr": "Nu am putut încărca logo-ul. Încearcă PNG sau JPEG.",

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
  "dictate.listening": "Înregistrez… · Atinge pentru stop",
  "dictate.startAria": "Pornește dictarea",
  "dictate.stopAria": "Oprește dictarea",
  "dictate.unsupported": "Înregistrarea audio nu e disponibilă pe acest browser",
  "dictate.micDenied": "Permite accesul la microfon pentru dictare.",
  "dictate.network": "Eroare de rețea la transcriere. Verifică internetul și încearcă din nou.",
  "dictate.service": "Serviciul de dictare nu e disponibil.",
  "dictate.appendHint": "Textul se adaugă la finalul câmpului",

  "dictate.networkRetry": "Rețea — reîncerc o dată…",
  "dictate.networkHint": "Dictarea necesită Chrome, internet și microfon. Poți înregistra o notă vocală mai jos.",
  "dictate.tapAgain": "Atinge din nou microfonul",
  "dictate.voiceNote": "Înregistrează notă vocală",
  "dictate.voiceNoteStop": "Oprește înregistrarea",
  "dictate.voiceNoteRecording": "Se înregistrează nota vocală…",
  "dictate.voiceNoteSaved": "Notă vocală salvată pe fișă.",
  "dictate.transcribing": "Se transcrie…",
  "dictate.missingKey": "Lipsește GROQ_API_KEY pe server. Adaugă cheia în .env și repornește.",
  "dictate.emptyTranscript": "Nu s-a detectat vorbire. Încearcă din nou.",
  "dictate.tryBrowserSpeech": "Încearcă dictarea din browser",
  "form.audioNote": "Notă vocală",
  "pdf.audioNote": "Notă vocală",
  "fise.demosTitle": "Încarcă demo real",
  "fise.demoCuratenie": "Utilaje curățenie",
  "fise.demoTamplarie": "Tâmplărie PVC / lemn",
  "fise.demoStoma": "Cabinet stomatologic",
  "fise.badge.curatenie": "Curățenie",
  "fise.badge.tamplarie": "Tâmplărie",
  "fise.badge.stoma": "Stoma",

  "nav.guide": "Ghid",
  "settings.openGuide": "Deschide ghidul",

  "fise.emptyCtaDemo": "Încarcă un demo real",
  "fise.emptyCtaGuide": "Citește ghidul",
  "fise.emptyCtaNew": "Fișă nouă",
  "fise.emptyFriendly": "Începe cu un exemplu pe limba ta, citește ghidul scurt sau creează o fișă goală.",

  "hint.tip": "Alege tipul intervenției (constatare, reparație, revizie, punere în funcțiune).",
  "hint.client": "Numele firmei sau persoanei pentru care lucrezi.",
  "hint.locatie": "Adresa / locul unde se face intervenția.",
  "hint.modelUtilaj": "Modelul utilajului, tratamentului sau produsului (ex. Kärcher B 60).",
  "hint.reclamatie": "Ce a raportat clientul / motivul prezentării — în cuvinte simple.",
  "hint.piese": "Piese sau materiale folosite: denumire, cod, cantitate, preț.",
  "hint.observatii": "Ce ai făcut pe teren, instructaj, termene următoare.",
  "hint.motiveInlocuire": "De ce ai înlocuit piesele (uzură, defect, indicație clinică).",
  "hint.dates": "Când s-a anunțat problema și când ai intervenit.",
  "hint.semnaturi": "Numele persoanei care recepționează și al tehnicianului.",

  "guide.title": "Ghid rapid",
  "guide.whatTitle": "Ce este Querra Fișă?",
  "guide.what": "Aplicație pe telefon pentru fișe de service / intervenție — completezi pe teren, revizuiești, descarci PDF, și offline.",
  "guide.stepsTitle": "Pași",
  "guide.step1": "Autentifică-te cu firma și numele tehnicianului.",
  "guide.step2": "Încarcă un demo real (pe limba curentă) SAU creează o fișă nouă (text / dictare / foto).",
  "guide.step3": "Revizuiește și editează toate câmpurile — revizia e obligatorie.",
  "guide.step4": "Salvează, apoi deschide PDF pentru previzualizare / descărcare.",
  "guide.glossaryTitle": "Ce înseamnă fiecare câmp",
  "guide.g.tip": "Tip — tipul fișei (constatare, reparație, revizie, punere în funcțiune).",
  "guide.g.client": "Client — cine beneficiază de intervenție.",
  "guide.g.locatie": "Locație — unde ai lucrat.",
  "guide.g.equipment": "Utilaj / model — ce echipament, produs sau tratament.",
  "guide.g.reclamatie": "Reclamație — ce a cerut / raportat clientul.",
  "guide.g.parts": "Piese — materiale consumate (denumire, cod, cant., preț).",
  "guide.g.dates": "Date — anunțare defecțiune și intervenție.",
  "guide.g.signatures": "Semnături — nume client și tehnician (text).",
  "guide.tipLang": "Sfat: schimbă limba în Setări — demo-urile și ghidul urmează limba aleasă.",
  "guide.back": "Înapoi la fișe",

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
  "login.firmExample": "PROFESSIONAL CLEANING EQUIPMENT LTD",
  "login.techExample": "James Wilson",
  "login.firmInfo": "Your service company name (shows on the PDF). The example is demo only — replace it.",
  "login.techInfo": "Technician name on the sheet. The example is demo only — replace it.",

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
  "form.pret": "Price {currency}",
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
  "pdf.defaultCompany": "PROFESSIONAL CLEANING EQUIPMENT LTD",

  "settings.title": "Company settings",
  "settings.companyName": "Company name",
  "settings.companyInfo": "Your service company name (shows on the PDF). The example is demo only — replace it.",
  "settings.cui": "Company No.",
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
  "settings.pdfHeader": "PDF header",
  "settings.pdfHeaderHint": "Company details and logo appear on the PDF sheet header.",
  "settings.pdfPreview": "Header preview",
  "settings.logoTip": "The logo appears on the left of the PDF header (auto-resized).",
  "settings.logoBusy": "Processing logo…",
  "settings.logoErr": "Could not load the logo. Try PNG or JPEG.",

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
  "dictate.listening": "Recording… · Tap to stop",
  "dictate.startAria": "Start dictation",
  "dictate.stopAria": "Stop dictation",
  "dictate.unsupported": "Audio recording is not available in this browser",
  "dictate.micDenied": "Allow microphone access for dictation.",
  "dictate.network": "Network error during transcription. Check your connection and try again.",
  "dictate.service": "Dictation service is not available.",
  "dictate.appendHint": "Text is appended to the end of the field",

  "dictate.networkRetry": "Network — retrying once…",
  "dictate.networkHint": "Dictation needs Chrome, internet and a microphone. You can record a voice note below.",
  "dictate.tapAgain": "Tap the microphone again",
  "dictate.voiceNote": "Record voice note",
  "dictate.voiceNoteStop": "Stop recording",
  "dictate.voiceNoteRecording": "Recording voice note…",
  "dictate.voiceNoteSaved": "Voice note saved on the sheet.",
  "dictate.transcribing": "Transcribing…",
  "dictate.missingKey": "GROQ_API_KEY is missing on the server. Add it to .env and restart.",
  "dictate.emptyTranscript": "No speech detected. Try again.",
  "dictate.tryBrowserSpeech": "Try browser speech",
  "form.audioNote": "Voice note",
  "pdf.audioNote": "Voice note",
  "fise.demosTitle": "Load real demo",
  "fise.demoCuratenie": "Cleaning equipment",
  "fise.demoTamplarie": "PVC / wood joinery",
  "fise.demoStoma": "Dental clinic",
  "fise.badge.curatenie": "Cleaning",
  "fise.badge.tamplarie": "Joinery",
  "fise.badge.stoma": "Dental",

  "nav.guide": "Guide",
  "settings.openGuide": "Open the guide",

  "fise.emptyCtaDemo": "Load a real demo",
  "fise.emptyCtaGuide": "Read the guide",
  "fise.emptyCtaNew": "New sheet",
  "fise.emptyFriendly": "Start with a sample in your language, read the short guide, or create a blank sheet.",

  "hint.tip": "Choose the job type (inspection, repair, service, commissioning).",
  "hint.client": "Company or person you are working for.",
  "hint.locatie": "Address / place where the work is done.",
  "hint.modelUtilaj": "Machine, product or treatment model (e.g. Nilfisk SC500).",
  "hint.reclamatie": "What the client reported / why they called — in plain words.",
  "hint.piese": "Parts or materials used: name, code, qty, price.",
  "hint.observatii": "What you did on site, briefing, next dates.",
  "hint.motiveInlocuire": "Why parts were replaced (wear, fault, clinical indication).",
  "hint.dates": "When the issue was reported and when you attended.",
  "hint.semnaturi": "Name of the person receiving the work and the technician.",

  "guide.title": "Quick guide",
  "guide.whatTitle": "What is Querra Sheet?",
  "guide.what": "A phone app for service / job sheets — fill on site, review, download PDF, works offline.",
  "guide.stepsTitle": "Steps",
  "guide.step1": "Sign in with company and technician name.",
  "guide.step2": "Load a real demo (in the current language) OR create a new sheet (text / dictate / photo).",
  "guide.step3": "Review and edit every field — manual review is required.",
  "guide.step4": "Save, then open PDF to preview / download.",
  "guide.glossaryTitle": "What each field means",
  "guide.g.tip": "Type — sheet type (inspection, repair, service, commissioning).",
  "guide.g.client": "Client — who receives the work.",
  "guide.g.locatie": "Location — where you worked.",
  "guide.g.equipment": "Machine / model — equipment, product or treatment.",
  "guide.g.reclamatie": "Complaint — what the client asked for / reported.",
  "guide.g.parts": "Parts — materials used (name, code, qty, price).",
  "guide.g.dates": "Dates — fault reported and intervention.",
  "guide.g.signatures": "Signatures — client and technician names (text).",
  "guide.tipLang": "Tip: change language in Settings — demos and this guide follow the chosen language.",
  "guide.back": "Back to sheets",

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
  "login.firmExample": "PROFESJONALNE MASZYNY CZYSZCZĄCE SP. Z O.O.",
  "login.techExample": "Jan Kowalski",
  "login.firmInfo": "Nazwa Twojej firmy serwisowej (na PDF). Przykład jest tylko demo — zamień go.",
  "login.techInfo": "Imię technika na karcie. Przykład jest tylko demo — zamień go.",

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
  "form.pret": "Cena {currency}",
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
  "pdf.defaultCompany": "PROFESJONALNE MASZYNY CZYSZCZĄCE SP. Z O.O.",

  "settings.title": "Ustawienia firmy",
  "settings.companyName": "Nazwa firmy",
  "settings.companyInfo": "Nazwa Twojej firmy serwisowej (na PDF). Przykład jest tylko demo — zamień go.",
  "settings.cui": "NIP",
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
  "settings.pdfHeader": "Nagłówek PDF",
  "settings.pdfHeaderHint": "Dane firmy i logo pojawiają się w nagłówku karty PDF.",
  "settings.pdfPreview": "Podgląd nagłówka",
  "settings.logoTip": "Logo pojawia się po lewej stronie nagłówka PDF (automatycznie skalowane).",
  "settings.logoBusy": "Przetwarzanie logo…",
  "settings.logoErr": "Nie udało się wczytać logo. Spróbuj PNG lub JPEG.",

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
  "dictate.listening": "Nagrywam… · Dotknij, by zatrzymać",
  "dictate.startAria": "Rozpocznij dyktowanie",
  "dictate.stopAria": "Zatrzymaj dyktowanie",
  "dictate.unsupported": "Nagrywanie dźwięku niedostępne w tej przeglądarce",
  "dictate.micDenied": "Zezwól na dostęp do mikrofonu do dyktowania.",
  "dictate.network": "Błąd sieci przy transkrypcji. Sprawdź połączenie i spróbuj ponownie.",
  "dictate.service": "Usługa dyktowania niedostępna.",
  "dictate.appendHint": "Tekst jest dodawany na końcu pola",

  "dictate.networkRetry": "Sieć — ponawiam raz…",
  "dictate.networkHint": "Dyktowanie wymaga Chrome, internetu i mikrofonu. Możesz nagrać notatkę głosową poniżej.",
  "dictate.tapAgain": "Dotknij mikrofonu ponownie",
  "dictate.voiceNote": "Nagraj notatkę głosową",
  "dictate.voiceNoteStop": "Zatrzymaj nagrywanie",
  "dictate.voiceNoteRecording": "Nagrywanie notatki głosowej…",
  "dictate.voiceNoteSaved": "Notatka głosowa zapisana na karcie.",
  "dictate.transcribing": "Trwa transkrypcja…",
  "dictate.missingKey": "Brak GROQ_API_KEY na serwerze. Dodaj klucz do .env i uruchom ponownie.",
  "dictate.emptyTranscript": "Nie wykryto mowy. Spróbuj ponownie.",
  "dictate.tryBrowserSpeech": "Spróbuj dyktowania w przeglądarce",
  "form.audioNote": "Notatka głosowa",
  "pdf.audioNote": "Notatka głosowa",
  "fise.demosTitle": "Wczytaj demo realne",
  "fise.demoCuratenie": "Sprzęt czyszczący",
  "fise.demoTamplarie": "Stolarka PVC / drewno",
  "fise.demoStoma": "Gabinet stomatologiczny",
  "fise.badge.curatenie": "Czyszczenie",
  "fise.badge.tamplarie": "Stolarka",
  "fise.badge.stoma": "Stoma",

  "nav.guide": "Przewodnik",
  "settings.openGuide": "Otwórz przewodnik",

  "fise.emptyCtaDemo": "Wczytaj demo realne",
  "fise.emptyCtaGuide": "Przeczytaj przewodnik",
  "fise.emptyCtaNew": "Nowa karta",
  "fise.emptyFriendly": "Zacznij od przykładu w Twoim języku, przeczytaj krótki przewodnik lub utwórz pustą kartę.",

  "hint.tip": "Wybierz typ zlecenia (ekspertyza, naprawa, przegląd, uruchomienie).",
  "hint.client": "Firma lub osoba, dla której pracujesz.",
  "hint.locatie": "Adres / miejsce wykonania pracy.",
  "hint.modelUtilaj": "Model maszyny, produktu lub zabiegu (np. Kärcher B 60).",
  "hint.reclamatie": "Co zgłosił klient / powód wizyty — prostymi słowami.",
  "hint.piese": "Części lub materiały: nazwa, kod, ilość, cena.",
  "hint.observatii": "Co zrobiłeś na miejscu, instruktaż, kolejne terminy.",
  "hint.motiveInlocuire": "Dlaczego wymieniono części (zużycie, usterka, wskazanie kliniczne).",
  "hint.dates": "Kiedy zgłoszono problem i kiedy była interwencja.",
  "hint.semnaturi": "Imię osoby odbierającej i technika.",

  "guide.title": "Szybki przewodnik",
  "guide.whatTitle": "Czym jest Querra Karta?",
  "guide.what": "Aplikacja w telefonie do kart serwisowych / zleceń — wypełniasz w terenie, weryfikujesz, pobierasz PDF, działa offline.",
  "guide.stepsTitle": "Kroki",
  "guide.step1": "Zaloguj się nazwą firmy i imieniem technika.",
  "guide.step2": "Wczytaj demo realne (w bieżącym języku) LUB utwórz nową kartę (tekst / dyktowanie / zdjęcie).",
  "guide.step3": "Sprawdź i edytuj wszystkie pola — przegląd jest obowiązkowy.",
  "guide.step4": "Zapisz, potem otwórz PDF do podglądu / pobrania.",
  "guide.glossaryTitle": "Co oznacza każde pole",
  "guide.g.tip": "Typ — typ karty (ekspertyza, naprawa, przegląd, uruchomienie).",
  "guide.g.client": "Klient — kto otrzymuje usługę.",
  "guide.g.locatie": "Lokalizacja — gdzie pracowałeś.",
  "guide.g.equipment": "Maszyna / model — sprzęt, produkt lub zabieg.",
  "guide.g.reclamatie": "Reklamacja — czego zażądał / zgłosił klient.",
  "guide.g.parts": "Części — zużyte materiały (nazwa, kod, ilość, cena).",
  "guide.g.dates": "Daty — zgłoszenie usterki i interwencja.",
  "guide.g.signatures": "Podpisy — imiona klienta i technika (tekst).",
  "guide.tipLang": "Wskazówka: zmień język w Ustawieniach — dema i ten przewodnik podążają za wybranym językiem.",
  "guide.back": "Wróć do kart",

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
  dateLang: string;
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
      document.documentElement.setAttribute("lang", locale);
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
      dateLang: DATE_LANG[locale],
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
