/**
 * Human-readable field labels for the Nyelvesítés / UiCopy editor.
 * Exact catalog for shared UI keys; path/leaf dictionaries + fallback for the rest
 * so editors never show raw dotted keys as the primary title.
 */

type LabelSet = { hu: string; en: string; de: string };

function pick(row: LabelSet, lang: string): string {
  const code = (lang.split("-")[0] || "hu") as keyof LabelSet;
  return row[code] || row.hu || row.en;
}

/** Exact overrides (shared UI / general section). */
export const UI_COPY_KEY_LABELS: Record<string, LabelSet> = {
  "common.loading": { hu: "Betöltés", en: "Loading", de: "Laden" },
  "common.error": { hu: "Általános hiba", en: "Generic error", de: "Allgemeiner Fehler" },
  "common.save": { hu: "Mentés gomb", en: "Save button", de: "Speichern-Schaltfläche" },
  "common.cancel": { hu: "Mégse gomb", en: "Cancel button", de: "Abbrechen-Schaltfläche" },
  "common.confirm": { hu: "Megerősítés gomb", en: "Confirm button", de: "Bestätigen-Schaltfläche" },
  "common.close": { hu: "Bezárás gomb", en: "Close button", de: "Schließen-Schaltfläche" },
  "common.delete": { hu: "Törlés gomb", en: "Delete button", de: "Löschen-Schaltfläche" },
  "common.edit": { hu: "Szerkesztés gomb", en: "Edit button", de: "Bearbeiten-Schaltfläche" },
  "common.create": { hu: "Létrehozás gomb", en: "Create button", de: "Erstellen-Schaltfläche" },
  "common.update": { hu: "Frissítés gomb", en: "Update button", de: "Aktualisieren-Schaltfläche" },
  "common.active": { hu: "Aktív állapot", en: "Active state", de: "Aktiver Status" },
  "common.inactive": { hu: "Inaktív állapot", en: "Inactive state", de: "Inaktiver Status" },
  "common.name": { hu: "Név mező", en: "Name field", de: "Namensfeld" },
  "common.description": { hu: "Leírás mező", en: "Description field", de: "Beschreibungsfeld" },
  "common.search": { hu: "Keresés", en: "Search", de: "Suche" },
  "common.skipToContent": { hu: "Ugrás a tartalomra (a11y)", en: "Skip to content (a11y)", de: "Zum Inhalt springen (a11y)" },
  "common.expand": { hu: "Kinyitás", en: "Expand", de: "Aufklappen" },
  "common.collapse": { hu: "Bezárás (összecsukás)", en: "Collapse", de: "Zuklappen" },
  "common.filter": { hu: "Szűrés", en: "Filter", de: "Filter" },
  "common.actions": { hu: "Műveletek", en: "Actions", de: "Aktionen" },
  "common.siteName": { hu: "Régió neve (üres = dinamikus)", en: "Site name (empty = dynamic)", de: "Regionsname (leer = dynamisch)" },
  "common.title": { hu: "Cím mező", en: "Title field", de: "Titelfeld" },
  "common.image": { hu: "Kép mező", en: "Image field", de: "Bildfeld" },
  "common.none": { hu: "Üres / nincs érték", en: "None / empty", de: "Keine / leer" },
  "common.openingHoursEditor": { hu: "Nyitvatartás szerkesztő — cím", en: "Opening hours editor — title", de: "Öffnungszeiten-Editor — Titel" },
  "common.openingHoursHint": { hu: "Nyitvatartás szerkesztő — súgó", en: "Opening hours editor — hint", de: "Öffnungszeiten-Editor — Hinweis" },
  "common.dayOfWeek.0": { hu: "Nap neve — hétfő", en: "Weekday — Monday", de: "Wochentag — Montag" },
  "common.dayOfWeek.1": { hu: "Nap neve — kedd", en: "Weekday — Tuesday", de: "Wochentag — Dienstag" },
  "common.dayOfWeek.2": { hu: "Nap neve — szerda", en: "Weekday — Wednesday", de: "Wochentag — Mittwoch" },
  "common.dayOfWeek.3": { hu: "Nap neve — csütörtök", en: "Weekday — Thursday", de: "Wochentag — Donnerstag" },
  "common.dayOfWeek.4": { hu: "Nap neve — péntek", en: "Weekday — Friday", de: "Wochentag — Freitag" },
  "common.dayOfWeek.5": { hu: "Nap neve — szombat", en: "Weekday — Saturday", de: "Wochentag — Samstag" },
  "common.dayOfWeek.6": { hu: "Nap neve — vasárnap", en: "Weekday — Sunday", de: "Wochentag — Sonntag" },
  "common.openTime": { hu: "Nyitás ideje", en: "Opening time", de: "Öffnungszeit" },
  "common.closeTime": { hu: "Zárás ideje", en: "Closing time", de: "Schließzeit" },
  "common.closed": { hu: "Zárva jelölés", en: "Closed label", de: "Geschlossen-Label" },
  "common.isRainSafe": { hu: "Esőbiztos program — címke", en: "Rain-safe event — label", de: "Regensicher — Label" },
  "common.isRainSafeHint": { hu: "Esőbiztos program — súgó", en: "Rain-safe event — hint", de: "Regensicher — Hinweis" },
  "common.yes": { hu: "Igen", en: "Yes", de: "Ja" },
  "common.no": { hu: "Nem", en: "No", de: "Nein" },
  "common.language": { hu: "Nyelv", en: "Language", de: "Sprache" },
  "common.optional": { hu: "Opcionális jelölés", en: "Optional marker", de: "Optional-Markierung" },
  "common.selectSite": { hu: "Régió választó — üres állapot", en: "Site picker — empty state", de: "Regionsauswahl — leer" },
  "common.uploading": { hu: "Feltöltés folyamatban", en: "Upload in progress", de: "Upload läuft" },
  "common.remove": { hu: "Eltávolítás", en: "Remove", de: "Entfernen" },
  "common.newVersionAvailable": { hu: "Új verzió elérhető", en: "New version available", de: "Neue Version verfügbar" },
  "common.back": { hu: "Vissza", en: "Back", de: "Zurück" },
  "common.goBack": { hu: "Vissza (alternatív)", en: "Go back (alt)", de: "Zurück (alt)" },
  "common.premiumFeature": { hu: "Prémium funkció jelölés", en: "Premium feature badge", de: "Premium-Funktion" },

  "cookieConsent.message": { hu: "Süti banner — szöveg", en: "Cookie banner — message", de: "Cookie-Banner — Text" },
  "cookieConsent.acceptedMessage": { hu: "Süti banner — elfogadva", en: "Cookie banner — accepted", de: "Cookie-Banner — akzeptiert" },
  "cookieConsent.accept": { hu: "Süti banner — elfogadás", en: "Cookie banner — accept", de: "Cookie-Banner — akzeptieren" },
  "cookieConsent.later": { hu: "Süti banner — később", en: "Cookie banner — later", de: "Cookie-Banner — später" },
  "cookieConsent.ok": { hu: "Süti banner — OK", en: "Cookie banner — OK", de: "Cookie-Banner — OK" },
  "cookieConsent.settings": { hu: "Süti beállítások link", en: "Cookie settings link", de: "Cookie-Einstellungen" },
  "cookieConsent.close": { hu: "Süti banner — bezárás", en: "Cookie banner — close", de: "Cookie-Banner — schließen" },

  "error.pageNotFound": { hu: "404 — cím", en: "404 — title", de: "404 — Titel" },
  "error.pageNotFoundDescription": { hu: "404 — leírás", en: "404 — description", de: "404 — Beschreibung" },
  "error.errorOccurred": { hu: "Hiba történt — cím", en: "Error occurred — title", de: "Fehler aufgetreten — Titel" },
  "error.unknownError": { hu: "Ismeretlen hiba", en: "Unknown error", de: "Unbekannter Fehler" },
  "error.badRequest": { hu: "400 — hibás kérés", en: "400 — bad request", de: "400 — ungültige Anfrage" },
  "error.unauthorized": { hu: "401 — nincs jogosultság", en: "401 — unauthorized", de: "401 — nicht autorisiert" },
  "error.forbidden": { hu: "403 — hozzáférés megtagadva", en: "403 — forbidden", de: "403 — verboten" },
  "error.notFound": { hu: "404 — nem található", en: "404 — not found", de: "404 — nicht gefunden" },
  "error.internalServerError": { hu: "500 — belső szerverhiba", en: "500 — internal server error", de: "500 — interner Serverfehler" },
  "error.serverErrorDescription": { hu: "Szerverhiba — leírás", en: "Server error — description", de: "Serverfehler — Beschreibung" },
  "error.badGateway": { hu: "502 — hibás átjáró", en: "502 — bad gateway", de: "502 — Bad Gateway" },
  "error.serviceUnavailable": { hu: "503 — szolgáltatás nem elérhető", en: "503 — service unavailable", de: "503 — Dienst nicht verfügbar" },
  "error.goHome": { hu: "Hibaoldal — főoldal gomb", en: "Error page — home button", de: "Fehlerseite — Startseite" },
  "error.goBack": { hu: "Hibaoldal — vissza gomb", en: "Error page — back button", de: "Fehlerseite — zurück" },
  "error.reload": { hu: "Hibaoldal — újratöltés", en: "Error page — reload", de: "Fehlerseite — neu laden" },
  "error.errorDetails": { hu: "Hiba részletei", en: "Error details", de: "Fehlerdetails" },
  "error.siteNotFound": { hu: "Régió nem található — cím", en: "Site not found — title", de: "Region nicht gefunden — Titel" },
  "error.siteNotFoundMessage": { hu: "Régió nem található — üzenet", en: "Site not found — message", de: "Region nicht gefunden — Text" },
  "error.backToSites": { hu: "Vissza a régiókhoz", en: "Back to sites", de: "Zurück zu den Regionen" },
  "error.visitorHold": { hu: "Látogatói térkép szünet", en: "Visitor map hold", de: "Besucherkarte pausiert" },

  "offline.title": { hu: "Offline oldal — cím", en: "Offline page — title", de: "Offline-Seite — Titel" },
  "offline.message": { hu: "Offline oldal — üzenet", en: "Offline page — message", de: "Offline-Seite — Text" },
  "offline.joke": { hu: "Offline oldal — humoros sor", en: "Offline page — joke line", de: "Offline-Seite — Scherzzeile" },
  "offline.retry": { hu: "Offline oldal — újrapróbálás", en: "Offline page — retry", de: "Offline-Seite — erneut versuchen" },

  "validation.required": { hu: "Validáció — kötelező mező", en: "Validation — required", de: "Validierung — Pflichtfeld" },
  "validation.invalidEmail": { hu: "Validáció — email", en: "Validation — email", de: "Validierung — E-Mail" },
  "validation.invalidUrl": { hu: "Validáció — URL", en: "Validation — URL", de: "Validierung — URL" },
  "validation.invalidImageUrl": { hu: "Validáció — kép URL", en: "Validation — image URL", de: "Validierung — Bild-URL" },
  "validation.minLength": { hu: "Validáció — min. hossz", en: "Validation — min length", de: "Validierung — Min. Länge" },
  "validation.maxLength": { hu: "Validáció — max. hossz", en: "Validation — max length", de: "Validierung — Max. Länge" },
};

/** Longest-prefix wins (e.g. public.overview.demo before public.overview). */
const PATH_PREFIX_LABELS: Record<string, LabelSet> = {
  "public.overview.demo": { hu: "Áttekintő · Demó űrlap", en: "Overview · Demo form", de: "Übersicht · Demo-Formular" },
  "public.overview.plans.quote": {
    hu: "Áttekintő · Önkormányzati ajánlat",
    en: "Overview · Municipal quote",
    de: "Übersicht · Gemeinde-Angebot",
  },
  "public.overview.plans.municipal": {
    hu: "Áttekintő · Önkormányzati csomag",
    en: "Overview · Municipal plan",
    de: "Übersicht · Gemeinde-Paket",
  },
  "public.overview.plans.free": { hu: "Áttekintő · Free csomag", en: "Overview · Free plan", de: "Übersicht · Free-Paket" },
  "public.overview.plans.basic": { hu: "Áttekintő · Basic csomag", en: "Overview · Basic plan", de: "Übersicht · Basic-Paket" },
  "public.overview.plans.premium": {
    hu: "Áttekintő · Premium csomag",
    en: "Overview · Premium plan",
    de: "Übersicht · Premium-Paket",
  },
  "public.overview.plans": { hu: "Áttekintő · Csomagok", en: "Overview · Plans", de: "Übersicht · Pakete" },
  "public.overview.faq": { hu: "Áttekintő · GYIK", en: "Overview · FAQ", de: "Übersicht · FAQ" },
  "public.overview.stories": { hu: "Áttekintő · Történetek", en: "Overview · Stories", de: "Übersicht · Stories" },
  "public.overview.features": { hu: "Áttekintő · Funkciók", en: "Overview · Features", de: "Übersicht · Funktionen" },
  "public.overview.steps": { hu: "Áttekintő · Lépések", en: "Overview · Steps", de: "Übersicht · Schritte" },
  "public.overview.difference": {
    hu: "Áttekintő · Miért más",
    en: "Overview · Difference",
    de: "Übersicht · Unterschied",
  },
  "public.overview": { hu: "Áttekintő", en: "Overview", de: "Übersicht" },
  "public.pricing": { hu: "Árazás", en: "Pricing", de: "Preise" },
  "public.legal": { hu: "Jogi", en: "Legal", de: "Rechtliches" },
  "public.visitorAuth": { hu: "Látogatói belépés", en: "Visitor auth", de: "Besucher-Login" },
  public: { hu: "Publikus UI", en: "Public UI", de: "Öffentliche UI" },
  admin: { hu: "Admin", en: "Admin", de: "Admin" },
};

/** Single path segment labels (middle or leaf-ish ids). */
const SEGMENT_LABELS: Record<string, LabelSet> = {
  overview: { hu: "Áttekintő", en: "Overview", de: "Übersicht" },
  demo: { hu: "Demó", en: "Demo", de: "Demo" },
  plans: { hu: "Csomagok", en: "Plans", de: "Pakete" },
  quote: { hu: "Ajánlatkérés", en: "Quote", de: "Angebot" },
  municipal: { hu: "Önkormányzat", en: "Municipal", de: "Gemeinde" },
  free: { hu: "Free", en: "Free", de: "Free" },
  basic: { hu: "Basic", en: "Basic", de: "Basic" },
  premium: { hu: "Premium", en: "Premium", de: "Premium" },
  faq: { hu: "GYIK", en: "FAQ", de: "FAQ" },
  stories: { hu: "Történetek", en: "Stories", de: "Stories" },
  features: { hu: "Funkciók", en: "Features", de: "Funktionen" },
  steps: { hu: "Lépések", en: "Steps", de: "Schritte" },
  difference: { hu: "Különbség", en: "Difference", de: "Unterschied" },
  pricing: { hu: "Árazás", en: "Pricing", de: "Preise" },
  legal: { hu: "Jogi", en: "Legal", de: "Rechtliches" },
  wizard: { hu: "Wizard", en: "Wizard", de: "Assistent" },
  dashboard: { hu: "Irányítópult", en: "Dashboard", de: "Dashboard" },
  places: { hu: "Helyek", en: "Places", de: "Orte" },
  events: { hu: "Programok", en: "Events", de: "Termine" },
  towns: { hu: "Települések", en: "Towns", de: "Gemeinden" },
  sites: { hu: "Régiók", en: "Sites", de: "Regionen" },
  users: { hu: "Felhasználók", en: "Users", de: "Benutzer" },
  profile: { hu: "Profil", en: "Profile", de: "Profil" },
  i18n: { hu: "Nyelvesítés", en: "Localization", de: "Lokalisierung" },
  contentDraft: { hu: "AI szöveg", en: "AI draft", de: "KI-Entwurf" },
  floorplan: { hu: "Alaprajz", en: "Floorplan", de: "Grundriss" },
  galleries: { hu: "Galériák", en: "Galleries", de: "Galerien" },
  collections: { hu: "Gyűjtemények", en: "Collections", de: "Sammlungen" },
  subscription: { hu: "Előfizetés", en: "Subscription", de: "Abo" },
  twoFactor: { hu: "Kétlépcsős", en: "Two-factor", de: "Zwei-Faktor" },
  catalog: { hu: "Katalógus", en: "Catalog", de: "Katalog" },
  errors: { hu: "Hibák", en: "Errors", de: "Fehler" },
  mobile: { hu: "Mobil", en: "Mobile", de: "Mobil" },
  maker: { hu: "Készítő", en: "Maker", de: "Macher" },
  service: { hu: "Szolgáltatás", en: "Service", de: "Service" },
  quiet: { hu: "Csendes", en: "Quiet", de: "Ruhig" },
  civic: { hu: "Közösségi", en: "Civic", de: "Bürgerlich" },
  town: { hu: "Település", en: "Town", de: "Gemeinde" },
  app: { hu: "App", en: "App", de: "App" },
  languages: { hu: "Nyelvek", en: "Languages", de: "Sprachen" },
  editors: { hu: "Szerkesztők", en: "Editors", de: "Editoren" },
  maps: { hu: "Térképek", en: "Maps", de: "Karten" },
  hidden: { hu: "Rejtett", en: "Hidden", de: "Versteckt" },
  traffic: { hu: "Forgalom", en: "Traffic", de: "Traffic" },
  region: { hu: "Régió", en: "Region", de: "Region" },
  collect: { hu: "Gyűjtés", en: "Collect", de: "Sammeln" },
  publish: { hu: "Publikálás", en: "Publish", de: "Veröffentlichen" },
  share: { hu: "Megosztás", en: "Share", de: "Teilen" },
  map: { hu: "Térkép", en: "Map", de: "Karte" },
  place: { hu: "Hely", en: "Place", de: "Ort" },
};

/** Full leaf keys (last segment). */
const LEAF_LABELS: Record<string, LabelSet> = {
  title: { hu: "Cím", en: "Title", de: "Titel" },
  subtitle: { hu: "Alcím", en: "Subtitle", de: "Untertitel" },
  description: { hu: "Leírás", en: "Description", de: "Beschreibung" },
  text: { hu: "Szöveg", en: "Text", de: "Text" },
  lead: { hu: "Bevezető", en: "Lead", de: "Lead" },
  kicker: { hu: "Kicker", en: "Kicker", de: "Kicker" },
  eyebrow: { hu: "Eyebrow", en: "Eyebrow", de: "Eyebrow" },
  cta: { hu: "Fő gomb", en: "Primary CTA", de: "Haupt-CTA" },
  ctaSecondary: { hu: "Másodlagos gomb", en: "Secondary CTA", de: "Zweiter CTA" },
  alt: { hu: "Kép alt szöveg", en: "Image alt", de: "Bild-Alt" },
  q: { hu: "Kérdés", en: "Question", de: "Frage" },
  a: { hu: "Válasz", en: "Answer", de: "Antwort" },
  name: { hu: "Név", en: "Name", de: "Name" },
  email: { hu: "Email", en: "Email", de: "E-Mail" },
  phone: { hu: "Telefon", en: "Phone", de: "Telefon" },
  message: { hu: "Üzenet", en: "Message", de: "Nachricht" },
  organization: { hu: "Szervezet", en: "Organization", de: "Organisation" },
  optional: { hu: "Opcionális jelölés", en: "Optional", de: "Optional" },
  submit: { hu: "Beküldés gomb", en: "Submit", de: "Absenden" },
  sending: { hu: "Küldés folyamatban", en: "Sending", de: "Senden…" },
  failed: { hu: "Hibaüzenet", en: "Error message", de: "Fehlermeldung" },
  required: { hu: "Kötelező mező", en: "Required", de: "Pflichtfeld" },
  invalidEmail: { hu: "Érvénytelen email", en: "Invalid email", de: "Ungültige E-Mail" },
  invalidPhone: { hu: "Érvénytelen telefon", en: "Invalid phone", de: "Ungültige Telefonnr." },
  placeholderName: { hu: "Név placeholder", en: "Name placeholder", de: "Name-Platzhalter" },
  placeholderEmail: { hu: "Email placeholder", en: "Email placeholder", de: "E-Mail-Platzhalter" },
  placeholderPhone: { hu: "Telefon placeholder", en: "Phone placeholder", de: "Telefon-Platzhalter" },
  placeholderOrganization: {
    hu: "Szervezet placeholder",
    en: "Organization placeholder",
    de: "Organisations-Platzhalter",
  },
  placeholderMessage: { hu: "Üzenet placeholder", en: "Message placeholder", de: "Nachrichten-Platzhalter" },
  sentTitle: { hu: "Elküldve — cím", en: "Sent — title", de: "Gesendet — Titel" },
  sentLead: { hu: "Elküldve — szöveg", en: "Sent — lead", de: "Gesendet — Text" },
  storedTitle: { hu: "Mentve — cím", en: "Stored — title", de: "Gespeichert — Titel" },
  storedLead: { hu: "Mentve — szöveg", en: "Stored — lead", de: "Gespeichert — Text" },
  noRecipientTitle: { hu: "Nincs címzett — cím", en: "No recipient — title", de: "Kein Empfänger — Titel" },
  noRecipientLead: { hu: "Nincs címzett — szöveg", en: "No recipient — lead", de: "Kein Empfänger — Text" },
  trust: { hu: "Bizalmi szöveg", en: "Trust line", de: "Vertrauenszeile" },
  pitch: { hu: "Pitch", en: "Pitch", de: "Pitch" },
  badge: { hu: "Badge", en: "Badge", de: "Badge" },
  domain: { hu: "Domain sor", en: "Domain line", de: "Domain-Zeile" },
  price: { hu: "Ár", en: "Price", de: "Preis" },
  priceUnit: { hu: "Ár egység", en: "Price unit", de: "Preiseinheit" },
  freeForever: { hu: "Ingyenes megjegyzés", en: "Free note", de: "Gratis-Hinweis" },
  eventsNone: { hu: "Nincs program limit szöveg", en: "No events line", de: "Keine Termine" },
  languagesOne: { hu: "Egy nyelv szöveg", en: "One language line", de: "Eine Sprache" },
  intro: { hu: "Bevezető", en: "Intro", de: "Intro" },
  introP1: { hu: "Bevezető 1. bekezdés", en: "Intro paragraph 1", de: "Intro Absatz 1" },
  introP2: { hu: "Bevezető 2. bekezdés", en: "Intro paragraph 2", de: "Intro Absatz 2" },
  closingTitle: { hu: "Záró blokk — cím", en: "Closing — title", de: "Abschluss — Titel" },
  closingText: { hu: "Záró blokk — szöveg", en: "Closing — text", de: "Abschluss — Text" },
  closingImageAlt: { hu: "Záró kép alt", en: "Closing image alt", de: "Abschlussbild-Alt" },
  storiesTitle: { hu: "Történetek — cím", en: "Stories — title", de: "Stories — Titel" },
  storiesLead: { hu: "Történetek — bevezető", en: "Stories — lead", de: "Stories — Lead" },
  featuresTitle: { hu: "Funkciók — cím", en: "Features — title", de: "Funktionen — Titel" },
  featuresLead: { hu: "Funkciók — bevezető", en: "Features — lead", de: "Funktionen — Lead" },
  stepsTitle: { hu: "Lépések — cím", en: "Steps — title", de: "Schritte — Titel" },
  faqTitle: { hu: "GYIK — cím", en: "FAQ — title", de: "FAQ — Titel" },
  plansTitle: { hu: "Csomagok — cím", en: "Plans — title", de: "Pakete — Titel" },
  plansLead: { hu: "Csomagok — bevezető", en: "Plans — lead", de: "Pakete — Lead" },
  differenceTitle: { hu: "Különbség — cím", en: "Difference — title", de: "Unterschied — Titel" },
  differenceLead: { hu: "Különbség — bevezető", en: "Difference — lead", de: "Unterschied — Lead" },
  differenceKicker: { hu: "Különbség — kicker", en: "Difference — kicker", de: "Unterschied — Kicker" },
  seoTitle: { hu: "SEO cím", en: "SEO title", de: "SEO-Titel" },
  seoDescription: { hu: "SEO leírás", en: "SEO description", de: "SEO-Beschreibung" },
  keywords: { hu: "Kulcsszavak", en: "Keywords", de: "Keywords" },
  menu: { hu: "Menü / szekció címke", en: "Menu label", de: "Menü-Label" },
  shotCaption: { hu: "Hero kép alt", en: "Hero shot alt", de: "Hero-Alt" },
  shotLabel: { hu: "Hero felirat", en: "Hero caption", de: "Hero-Beschriftung" },
  statsLanguages: { hu: "Stat — nyelvek címke", en: "Stats — languages", de: "Stats — Sprachen" },
  statsLanguagesValue: { hu: "Stat — nyelvek érték", en: "Stats — languages value", de: "Stats — Sprachen-Wert" },
  statsMap: { hu: "Stat — térkép címke", en: "Stats — map", de: "Stats — Karte" },
  statsMapValue: { hu: "Stat — térkép érték", en: "Stats — map value", de: "Stats — Karten-Wert" },
  statsApp: { hu: "Stat — app címke", en: "Stats — app", de: "Stats — App" },
  statsAppValue: { hu: "Stat — app érték", en: "Stats — app value", de: "Stats — App-Wert" },
  save: { hu: "Mentés", en: "Save", de: "Speichern" },
  saved: { hu: "Mentve", en: "Saved", de: "Gespeichert" },
  saving: { hu: "Mentés folyamatban", en: "Saving", de: "Speichern…" },
  delete: { hu: "Törlés", en: "Delete", de: "Löschen" },
  deleted: { hu: "Törölve", en: "Deleted", de: "Gelöscht" },
  deleteConfirm: { hu: "Törlés megerősítés", en: "Delete confirm", de: "Löschen bestätigen" },
  edit: { hu: "Szerkesztés", en: "Edit", de: "Bearbeiten" },
  add: { hu: "Hozzáadás", en: "Add", de: "Hinzufügen" },
  empty: { hu: "Üres állapot", en: "Empty state", de: "Leerzustand" },
  loading: { hu: "Betöltés", en: "Loading", de: "Laden" },
  help: { hu: "Súgó", en: "Help", de: "Hilfe" },
  hint: { hu: "Tipp", en: "Hint", de: "Hinweis" },
  search: { hu: "Keresés", en: "Search", de: "Suche" },
  searchPlaceholder: { hu: "Keresés placeholder", en: "Search placeholder", de: "Such-Platzhalter" },
  cancel: { hu: "Mégse", en: "Cancel", de: "Abbrechen" },
  next: { hu: "Tovább", en: "Next", de: "Weiter" },
  back: { hu: "Vissza", en: "Back", de: "Zurück" },
  close: { hu: "Bezárás", en: "Close", de: "Schließen" },
  error: { hu: "Hiba", en: "Error", de: "Fehler" },
  active: { hu: "Aktív", en: "Active", de: "Aktiv" },
  status: { hu: "Státusz", en: "Status", de: "Status" },
  plan: { hu: "Csomag", en: "Plan", de: "Paket" },
  contactName: { hu: "Kapcsolattartó neve", en: "Contact name", de: "Kontaktname" },
  placeholderContactName: {
    hu: "Kapcsolattartó placeholder",
    en: "Contact placeholder",
    de: "Kontakt-Platzhalter",
  },
  organizationRequired: { hu: "Szervezet kötelező", en: "Organization required", de: "Organisation Pflicht" },
  contactRequired: { hu: "Kapcsolattartó kötelező", en: "Contact required", de: "Kontakt Pflicht" },
  messageShort: { hu: "Üzenet túl rövid", en: "Message too short", de: "Nachricht zu kurz" },
};

/** CamelCase / unknown leaf word pieces. */
const WORD_LABELS: Record<string, LabelSet> = {
  failed: { hu: "hiba", en: "failed", de: "fehler" },
  invalid: { hu: "érvénytelen", en: "invalid", de: "ungültig" },
  email: { hu: "email", en: "email", de: "E-Mail" },
  phone: { hu: "telefon", en: "phone", de: "Telefon" },
  placeholder: { hu: "placeholder", en: "placeholder", de: "Platzhalter" },
  title: { hu: "cím", en: "title", de: "Titel" },
  lead: { hu: "bevezető", en: "lead", de: "Lead" },
  sent: { hu: "elküldve", en: "sent", de: "gesendet" },
  stored: { hu: "mentve", en: "stored", de: "gespeichert" },
  recipient: { hu: "címzett", en: "recipient", de: "Empfänger" },
  no: { hu: "nincs", en: "no", de: "kein" },
  free: { hu: "ingyenes", en: "free", de: "gratis" },
  forever: { hu: "örökre", en: "forever", de: "dauerhaft" },
  secondary: { hu: "másodlagos", en: "secondary", de: "sekundär" },
  closing: { hu: "záró", en: "closing", de: "Abschluss" },
  image: { hu: "kép", en: "image", de: "Bild" },
  alt: { hu: "alt", en: "alt", de: "Alt" },
  confirm: { hu: "megerősítés", en: "confirm", de: "Bestätigung" },
  delete: { hu: "törlés", en: "delete", de: "Löschen" },
  load: { hu: "betöltés", en: "load", de: "Laden" },
  save: { hu: "mentés", en: "save", de: "Speichern" },
};

const SKIP_ROOT = new Set(["public", "admin", "common", "cookieConsent", "error", "offline", "validation"]);

function titleCaseWords(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function labelUnknownLeaf(leaf: string, lang: string): string {
  const tokens = leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const mapped = tokens.map((token) => {
    const lower = token.toLowerCase();
    const row = WORD_LABELS[lower];
    if (row) return pick(row, lang);
    return token;
  });
  return titleCaseWords(mapped.join(" "));
}

function labelSegment(segment: string, lang: string, isLeaf: boolean): string {
  if (isLeaf && LEAF_LABELS[segment]) return pick(LEAF_LABELS[segment], lang);
  if (SEGMENT_LABELS[segment]) return pick(SEGMENT_LABELS[segment], lang);
  if (isLeaf) return labelUnknownLeaf(segment, lang);
  return labelUnknownLeaf(segment, lang);
}

function longestPathPrefix(key: string): { prefix: string; label: LabelSet } | null {
  let best: { prefix: string; label: LabelSet } | null = null;
  for (const [prefix, label] of Object.entries(PATH_PREFIX_LABELS)) {
    if (key === prefix || key.startsWith(`${prefix}.`)) {
      if (!best || prefix.length > best.prefix.length) best = { prefix, label };
    }
  }
  return best;
}

function composeLabel(key: string, lang: string): string {
  const hit = longestPathPrefix(key);
  if (hit) {
    if (key === hit.prefix) return pick(hit.label, lang);
    const rest = key.slice(hit.prefix.length + 1);
    const parts = rest.split(".").filter(Boolean);
    const labeled = parts.map((part, index) =>
      labelSegment(part, lang, index === parts.length - 1)
    );
    return `${pick(hit.label, lang)} — ${labeled.join(" · ")}`;
  }

  const parts = key.split(".").filter(Boolean);
  const meaningful = parts[0] && SKIP_ROOT.has(parts[0]) ? parts.slice(1) : parts;
  if (!meaningful.length) return key;
  const labeled = meaningful.map((part, index) =>
    labelSegment(part, lang, index === meaningful.length - 1)
  );
  return labeled.join(" — ");
}

/** Resolve editor field label for the active admin UI language. */
export function uiCopyFieldLabel(key: string, uiLang: string): string {
  const exact = UI_COPY_KEY_LABELS[key];
  if (exact) return pick(exact, uiLang);
  return composeLabel(key, uiLang);
}
