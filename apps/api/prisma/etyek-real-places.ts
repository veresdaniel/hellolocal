/**
 * Curated real Etyek–Budai venues + Wikimedia Commons image URLs (CC BY-SA).
 * Used by scripts/bootstrap-etyek-real.ts — not by prisma db seed.
 */

export type Hours = { open: string; close: string; closed: number[] };

export type PlaceCopy = {
  name: string;
  short: string;
  body: string;
  address: string;
  hoursLabel: string;
};

export type CommonsImage = {
  url: string;
  thumbUrl?: string;
  alt: string;
  /** Short credit for gallery caption / extras */
  credit: string;
  license: string;
  sourcePage: string;
};

export type RealPlace = {
  /** Stable key used for gallery name + extras */
  key: string;
  categoryHu: "Borászat" | "Vendéglátás" | "Látnivaló" | "Piac" | "Kézműves" | "Szállás" | "Szolgáltatás";
  lat: number;
  lng: number;
  hours: Hours;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  hero: CommonsImage;
  mapImage?: CommonsImage;
  gallery: CommonsImage[];
  hu: PlaceCopy;
  en: PlaceCopy;
  de: PlaceCopy;
};

const p = (parts: string[]) => parts.map((part) => `<p>${part}</p>`).join("");

/** Strip tracking query params from Commons upload URLs. */
export function cleanCommonsUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

function img(
  url: string,
  opts: { alt: string; credit: string; license: string; sourcePage: string; thumbUrl?: string }
): CommonsImage {
  return {
    url: cleanCommonsUrl(url),
    thumbUrl: opts.thumbUrl ? cleanCommonsUrl(opts.thumbUrl) : undefined,
    alt: opts.alt,
    credit: opts.credit,
    license: opts.license,
    sourcePage: opts.sourcePage,
  };
}

const G = "Globetrotter19";
const CC3 = "CC BY-SA 3.0";
const CC4 = "CC BY-SA 4.0";

/** Known seed / demo HU names on etyek-budai (from prisma/etyek-sample ETYEK_PLACES). Soft-deactivated by bootstrap. */
export const ETYEK_SEED_PLACE_NAMES_HU: string[] = [
  "Hernák Estate",
  "Etyeki SajtMűhely",
  "Budai Csokoládé Manufaktúra",
  "Sonkás Porta",
  "Etyeki Termelői Piac",
  "Füge & Levendula Kávézó",
  "Pezsgő Terasz",
  "Etyek Panorama Kilátó",
  "Öreghegyi Pince",
  "Bikavér Pince",
  "Szőlőskert Vendégház",
  "Gasztro Workshop Ház",
  "Kerékpár Szerviz Etyek",
  "Helyi Mézesház",
  "Etyek Barber",
  "Piknik Réten",
];

/**
 * Five recognizably real venues in the Etyek–Budai wine region.
 * Coords/addresses from public winery/tourism listings; images from Wikimedia Commons.
 */
export const ETYEK_REAL_PLACES: RealPlace[] = [
  {
    key: "etyeki-kuria",
    categoryHu: "Borászat",
    lat: 47.43987,
    lng: 18.74037,
    hours: { open: "10:00", close: "18:00", closed: [] },
    phone: "+36 22 920 990",
    email: "info@etyekikuria.com",
    website: "https://etyekikuria.com/",
    hero: img(
      "https://upload.wikimedia.org/wikipedia/commons/d/db/%C3%96reghegyi_sz%C5%91l%C5%91skert%2C_2019_Etyek.jpg",
      {
        alt: "Öreghegyi szőlőskert, Etyek",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage: "https://commons.wikimedia.org/wiki/File:%C3%96reghegyi_sz%C5%91l%C5%91skert,_2019_Etyek.jpg",
      }
    ),
    mapImage: img(
      "https://upload.wikimedia.org/wikipedia/commons/9/93/Tibor_B%C3%A1thori_memorial_stone_and_bench%2C_B%C3%A1thori_d%C5%B1l%C5%91%2C_2019_Etyek.jpg",
      {
        alt: "Báthori dűlő, Etyek",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage:
          "https://commons.wikimedia.org/wiki/File:Tibor_B%C3%A1thori_memorial_stone_and_bench,_B%C3%A1thori_d%C5%B1l%C5%91,_2019_Etyek.jpg",
      }
    ),
    gallery: [
      img(
        "https://upload.wikimedia.org/wikipedia/commons/8/8b/Fingerpost%2C_vineyards%2C_%C3%96reghegy%2C_Anna_hill%2C_2019_Etyek.jpg",
        {
          alt: "Útbaigazító és szőlő, Öreghegy",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage:
            "https://commons.wikimedia.org/wiki/File:Fingerpost,_vineyards,_%C3%96reghegy,_Anna_hill,_2019_Etyek.jpg",
        }
      ),
      img(
        "https://upload.wikimedia.org/wikipedia/commons/b/bf/%C3%96reghegyi_%C3%BAt%2C_pr%C3%A9sh%C3%A1z%2C_2019_Etyek.jpg",
        {
          alt: "Présház az Öreghegyi úton",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage: "https://commons.wikimedia.org/wiki/File:%C3%96reghegyi_%C3%BAt,_pr%C3%A9sh%C3%A1z,_2019_Etyek.jpg",
        }
      ),
    ],
    hu: {
      name: "Etyeki Kúria",
      short: "Modern borászat az Öreghegyen: Pinot Noir, Chardonnay, Sauvignon Blanc.",
      body: p([
        "Az Etyeki Kúria az Öreghegy egyik meghatározó borászata. Pinot Noir, Chardonnay és Sauvignon Blanc a fókusz, a kóstolók és a pincelátogatás előzetes egyeztetéssel zajlik.",
        "Cím: 2091 Etyek, Báthory u. 21. / Öreghegy (Báthori dűlő). A hivatalos nyitvatartást és foglalást a borászat weboldalán érdemes ellenőrizni.",
        `<em>Képek: Wikimedia Commons (${CC3}), ${G} – hangulatkép az Öreghegyről, nem a pince saját stúdiófotója.</em>`,
      ]),
      address: "2091 Etyek, Báthory u. 21. (Öreghegy)",
      hoursLabel: "Kóstoló előzetes bejelentkezéssel – részletek: etyekikuria.com",
    },
    en: {
      name: "Etyeki Kúria",
      short: "A modern winery on Öreghegy: Pinot Noir, Chardonnay, Sauvignon Blanc.",
      body: p([
        "Etyeki Kúria is one of the landmark wineries on Öreghegy. Pinot Noir, Chardonnay and Sauvignon Blanc are the focus; tastings are by appointment.",
        "Address: 2091 Etyek, Báthory u. 21 / Öreghegy. Check the winery site for current opening hours.",
        `<em>Photos: Wikimedia Commons (${CC3}), ${G} – Öreghegy atmosphere, not a studio shoot of the cellar.</em>`,
      ]),
      address: "2091 Etyek, Báthory u. 21 (Öreghegy)",
      hoursLabel: "Tastings by appointment – see etyekikuria.com",
    },
    de: {
      name: "Etyeki Kúria",
      short: "Modernes Weingut am Öreghegy: Pinot Noir, Chardonnay, Sauvignon Blanc.",
      body: p([
        "Die Etyeki Kúria ist eines der prägenden Weingüter am Öreghegy. Fokus auf Pinot Noir, Chardonnay und Sauvignon Blanc; Verkostungen nach Vereinbarung.",
        "Adresse: 2091 Etyek, Báthory u. 21 / Öreghegy. Aktuelle Öffnungszeiten auf der Website prüfen.",
        `<em>Fotos: Wikimedia Commons (${CC3}), ${G} – Stimmung am Öreghegy, kein Studiofoto des Kellers.</em>`,
      ]),
      address: "2091 Etyek, Báthory u. 21 (Öreghegy)",
      hoursLabel: "Verkostung nach Vereinbarung – etyekikuria.com",
    },
  },
  {
    key: "rokusfalvy-birtok",
    categoryHu: "Borászat",
    lat: 47.448608,
    lng: 18.736025,
    hours: { open: "10:00", close: "18:00", closed: [5, 6] },
    phone: "+36 20 938 8888",
    email: "info@rokusfalvybirtok.hu",
    website: "https://rokusfalvy.hu/",
    hero: img(
      "https://upload.wikimedia.org/wikipedia/commons/4/4c/%C3%9Ajhegy_vineyard_and_view_to_Zs%C3%A1mb%C3%A9k_Basin%2C_2019_Etyek.jpg",
      {
        alt: "Újhegyi szőlő, kilátás a Zsámbéki-medencére",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage:
          "https://commons.wikimedia.org/wiki/File:%C3%9Ajhegy_vineyard_and_view_to_Zs%C3%A1mb%C3%A9k_Basin,_2019_Etyek.jpg",
      }
    ),
    mapImage: img(
      "https://upload.wikimedia.org/wikipedia/commons/9/9b/Vineyard_from_%C3%9Ajhegyi_%C3%BAt%2C_2019_Etyek.jpg",
      {
        alt: "Szőlő az Újhegyi útról",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage: "https://commons.wikimedia.org/wiki/File:Vineyard_from_%C3%9Ajhegyi_%C3%BAt,_2019_Etyek.jpg",
      }
    ),
    gallery: [
      img(
        "https://upload.wikimedia.org/wikipedia/commons/0/0d/Wine_barrels%2C_%C3%9Ajhegyi_%C3%BAt%2C_2019_Etyek.jpg",
        {
          alt: "Boroshordók az Újhegyi úton",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage: "https://commons.wikimedia.org/wiki/File:Wine_barrels,_%C3%9Ajhegyi_%C3%BAt,_2019_Etyek.jpg",
        }
      ),
      img(
        "https://upload.wikimedia.org/wikipedia/commons/5/56/Vineyard_and_cycling_route_looking_to_Road_8108_from_%C3%9Ajhegy%2C_2019_Etyek.jpg",
        {
          alt: "Szőlő és kerékpárút Újhegyről",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage:
            "https://commons.wikimedia.org/wiki/File:Vineyard_and_cycling_route_looking_to_Road_8108_from_%C3%9Ajhegy,_2019_Etyek.jpg",
        }
      ),
    ],
    hu: {
      name: "Rókusfalvy Birtok",
      short: "Családi birtok Újhegyen: pezsgő, kóstoló, rendezvénytér.",
      body: p([
        "A Rókusfalvy Birtok Etyek Újhegy dűlőjén működik (Újhegy 89). Pezsgő és fehérborok, présház és teraszos kóstolók – a birtokon több rendezvényhelyszín is van.",
        "A Fogadó (Alcsúti út) külön vendéglátó egység; a birtokot érdemes külön, a hivatalos oldalon egyeztetni.",
        `<em>Képek: Wikimedia Commons (${CC3}), ${G} – Újhegyi szőlő és gasztrosétány, hangulatkép.</em>`,
      ]),
      address: "2091 Etyek, Újhegy 89.",
      hoursLabel: "Látogatás egyeztetéssel – rokusfalvy.hu",
    },
    en: {
      name: "Rókusfalvy Estate",
      short: "Family estate on Újhegy: sparkling wine, tastings, event spaces.",
      body: p([
        "Rókusfalvy Estate sits on Etyek’s Újhegy (Újhegy 89). Sparkling and white wines, press house and terrace tastings, plus several event venues on site.",
        "The Inn on Alcsúti út is a separate hospitality unit — book the estate via the official site.",
        `<em>Photos: Wikimedia Commons (${CC3}), ${G} – Újhegy vines and promenade atmosphere.</em>`,
      ]),
      address: "2091 Etyek, Újhegy 89",
      hoursLabel: "Visits by arrangement – rokusfalvy.hu",
    },
    de: {
      name: "Rókusfalvy Birtok",
      short: "Familienweingut am Újhegy: Sekt, Verkostung, Eventflächen.",
      body: p([
        "Das Rókusfalvy-Weingut liegt am Újhegy in Etyek (Újhegy 89). Sekt und Weißweine, Presshaus und Terrassenverkostungen sowie mehrere Eventorte.",
        "Der Gasthof an der Alcsúti út ist eine eigene Gastronomie – das Weingut über die offizielle Website buchen.",
        `<em>Fotos: Wikimedia Commons (${CC3}), ${G} – Weinberge und Promenade am Újhegy.</em>`,
      ]),
      address: "2091 Etyek, Újhegy 89",
      hoursLabel: "Besuch nach Vereinbarung – rokusfalvy.hu",
    },
  },
  {
    key: "hernyak-birtok",
    categoryHu: "Borászat",
    lat: 47.441574,
    lng: 18.73881,
    hours: { open: "10:00", close: "18:00", closed: [] },
    phone: "+36 30 274 8994",
    email: "info@hernyak.hu",
    website: "https://hernyak.hu/",
    hero: img(
      "https://upload.wikimedia.org/wikipedia/commons/b/b6/Sz%C5%91l%C5%91%C3%BCltetv%C3%A9ny%2C_a_Herny%C3%A1k_birtokk%C3%B6zpont_fel%C3%A9_n%C3%A9zve%2C_2019_Etyek.jpg",
      {
        alt: "Szőlőültetvény a Hernyák birtokközpont felé",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage:
          "https://commons.wikimedia.org/wiki/File:Sz%C5%91l%C5%91%C3%BCltetv%C3%A9ny,_a_Herny%C3%A1k_birtokk%C3%B6zpont_fel%C3%A9_n%C3%A9zve,_2019_Etyek.jpg",
      }
    ),
    gallery: [
      img(
        "https://upload.wikimedia.org/wikipedia/commons/0/06/%C3%96reghegy_cellars_and_wineries_name_sign_and_fingerpost%2C_2019_Etyek.jpg",
        {
          alt: "Öreghegy pincék táblája",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage:
            "https://commons.wikimedia.org/wiki/File:%C3%96reghegy_cellars_and_wineries_name_sign_and_fingerpost,_2019_Etyek.jpg",
        }
      ),
      img(
        "https://upload.wikimedia.org/wikipedia/commons/9/9e/Presshouse_J_D_h_1883%2C_%C3%96reghegyi_%C3%BAt%2C_2019_Etyek.jpg",
        {
          alt: "Műemlék présház, Öreghegyi út",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage:
            "https://commons.wikimedia.org/wiki/File:Presshouse_J_D_h_1883,_%C3%96reghegyi_%C3%BAt,_2019_Etyek.jpg",
        }
      ),
    ],
    hu: {
      name: "Hernyák Birtok",
      short: "Családi birtok az Öreghegyen: bor, párlat, kóstoló bejelentkezéssel.",
      body: p([
        "A Hernyák Birtok 1993 óta dolgozik Etyeken (Öreghegy présházak / Báthori dűlő). Bor és párlat, házisajt, pince- és lepárló-látogatás – előzetes bejelentkezés szükséges.",
        "Ne keverendő a régi seed „Hernák Estate” kamu névvel: ez a valódi Hernyák család birtoka (hernyak.hu).",
        `<em>Képek: Wikimedia Commons (${CC3}), ${G} – szőlő a birtokközpont felé nézve.</em>`,
      ]),
      address: "2091 Etyek, Öreghegy présházak (Báthori dűlő)",
      hoursLabel: "Előzetes bejelentkezés – hernyak.hu / +36 30 274 8994",
    },
    en: {
      name: "Hernyák Estate",
      short: "Family estate on Öreghegy: wine, spirits, tastings by appointment.",
      body: p([
        "Hernyák Estate has worked in Etyek since 1993 (Öreghegy press houses / Báthori vineyard). Wine and spirits, cellar visits — booking required.",
        "Not the old seed name “Hernák Estate”: this is the real Hernyák family winery (hernyak.hu).",
        `<em>Photos: Wikimedia Commons (${CC3}), ${G} – vineyard looking toward the estate centre.</em>`,
      ]),
      address: "2091 Etyek, Öreghegy press houses (Báthori vineyard)",
      hoursLabel: "By appointment – hernyak.hu / +36 30 274 8994",
    },
    de: {
      name: "Hernyák Birtok",
      short: "Familienweingut am Öreghegy: Wein, Destillat, Verkostung nach Anmeldung.",
      body: p([
        "Das Hernyák-Weingut arbeitet seit 1993 in Etyek (Öreghegy-Presshäuser / Báthori-Lage). Wein und Destillate, Kellerbesuche — Anmeldung nötig.",
        "Nicht der alte Seed-Name „Hernák Estate“: das echte Weingut der Familie Hernyák (hernyak.hu).",
        `<em>Fotos: Wikimedia Commons (${CC3}), ${G} – Weinberg Richtung Gutszentrum.</em>`,
      ]),
      address: "2091 Etyek, Öreghegy-Presshäuser (Báthori-Lage)",
      hoursLabel: "Nach Anmeldung – hernyak.hu / +36 30 274 8994",
    },
  },
  {
    key: "fetzer-pince",
    categoryHu: "Borászat",
    lat: 47.438402,
    lng: 18.748354,
    hours: { open: "11:00", close: "17:00", closed: [1, 2, 3, 4] },
    email: "info@fetzerpince.hu",
    website: "https://www.fetzerpince.hu/",
    hero: img(
      "https://upload.wikimedia.org/wikipedia/commons/e/ed/Fetzer_Pince%2C_2019_Etyek.jpg",
      {
        alt: "Fetzer Pince présház, Öreghegyi út",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage: "https://commons.wikimedia.org/wiki/File:Fetzer_Pince,_2019_Etyek.jpg",
      }
    ),
    gallery: [
      img(
        "https://upload.wikimedia.org/wikipedia/commons/7/72/Presshouse_PZM_2000%2C_%C3%96reghegyi_%C3%BAt%2C_2019_Etyek.jpg",
        {
          alt: "Présház az Öreghegyi úton",
          credit: `${G} / Wikimedia Commons`,
          license: CC3,
          sourcePage:
            "https://commons.wikimedia.org/wiki/File:Presshouse_PZM_2000,_%C3%96reghegyi_%C3%BAt,_2019_Etyek.jpg",
        }
      ),
      img(
        "https://upload.wikimedia.org/wikipedia/commons/d/d0/The_vineyard.jpg",
        {
          alt: "Szőlőültetvény Etyek környékén",
          credit: "Cserfranciska / Wikimedia Commons",
          license: CC4,
          sourcePage: "https://commons.wikimedia.org/wiki/File:The_vineyard.jpg",
        }
      ),
    ],
    hu: {
      name: "Fetzer Pince",
      short: "Kis présház az Öreghegyi úton, hétvégi kóstolóval.",
      body: p([
        "A Fetzer Pince az Öreghegyi úton áll (kb. 68. / 2025 hrsz.). Kis férőhelyű családi pince: borkóstoló és értékesítés, étkezés előzetes egyeztetéssel.",
        "Tipikus nyitvatartás a borúti listák szerint: péntek délután, szombat–vasárnap – mindig érdemes előre írni (fetzerpince.hu).",
        `<em>Képek: Wikimedia Commons – a fő kép a Fetzer présház 2019-es fotója (${G}, ${CC3}).</em>`,
      ]),
      address: "2091 Etyek, Öreghegyi út",
      hoursLabel: "Péntek–vasárnap (szezonális) – fetzerpince.hu",
    },
    en: {
      name: "Fetzer Cellar",
      short: "A small press house on Öreghegyi út, weekend tastings.",
      body: p([
        "Fetzer Cellar stands on Öreghegyi út. A small family cellar for tastings and sales; meals by arrangement.",
        "Typical hours on wine-route lists: Friday afternoon plus Saturday–Sunday — confirm ahead (fetzerpince.hu).",
        `<em>Photos: Wikimedia Commons – hero is the 2019 Fetzer press-house photo (${G}, ${CC3}).</em>`,
      ]),
      address: "2091 Etyek, Öreghegyi út",
      hoursLabel: "Fri–Sun (seasonal) – fetzerpince.hu",
    },
    de: {
      name: "Fetzer Pince",
      short: "Kleines Presshaus an der Öreghegyi út, Verkostung am Wochenende.",
      body: p([
        "Die Fetzer Pince steht an der Öreghegyi út. Kleiner Familienkeller für Verkostung und Verkauf; Essen nach Absprache.",
        "Typische Zeiten laut Weinstraßenlisten: Freitagnachmittag sowie Samstag–Sonntag — vorher anfragen (fetzerpince.hu).",
        `<em>Fotos: Wikimedia Commons – Titelbild ist das Fetzer-Presshaus 2019 (${G}, ${CC3}).</em>`,
      ]),
      address: "2091 Etyek, Öreghegyi út",
      hoursLabel: "Fr–So (saisonal) – fetzerpince.hu",
    },
  },
  {
    key: "etyeki-kilato",
    categoryHu: "Látnivaló",
    lat: 47.442517,
    lng: 18.737803,
    hours: { open: "08:00", close: "20:00", closed: [] },
    website: null,
    hero: img(
      "https://upload.wikimedia.org/wikipedia/commons/4/42/Vineyard_and_Observation_tower%2C_2019_Etyek.jpg",
      {
        alt: "Szőlő és az etyeki kilátó",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage: "https://commons.wikimedia.org/wiki/File:Vineyard_and_Observation_tower,_2019_Etyek.jpg",
      }
    ),
    mapImage: img(
      "https://upload.wikimedia.org/wikipedia/commons/5/5d/Kil%C3%A1t%C3%B3%2C_2019_Etyek.jpg",
      {
        alt: "Etyeki kilátó",
        credit: `${G} / Wikimedia Commons`,
        license: CC3,
        sourcePage: "https://commons.wikimedia.org/wiki/File:Kil%C3%A1t%C3%B3,_2019_Etyek.jpg",
      }
    ),
    gallery: [
      img(
        "https://upload.wikimedia.org/wikipedia/commons/1/19/Etyeki_kil%C3%A1t%C3%B3.jpg",
        {
          alt: "Etyeki kilátó",
          credit: "Kovianyo / Wikimedia Commons",
          license: CC4,
          sourcePage: "https://commons.wikimedia.org/wiki/File:Etyeki_kil%C3%A1t%C3%B3.jpg",
        }
      ),
      img(
        "https://upload.wikimedia.org/wikipedia/commons/6/69/Hungary%2C_Etyek%2C_Windows_XP%2C_Bliss%2C_1.jpg",
        {
          alt: "Etyeki táj, dombok",
          credit: "Random photos 1989 / Wikimedia Commons",
          license: CC4,
          sourcePage: "https://commons.wikimedia.org/wiki/File:Hungary,_Etyek,_Windows_XP,_Bliss,_1.jpg",
        }
      ),
    ],
    hu: {
      name: "Etyeki kilátó",
      short: "Kilátótorony az Öreghegyen, szőlővel körülvéve – belépő nélkül.",
      body: p([
        "Az etyeki kilátó az Öreghegyen áll; körben szőlő, tiszta időben a Budai-hegység felé is lehet látni. A torony részben adótoronyként is szolgál.",
        "Nincs jegyárus. A naplemente a legszebb; eső után az út sáros lehet. GPS kb. 47.4425, 18.7378.",
        `<em>Képek: Wikimedia Commons (${CC3}/${CC4}) – Globetrotter19, Kovianyo.</em>`,
      ]),
      address: "2091 Etyek, Öreghegy (kilátó)",
      hoursLabel: "Szabadon látogatható (nappal)",
    },
    en: {
      name: "Etyek lookout tower",
      short: "Observation tower on Öreghegy among the vines — no ticket.",
      body: p([
        "The Etyek lookout stands on Öreghegy, surrounded by vines; on a clear day you can see toward the Buda hills. The tower also hosts telecom gear.",
        "No ticket booth. Sunset is best; paths get muddy after rain. GPS approx. 47.4425, 18.7378.",
        `<em>Photos: Wikimedia Commons (${CC3}/${CC4}) – Globetrotter19, Kovianyo.</em>`,
      ]),
      address: "2091 Etyek, Öreghegy (lookout)",
      hoursLabel: "Open access in daylight",
    },
    de: {
      name: "Etyeker Aussichtsturm",
      short: "Aussichtsturm am Öreghegy zwischen den Reben — ohne Eintritt.",
      body: p([
        "Der Aussichtsturm steht am Öreghegy, umgeben von Weinbergen; bei klarem Wetter Blick Richtung Budaer Berge.",
        "Keine Kasse. Sonnenuntergang ist am schönsten; nach Regen kann der Weg schlammig sein. GPS ca. 47.4425, 18.7378.",
        `<em>Fotos: Wikimedia Commons (${CC3}/${CC4}) – Globetrotter19, Kovianyo.</em>`,
      ]),
      address: "2091 Etyek, Öreghegy (Aussichtsturm)",
      hoursLabel: "Frei zugänglich (tagsüber)",
    },
  },
];
