/** First-run copy for the six platform guides. Existing slugs are left alone. */
export type GuideSeedTranslation = {
  title: string;
  body: string;
  imageUrl: string;
  imageCaption: string;
  seoTitle: string;
  seoDescription: string;
};

export type GuideSeed = {
  slug: string;
  sortOrder: number;
  translations: Record<"hu" | "en" | "de", GuideSeedTranslation>;
};

const p = (...parts: string[]) => parts.map((text) => `<p>${text}</p>`).join("");

export const PLATFORM_GUIDE_SEED: GuideSeed[] = [
  {
    slug: "google-terkep",
    sortOrder: 10,
    translations: {
      hu: {
        title: "Miért nem elég a Google Térkép?",
        imageUrl: "/marketing/map-szeged.jpg",
        imageCaption: "A helyi kínálat egy térképen: helyek, szűrők és a soron következő programok.",
        seoTitle: "Miért nem elég a Google Térkép egy településnek? | HelloLocal",
        seoDescription:
          "A Google Térkép a világot mutatja. A HelloLocal a régió saját helyeit, programjait és intézményeit gyűjti egyetlen linkre, amit az önkormányzat vagy a turisztikai iroda továbbadhat.",
        body: p(
          "A Google Térkép arra való, hogy a világ bármely pontjára eljussunk. Egy település vendégének viszont nem a világ kell, hanem az, ami ott tényleg megtalálható: a pince, a műhely, a hétvégi program, a könyvtár nyitvatartása. Ezek a nagy térképen könnyen elvesznek a láncok, a benzinkutak és a szomszéd város találatai között.",
          "A HelloLocal nem egy újabb világatlasz. Egy régió saját kínálatát gyűjti össze, a hely gazdájának szavaival. A vendég egy linken nyitja meg a telefonján, szűr, és elindul. Nem kell hozzá alkalmazást letölteni, és böngészni regisztráció nélkül lehet.",
          "Az önkormányzatnak vagy a turisztikai irodának ez egy olyan cím, amit nyugodtan kitehet a weboldalra, a hírlevélbe, a QR-kódra vagy a Tourinform pultjára. Ugyanaz a link mindenhol. Nem kell külön hirdetési gépezet ahhoz, hogy a vendég egy helyen lássa a környéket.",
          "A különbség tehát nem az, hogy melyik térkép szebb. Hanem az, hogy ki válogatja a tartalmat. A nagy térképen a világ látszik. A HelloLocalon az, amit ti akartok megmutatni: a helyi hely, a friss program, és az az intézmény is, ami a helyieknek fontos."
        ),
      },
      en: {
        title: "Why Google Maps is not enough",
        imageUrl: "/marketing/map-szeged.jpg",
        imageCaption: "The local offer on one map: places, filters and what is on this week.",
        seoTitle: "Why Google Maps is not enough for a town | HelloLocal",
        seoDescription:
          "Google Maps shows the world. HelloLocal gathers a region’s own places, events and institutions on one link a council or tourist office can pass on.",
        body: p(
          "Google Maps is built to get you anywhere in the world. A visitor in a small town needs something else: the cellar, the workshop, this weekend’s event, the library’s opening hours. On a world map those easily disappear among chains, petrol stations and the next city.",
          "HelloLocal is not another world atlas. It gathers one region’s own offer, in the words of the people who run each place. The visitor opens one link on their phone, filters, and sets off. No app to install, and no account just to look around.",
          "For a council or a tourist office it is an address you can put on the website, in the newsletter, on a QR code or at the tourist desk. The same link everywhere. You do not need a separate advertising machine for the guest to see the area in one place.",
          "The difference is not which map looks nicer. It is who chooses what appears. The big map shows the world. HelloLocal shows what you want to show: the local place, the fresh event, and the institution that matters to people who live there."
        ),
      },
      de: {
        title: "Warum Google Maps nicht reicht",
        imageUrl: "/marketing/map-szeged.jpg",
        imageCaption: "Das lokale Angebot auf einer Karte: Orte, Filter und das Programm dieser Woche.",
        seoTitle: "Warum Google Maps für eine Gemeinde nicht reicht | HelloLocal",
        seoDescription:
          "Google Maps zeigt die Welt. HelloLocal sammelt die eigenen Orte, Termine und Einrichtungen einer Region auf einem Link, den Gemeinde oder Tourismusbüro weitergeben.",
        body: p(
          "Google Maps ist dafür da, überall auf der Welt hinzufinden. Ein Gast in einer kleinen Gemeinde braucht etwas anderes: den Keller, die Werkstatt, das Wochenendprogramm, die Öffnungszeit der Bibliothek. Auf der Weltkarte verschwinden die leicht zwischen Ketten, Tankstellen und der nächsten Stadt.",
          "HelloLocal ist kein zweiter Weltatlas. Es sammelt das eigene Angebot einer Region, mit den Worten der Menschen, die den Ort führen. Der Gast öffnet einen Link am Handy, filtert und geht los. Keine App, und kein Konto nur zum Umschauen.",
          "Für Gemeinde oder Tourismusbüro ist das eine Adresse für die Website, den Newsletter, den QR-Code oder den Schalter. Derselbe Link überall. Es braucht keine eigene Werbeabteilung, damit der Gast die Gegend an einem Ort sieht.",
          "Der Unterschied ist nicht, welche Karte schöner ist. Sondern wer auswählt, was erscheint. Die große Karte zeigt die Welt. HelloLocal zeigt, was ihr zeigen wollt: den lokalen Ort, den frischen Termin und die Einrichtung, die den Einheimischen wichtig ist."
        ),
      },
    },
  },
  {
    slug: "onkormanyzat",
    sortOrder: 20,
    translations: {
      hu: {
        title: "Önkormányzatnak és turisztikai irodának",
        imageUrl: "/marketing/visitor-hiker.jpg",
        imageCaption: "A vendég egy linken indul el, nem tíz külön oldalon keresgél.",
        seoTitle: "Interaktív turisztikai térkép önkormányzatoknak | HelloLocal",
        seoDescription:
          "Egy link a település helyeire és programjaira. Az önkormányzat vagy a turisztikai iroda továbbadja, a hely gazdája a saját oldalát gondozza.",
        body: p(
          "Egy település turisztikai kommunikációja gyakran szétszórt. Van egy PDF a honlapon, egy Facebook-esemény, egy nyomtatott szórólap, és egy lista a Tourinform pultján. A vendég ezek közül választ, vagy egyiket sem találja meg, amikor már ott áll a főtéren.",
          "A HelloLocal ezt egy címre húzza össze. A térképen ott van a látnivaló, a szolgáltatás, a vendéglátóhely, a program és a helyi intézmény. Az önkormányzat vagy az iroda ezt az egy linket adja tovább. A weboldalon, a hírlevélben, a plakáton és a pulton ugyanaz a cím szerepel.",
          "A szöveget nem a hivatalnak kell egyedül megírnia. Aki a helyet viszi, a saját oldalát gondozza: képek, nyitvatartás, rövid bemutatkozás. A hivatal azt látja, hogy a kínálat együtt van, és nem egy elavult programhoz küldi a vendéget. Ami véget ért, lekerül a listáról.",
          "Több település is elfér egy régióban. Mindegyiknek megmarad a saját térképe és a saját programja. A kisebb falunak nem kell nulláról felépítenie egy teljes turisztikai oldalt, mégis saját arculattal jelenhet meg, ha arra van szüksége."
        ),
      },
      en: {
        title: "For councils and tourist offices",
        imageUrl: "/marketing/visitor-hiker.jpg",
        imageCaption: "The visitor starts from one link instead of hunting across ten pages.",
        seoTitle: "Interactive tourism map for municipalities | HelloLocal",
        seoDescription:
          "One link to a town’s places and events. The council or tourist office passes it on. Each place owner looks after their own page.",
        body: p(
          "A town’s visitor information is often scattered. A PDF on the website, a Facebook event, a printed leaflet, and a list at the tourist desk. The guest picks among these, or finds none of them while already standing on the main square.",
          "HelloLocal pulls that into one address. The map holds the sight, the service, the place to eat, the event and the local institution. The council or the office passes on that single link. The website, the newsletter, the poster and the desk all use the same address.",
          "The office does not have to write every word alone. Whoever runs the place looks after their own page: photos, opening hours, a short introduction. The office sees the offer together, and does not send the guest to an event that already ended. What is over drops off the list.",
          "Several towns can sit in one region. Each keeps its own map and its own events. A smaller village does not have to build a full tourism site from nothing, and can still appear with its own look when it needs to."
        ),
      },
      de: {
        title: "Für Gemeinden und Tourismusbüros",
        imageUrl: "/marketing/visitor-hiker.jpg",
        imageCaption: "Der Gast startet von einem Link, statt zehn Seiten abzusuchen.",
        seoTitle: "Interaktive Tourismuskarte für Gemeinden | HelloLocal",
        seoDescription:
          "Ein Link zu Orten und Terminen. Gemeinde oder Tourismusbüro gibt ihn weiter. Wer den Ort führt, pflegt die eigene Seite.",
        body: p(
          "Die Gästeinformation einer Gemeinde ist oft verstreut. Ein PDF auf der Website, ein Facebook-Termin, ein gedrucktes Faltblatt und eine Liste am Schalter. Der Gast wählt dazwischen, oder findet keines davon, wenn er schon am Hauptplatz steht.",
          "HelloLocal zieht das auf eine Adresse. Auf der Karte liegen Sehenswürdigkeit, Dienstleistung, Gasthaus, Termin und die lokale Einrichtung. Gemeinde oder Büro gibt genau diesen Link weiter. Website, Newsletter, Plakat und Schalter nutzen dieselbe Adresse.",
          "Das Büro muss nicht jedes Wort allein schreiben. Wer den Ort führt, pflegt die eigene Seite: Fotos, Öffnungszeiten, eine kurze Vorstellung. Das Büro sieht das Angebot beisammen und schickt den Gast nicht zu einem Termin, der schon vorbei ist. Was endet, fällt von der Liste.",
          "Mehrere Orte passen in eine Region. Jeder behält seine Karte und sein Programm. Ein kleineres Dorf muss keine komplette Tourismusseite von null bauen und kann trotzdem mit eigenem Auftritt erscheinen, wenn es das braucht."
        ),
      },
    },
  },
  {
    slug: "helyi-vallalkozas",
    sortOrder: 30,
    translations: {
      hu: {
        title: "Műhely, bolt és szolgáltatás a térképen",
        imageUrl: "/marketing/craft-workshop.jpg",
        imageCaption: "Kézzel készült kerámia a műhelyasztalon: a kis hely is saját oldalt kap.",
        seoTitle: "Helyi vállalkozás a turisztikai térképen | HelloLocal",
        seoDescription:
          "Műhely, bolt, pince és helyi szolgáltatás saját oldallal, képekkel és nyitvatartással. A vendég továbbküldheti, az önkormányzat egy linken adja tovább.",
        body: p(
          "A környék értéke nem csak a főtér és a legismertebb látványosság. Ott van a kerámiaműhely, a mézes bolt, a biciklis szerviz, a fodrász, a pince egy sarokkal beljebb. Ezeket a helyiek ismerik. A vendég gyakran nem, mert nincs egy közös hely, ahol együtt látszanának.",
          "A HelloLocalon a kis hely is saját oldalt kap. Kép, rövid bemutatkozás, nyitvatartás, elérhetőség. Olyan forma, amit a vendég továbbküldhet, ha megtetszett, amit látott. Nem egy hirdetés a nagy térkép szélén, hanem a régió saját kínálatának része.",
          "A szöveget a vállalkozó írja, nem egy távoli szerkesztőség. Ha elakad a megfogalmazással, van segítség a szöveghez, de a tartalom az övé marad. Ő tudja, mikor van nyitva, és mi igaz ezen a héten.",
          "A telefonról is fel lehet vinni a helyet: fotó a kamerából, pár mondat, és ha kell, a pont a térképen. Nem kell megvárni a hétfői irodai napot. A vendég akkor látja a műhelyt, amikor megnyitja a linket, nem hetekkel később."
        ),
      },
      en: {
        title: "Workshops, shops and services on the map",
        imageUrl: "/marketing/craft-workshop.jpg",
        imageCaption: "Handmade bowls on a workshop table: a small place gets its own page.",
        seoTitle: "Put a local business on the tourism map | HelloLocal",
        seoDescription:
          "A workshop, shop, cellar or local service with its own page, photos and opening hours. Visitors can pass it on. The council shares one link.",
        body: p(
          "A region is more than the main square and the famous sight. There is the pottery workshop, the honey shop, the bike repair, the hairdresser, the cellar one corner further in. Locals know them. Visitors often do not, because there is no shared place where they appear together.",
          "On HelloLocal a small place gets its own page. A photo, a short introduction, opening hours, a way to get in touch. A form the visitor can forward when they liked what they saw. Not an ad at the edge of a world map, but part of the region’s own offer.",
          "The owner writes the words, not a distant newsroom. If the wording stalls, there is help with the text, but the content stays theirs. They know when the door is open and what is true this week.",
          "A place can go up from the phone: a photo from the camera, a few sentences, and the point on the map if you want it. No need to wait for Monday in the office. The visitor sees the workshop when they open the link, not weeks later."
        ),
      },
      de: {
        title: "Werkstatt, Laden und Dienstleistung auf der Karte",
        imageUrl: "/marketing/craft-workshop.jpg",
        imageCaption: "Handgemachte Schalen auf dem Werktisch: auch der kleine Ort bekommt eine eigene Seite.",
        seoTitle: "Lokaler Betrieb auf der Tourismuskarte | HelloLocal",
        seoDescription:
          "Werkstatt, Laden, Keller oder lokaler Dienst mit eigener Seite, Fotos und Öffnungszeiten. Gäste können sie weiterleiten. Die Gemeinde teilt einen Link.",
        body: p(
          "Eine Gegend ist mehr als der Hauptplatz und die bekannte Sehenswürdigkeit. Da ist die Töpferwerkstatt, der Honigladen, die Fahrradwerkstatt, der Friseur, der Keller eine Ecke weiter. Einheimische kennen sie. Gäste oft nicht, weil es keinen gemeinsamen Ort gibt, an dem sie zusammen erscheinen.",
          "Auf HelloLocal bekommt auch der kleine Ort eine eigene Seite. Foto, kurze Vorstellung, Öffnungszeiten, Kontakt. Eine Form, die der Gast weiterleitet, wenn ihm gefällt, was er sieht. Keine Anzeige am Rand der Weltkarte, sondern Teil des eigenen Angebots der Region.",
          "Die Worte schreibt, wer den Ort führt, nicht eine ferne Redaktion. Wenn die Formulierung stockt, gibt es Hilfe beim Text, der Inhalt bleibt aber bei ihm. Er weiß, wann offen ist und was diese Woche stimmt.",
          "Ein Ort lässt sich vom Handy aus anlegen: Foto aus der Kamera, ein paar Sätze, und der Punkt auf der Karte, wenn er soll. Nicht bis Montag im Büro warten. Der Gast sieht die Werkstatt, wenn er den Link öffnet, nicht Wochen später."
        ),
      },
    },
  },
  {
    slug: "hogyan-kerul-fel",
    sortOrder: 40,
    translations: {
      hu: {
        title: "Hogyan kerül fel a hely és a program?",
        imageUrl: "/marketing/mobile-place-upload.jpg",
        imageCaption: "A hely feltöltése telefonról: fotó, pár mondat, és a pont a térképen.",
        seoTitle: "Hogyan kerül fel egy hely vagy program a térképre? | HelloLocal",
        seoDescription:
          "Három lépés: a hely vagy a program felkerül, a lejárt program magától lekerül, a vendég egy linken nyitja meg. Telefonról is, app nélkül.",
        body: p(
          "Az első lépés az, hogy felkerül, aki eddig kimaradt. Műhely, bolt, pince, szolgáltatás vagy intézmény: saját oldal, képek, nyitvatartás. Nem egy üres pont a térképen, hanem egy rövid bemutatkozás, amit a vendég el tud olvasni, mielőtt elindul.",
          "A második lépés a program. Ami ezen a héten vagy a hétvégén van, elöl vár a listán. Ami véget ért, magától lekerül. Nem kell kézzel takarítani egy régi eseménynaptárt, és a vendég nem egy már lezajlott koncerthez érkezik.",
          "A harmadik lépés a megosztás. Egy link, a vendég nyelvén, akár saját domainnel is. Megnyitja a telefonján, szűr, és úton van. Külön alkalmazást nem kell telepítenie. Belépni csak akkor kell, ha értékelni szeretne.",
          "A feltöltés nem irodai szertartás. Ha a pincében vagy a műhelyben állsz, a telefon elég: fotó, pár mondat, és ha kéred, a helyzet a térképre teszi a pontot. A vendég azt látja, ami most igaz, nem azt, amit hetekkel ezelőtt valaki még emlékezetből leírt."
        ),
      },
      en: {
        title: "How a place and an event get on the map",
        imageUrl: "/marketing/mobile-place-upload.jpg",
        imageCaption: "Adding a place from the phone: a photo, a few sentences, and the point on the map.",
        seoTitle: "How a place or event gets onto the map | HelloLocal",
        seoDescription:
          "Three steps: the place or event goes up, a finished event drops off, the visitor opens one link. From the phone, with no app.",
        body: p(
          "The first step is adding whoever was missing. A workshop, shop, cellar, service or institution: its own page, photos, opening hours. Not an empty pin, but a short introduction the visitor can read before they set off.",
          "The second step is the event. What is on this week or this weekend waits at the front of the list. What has ended drops off by itself. Nobody has to tidy an old calendar by hand, and the guest does not arrive for a concert that already happened.",
          "The third step is sharing. One link, in the visitor’s language, on your own domain if you have one. They open it on the phone, filter, and they are on their way. No separate app to install. A login is only needed if they want to leave a rating.",
          "Adding a place is not an office ritual. If you are standing in the cellar or the workshop, the phone is enough: a photo, a few sentences, and the location puts the point on the map if you ask it to. The visitor sees what is true now, not what someone wrote from memory weeks ago."
        ),
      },
      de: {
        title: "Wie Ort und Termin auf die Karte kommen",
        imageUrl: "/marketing/mobile-place-upload.jpg",
        imageCaption: "Einen Ort vom Handy aus anlegen: Foto, ein paar Sätze und der Punkt auf der Karte.",
        seoTitle: "Wie ein Ort oder Termin auf die Karte kommt | HelloLocal",
        seoDescription:
          "Drei Schritte: Ort oder Termin kommt hinauf, ein beendeter Termin fällt herunter, der Gast öffnet einen Link. Vom Handy, ohne App.",
        body: p(
          "Der erste Schritt ist, dass hinzukommt, wer bisher fehlte. Werkstatt, Laden, Keller, Dienst oder Einrichtung: eigene Seite, Fotos, Öffnungszeiten. Kein leerer Punkt, sondern eine kurze Vorstellung, die der Gast liest, bevor er losgeht.",
          "Der zweite Schritt ist der Termin. Was diese Woche oder am Wochenende stattfindet, wartet vorn auf der Liste. Was vorbei ist, fällt von selbst herunter. Niemand muss einen alten Kalender von Hand putzen, und der Gast kommt nicht zu einem Konzert, das schon vorbei ist.",
          "Der dritte Schritt ist das Teilen. Ein Link, in der Sprache des Gastes, auch mit eigener Domain. Er öffnet ihn am Handy, filtert und ist unterwegs. Keine eigene App. Anmelden muss er sich nur, wenn er bewerten will.",
          "Das Anlegen ist kein Büro-Ritual. Wer im Keller oder in der Werkstatt steht, braucht das Handy: Foto, ein paar Sätze, und auf Wunsch setzt der Standort den Punkt auf die Karte. Der Gast sieht, was jetzt stimmt, nicht was jemand vor Wochen aus dem Gedächtnis schrieb."
        ),
      },
    },
  },
  {
    slug: "sajat-domain",
    sortOrder: 50,
    translations: {
      hu: {
        title: "Saját domain és több nyelv",
        imageUrl: "/marketing/local-service.jpg",
        imageCaption: "A vendég a saját nyelvén olvassa ugyanazt a térképet, külön alkalmazás nélkül.",
        seoTitle: "Saját domain és többnyelvű turisztikai térkép | HelloLocal",
        seoDescription:
          "A település saját címén is megjelenhet, magyarul, angolul és németül. A vendég a saját nyelvén olvassa a térképet, app nélkül.",
        body: p(
          "Egy link akkor működik igazán, ha a vendég felismeri. A település saját címe — például egy helloetyek.hu jellegű domain — ugyanazt a térképet nyitja, csak a ti neveteken. Ezt a címet lehet kitenni a plakátra, a hírlevélbe és a QR-kódra.",
          "A nyelv nem egy gombnyomásos gépi fordítás az oldal alján. Magyar, angol és német tartalom külön gondozható. A vendég azon a címen találja az oldalt, amelyik az ő nyelvén készült, és ugyanazt a térképet olvassa, nem egy másik alkalmazást.",
          "Egy régióban több település is elfér, mindegyik a saját programjával. A vendég ott marad, ahová belépett, és nem csúszik át véletlenül a szomszéd falu kínálatába. A kisebb településnek ettől még lehet saját megjelenése.",
          "Készülhet külön tematikus oldal is egy kampányhoz: őszi túrák, egy gasztro válogatás, egy ünnepi hétvége. Annak is lehet saját címe, így a plakát egyből a megfelelő ajánlatra visz, nem a teljes térkép elejére."
        ),
      },
      en: {
        title: "Your own domain and more than one language",
        imageUrl: "/marketing/local-service.jpg",
        imageCaption: "The visitor reads the same map in their own language, with no app.",
        seoTitle: "Custom domain and a multilingual tourism map | HelloLocal",
        seoDescription:
          "A town can appear on its own address, in Hungarian, English and German. Visitors read the map in their language, with no app.",
        body: p(
          "A link works when the visitor recognises it. The town’s own address opens the same map under your name. That address can go on the poster, in the newsletter and on the QR code.",
          "Language is not a machine-translation button at the bottom of the page. Hungarian, English and German can each be looked after on their own. The visitor finds the page at the address written in their language and reads the same map, not a different app.",
          "Several towns can share a region, each with its own events. The visitor stays where they entered and does not slide by accident into the next village’s offer. A smaller town can still have its own look.",
          "A separate themed page can be made for a campaign: autumn walks, a food selection, a festival weekend. That page can have its own address, so the poster lands on the right offer, not at the top of the whole map."
        ),
      },
      de: {
        title: "Eigene Domain und mehrere Sprachen",
        imageUrl: "/marketing/local-service.jpg",
        imageCaption: "Der Gast liest dieselbe Karte in seiner Sprache, ohne App.",
        seoTitle: "Eigene Domain und mehrsprachige Tourismuskarte | HelloLocal",
        seoDescription:
          "Eine Gemeinde kann unter der eigenen Adresse erscheinen, auf Ungarisch, Englisch und Deutsch. Der Gast liest die Karte in seiner Sprache, ohne App.",
        body: p(
          "Ein Link wirkt, wenn der Gast ihn wiedererkennt. Die eigene Adresse der Gemeinde öffnet dieselbe Karte unter eurem Namen. Diese Adresse kommt aufs Plakat, in den Newsletter und auf den QR-Code.",
          "Sprache ist kein Knopf für maschinelle Übersetzung unten auf der Seite. Ungarisch, Englisch und Deutsch lassen sich jeweils für sich pflegen. Der Gast findet die Seite unter der Adresse in seiner Sprache und liest dieselbe Karte, nicht eine andere App.",
          "Mehrere Orte passen in eine Region, jeder mit eigenem Programm. Der Gast bleibt, wo er eingetreten ist, und rutscht nicht zufällig ins Angebot des Nachbardorfs. Ein kleinerer Ort kann trotzdem einen eigenen Auftritt haben.",
          "Für eine Kampagne kann eine eigene Themenseite entstehen: Herbstwanderungen, eine Gastro-Auswahl, ein Festwochenende. Auch die kann eine eigene Adresse haben, damit das Plakat beim passenden Angebot landet, nicht am Anfang der ganzen Karte."
        ),
      },
    },
  },
  {
    slug: "helyi-intezmenyek",
    sortOrder: 60,
    translations: {
      hu: {
        title: "Hivatal, iskola és könyvtár egy térképen",
        imageUrl: "/marketing/civic-institutions.jpg",
        imageCaption: "A közintézmény is felkerül: nyitvatartás, elérhetőség, rövid bemutatkozás.",
        seoTitle: "Helyi intézmények egy térképen | HelloLocal",
        seoDescription:
          "Óvoda, iskola, könyvtár, rendelő és hivatal egy helyen, nyitvatartással és elérhetőséggel. A helyieknek és a visszatérő vendégnek is.",
        body: p(
          "Egy település térképe nem csak a turistának szól. A helyiek és a visszatérő vendégek azt keresik, hol van nyitva a könyvtár, mikor tart a rendelés, melyik utcában van az óvoda vagy a hivatal. Ezek az információk ma gyakran külön oldalakon, elavult táblázatokban vagy egy Facebook-bejegyzésben élnek.",
          "A HelloLocalon az intézmény ugyanúgy saját oldalt kap, mint a műhely. Nyitvatartás, elérhetőség, rövid bemutatkozás. Óvoda, bölcsőde, iskola, könyvtár, művelődési ház, rendelő, polgármesteri hivatal: ami a mindennaphoz kell, egy helyen van.",
          "Ez nem helyettesíti a hivatal saját honlapját, ha arra jogszabály vagy ügyintézés miatt szükség van. A térkép azt adja, amit az ember útközben keres: hol van, mikor nyit, kit lehet hívni. Aki az intézményt viszi, ezt a rövid oldalt maga tudja frissen tartani.",
          "A vendég és a helybeli ugyanazt a linket kapja. Aki programot keres, a programot látja elöl. Aki intézményt keres, szűr, és oda talál. Nem kell hozzá külön alkalmazás, és nem kell tíz könyvjelzőt gyűjteni a telefonon."
        ),
      },
      en: {
        title: "The town hall, the school and the library on one map",
        imageUrl: "/marketing/civic-institutions.jpg",
        imageCaption: "A public institution gets a page too: hours, contact, a short introduction.",
        seoTitle: "Local institutions on one map | HelloLocal",
        seoDescription:
          "School, library, clinic and town hall in one place, with opening hours and a way to get in touch. For residents and returning visitors.",
        body: p(
          "A town map is not only for tourists. Residents and people who come back want to know when the library is open, when the clinic runs, which street the school or the town hall is on. Today that information often lives on separate pages, in an old table, or in a Facebook post.",
          "On HelloLocal an institution gets its own page, the same way a workshop does. Opening hours, contact, a short introduction. Nursery, school, library, culture house, clinic, town hall: what everyday life needs, in one place.",
          "This does not replace the office’s own website when a rule or a formal errand needs that site. The map gives what a person looks up on the way: where it is, when it is open, whom to call. Whoever runs the institution can keep this short page up to date.",
          "The visitor and the resident get the same link. Someone looking for an event sees the event first. Someone looking for an institution filters and finds it. No separate app, and no need to collect ten bookmarks on the phone."
        ),
      },
      de: {
        title: "Amt, Schule und Bibliothek auf einer Karte",
        imageUrl: "/marketing/civic-institutions.jpg",
        imageCaption: "Auch die Einrichtung bekommt eine Seite: Öffnungszeit, Kontakt, kurze Vorstellung.",
        seoTitle: "Lokale Einrichtungen auf einer Karte | HelloLocal",
        seoDescription:
          "Schule, Bibliothek, Ordination und Amt an einem Ort, mit Öffnungszeiten und Kontakt. Für Einheimische und wiederkehrende Gäste.",
        body: p(
          "Die Karte einer Gemeinde ist nicht nur für Touristen. Einheimische und Menschen, die wiederkommen, wollen wissen, wann die Bibliothek offen ist, wann die Ordination läuft, in welcher Straße Schule oder Amt liegen. Heute steckt das oft auf getrennten Seiten, in einer alten Tabelle oder in einem Facebook-Beitrag.",
          "Auf HelloLocal bekommt die Einrichtung eine eigene Seite, so wie die Werkstatt. Öffnungszeiten, Kontakt, kurze Vorstellung. Kindergarten, Schule, Bibliothek, Kulturhaus, Ordination, Gemeindeamt: was der Alltag braucht, an einem Ort.",
          "Das ersetzt nicht die eigene Website des Amtes, wenn eine Vorschrift oder ein förmliches Anliegen diese Seite braucht. Die Karte gibt, was man unterwegs sucht: wo es ist, wann es offen ist, wen man anruft. Wer die Einrichtung führt, kann diese kurze Seite selbst aktuell halten.",
          "Gast und Einheimischer bekommen denselben Link. Wer einen Termin sucht, sieht den Termin vorn. Wer eine Einrichtung sucht, filtert und findet sie. Keine eigene App, und keine zehn Lesezeichen auf dem Handy."
        ),
      },
    },
  },
];
