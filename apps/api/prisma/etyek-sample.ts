import type { PrismaClient } from "@prisma/client";
import { Lang } from "../src/common/language-code";

type Hours = { open: string; close: string; closed: number[] };

type Copy = {
  name: string;
  short: string;
  body: string;
  address: string;
  hoursLabel: string;
};

type PlaceSample = {
  match: string[];
  category: string;
  lat: number;
  lng: number;
  hours: Hours;
  hu: Copy;
  en: Copy;
  de: Copy;
};

type EventSample = {
  place: string;
  pinned?: boolean;
  rainSafe?: boolean;
  hour: number;
  duration: number;
  week: number;
  hu: { title: string; short: string; body: string };
  en: { title: string; short: string; body: string };
  de: { title: string; short: string; body: string };
};

const p = (parts: string[]) => parts.map((part) => `<p>${part}</p>`).join("");

export const ETYEK_PLACES: PlaceSample[] = [
  {
    match: ["Hernák Estate"],
    category: "Borászat",
    lat: 47.4492,
    lng: 18.7568,
    hours: { open: "11:00", close: "18:00", closed: [0] },
    hu: {
      name: "Hernák Estate",
      short: "Családi pince az Öreghegyen, saját pezsgővel és chardonnay-val.",
      body: p([
        "A Hernák család az Öreghegyen dolgozik. A pince kicsi, a kóstoló hat tétel, és a házigazda mondja el, melyik tőkéről jön a bor.",
        "Előzetes bejelentés nélkül szombaton érdemes jönni. A terasz a szőlőre néz, esőben a pincében marad a kóstoló.",
      ]),
      address: "Etyek, Öreghegy",
      hoursLabel: "Kedd–vasárnap 11:00–18:00, hétfőn zárva",
    },
    en: {
      name: "Hernák Estate",
      short: "A family cellar on Öreghegy, pouring its own sparkling wine and chardonnay.",
      body: p([
        "The Hernák family works on Öreghegy. The cellar is small, the tasting is six wines, and the host tells you which row they came from.",
        "Saturday is the day to arrive without booking. The terrace faces the vines; if it rains, the tasting stays in the cellar.",
      ]),
      address: "Etyek, Öreghegy",
      hoursLabel: "Tuesday–Sunday 11:00–18:00, closed Monday",
    },
    de: {
      name: "Hernák Estate",
      short: "Familienkeller am Öreghegy, mit eigenem Sekt und Chardonnay.",
      body: p([
        "Die Familie Hernák arbeitet am Öreghegy. Der Keller ist klein, die Probe hat sechs Weine, und der Gastgeber sagt, aus welcher Reihe sie kommen.",
        "Samstags lohnt es sich, ohne Anmeldung zu kommen. Die Terrasse schaut in den Weinberg; bei Regen bleibt die Probe im Keller.",
      ]),
      address: "Etyek, Öreghegy",
      hoursLabel: "Dienstag–Sonntag 11:00–18:00, Montag geschlossen",
    },
  },
  {
    match: ["Etyeki SajtMűhely", "Etyeki Sajtműhely"],
    category: "Kézműves",
    lat: 47.4464,
    lng: 18.7536,
    hours: { open: "10:00", close: "17:00", closed: [0, 1] },
    hu: {
      name: "Etyeki SajtMűhely",
      short: "Friss sajt a faluban, a pincék borához párosítva.",
      body: p([
        "A műhely a falu szélén érleli a sajtot. A pultnál lehet kóstolni, és a szombati piacra innen megy a lágy sajt.",
        "A párosítást a szomszéd pincék pezsgőjével rakják össze. A műhelyt meg lehet nézni, ha éppen gyártanak.",
      ]),
      address: "Etyek, a falu széle",
      hoursLabel: "Szerda–vasárnap 10:00–17:00",
    },
    en: {
      name: "Etyeki SajtMűhely",
      short: "Fresh cheese in the village, paired with the cellars' wine.",
      body: p([
        "The workshop ages cheese at the edge of the village. You can taste it at the counter, and the soft cheese on the Saturday market comes from here.",
        "They build the pairing around the neighbouring cellars' sparkling wine. You can look into the workshop when a batch is on.",
      ]),
      address: "Etyek, edge of the village",
      hoursLabel: "Wednesday–Sunday 10:00–17:00",
    },
    de: {
      name: "Etyeki SajtMűhely",
      short: "Frischer Käse im Dorf, zum Wein der Keller.",
      body: p([
        "Die Werkstatt reift den Käse am Dorfrand. An der Theke kann man probieren, und der weiche Käse auf dem Samstagsmarkt kommt von hier.",
        "Die Begleitung bauen sie zum Sekt der Nachbarkeller. In die Werkstatt kann man schauen, wenn gerade produziert wird.",
      ]),
      address: "Etyek, am Dorfrand",
      hoursLabel: "Mittwoch–Sonntag 10:00–17:00",
    },
  },
  {
    match: ["Budai Csokoládé Manufaktúra"],
    category: "Kézműves",
    lat: 47.5512,
    lng: 18.8084,
    hours: { open: "10:00", close: "18:00", closed: [0, 1, 2] },
    hu: {
      name: "Budai Csokoládé Manufaktúra",
      short: "Táblás csokoládé Budajenőn, a borvidék északi szélén.",
      body: p([
        "A manufaktúra Budajenőn dolgozik, nem egy fővárosi üzletben. A táblákba a környék méze és a levendula kerül, a kakaót ők olvasztják.",
        "Csütörtöktől vasárnapig nyitott a pult. A műhelyablakon át látszik a munka, kóstoló a helyszínen van.",
      ]),
      address: "Budajenő",
      hoursLabel: "Csütörtök–vasárnap 10:00–18:00",
    },
    en: {
      name: "Budai Csokoládé Manufaktúra",
      short: "Bar chocolate in Budajenő, on the northern edge of the wine region.",
      body: p([
        "The workshop works in Budajenő, not in a city shop. Local honey and lavender go into the bars, and they melt the cocoa themselves.",
        "The counter is open from Thursday to Sunday. The work is visible through the workshop window, and the tasting happens on the spot.",
      ]),
      address: "Budajenő",
      hoursLabel: "Thursday–Sunday 10:00–18:00",
    },
    de: {
      name: "Budai Csokoládé Manufaktúra",
      short: "Tafelschokolade in Budajenő, am nördlichen Rand der Weinregion.",
      body: p([
        "Die Manufaktur arbeitet in Budajenő, nicht in einem Geschäft in der Stadt. Honig und Lavendel aus der Gegend kommen in die Tafeln, den Kakao schmelzen sie selbst.",
        "Von Donnerstag bis Sonntag ist die Theke offen. Durch das Werkstattfenster sieht man die Arbeit, die Probe ist vor Ort.",
      ]),
      address: "Budajenő",
      hoursLabel: "Donnerstag–Sonntag 10:00–18:00",
    },
  },
  {
    match: ["Sonkás Porta"],
    category: "Piac",
    lat: 47.4716,
    lng: 18.7335,
    hours: { open: "09:00", close: "16:00", closed: [0, 6] },
    hu: {
      name: "Sonkás Porta",
      short: "Füstölt sonka Tökön, a piacra és a pincék táljára.",
      body: p([
        "A porta Tökön füstöl. A sonka a szombati etyeki piacra és néhány pince sajttáljára megy, a boltban kisebb adagot is vágnak.",
        "Hétfőn és vasárnap zárva. Érdemes reggel menni, a friss füstölés akkor kerül a pultra.",
      ]),
      address: "Tök",
      hoursLabel: "Kedd–szombat 9:00–16:00",
    },
    en: {
      name: "Sonkás Porta",
      short: "Smoked ham in Tök, for the market and the cellars' boards.",
      body: p([
        "The farm smokes in Tök. The ham goes to the Saturday market in Etyek and onto a few cellars' cheese boards. The shop also cuts smaller pieces.",
        "Closed on Monday and Sunday. Morning is the time to come, when the fresh smoking reaches the counter.",
      ]),
      address: "Tök",
      hoursLabel: "Tuesday–Saturday 9:00–16:00",
    },
    de: {
      name: "Sonkás Porta",
      short: "Geräucherter Schinken in Tök, für den Markt und die Kellerbretter.",
      body: p([
        "Der Hof räuchert in Tök. Der Schinken geht auf den Samstagsmarkt in Etyek und auf die Käsebretter einiger Keller. Im Laden schneiden sie auch kleinere Stücke.",
        "Montag und Sonntag geschlossen. Morgens lohnt es sich, wenn das frische Räuchergut an die Theke kommt.",
      ]),
      address: "Tök",
      hoursLabel: "Dienstag–Samstag 9:00–16:00",
    },
  },
  {
    match: ["Etyeki Termelői Piac"],
    category: "Piac",
    lat: 47.4472,
    lng: 18.7539,
    hours: { open: "08:00", close: "13:00", closed: [0, 1, 2, 3, 4, 6] },
    hu: {
      name: "Etyeki Termelői Piac",
      short: "Szombat reggel a faluban: sajt, sonka, méz, zöldség.",
      body: p([
        "Szombaton reggel nyolctól állnak a padok. A sajtműhely, a sonkás porta és a mézesház innen adja el, amit a héten készített.",
        "Egy óra körül a padok elfogynak. A zöldség a környék kertjeiből jön, nem egy nagykerből.",
      ]),
      address: "Etyek, a falu közepe",
      hoursLabel: "Szombaton 8:00–13:00",
    },
    en: {
      name: "Etyeki Termelői Piac",
      short: "Saturday morning in the village: cheese, ham, honey, vegetables.",
      body: p([
        "The stalls are up from eight on Saturday morning. The cheese workshop, the ham farm and the honey house sell here what they made during the week.",
        "The stalls are gone around one. The vegetables come from gardens nearby, not from a wholesaler.",
      ]),
      address: "Etyek, centre of the village",
      hoursLabel: "Saturday 8:00–13:00",
    },
    de: {
      name: "Etyeki Termelői Piac",
      short: "Samstagmorgen im Dorf: Käse, Schinken, Honig, Gemüse.",
      body: p([
        "Samstags stehen die Stände ab acht. Die Käsewerkstatt, der Schinkenhof und das Honighaus verkaufen hier, was sie in der Woche gemacht haben.",
        "Gegen eins sind die Stände weg. Das Gemüse kommt aus Gärten der Gegend, nicht aus einem Großhandel.",
      ]),
      address: "Etyek, Dorfmitte",
      hoursLabel: "Samstag 8:00–13:00",
    },
  },
  {
    match: ["Füge & Levendula Kávézó", "Fuge & Levendula Kavezo"],
    category: "Vendéglátás",
    lat: 47.4468,
    lng: 18.7546,
    hours: { open: "09:00", close: "17:00", closed: [0, 1] },
    hu: {
      name: "Füge & Levendula Kávézó",
      short: "Kávé és sütemény a főutca mellett, a piac napján tele.",
      body: p([
        "A kávézó a főutca mellett van, egy udvarra nyílik. A süteménybe füge és levendula kerül, a kávé egy pörkölőből jön, nem kapszulából.",
        "Szombaton a piac miatt tele van. Hét közben csendesebb, és innen indul több séta a pincesor felé.",
      ]),
      address: "Etyek, a főutca mellett",
      hoursLabel: "Szerda–vasárnap 9:00–17:00",
    },
    en: {
      name: "Füge & Levendula Kávézó",
      short: "Coffee and cake beside the main street, full on market day.",
      body: p([
        "The café sits beside the main street and opens onto a yard. The cakes use fig and lavender, and the coffee comes from a roaster, not a capsule.",
        "On Saturday it fills up because of the market. On weekdays it is quieter, and several walks toward the cellar row start from here.",
      ]),
      address: "Etyek, beside the main street",
      hoursLabel: "Wednesday–Sunday 9:00–17:00",
    },
    de: {
      name: "Füge & Levendula Kávézó",
      short: "Kaffee und Kuchen an der Hauptstraße, voll am Markttag.",
      body: p([
        "Das Café liegt an der Hauptstraße und öffnet sich zu einem Hof. In den Kuchen kommen Feige und Lavendel, der Kaffee kommt von einer Rösterei, nicht aus einer Kapsel.",
        "Samstags ist es wegen des Marktes voll. Unter der Woche ist es ruhiger, und mehrere Spaziergänge zur Kellerzeile starten hier.",
      ]),
      address: "Etyek, an der Hauptstraße",
      hoursLabel: "Mittwoch–Sonntag 9:00–17:00",
    },
  },
  {
    match: ["Pezsgő Terasz"],
    category: "Vendéglátás",
    lat: 47.4504,
    lng: 18.7602,
    hours: { open: "12:00", close: "20:00", closed: [0, 1] },
    hu: {
      name: "Pezsgő Terasz",
      short: "Ebéd a domboldalon, a pohárban a környék pezsgője.",
      body: p([
        "A terasz a domboldalon van, Etyek fölött. Az étlap rövid: leves, egy tészta, és ami a héten a piacon volt.",
        "A pohárba a környék pincéinek pezsgője kerül, nem egy országos márka. Esőben a belső terem nyitva marad.",
      ]),
      address: "Etyek, a domboldal",
      hoursLabel: "Szerda–vasárnap 12:00–20:00",
    },
    en: {
      name: "Pezsgő Terasz",
      short: "Lunch on the hillside, with the region's sparkling wine in the glass.",
      body: p([
        "The terrace is on the hillside above Etyek. The menu is short: a soup, one pasta, and whatever was at the market that week.",
        "The glass is filled with sparkling wine from nearby cellars, not a national brand. When it rains, the inside room stays open.",
      ]),
      address: "Etyek, the hillside",
      hoursLabel: "Wednesday–Sunday 12:00–20:00",
    },
    de: {
      name: "Pezsgő Terasz",
      short: "Mittagessen am Hang, im Glas der Sekt der Gegend.",
      body: p([
        "Die Terrasse liegt am Hang über Etyek. Die Karte ist kurz: eine Suppe, eine Pasta, und was in der Woche auf dem Markt war.",
        "Ins Glas kommt Sekt aus den Kellern der Gegend, keine landesweite Marke. Bei Regen bleibt der Innenraum offen.",
      ]),
      address: "Etyek, am Hang",
      hoursLabel: "Mittwoch–Sonntag 12:00–20:00",
    },
  },
  {
    match: ["Etyek Panorama Kilátó"],
    category: "Látnivaló",
    lat: 47.4558,
    lng: 18.7684,
    hours: { open: "08:00", close: "20:00", closed: [] },
    hu: {
      name: "Etyek Panorama Kilátó",
      short: "Kilátás a szőlőre és a Budai-hegység felé, belépő nélkül.",
      body: p([
        "A kilátó a szőlő fölött áll. Látni Etyeket, tiszta időben a Budai-hegység vonalát, és hogy hol végződik a pincesor.",
        "Nincs jegyárus. A naplemente a legjobb idő, esőben az út saras, de a kilátó fedett.",
      ]),
      address: "Etyek, a szőlő fölött",
      hoursLabel: "Minden nap 8:00–20:00",
    },
    en: {
      name: "Etyek Panorama Kilátó",
      short: "A view over the vines and toward the Buda hills, with no ticket.",
      body: p([
        "The lookout stands above the vines. You see Etyek, on a clear day the line of the Buda hills, and where the cellar row ends.",
        "There is no ticket booth. Sunset is the best time. In rain the path is muddy, but the lookout is covered.",
      ]),
      address: "Etyek, above the vines",
      hoursLabel: "Every day 8:00–20:00",
    },
    de: {
      name: "Etyek Panorama Kilátó",
      short: "Blick über die Reben und zu den Budaer Bergen, ohne Eintritt.",
      body: p([
        "Der Aussichtspunkt steht über den Reben. Man sieht Etyek, bei klarem Wetter die Linie der Budaer Berge, und wo die Kellerzeile endet.",
        "Es gibt keine Kasse. Der Sonnenuntergang ist die beste Zeit. Bei Regen ist der Weg schlammig, der Aussichtspunkt ist aber überdacht.",
      ]),
      address: "Etyek, über den Reben",
      hoursLabel: "Täglich 8:00–20:00",
    },
  },
  {
    match: ["Bikavér Pince", "Öreghegyi Pince"],
    category: "Borászat",
    lat: 47.4428,
    lng: 18.7462,
    hours: { open: "11:00", close: "18:00", closed: [0] },
    hu: {
      name: "Öreghegyi Pince",
      short: "Fehérbor és pezsgő az Öreghegy másik oldalán.",
      body: p([
        "A pince az Öreghegy Etyektől távolabb eső oldalán van. Fehérbort és pezsgőt kóstoltatnak, a tőkék chardonnay és irsai.",
        "A név a mintában korábban mást mondott. A pince az etyeki fajtákkal dolgozik, nem egy alföldi vörössel.",
      ]),
      address: "Etyek, Öreghegy",
      hoursLabel: "Kedd–vasárnap 11:00–18:00, hétfőn zárva",
    },
    en: {
      name: "Öreghegyi Pince",
      short: "White wine and sparkling wine on the far side of Öreghegy.",
      body: p([
        "The cellar is on the side of Öreghegy farther from the village. They pour white wine and sparkling wine. The vines are chardonnay and irsai.",
        "An earlier sample name pointed somewhere else. This cellar works with Etyek varieties, not a red from the Great Plain.",
      ]),
      address: "Etyek, Öreghegy",
      hoursLabel: "Tuesday–Sunday 11:00–18:00, closed Monday",
    },
    de: {
      name: "Öreghegyi Pince",
      short: "Weißwein und Sekt auf der anderen Seite des Öreghegy.",
      body: p([
        "Der Keller liegt auf der Seite des Öreghegy, die weiter vom Dorf entfernt ist. Ausgeschenkt werden Weißwein und Sekt. Die Reben sind Chardonnay und Irsai.",
        "Ein früherer Mustername zeigte woandershin. Dieser Keller arbeitet mit den Sorten von Etyek, nicht mit einem Rotwein von der Tiefebene.",
      ]),
      address: "Etyek, Öreghegy",
      hoursLabel: "Dienstag–Sonntag 11:00–18:00, Montag geschlossen",
    },
  },
  {
    match: ["Szőlőskert Vendégház"],
    category: "Szállás",
    lat: 47.4488,
    lng: 18.7494,
    hours: { open: "08:00", close: "20:00", closed: [] },
    hu: {
      name: "Szőlőskert Vendégház",
      short: "Néhány szoba a szőlő mellett, reggelivel a saját kertből.",
      body: p([
        "A vendégház négy szobás, a szőlő mellett. Reggelire azt teszik ki, ami a kertben megérett, és a szomszéd pince kenyerét.",
        "A pincesor gyalog van. Autóval a falu szélén lehet megállni, a házban nincs nagy parkoló.",
      ]),
      address: "Etyek, a szőlő mellett",
      hoursLabel: "Minden nap, érkezés 8:00 után",
    },
    en: {
      name: "Szőlőskert Vendégház",
      short: "A few rooms beside the vines, with breakfast from the garden.",
      body: p([
        "The guesthouse has four rooms, beside the vines. Breakfast is whatever ripened in the garden, and bread from the neighbouring cellar.",
        "The cellar row is a walk away. You can stop the car at the edge of the village. The house has no large car park.",
      ]),
      address: "Etyek, beside the vines",
      hoursLabel: "Every day, arrival after 8:00",
    },
    de: {
      name: "Szőlőskert Vendégház",
      short: "Ein paar Zimmer neben den Reben, Frühstück aus dem Garten.",
      body: p([
        "Das Gästehaus hat vier Zimmer, neben den Reben. Zum Frühstück kommt, was im Garten reif wurde, und Brot vom Nachbarkeller.",
        "Die Kellerzeile ist zu Fuß erreichbar. Mit dem Auto kann man am Dorfrand halten. Das Haus hat keinen großen Parkplatz.",
      ]),
      address: "Etyek, neben den Reben",
      hoursLabel: "Täglich, Anreise nach 8:00",
    },
  },
  {
    match: ["Gasztro Workshop Ház"],
    category: "Kézműves",
    lat: 47.4501,
    lng: 18.7555,
    hours: { open: "10:00", close: "18:00", closed: [0, 1, 2] },
    hu: {
      name: "Gasztro Workshop Ház",
      short: "Főzőesték és kóstolók egy udvari konyhában.",
      body: p([
        "Az udvari konyhában esténként főznek: tészta, a piac zöldsége, és egy pince bora a pohárban. A létszám tizenkét fő.",
        "Napközben a konyha zárva, csak a bejelentett alkalmak nyitják ki. A műhely a falu fölött van, nem a főtéren.",
      ]),
      address: "Etyek, a falu fölött",
      hoursLabel: "Csütörtök–vasárnap 10:00–18:00, programra nyit",
    },
    en: {
      name: "Gasztro Workshop Ház",
      short: "Cooking evenings and tastings in a yard kitchen.",
      body: p([
        "In the evening they cook in the yard kitchen: pasta, vegetables from the market, and one cellar's wine in the glass. The room holds twelve.",
        "During the day the kitchen is closed and opens only for announced sessions. The workshop is above the village, not on the main square.",
      ]),
      address: "Etyek, above the village",
      hoursLabel: "Thursday–Sunday 10:00–18:00, open for sessions",
    },
    de: {
      name: "Gasztro Workshop Ház",
      short: "Kochabende und Proben in einer Hofküche.",
      body: p([
        "Abends kochen sie in der Hofküche: Pasta, Gemüse vom Markt, und der Wein eines Kellers im Glas. Der Raum fasst zwölf Personen.",
        "Tagsüber ist die Küche zu und öffnet nur zu angekündigten Terminen. Die Werkstatt liegt über dem Dorf, nicht am Hauptplatz.",
      ]),
      address: "Etyek, über dem Dorf",
      hoursLabel: "Donnerstag–Sonntag 10:00–18:00, offen zu Terminen",
    },
  },
  {
    match: ["Kerékpár Szerviz Etyek"],
    category: "Szolgáltatás",
    lat: 47.4469,
    lng: 18.7518,
    hours: { open: "09:00", close: "17:00", closed: [0, 6] },
    hu: {
      name: "Kerékpár Szerviz Etyek",
      short: "Szerelés és egy térkép a pincesorról, ha defektet kaptál.",
      body: p([
        "A szerviz a faluban van. Defektet, féket és láncot vállalnak, és kitesznek egy papírtérképet, melyik dűlőn érdemes menni.",
        "A pincejárat innen indul szombaton. Hétfőn és vasárnap zárva, szombaton ebédig biztosan van valaki a műhelyben.",
      ]),
      address: "Etyek, a faluban",
      hoursLabel: "Kedd–szombat 9:00–17:00",
    },
    en: {
      name: "Kerékpár Szerviz Etyek",
      short: "Repairs and a map of the cellar row, if you pick up a puncture.",
      body: p([
        "The shop is in the village. They take punctures, brakes and chains, and they keep a paper map of which track is worth riding.",
        "The cellar ride starts here on Saturday. Closed on Monday and Sunday. On Saturday someone is in the workshop until lunch.",
      ]),
      address: "Etyek, in the village",
      hoursLabel: "Tuesday–Saturday 9:00–17:00",
    },
    de: {
      name: "Kerékpár Szerviz Etyek",
      short: "Reparatur und eine Karte der Kellerzeile, wenn du einen Platten hast.",
      body: p([
        "Die Werkstatt ist im Dorf. Sie nehmen Platten, Bremsen und Ketten an, und sie legen eine Papierkarte aus, welcher Feldweg sich lohnt.",
        "Die Kellerfahrt startet samstags hier. Montag und Sonntag geschlossen. Samstags ist bis zum Mittag jemand in der Werkstatt.",
      ]),
      address: "Etyek, im Dorf",
      hoursLabel: "Dienstag–Samstag 9:00–17:00",
    },
  },
  {
    match: ["Helyi Mézesház"],
    category: "Piac",
    lat: 47.4588,
    lng: 18.7214,
    hours: { open: "10:00", close: "16:00", closed: [0, 1, 2, 3, 4] },
    hu: {
      name: "Helyi Mézesház",
      short: "Akác és hárs a dűlő mellett, kóstoló üvegből.",
      body: p([
        "A mézesház a dűlő mellett áll, Páty és Etyek között. Az akác és a hárs külön üvegben van, és meg lehet kóstolni, mielőtt viszel.",
        "Hét közben a méhekkel vannak, a ház szombaton és vasárnap tart nyitva. A piacra is ők viszik a kisebb üvegeket.",
      ]),
      address: "Páty és Etyek között",
      hoursLabel: "Szombat–vasárnap 10:00–16:00",
    },
    en: {
      name: "Helyi Mézesház",
      short: "Acacia and linden honey beside the track, tasted from the jar.",
      body: p([
        "The honey house stands beside the track, between Páty and Etyek. Acacia and linden are in separate jars, and you can taste them before you take one.",
        "On weekdays they are with the bees. The house is open on Saturday and Sunday. They also bring the smaller jars to the market.",
      ]),
      address: "Between Páty and Etyek",
      hoursLabel: "Saturday–Sunday 10:00–16:00",
    },
    de: {
      name: "Helyi Mézesház",
      short: "Akazien- und Lindenhonig am Feldweg, zum Probieren aus dem Glas.",
      body: p([
        "Das Honighaus steht am Feldweg, zwischen Páty und Etyek. Akazie und Linde sind in getrennten Gläsern, und man kann probieren, bevor man eines mitnimmt.",
        "Unter der Woche sind sie bei den Bienen. Das Haus ist samstags und sonntags offen. Die kleineren Gläser bringen sie auch auf den Markt.",
      ]),
      address: "Zwischen Páty und Etyek",
      hoursLabel: "Samstag–Sonntag 10:00–16:00",
    },
  },
  {
    match: ["Etyek Barber"],
    category: "Szolgáltatás",
    lat: 47.4466,
    lng: 18.7532,
    hours: { open: "09:00", close: "18:00", closed: [0, 6] },
    hu: {
      name: "Etyek Barber",
      short: "Férfi fodrász a faluban, időpontra, szombaton sorban.",
      body: p([
        "A fodrászat egy udvari szobában van, nem egy plázaüzlet. Hét közben időpontra dolgoznak, szombaton érkezési sorrendben.",
        "A vendégek nagy része a faluból jön, a pincejárat előtt is beülnek egy gyors vágásra.",
      ]),
      address: "Etyek, udvari szoba",
      hoursLabel: "Kedd–szombat 9:00–18:00",
    },
    en: {
      name: "Etyek Barber",
      short: "A barber in the village, by appointment, and a queue on Saturday.",
      body: p([
        "The shop is a room off a yard, not a unit in a mall. On weekdays they work by appointment. On Saturday it is first come.",
        "Most guests come from the village. Some sit down for a quick cut before the cellar ride.",
      ]),
      address: "Etyek, a room off a yard",
      hoursLabel: "Tuesday–Saturday 9:00–18:00",
    },
    de: {
      name: "Etyek Barber",
      short: "Herrenfriseur im Dorf, mit Termin, samstags der Reihe nach.",
      body: p([
        "Der Salon ist ein Zimmer am Hof, kein Laden in einem Einkaufszentrum. Unter der Woche arbeiten sie mit Termin. Samstags gilt die Reihenfolge des Kommens.",
        "Die meisten Gäste kommen aus dem Dorf. Manche setzen sich vor der Kellerfahrt noch schnell auf den Stuhl.",
      ]),
      address: "Etyek, Zimmer am Hof",
      hoursLabel: "Dienstag–Samstag 9:00–18:00",
    },
  },
  {
    match: ["Piknik Réten"],
    category: "Vendéglátás",
    lat: 47.4526,
    lng: 18.7428,
    hours: { open: "09:00", close: "19:00", closed: [] },
    hu: {
      name: "Piknik Réten",
      short: "Takaró és egy egyszerű étel a réten, a szőlő alatt.",
      body: p([
        "A rét a szőlő alatt van. Takarót lehet kérni, az étel egyszerű: sajt, sonka, kenyér, és egy üveg a közeli pincéből.",
        "Nincs pincérsor. Az időjárás számít, esőben a szomszéd pajta nyit. A hely a falutól egy rövid sétára van.",
      ]),
      address: "Etyek, a szőlő alatti rét",
      hoursLabel: "Minden nap 9:00–19:00",
    },
    en: {
      name: "Piknik Réten",
      short: "A blanket and a simple meal in the meadow below the vines.",
      body: p([
        "The meadow is below the vines. You can ask for a blanket. The food is simple: cheese, ham, bread, and a bottle from a nearby cellar.",
        "There is no row of waiters. The weather matters. In rain the neighbouring barn opens. The spot is a short walk from the village.",
      ]),
      address: "Etyek, the meadow below the vines",
      hoursLabel: "Every day 9:00–19:00",
    },
    de: {
      name: "Piknik Réten",
      short: "Eine Decke und ein einfaches Essen auf der Wiese unter den Reben.",
      body: p([
        "Die Wiese liegt unter den Reben. Eine Decke kann man erbitten. Das Essen ist einfach: Käse, Schinken, Brot, und eine Flasche aus einem nahen Keller.",
        "Es gibt keine Kellnerreihe. Das Wetter zählt. Bei Regen öffnet die benachbarte Scheune. Der Platz ist ein kurzer Spaziergang vom Dorf.",
      ]),
      address: "Etyek, die Wiese unter den Reben",
      hoursLabel: "Täglich 9:00–19:00",
    },
  },
];

export const ETYEK_EVENTS: EventSample[] = [
  {
    place: "Etyeki Termelői Piac",
    pinned: true,
    hour: 8,
    duration: 5,
    week: 0,
    hu: {
      title: "Szombati termelői piac",
      short: "Sajt, sonka, méz és zöldség a falu közepén, reggel nyolctól.",
      body: p([
        "A padok reggel nyolckor állnak fel, és egy körül tűnnek el. A sajtműhely, a sonkás porta és a mézesház a sajátját hozza.",
        "Érdemes kosárral jönni. A kávézó a piac mellett nyit, ha a sor hosszú.",
      ]),
    },
    en: {
      title: "Saturday producers' market",
      short: "Cheese, ham, honey and vegetables in the centre of the village, from eight.",
      body: p([
        "The stalls go up at eight and are gone around one. The cheese workshop, the ham farm and the honey house bring their own.",
        "A basket is worth bringing. The café beside the market is open if the queue is long.",
      ]),
    },
    de: {
      title: "Samstagsmarkt der Erzeuger",
      short: "Käse, Schinken, Honig und Gemüse in der Dorfmitte, ab acht.",
      body: p([
        "Die Stände stehen um acht und sind gegen eins weg. Die Käsewerkstatt, der Schinkenhof und das Honighaus bringen das Eigene.",
        "Ein Korb lohnt sich. Das Café neben dem Markt ist offen, wenn die Schlange lang ist.",
      ]),
    },
  },
  {
    place: "Hernák Estate",
    rainSafe: true,
    hour: 15,
    duration: 3,
    week: 0,
    hu: {
      title: "Pezsgőkóstoló a pincesoron",
      short: "Hat tétel a Hernák pincében, a házigazda mondja a sort.",
      body: p([
        "A kóstoló hat tétel: pezsgő és chardonnay az Öreghegyről. A házigazda végigmegy a soron, és megmondja, melyik dűlőből van.",
        "A hely a pincében van, eső nem számít. A létszám húsz fő, a maradék a teraszon ül, ha az idő engedi.",
      ]),
    },
    en: {
      title: "Sparkling tasting on the cellar row",
      short: "Six wines in the Hernák cellar, with the host walking the row.",
      body: p([
        "The tasting is six wines: sparkling wine and chardonnay from Öreghegy. The host walks the row and says which track each one comes from.",
        "It happens in the cellar, so rain does not matter. The room holds twenty. The rest sit on the terrace if the weather allows.",
      ]),
    },
    de: {
      title: "Sektprobe in der Kellerzeile",
      short: "Sechs Weine im Keller Hernák, der Gastgeber geht die Reihe durch.",
      body: p([
        "Die Probe hat sechs Weine: Sekt und Chardonnay vom Öreghegy. Der Gastgeber geht die Reihe durch und sagt, von welchem Feldweg jeder kommt.",
        "Sie findet im Keller statt, der Regen spielt keine Rolle. Der Raum fasst zwanzig. Der Rest sitzt auf der Terrasse, wenn das Wetter mitmacht.",
      ]),
    },
  },
  {
    place: "Etyeki SajtMűhely",
    rainSafe: true,
    hour: 16,
    duration: 2,
    week: 1,
    hu: {
      title: "Sajt és pezsgő párosítás",
      short: "Négy sajt, két pezsgő, a műhely pultjánál.",
      body: p([
        "Négy sajtot kóstolunk, mellé két pezsgőt a szomszéd pincéből. A műhelyben mondják el, melyik tejből és mennyi ideig érett.",
        "A párosítás bent van. A létszám tizenhat fő.",
      ]),
    },
    en: {
      title: "Cheese and sparkling pairing",
      short: "Four cheeses, two sparkling wines, at the workshop counter.",
      body: p([
        "We taste four cheeses, with two sparkling wines from the neighbouring cellar. In the workshop they say which milk and how long each one aged.",
        "The pairing is indoors. The room holds sixteen.",
      ]),
    },
    de: {
      title: "Käse und Sekt",
      short: "Vier Käse, zwei Sekte, an der Theke der Werkstatt.",
      body: p([
        "Wir probieren vier Käse, dazu zwei Sekte aus dem Nachbarkeller. In der Werkstatt sagen sie, aus welcher Milch und wie lange jeder gereift ist.",
        "Die Begleitung ist drinnen. Der Raum fasst sechzehn.",
      ]),
    },
  },
  {
    place: "Budai Csokoládé Manufaktúra",
    rainSafe: true,
    hour: 11,
    duration: 3,
    week: 1,
    hu: {
      title: "Nyitott műhely: táblás csokoládé",
      short: "Vasárnap a manufaktúrában, a tábla a szemünk előtt készül.",
      body: p([
        "Vasárnap a manufaktúra nyitva hagyja a műhelyt. Látni az olvasztást, és a végén egy táblát lehet elvinni, mézzel vagy levendulával.",
        "Budajenőn van, az etyeki piactól egy rövid autóútra. A kóstoló bent van.",
      ]),
    },
    en: {
      title: "Open workshop: bar chocolate",
      short: "Sunday in the workshop, the bar made in front of you.",
      body: p([
        "On Sunday the workshop stays open. You see the melting, and at the end you can take a bar, with honey or lavender.",
        "It is in Budajenő, a short drive from the Etyek market. The tasting is indoors.",
      ]),
    },
    de: {
      title: "Offene Werkstatt: Tafelschokolade",
      short: "Sonntag in der Manufaktur, die Tafel entsteht vor den Augen.",
      body: p([
        "Sonntags lässt die Manufaktur die Werkstatt offen. Man sieht das Schmelzen, und am Ende kann man eine Tafel mitnehmen, mit Honig oder Lavendel.",
        "Sie ist in Budajenő, eine kurze Fahrt vom Markt in Etyek. Die Probe ist drinnen.",
      ]),
    },
  },
  {
    place: "Öreghegyi Pince",
    hour: 10,
    duration: 3,
    week: 2,
    hu: {
      title: "Séta az Öreghegyen",
      short: "Gyalog a tőkék között, a pincénél egy pohár a végén.",
      body: p([
        "A séta a pincétől indul, végigmegy a chardonnay és az irsai sorokon, és visszatér a kóstolóra. A táv rövid, a cipő saras lehet.",
        "Esőben a séta elmarad, a pince kóstolója megmarad. A találkozó a pince ajtajánál van.",
      ]),
    },
    en: {
      title: "A walk on Öreghegy",
      short: "On foot between the vines, and a glass at the cellar at the end.",
      body: p([
        "The walk starts at the cellar, goes through the chardonnay and irsai rows, and comes back for the tasting. The distance is short. Shoes can get muddy.",
        "In rain the walk is cancelled and the cellar tasting stays. The meeting point is the cellar door.",
      ]),
    },
    de: {
      title: "Spaziergang am Öreghegy",
      short: "Zu Fuß zwischen den Reben, am Ende ein Glas im Keller.",
      body: p([
        "Der Spaziergang startet am Keller, geht durch die Reihen von Chardonnay und Irsai und kommt zur Probe zurück. Die Strecke ist kurz. Die Schuhe können schlammig werden.",
        "Bei Regen fällt der Spaziergang aus, die Kellerprobe bleibt. Der Treffpunkt ist die Kellertür.",
      ]),
    },
  },
  {
    place: "Kerékpár Szerviz Etyek",
    hour: 9,
    duration: 5,
    week: 2,
    hu: {
      title: "Kerékpáros pincejárat",
      short: "A szerviztől három pincéig, saját kerékpárral.",
      body: p([
        "A járat a szerviz elől indul, és három pincét érint: Hernák, az Öreghegyi Pince, és egy rövid megálló a sajtműhelynél. A táv húsz kilométer alatt van.",
        "Saját kerékpár kell. Defektnél a szerviz tartalék belsőt ad. Esőben a járat a következő szombatra csúszik.",
      ]),
    },
    en: {
      title: "Cellar ride by bicycle",
      short: "From the shop to three cellars, on your own bicycle.",
      body: p([
        "The ride starts in front of the shop and stops at three places: Hernák, Öreghegyi Pince, and a short stop at the cheese workshop. The distance is under twenty kilometres.",
        "You need your own bicycle. If you puncture, the shop has a spare tube. In rain the ride moves to the next Saturday.",
      ]),
    },
    de: {
      title: "Kellerfahrt mit dem Fahrrad",
      short: "Von der Werkstatt zu drei Kellern, mit dem eigenen Rad.",
      body: p([
        "Die Fahrt startet vor der Werkstatt und hält an drei Orten: Hernák, Öreghegyi Pince, und ein kurzer Stopp bei der Käsewerkstatt. Die Strecke liegt unter zwanzig Kilometern.",
        "Das eigene Fahrrad ist nötig. Bei einem Platten gibt die Werkstatt einen Ersatzschlauch. Bei Regen rutscht die Fahrt auf den nächsten Samstag.",
      ]),
    },
  },
  {
    place: "Helyi Mézesház",
    rainSafe: true,
    hour: 10,
    duration: 2,
    week: 3,
    hu: {
      title: "Méz és lekvár kóstoló",
      short: "Akác, hárs és a kert lekvárja, üvegből.",
      body: p([
        "A mézesházban akácot, hársat és a kert lekvárját lehet kóstolni. Elmondják, melyik dűlőn voltak a kaptárak.",
        "A kóstoló bent van. Utána a kisebb üvegeket el lehet vinni.",
      ]),
    },
    en: {
      title: "Honey and jam tasting",
      short: "Acacia, linden and the garden's jam, from the jar.",
      body: p([
        "At the honey house you can taste acacia, linden and the garden's jam. They say which track the hives stood on.",
        "The tasting is indoors. Afterwards you can take the smaller jars.",
      ]),
    },
    de: {
      title: "Honig- und Marmeladenprobe",
      short: "Akazie, Linde und die Marmelade aus dem Garten, aus dem Glas.",
      body: p([
        "Im Honighaus kann man Akazie, Linde und die Marmelade aus dem Garten probieren. Sie sagen, an welchem Feldweg die Kästen standen.",
        "Die Probe ist drinnen. Danach kann man die kleineren Gläser mitnehmen.",
      ]),
    },
  },
  {
    place: "Piknik Réten",
    hour: 11,
    duration: 5,
    week: 3,
    hu: {
      title: "Családi piknik a réten",
      short: "Takaró, sajt és egy üveg, a szőlő alatti réten.",
      body: p([
        "A piknik a szőlő alatti réten van. Takarót adnak, az étel sajt, sonka és kenyér, az üveg a közeli pincéből jön.",
        "Gyerekeknek van árnyék a pajta mellett. Esőben a pajtába húzódunk, a program nem marad el.",
      ]),
    },
    en: {
      title: "Family picnic in the meadow",
      short: "A blanket, cheese and a bottle, in the meadow below the vines.",
      body: p([
        "The picnic is in the meadow below the vines. They give you a blanket. The food is cheese, ham and bread, and the bottle comes from a nearby cellar.",
        "Children have shade beside the barn. In rain we move into the barn, and the picnic still happens.",
      ]),
    },
    de: {
      title: "Familienpicknick auf der Wiese",
      short: "Decke, Käse und eine Flasche, auf der Wiese unter den Reben.",
      body: p([
        "Das Picknick ist auf der Wiese unter den Reben. Es gibt eine Decke. Das Essen ist Käse, Schinken und Brot, die Flasche kommt aus einem nahen Keller.",
        "Kinder haben Schatten neben der Scheune. Bei Regen ziehen wir in die Scheune, das Picknick fällt nicht aus.",
      ]),
    },
  },
];

const SITE_COPY: Record<Lang, { short: string; body: string; seo: string }> = {
  hu: {
    short: "Pincék, műhelyek és a falu, amelyik össze tudja őket gyűjteni.",
    body: p([
      "Az Etyek–Budai borvidék mintája nem a plakát helyeit sorolja. A pincesor, a sajtműhely, a szombati piac és a falu fodrásza ugyanazon a térképen van.",
      "Etyek, Budajenő, Tök és Páty egy régió. A vendég szombaton a piacon kezdi, és onnan megy tovább a pincéhez, aki keveset tud hirdetésre költeni.",
    ]),
    seo: "Etyek–Budai borvidék: pincék, kézművesek, piac és a környező falvak egy térképen.",
  },
  en: {
    short: "Cellars, workshops, and the village that can gather them.",
    body: p([
      "This sample of the Etyek–Buda wine region does not list the places already on the poster. The cellar row, the cheese workshop, the Saturday market and the village barber share one map.",
      "Etyek, Budajenő, Tök and Páty are one region. A visitor starts at the market on Saturday and goes on to the cellar that can spend little on advertising.",
    ]),
    seo: "Etyek–Buda wine region: cellars, makers, the market and the surrounding villages on one map.",
  },
  de: {
    short: "Keller, Werkstätten und das Dorf, das sie sammeln kann.",
    body: p([
      "Dieses Muster der Weinregion Etyek–Buda listet nicht die Orte, die schon auf dem Plakat stehen. Die Kellerzeile, die Käsewerkstatt, der Samstagsmarkt und der Dorffriseur liegen auf einer Karte.",
      "Etyek, Budajenő, Tök und Páty sind eine Region. Der Gast fängt samstags auf dem Markt an und geht weiter zu dem Keller, der wenig für Werbung ausgeben kann.",
    ]),
    seo: "Weinregion Etyek–Buda: Keller, Handwerk, Markt und die umliegenden Dörfer auf einer Karte.",
  },
};

const TOWN_COPY: Record<Lang, { body: string; seo: string }> = {
  hu: {
    body: p([
      "Etyek a pezsgő és a fehérbor faluja az Öreghegy alatt. A pincesor nincs a főtéren, a szombati piac viszont a falu közepén áll.",
      "A minta ide gyűjti a szomszéd falvakat is: Budajenő a csokoládét, Tök a sonkát, Páty felé a mézet. A vendég egy térképen látja mindet.",
    ]),
    seo: "Etyek: pincesor, szombati piac, és a környék műhelyei egy lapon.",
  },
  en: {
    body: p([
      "Etyek is the village of sparkling wine and white wine, below Öreghegy. The cellar row is not on the main square. The Saturday market is, in the centre of the village.",
      "The sample gathers the neighbouring villages too: chocolate in Budajenő, ham in Tök, honey toward Páty. A visitor sees all of them on one map.",
    ]),
    seo: "Etyek: the cellar row, the Saturday market, and the workshops nearby on one page.",
  },
  de: {
    body: p([
      "Etyek ist das Dorf des Sekts und des Weißweins, unter dem Öreghegy. Die Kellerzeile liegt nicht am Hauptplatz. Der Samstagsmarkt schon, in der Dorfmitte.",
      "Das Muster sammelt auch die Nachbardörfer: Schokolade in Budajenő, Schinken in Tök, Honig in Richtung Páty. Der Gast sieht alles auf einer Karte.",
    ]),
    seo: "Etyek: Kellerzeile, Samstagsmarkt und die Werkstätten der Gegend auf einer Seite.",
  },
};

type PageCopy = Record<Lang, { title: string; short: string; body: string }>;

const LEGAL: Array<{ key: "imprint" | "terms" | "privacy"; copy: PageCopy }> = [
  {
    key: "imprint",
    copy: {
      hu: {
        title: "Impresszum",
        short: "Az Etyek–Budai mintaoldal kiadója.",
        body: p([
          "Ez az oldal a HelloLocal Etyek–Budai mintája. A pincék, műhelyek és programok a borvidék szerkezetét mutatják, hogy a térképnek legyen mit megjelenítenie.",
          "A nevek mintahelyek. Nem egy bejegyzett pince, műhely vagy önkormányzat hivatalos oldala, és nem helyettesíti a szolgáltató saját elérhetőségét.",
          "Kiadó: HelloLocal minta. A terület kulcsa: etyek-budai. Nyelv: magyar, angol, német.",
        ]),
      },
      en: {
        title: "Imprint",
        short: "Publisher of the Etyek–Buda sample.",
        body: p([
          "This page is the HelloLocal sample of the Etyek–Buda wine region. The cellars, workshops and events show how the region is put together, so the map has something to display.",
          "The names are sample places. This is not the official page of a registered cellar, workshop or municipality, and it does not replace a provider's own contact.",
          "Publisher: HelloLocal sample. Area key: etyek-budai. Languages: Hungarian, English, German.",
        ]),
      },
      de: {
        title: "Impressum",
        short: "Herausgeber des Musters Etyek–Buda.",
        body: p([
          "Diese Seite ist das HelloLocal-Muster der Weinregion Etyek–Buda. Keller, Werkstätten und Termine zeigen, wie die Region aufgebaut ist, damit die Karte etwas zu zeigen hat.",
          "Die Namen sind Musterorte. Dies ist nicht die offizielle Seite eines eingetragenen Kellers, einer Werkstatt oder einer Gemeinde, und sie ersetzt nicht den eigenen Kontakt eines Anbieters.",
          "Herausgeber: HelloLocal-Muster. Gebietsschlüssel: etyek-budai. Sprachen: Ungarisch, Englisch, Deutsch.",
        ]),
      },
    },
  },
  {
    key: "terms",
    copy: {
      hu: {
        title: "Általános szerződési feltételek",
        short: "A mintaoldal használatának feltételei.",
        body: p([
          "Az etyek-budai oldal egy minta. A helyek leírása, a nyitvatartás és a programok ideje tájékoztat a térkép működéséről. Nem ajánlattétel egy szolgáltatónak a vendég felé.",
          "A foglalás, a kóstoló és a vásárlás a hely saját rendje szerint történik, ha a minta mögött később valódi szolgáltató áll. A mintában közölt árak, ha szerepelnek, nem számlázható díjak.",
          "A térkép és a szövegek magyarul, angolul és németül érhetők el. A három nyelv ugyanazt a területet mutatja, külön címen.",
        ]),
      },
      en: {
        title: "Terms of use",
        short: "Terms for using the sample site.",
        body: p([
          "The etyek-budai site is a sample. Descriptions, opening hours and event times explain how the map works. They are not an offer from a provider to a visitor.",
          "A booking, a tasting or a purchase follows the place's own rules if a real provider later stands behind the sample. Prices shown in the sample, if any, are not invoiced fees.",
          "The map and the texts are available in Hungarian, English and German. The three languages show the same area, each at its own address.",
        ]),
      },
      de: {
        title: "Allgemeine Nutzungsbedingungen",
        short: "Bedingungen für die Nutzung der Musterseite.",
        body: p([
          "Die Seite etyek-budai ist ein Muster. Beschreibungen, Öffnungszeiten und Termine erklären, wie die Karte funktioniert. Sie sind kein Angebot eines Anbieters an einen Gast.",
          "Eine Reservierung, eine Probe oder ein Kauf folgt der eigenen Ordnung des Ortes, wenn später ein echter Anbieter hinter dem Muster steht. Preise im Muster, falls sie vorkommen, sind keine Rechnungsbeträge.",
          "Karte und Texte gibt es auf Ungarisch, Englisch und Deutsch. Die drei Sprachen zeigen dasselbe Gebiet, jede unter ihrer eigenen Adresse.",
        ]),
      },
    },
  },
  {
    key: "privacy",
    copy: {
      hu: {
        title: "Adatvédelem",
        short: "Mit tárol a mintaoldal a látogatásról.",
        body: p([
          "A nyilvános térkép fiók nélkül használható. A látogatás során a böngésző a nyelv választását és a térkép helyzetét a saját eszközön tarthatja, hogy a következő megnyitáskor ugyanott folytatódjon.",
          "A minta nem kér számlázási adatot, és nem adja tovább a látogató nevét egy pincének. Ha később bejelentkezés vagy hírlevél kerül az oldalra, arról külön szöveg szól, mielőtt bármit elküldenél.",
          "A mintában szereplő helyeknek nincs valódi ügyféladatbázisa. A kapcsolati mezők szándékosan üresek.",
        ]),
      },
      en: {
        title: "Privacy",
        short: "What the sample site keeps about a visit.",
        body: p([
          "The public map works without an account. During a visit the browser may keep the language choice and the map position on the device, so the next opening continues in the same place.",
          "The sample does not ask for billing details, and it does not pass a visitor's name to a cellar. If sign-in or a newsletter is added later, a separate text will say so before anything is sent.",
          "The places in the sample have no real customer database. Contact fields are left empty on purpose.",
        ]),
      },
      de: {
        title: "Datenschutz",
        short: "Was die Musterseite über einen Besuch behält.",
        body: p([
          "Die öffentliche Karte funktioniert ohne Konto. Während eines Besuchs kann der Browser die Sprachwahl und die Kartenposition auf dem Gerät behalten, damit das nächste Öffnen an derselben Stelle weitergeht.",
          "Das Muster fragt keine Rechnungsdaten ab und gibt den Namen eines Gastes nicht an einen Keller weiter. Wenn später eine Anmeldung oder ein Newsletter hinzukommt, steht das in einem eigenen Text, bevor etwas abgeschickt wird.",
          "Die Orte im Muster haben keine echte Kundendatenbank. Kontaktfelder bleiben absichtlich leer.",
        ]),
      },
    },
  },
];

const STATIC_PAGES: Array<{ category: string; copy: PageCopy }> = [
  {
    category: "infok",
    copy: {
      hu: {
        title: "Hogyan érd el Etyeket",
        short: "Vonat Kelenföldig, onnan busz, vagy kerékpár a pincesorig.",
        body: p([
          "Budapestről Kelenföldig vonattal, onnan busszal lehet Etyekre jutni. A falu közepe a szombati piac, a pincesor gyalog van tőle.",
          "Kerékpárral a dűlőutak visznek a pincékhez. A szerviz a faluban defektet vállal, és ott indul a pincejárat is.",
          "Autóval a falu szélén érdemes megállni. A vendégháznál nincs nagy parkoló, a kilátóhoz az utolsó szakasz gyalogos.",
        ]),
      },
      en: {
        title: "How to reach Etyek",
        short: "Train to Kelenföld, then a bus, or a bicycle to the cellar row.",
        body: p([
          "From Budapest, take the train to Kelenföld and then a bus to Etyek. The centre of the village is the Saturday market. The cellar row is a walk from there.",
          "By bicycle, the farm tracks lead to the cellars. The shop in the village takes punctures, and the cellar ride starts there.",
          "By car, stop at the edge of the village. The guesthouse has no large car park, and the last stretch to the lookout is on foot.",
        ]),
      },
      de: {
        title: "Wie du nach Etyek kommst",
        short: "Zug bis Kelenföld, dann Bus, oder Fahrrad bis zur Kellerzeile.",
        body: p([
          "Von Budapest fährt der Zug nach Kelenföld, von dort ein Bus nach Etyek. Die Dorfmitte ist der Samstagsmarkt. Die Kellerzeile ist von dort zu Fuß erreichbar.",
          "Mit dem Fahrrad führen die Feldwege zu den Kellern. Die Werkstatt im Dorf nimmt Platten an, und dort startet auch die Kellerfahrt.",
          "Mit dem Auto lohnt es sich, am Dorfrand zu halten. Das Gästehaus hat keinen großen Parkplatz, und das letzte Stück zum Aussichtspunkt geht zu Fuß.",
        ]),
      },
    },
  },
  {
    category: "infok",
    copy: {
      hu: {
        title: "Ami nincs a plakáton",
        short: "A borvidék a pincéken túl: műhely, piac, fodrász, kilátó.",
        body: p([
          "Egy átlagos borvidéki oldal a már ismert pincéket listázza. Ezen a mintán a sajtműhely, a sonkás porta, a mézesház és a falu fodrásza is rajta van.",
          "A szombati piac köti össze őket. Aki reggel nyolckor odaér, délutánra a pincesoron van, anélkül hogy egy hirdetést követne.",
          "A település dolga annyi, hogy egy linken adja tovább. A szöveget az írja, aki a helyet viszi.",
        ]),
      },
      en: {
        title: "What is not on the poster",
        short: "The wine region beyond the cellars: workshop, market, barber, lookout.",
        body: p([
          "A typical wine-region page lists the cellars people already know. On this sample the cheese workshop, the ham farm, the honey house and the village barber are on the map too.",
          "The Saturday market connects them. Someone who arrives at eight is on the cellar row by the afternoon, without following an advertisement.",
          "The town's part is to pass on one link. The text is written by the person who runs the place.",
        ]),
      },
      de: {
        title: "Was nicht auf dem Plakat steht",
        short: "Die Weinregion jenseits der Keller: Werkstatt, Markt, Friseur, Aussicht.",
        body: p([
          "Eine übliche Weinregionenseite listet die Keller, die man schon kennt. Auf diesem Muster sind auch die Käsewerkstatt, der Schinkenhof, das Honighaus und der Dorffriseur auf der Karte.",
          "Der Samstagsmarkt verbindet sie. Wer um acht ankommt, ist nachmittags in der Kellerzeile, ohne einer Anzeige zu folgen.",
          "Die Gemeinde gibt einen Link weiter. Den Text schreibt, wer den Ort führt.",
        ]),
      },
    },
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function upcomingSaturday(week: number, hour: number, duration: number) {
  const start = new Date();
  start.setHours(hour, 0, 0, 0);
  const day = start.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  start.setDate(start.getDate() + daysUntilSaturday + week * 7);
  const end = new Date(start);
  end.setHours(start.getHours() + duration);
  return { start, end };
}

function copyFor(sample: PlaceSample, lang: Lang): Copy {
  return sample[lang];
}

async function upsertTranslation(
  prisma: PrismaClient,
  placeId: string,
  lang: Lang,
  copy: Copy
) {
  const data = {
    name: copy.name,
    shortDescription: `<p>${copy.short}</p>`,
    description: copy.body,
    address: `<p>${copy.address}</p>`,
    openingHours: `<p>${copy.hoursLabel}</p>`,
    website: null,
    phone: null,
    email: null,
    seoTitle: copy.name,
    seoDescription: copy.short,
    seoKeywords: [copy.name, "Etyek", "Etyek-Buda"],
  };
  await prisma.placeTranslation.upsert({
    where: { placeId_lang: { placeId, lang } },
    update: data,
    create: { placeId, lang, ...data },
  });
}

export async function applyEtyekHours(prisma: PrismaClient, placeId: string, hours: Hours) {
  for (let day = 0; day < 7; day += 1) {
    const isClosed = hours.closed.includes(day);
    await prisma.placeOpeningHours.upsert({
      where: { placeId_dayOfWeek: { placeId, dayOfWeek: day } },
      update: {
        isClosed,
        openTime: isClosed ? null : hours.open,
        closeTime: isClosed ? null : hours.close,
      },
      create: {
        placeId,
        dayOfWeek: day,
        isClosed,
        openTime: isClosed ? null : hours.open,
        closeTime: isClosed ? null : hours.close,
      },
    });
  }
}

async function ensurePrimarySlug(
  prisma: PrismaClient,
  siteId: string,
  lang: Lang,
  entityType: "place" | "event",
  entityId: string,
  slug: string
) {
  await prisma.slug.updateMany({
    where: { siteId, lang, entityType, entityId, isPrimary: true, NOT: { slug } },
    data: { isPrimary: false },
  });
  await prisma.slug.upsert({
    where: { siteId_lang_slug: { siteId, lang, slug } },
    update: { entityType, entityId, isPrimary: true, isActive: true },
    create: { siteId, lang, slug, entityType, entityId, isPrimary: true, isActive: true },
  });
}

export async function applyEtyekSample(prisma: PrismaClient) {
  const site = await prisma.site.findFirst({
    where: { slug: "etyek-budai" },
    select: { id: true },
  });
  if (!site) {
    throw new Error('Site "etyek-budai" was not found');
  }
  const siteId = site.id;
  const langs: Lang[] = ["hu", "en", "de"];

  for (const lang of langs) {
    const copy = SITE_COPY[lang];
    await prisma.siteTranslation.upsert({
      where: { siteId_lang: { siteId, lang } },
      update: {
        shortDescription: `<p>${copy.short}</p>`,
        description: copy.body,
        seoTitle: lang === "hu" ? "Etyek–Budai Borvidék" : lang === "en" ? "Etyek–Buda Wine Region" : "Weinregion Etyek–Buda",
        seoDescription: copy.seo,
        seoKeywords: ["Etyek", "Etyek-Buda", "borvidék", "pince", "piac"],
      },
      create: {
        siteId,
        lang,
        name: lang === "hu" ? "Etyek–Budai Borvidék" : lang === "en" ? "Etyek–Buda Wine Region" : "Weinregion Etyek–Buda",
        shortDescription: `<p>${copy.short}</p>`,
        description: copy.body,
        seoTitle: lang === "hu" ? "Etyek–Budai Borvidék" : lang === "en" ? "Etyek–Buda Wine Region" : "Weinregion Etyek–Buda",
        seoDescription: copy.seo,
        seoKeywords: ["Etyek", "Etyek-Buda", "borvidék", "pince", "piac"],
      },
    });
  }

  const town = await prisma.town.findFirst({ where: { siteId }, select: { id: true } });
  if (town) {
    for (const lang of langs) {
      const copy = TOWN_COPY[lang];
      await prisma.townTranslation.upsert({
        where: { townId_lang: { townId: town.id, lang } },
        update: {
          name: "Etyek",
          description: copy.body,
          seoTitle: "Etyek",
          seoDescription: copy.seo,
        },
        create: {
          townId: town.id,
          lang,
          name: "Etyek",
          description: copy.body,
          seoTitle: "Etyek",
          seoDescription: copy.seo,
        },
      });
    }
  }

  const places = await prisma.place.findMany({
    where: { siteId },
    select: { id: true, translations: { select: { lang: true, name: true } } },
  });
  const byName = new Map<string, string>();
  for (const place of places) {
    for (const translation of place.translations) {
      if (translation.lang === "hu") byName.set(translation.name, place.id);
    }
  }

  let placeCount = 0;
  for (const sample of ETYEK_PLACES) {
    const placeId = sample.match.map((name) => byName.get(name)).find(Boolean);
    if (!placeId) continue;
    await prisma.place.update({
      where: { id: placeId },
      data: { lat: sample.lat, lng: sample.lng },
    });
    for (const lang of langs) {
      await upsertTranslation(prisma, placeId, lang, copyFor(sample, lang));
      await ensurePrimarySlug(prisma, siteId, lang, "place", placeId, slugify(copyFor(sample, lang).name));
    }
    await applyEtyekHours(prisma, placeId, sample.hours);
    placeCount += 1;
  }

  await prisma.placePriceList.updateMany({
    where: { place: { siteId }, note: { contains: "seedelt" } },
    data: {
      note: "<p>Az árak a minta tájékoztató számai. A pincénél és a műhelynél érdemes rákérdezni.</p>",
    },
  });

  const placeIdByCurrentName = new Map<string, string>();
  const refreshed = await prisma.place.findMany({
    where: { siteId },
    select: { id: true, translations: { where: { lang: "hu" }, select: { name: true } } },
  });
  for (const place of refreshed) {
    const name = place.translations[0]?.name;
    if (name) placeIdByCurrentName.set(name, place.id);
  }

  const existingEvents = await prisma.event.findMany({
    where: { siteId },
    orderBy: { createdAt: "asc" },
    select: { id: true, translations: { where: { lang: "hu" }, select: { title: true } } },
  });
  existingEvents.sort((a, b) => {
    const an = Number((a.translations[0]?.title ?? "").match(/(\d+)\s*$/)?.[1] ?? 99);
    const bn = Number((b.translations[0]?.title ?? "").match(/(\d+)\s*$/)?.[1] ?? 99);
    return an - bn;
  });

  for (let index = 0; index < ETYEK_EVENTS.length; index += 1) {
    const sample = ETYEK_EVENTS[index];
    const placeId = placeIdByCurrentName.get(sample.place) ?? null;
    const { start, end } = upcomingSaturday(sample.week, sample.hour, sample.duration);
    const data = {
      placeId,
      isActive: true,
      isPinned: Boolean(sample.pinned),
      isRainSafe: Boolean(sample.rainSafe),
      showOnMap: true,
      startDate: start,
      endDate: end,
    };
    const eventId =
      existingEvents[index]?.id ??
      (
        await prisma.event.create({
          data: { siteId, ...data },
          select: { id: true },
        })
      ).id;
    if (existingEvents[index]) {
      await prisma.event.update({ where: { id: eventId }, data });
    }
    for (const lang of langs) {
      const copy = sample[lang];
      await prisma.eventTranslation.upsert({
        where: { eventId_lang: { eventId, lang } },
        update: {
          title: copy.title,
          shortDescription: copy.short,
          description: copy.body,
          seoTitle: copy.title,
          seoDescription: copy.short,
        },
        create: {
          eventId,
          lang,
          title: copy.title,
          shortDescription: copy.short,
          description: copy.body,
          seoTitle: copy.title,
          seoDescription: copy.short,
          seoKeywords: [],
        },
      });
      await ensurePrimarySlug(prisma, siteId, lang, "event", eventId, slugify(copy.title));
    }
  }

  for (const extra of existingEvents.slice(ETYEK_EVENTS.length)) {
    await prisma.event.update({ where: { id: extra.id }, data: { isActive: false } });
  }

  for (const page of LEGAL) {
    const legal = await prisma.legalPage.upsert({
      where: { siteId_key: { siteId, key: page.key } },
      update: { isActive: true },
      create: { siteId, key: page.key, isActive: true },
      select: { id: true },
    });
    for (const lang of langs) {
      const copy = page.copy[lang];
      await prisma.legalPageTranslation.upsert({
        where: { legalPageId_lang: { legalPageId: legal.id, lang } },
        update: {
          title: copy.title,
          shortDescription: `<p>${copy.short}</p>`,
          content: copy.body,
          seoTitle: copy.title,
          seoDescription: copy.short,
        },
        create: {
          legalPageId: legal.id,
          lang,
          title: copy.title,
          shortDescription: `<p>${copy.short}</p>`,
          content: copy.body,
          seoTitle: copy.title,
          seoDescription: copy.short,
          seoKeywords: [],
        },
      });
    }
  }

  for (const page of STATIC_PAGES) {
    const title = page.copy.hu.title;
    const existing = await prisma.staticPage.findFirst({
      where: { siteId, translations: { some: { lang: "hu", title } } },
      select: { id: true },
    });
    const staticPage =
      existing ??
      (await prisma.staticPage.create({
        data: { siteId, category: page.category, isActive: true },
        select: { id: true },
      }));
    for (const lang of langs) {
      const copy = page.copy[lang];
      await prisma.staticPageTranslation.upsert({
        where: { staticPageId_lang: { staticPageId: staticPage.id, lang } },
        update: {
          title: copy.title,
          shortDescription: `<p>${copy.short}</p>`,
          content: copy.body,
          seoTitle: copy.title,
          seoDescription: copy.short,
        },
        create: {
          staticPageId: staticPage.id,
          lang,
          title: copy.title,
          shortDescription: `<p>${copy.short}</p>`,
          content: copy.body,
          seoTitle: copy.title,
          seoDescription: copy.short,
          seoKeywords: [],
        },
      });
    }
  }

  return { siteId, places: placeCount, events: ETYEK_EVENTS.length, legal: LEGAL.length, staticPages: STATIC_PAGES.length };
}
