/**
 * Human-readable field labels for the Nyelvesítés / UiCopy editor.
 * Technical keys stay visible as a subtitle; missing entries fall back to humanize.
 */

type LabelSet = { hu: string; en: string; de: string };

/** General-section keys (common / cookie / error / offline / validation). */
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

function humanizeUiCopyKey(key: string): string {
  const parts = key.split(".");
  const leaf = parts[parts.length - 1] ?? key;
  const words = leaf.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  const titled = words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
  if (parts.length <= 1) return titled;
  return `${parts.slice(0, -1).join(".")} · ${titled}`;
}

/** Resolve editor field label for the active admin UI language. */
export function uiCopyFieldLabel(key: string, uiLang: string): string {
  const row = UI_COPY_KEY_LABELS[key];
  if (row) {
    const code = (uiLang.split("-")[0] || "hu") as keyof LabelSet;
    return row[code] || row.hu || row.en;
  }
  return humanizeUiCopyKey(key);
}
