# HelloLocal integrációs felmérés

Állapot: 2026. november 1. A felmérés lezárult.

A nemzeti turisztikai portálok nem adnak nyilvános tartalom-API-t. Ami forgalmat és előfizetést is hozhat, az a település saját honlapja és a borút: oda egy beágyazható térkép kell. A HelloLocal ma bejelentkezés nélküli JSON-ban kiadja a helyeket és az eseményeket. Widget, iCal, RSS, webhook és leírt partnerfeed a felmérés szerint még nincs.

## Először ez a három irány

Az első kettő megkeresés. A harmadik egyszeri adatimport, szerződés nélkül.

### 1. Etyek honlapja és az Etyeki Borút — kifelé, beágyazással

Az önkormányzat oldala a [webetyek.hu](https://webetyek.hu/). A fájlok a `/wp-content/` útvonalról jönnek, tehát WordPress. A [turizmus aloldalon](https://webetyek.hu/turizmus/) már vannak dátumozott programok (szentmise, gyertyagyújtás, Márton nap). Az [Etyeki Borút Egyesület](http://etyekiborut.hu/rolunk/) a minősített borászatokat, kézműveseket, szállásokat és vendéglátóhelyeket mutatja. Elérhetőség: borutetyek@gmail.com, 2091 Etyek, Alcsúti út 1.

Nyilvános API-t egyik oldalon sem talált a felmérés. A WordPress-szerkesztő HTML-blokkot be tud illeszteni. Más településeken a [Webra 3.0 banner modulja](https://www.webra.hu/termekek/webra-3-0-modulok) képet, videót és HTML-kódrészletet is elfogad, tehát a következő vevőknél ugyanez a minta a kiindulás. Etyek oldalán Webra-t a felmérés nem állapított meg.

Mit hoz: aki már az önkormányzat vagy a borút oldalán van, egy kattintás nélkül látja a többnyelvű térképet, és onnan a HelloLocalra kerül. Eladási érv a havi díjra (3 990 / 8 990 Ft): a település a saját honlapján kap térképet.

A megállapodás egy beilleszthető blokk, nem többéves partnerszerződés.

**Mit kérdezzünk:** kaphat-e a `/turizmus` oldal és a borút egy térkép- és programblokkot, ami visszafelé linkel? Ki tölti a kulturális naptárt, és van-e nyilvános Google Naptár-címük?

### 2. A település saját naptára — befelé, iCal-lal

A magyar falvak programja gyakran Google Naptárban vagy a művelődési ház listájában él, nem egy országos API-ban. A Google nyilvános naptárhoz [beágyazó kódot és iCal-címet](https://support.google.com/calendar/answer/37083?hl=hu) ad, ha a naptár nyilvános. Etyek oldalán ilyen feedet a felmérés nem látott, csak a megjelenített eseménylistát.

Mit hoz: a polgármesteri hivatal és a művelődési ház egyszer viszi fel a programot, a HelloLocal átveszi. Eladási érv, hogy nem kell két naptárt gondozni.

Ha van nyilvános iCal-cím, az egy feed. Ha nincs, e-mailben kell elkérni a naptár megosztását.

Facebook-eseményt a felmérés szerint ne ígérjünk helyette. A [Graph API eseményei](https://developers.facebook.com/docs/graph-api/reference/event/) csak Facebook Marketing Partnereknek olvashatók. A [Page Plugin](https://developers.facebook.com/docs/plugins/page-plugin/) legfeljebb egy 180–500 pixeles, nem formázható iframe (`timeline`, `events`, `messages` fülekkel).

**Mit kérdezzünk:** van-e nyilvános Google Naptár, és megosztható-e az iCal-címe?

### 3. OpenStreetMap — egyszeri helyimport

Az [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) csak olvasható. Egy terület vendéglátóit, borászatait, címét és `opening_hours` címkéjét le lehet kérdezni. A fő nyilvános szerver (`overpass-api.de`) kis projektre van méretezve: rendszeres használatnál napi 100 lekérdezés és 10 MB alatt maradni illik, kereskedelmi használatra saját vagy fizetős szervert írnak. A [csempék](https://operations.osmfoundation.org/policies/tiles/) és a [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) (legfeljebb 1 kérés/másodperc) adományozott kapacitás, éles térképnek nem valók.

Mit hoz: egy új régió nem üres térképpel indul, a szerkesztő csak ellenőriz. Forgalmat nem hoz. A demó hitelességét igen.

Egyszeri lekérdezés és kézi ellenőrzés. Szerződni nem kell, partnert megkeresni nem kell.

## Ami nem nyitott partnercsatorna

| Jelölt | Ami ténylegesen nyitva van | Miért esik ki |
| --- | --- | --- |
| [Hello Hungary](https://hellohungary.hu/mediaajanlat) | Szerkesztőségi és fizetett megjelenés. Vendégcikk 50 000 Ft-tól. sales@hellohungary.hu | API nincs. |
| Visit Hungary, NETA, NTAK, NTAK Iránytű | A [NETA](https://www.vac.hu/docs/tdm_melleklet.pdf) Tourinform-irodáknak belépéses adatbázis (`neta.hun.travel`). Az [NTAK PMS](https://info.ntak.hu/media/uploads/docs/NTAK_PMS_Interface_v9-0.pdf) és az [attrakciós TSS](https://info.ntak.hu/media/uploads/docs/tss_interfesz_leiras_v103.pdf) kötelező, tanúsítvánnyal aláírt statisztika-beküldés. Az Iránytű szállásstatisztika. A [B2B oldal](https://visithungary.com/b2b) utazásszervezőknek szól. | Hely- vagy programfeed nincs. |
| Programturizmus | [Naptármegjelenés](https://www.programturizmus.hu/page-naptar-megjelenes.html): 15 000 Ft + áfa / időpont, a szerkesztőség rakja ki. | Feed nincs. Fizetett hirdetés. |
| Partyajánló | Van [ingyenes beágyazó widget](https://partyajanlo.hu/partyajanlo_apitechnikaileiras.pdf). | A widget a saját oldalukra visz bulikat. Borvidéknek rossz illeszkedés. |
| Mapillary | A [v4 API](https://www.mapillary.com/developer/api-documentation/) létezik (token, vektorcsempe, `graph.mapillary.com`), utcai fotót ad. | Látogatót nem hoz. Az etyeki lefedettséget a felmérés nem ellenőrizte. |
| Önkormányzati hirdetmények a webetyek.hu-n | Pályázat, adó, hatósági közlemény. | Felfedező oldalra nem valók. |
| Foglalás, webshop | A termék a felmérés szerint pénzt nem kezel. Elég a hely saját oldalára mutató link. | Külön foglaló API-t a felmérés nem javasol. |
| Google Business Profile | A [Business Information API](https://developers.google.com/my-business/content/prereqs) csak jóváhagyás után érhető el (60 napja ellenőrzött profil, űrlap, OAuth `business.manage`). A [nyitvatartás](https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations) a tulajdonos engedélyével olvasható. A Places API külön, használatarányos Google-díj. | Létező, de nem első. Akkor éri meg, ha a fizetős helyek tulajdonosai összekötik a saját profiljukat. |

## Mit kellene a HelloLocalnak kiadnia

A repóban a felmérés szerint már van nyilvános, bejelentkezés nélküli JSON, csak a throttler védi:

- `GET /api/public/:lang/:siteKey/places`
- `GET /api/public/:lang/:siteKey/events`

Lista, slug és stabil azonosító. Ezt a JSON-t a felmérés szerint ne adjuk oda partnernek szerződésként: az alkalmazás saját hívása, lapozással.

Egy településnek három kifelé néző dolog kellene. A felmérés szerint egyik sincs még meg:

- egy régióra és nyelvre szűrt iframe vagy HTML-blokk, amit WordPressbe be lehet illeszteni,
- eseményenként és régiónként egy `.ics` cím,
- ugyanez a két lista stabil, dokumentált JSON-ként, ha egy borút vagy TDM maga akarja betölteni.

Befelé elég egy iCal-cím mező régiónként, plusz egy egyszeri OSM-import, emberi ellenőrzéssel.

## Amit a felmérés nem zárt le

A felmérés lezárult. Ezek a pontok benne nyitva maradtak, mert a forrás nem adta ki őket:

- Etyek oldalán nyilvános iCal-címet nem talált; attól még lehet, hogy a naptár létezik, csak nincs kitéve.
- A Mapillary lefedettségét Etyeken nem ellenőrizte.
- Új integrációt nem épített, és a fenti végpontokon kívül más nyilvános partner-API-t nem írt le.
