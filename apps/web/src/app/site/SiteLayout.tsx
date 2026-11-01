// src/app/site/SiteLayout.tsx
import { Outlet, useParams, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { DEFAULT_LANG, DEFAULT_SITE_SLUG, HAS_MULTIPLE_SITES, type Lang, isLang } from "../config";
import { Footer } from "../../ui/layout/Footer";
import { usePlatformSettings } from "./usePlatformSettings";
import { PlatformSettingsProvider } from "../../context/PlatformSettingsContext";
import { useFavicon } from "../../hooks/useFavicon";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { ErrorState } from "../../components/ErrorState";
import { NotFoundPage } from "../../pages/NotFoundPage";
import { useTranslation } from "react-i18next";
import { devLog } from "../../lib/devLog";
import type { PlatformSettings } from "./SiteOutletContext";
import { publicFontCssVars } from "../../styles/publicFonts";
import { useApplyPublicFonts } from "../../hooks/useApplyPublicFonts";
import { useApplyPublicTheme, publicThemeStyle } from "../../hooks/useApplyPublicTheme";
import { CookieConsent } from "../../components/CookieConsent";
import { GoogleAnalytics } from "../../components/GoogleAnalytics";
import { PlatformGaShell } from "../../components/PlatformGaShell";
import {
  PublicGaOverrideProvider,
  usePublicGaOverrideId,
} from "../../context/PublicGaOverrideContext";

const LegalPage = lazy(() =>
  import("../../pages/LegalPage").then((m) => ({ default: m.LegalPage }))
);
const PublicPricingPage = lazy(() =>
  import("../../pages/PublicPricingPage").then((m) => ({ default: m.PublicPricingPage }))
);


export function SiteLayout() {
  const params = useParams();
  const location = useLocation();
  const { t } = useTranslation();

  const langParam = params.lang;
  const siteKeyParam = params.siteKey;

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Check if we're on a collections route (which doesn't require siteKey)
  const isCollectionsRoute = location.pathname.includes("/collections/");

  // Reserved paths that should not be treated as siteKey
  const RESERVED_PATHS = [
    "sites",
    "regiok",
    "teruletek",
    "regions",
    "regionen",
    "admin",
    "static-pages",
    "static-page",
    "impresszum",
    "aszf",
    "adatvedelem",
    "pricing",
    "tarife",
    "preise",
    "overview",
    "collections",
    "hely",
    "place",
    "ort",
    "telepules",
    "town",
    "gemeinde",
    "event",
  ];

  // Determine siteKey - use DEFAULT_SITE_SLUG if siteKeyParam is a reserved path
  // For collections route, always use DEFAULT_SITE_SLUG (no siteKey in URL)
  const siteKey = HAS_MULTIPLE_SITES
    ? isCollectionsRoute
      ? DEFAULT_SITE_SLUG
      : RESERVED_PATHS.includes(siteKeyParam || "")
        ? DEFAULT_SITE_SLUG
        : (siteKeyParam ?? DEFAULT_SITE_SLUG)
    : DEFAULT_SITE_SLUG;

  // Site-hez kötött platform settings / brand / instance betöltés (API-ból)
  // Hook-okat mindig a komponens elején kell hívni, még a korai return-ek előtt
  const { data: platform, isLoading, isError, refetch } = usePlatformSettings({ lang, siteKey });

  // Reserved segments are public pages, not site slugs. Render them after hooks
  // so navigating onto one of these paths does not change the hook count.
  if (HAS_MULTIPLE_SITES && siteKeyParam && RESERVED_PATHS.includes(siteKeyParam)) {
    if (siteKeyParam === "overview") {
      return <Navigate to={`/${lang}/overview`} replace />;
    }
    // Reserved paths are platform pages — use platform GA, not a site ID
    if (siteKeyParam === "pricing" || siteKeyParam === "preise" || siteKeyParam === "tarife") {
      return (
        <PlatformGaShell>
          <PublicPricingPage />
        </PlatformGaShell>
      );
    }
    if (siteKeyParam === "impresszum") {
      return (
        <PlatformGaShell>
          <LegalPage pageKey="imprint" />
        </PlatformGaShell>
      );
    }
    if (siteKeyParam === "aszf") {
      return (
        <PlatformGaShell>
          <LegalPage pageKey="terms" />
        </PlatformGaShell>
      );
    }
    if (siteKeyParam === "adatvedelem") {
      return (
        <PlatformGaShell>
          <LegalPage pageKey="privacy" />
        </PlatformGaShell>
      );
    }
    return <Navigate to={`/${lang}`} replace />;
  }

  // rossz lang -> redirect a javított langra (megtartva a többit)
  if (langParam !== lang) {
    const prefix = isCollectionsRoute
      ? `/${lang}`
      : HAS_MULTIPLE_SITES
        ? `/${lang}/${siteKey}`
        : `/${lang}`;
    return <Navigate to={prefix} replace />;
  }

  // Ha multi-site és nincs siteKey param, akkor nem kellene ide jönni
  // (mert a /:lang route már kezeli a SitesListPage-et)
  // De ha mégis ide jön, akkor redirectáljuk a default site-ra
  // Exception: collections route doesn't need siteKey
  if (HAS_MULTIPLE_SITES && !siteKeyParam && !isCollectionsRoute) {
    return <Navigate to={`/${lang}/${DEFAULT_SITE_SLUG}`} replace />;
  }

  // Full screen spinner for loading
  if (isLoading) {
    return <LoadingSpinner isLoading={true} delay={500} />;
  }

  // Hiba esetén (pl. rossz siteKey): 404 → NotFoundPage, egyéb → 500 state
  if (isError || !platform) {
    const errorStatus = (isError as any)?.status || (isError as any)?.response?.status;
    if (errorStatus === 404 || (!isError && !platform)) {
      devLog.warn("[SiteLayout] site not found", { lang, errorStatus });
      return <NotFoundPage />;
    }
    devLog.error("[SiteLayout] platform load failed", isError);
    return (
      <ErrorState
        title={t("error.internalServerError")}
        message={t("error.serverErrorDescription")}
        backLink={`/${lang}`}
        backLinkText={t("error.backToSites")}
        onRetry={() => refetch()}
        variant="default"
        statusCode={500}
      />
    );
  }

  if (platform.visitorHold) {
    return (
      <div
        className="hl-public"
        style={{
          ...publicFontCssVars(platform.brand?.theme),
          ...publicThemeStyle(platform.siteTheme, platform.brand?.theme),
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            maxWidth: 420,
            fontSize: 18,
            lineHeight: 1.5,
            color: "var(--hl-on-dark)",
          }}
        >
          {t("error.visitorHold") ||
            "A nyilvános térkép jelenleg nem elérhető. A helyek megmaradtak."}
        </p>
      </div>
    );
  }

  // Outlet context: mindent egy helyen adunk tovább (lang + siteKey + platform)
  // Wrap with PlatformSettingsProvider to provide platform settings to all children (hooks, etc.)
  return (
    <PlatformSettingsProvider value={platform}>
      <PublicGaOverrideProvider>
        <SiteLayoutContent lang={lang} siteKey={siteKey} platform={platform} />
      </PublicGaOverrideProvider>
    </PlatformSettingsProvider>
  );
}

// Inner component that uses hooks that require PlatformSettingsProvider
function SiteLayoutContent({
  lang,
  siteKey,
  platform,
}: {
  lang: Lang;
  siteKey: string;
  platform: PlatformSettings;
}) {
  const { t } = useTranslation();
  // Update favicon dynamically based on site settings (now inside provider)
  useFavicon();
  useApplyPublicFonts(platform.brand?.theme);
  useApplyPublicTheme(platform.siteTheme, platform.brand?.theme);

  const showCookieConsent = platform.features?.cookieConsent !== false;
  const siteGaId = platform.analytics?.gaMeasurementId ?? null;
  const pageGaOverride = usePublicGaOverrideId();
  // Event/Place/Town pages may set a more specific ID; otherwise use Site GA.
  // No platform fallback on site routes (platform pages use PlatformGaShell).
  const activeGaId = pageGaOverride ?? siteGaId;

  return (
    <div
      className="hl-public"
      style={{
        ...publicFontCssVars(platform.brand?.theme),
        ...publicThemeStyle(platform.siteTheme, platform.brand?.theme),
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <a href="#public-main" className="hl-skip-link">
        {t("common.skipToContent", { defaultValue: "Ugrás a tartalomra" })}
      </a>
      {/* ide később jöhet Header, site alapján brandelt */}
      <div id="public-main" tabIndex={-1} style={{ flex: "1 0 auto" }}>
        <Suspense fallback={<LoadingSpinner isLoading={true} delay={200} />}>
          <Outlet context={{ lang, siteKey, platform }} />
        </Suspense>
      </div>
      {/* Footer always visible at bottom, using flexbox to keep it there */}
      {platform && (
        <div style={{ flexShrink: 0 }}>
          <Footer lang={lang} siteSlug={siteKey} platform={platform} />
        </div>
      )}
      {showCookieConsent ? <CookieConsent /> : null}
      <GoogleAnalytics measurementId={activeGaId} />
    </div>
  );
}
