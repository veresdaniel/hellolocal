# Public analytics (GTM → GA4)

The web app pushes **Google Analytics–style events** into `window.dataLayer` on **public** pages only (admin routes are skipped). Events fire only after **cookie consent**. A GTM container ID is optional at push time: the queue still fills; once a container loads for that host, GTM can forward events to GA4.

**Code:** `apps/web/src/lib/gtmEvents.ts`, `apps/web/src/components/PublicAnalytics.tsx`, `apps/web/src/components/GoogleTagManager.tsx`.

**Admin config:** per-hostname GTM container under **Nyilvános platformcímek** (and domain rows on sites / towns / places / events). Format: `GTM-XXXXXXX`.

---

## Events the app already pushes

| `event` (dataLayer) | When | Useful parameters |
| --- | --- | --- |
| `page_view` | Every public SPA navigation (and on consent) | `page_path`, `page_location`, `page_title`, `page_type` |
| `scroll` | Scroll depth 25 / 50 / 75 / 90% (once per page) | `percent_scrolled` |
| `view_item` | Place or event detail loaded | `item_id`, `item_name`, `item_category`, `item_type` (`place` \| `event`) |
| `select_item` | Place card click in list | `item_id`, `item_name`, `item_category`, `item_type`, `item_list_name` |
| `contact_click` | Phone / email / website / Facebook / WhatsApp on place | `contact_method`, `item_id`, `item_name`, `item_type` |
| `share` | Social share or copy link | `method`, `content_type`, `item_id` |
| `cta_click` | Landing “live demo” (and similar CTAs) | `cta_id`, `cta_text` |
| `select_content` | Soft nav (e.g. map view, “how it works”) | `content_id`, `content_type` |
| `login_click` / `sign_up_click` | Header / menu auth entry | — |
| `generate_lead` | Demo request form success | `form_id` |

All pushes also include `transport_timestamp` (ms).

---

## What you configure (GTM + GA4)

The app does **not** create GA4 tags for you. You set this up once in **Google Tag Manager** (and ensure a GA4 property / web stream exists).

### 1. GA4 (Google Analytics)

1. Create (or open) a **GA4 property** and a **Web** data stream for the hostname (e.g. `https://hellolocal.hu`).
2. Note the stream’s **Measurement ID** (`G-……`) — used inside GTM’s GA4 tags, not pasted into HelloLocal admin (admin uses **GTM-……**).
3. Optional: mark conversions later for `generate_lead`, `contact_click`, etc.

### 2. GTM container

1. Create a container (or use the existing one, e.g. `GTM-5KW93TVN`).
2. Put that ID on the matching host row in HelloLocal admin (**Platformcímek** / domain GTM field) and save.
3. In GTM, add a **Google tag** (or GA4 Configuration) with the `G-……` Measurement ID, trigger: **Consent Initialization** or **All Pages** (after your consent model). HelloLocal only loads `gtm.js` after cookie accept.

### 3. Custom Event triggers + GA4 Event tags

For **each** row in the table above:

1. **Trigger** → type **Custom Event** → Event name = exact `event` string (e.g. `view_item`).
2. **Tag** → **Google Analytics: GA4 Event**  
   - Configuration tag / Measurement ID: your GA4 tag  
   - Event name: same as the dataLayer event (or a GA4 recommended name)  
   - Event parameters: map dataLayer keys (`item_id`, `page_path`, …) via Data Layer Variables.

Suggested Data Layer Variables to create:  
`page_path`, `page_location`, `page_title`, `page_type`, `percent_scrolled`, `item_id`, `item_name`, `item_category`, `item_type`, `item_list_name`, `contact_method`, `method`, `content_type`, `content_id`, `cta_id`, `cta_text`, `form_id`.

### 4. SPA note

`page_view` is pushed on client-side route changes. Prefer the app’s `page_view` Custom Event (not only GTM’s built-in History Change), so `page_path` / `page_type` stay consistent.

### 5. Consent

- Banner: accept → analytics may load; **Most nem** dismisses without enabling tags.
- Re-open: **Süti beállítások** in the mobile menu and footer.
- Do not fire marketing/analytics tags in GTM before consent (HelloLocal already delays `gtm.js` until accept).

### 6. Admin

No GTM/GA events on `/admin` (or `/:lang/admin`). Do not add a sitewide “All Pages” debug tag that also covers admin if you want a clean public-only stream.

### 7. Verify

1. Accept cookies on the public site.  
2. GTM **Preview** → confirm `gtm.js` and custom events.  
3. GA4 **Admin → DebugView** (or Realtime) → confirm hits.  
4. DevTools → `window.dataLayer` should show the pushes after consent.

---

## Related admin fields

| Where | What |
| --- | --- |
| App settings → Nyilvános platformcímek | Per platform host: `host` + lang + `GTM-…` |
| Site / town / place / event domain editors | Optional GTM on that custom domain |

Empty GTM field = no container script for that host; dataLayer events still queue after consent if the user already accepted, but nothing ships to Google until a container is set and published.
