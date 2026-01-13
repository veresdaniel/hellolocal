// src/app/site/SiteLayout.tsx
import { Outlet, useParams, Navigate } from "react-router-dom";
import { Suspense } from "react";
import {
  APP_LANGS,
  DEFAULT_LANG,
  DEFAULT_SITE_SLUG,
  HAS_MULTIPLE_SITES,
  type Lang,
} from "../config";
import { Footer } from "../../ui/layout/Footer";
import { usePlatformSettings } from "./usePlatformSettings";
import { PlatformSettingsProvider } from "../../context/PlatformSettingsContext";
import { useFavicon } from "../../hooks/useFavicon";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { ErrorState } from "../../components/ErrorState";
import { useTranslation } from "react-i18next";
import type { PlatformSettings } from "./SiteOutletContext";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function SiteLayout() {
  const params = useParams();
  const { t } = useTranslation();

  const langParam = params.lang;
  const siteKeyParam = params.siteKey;

  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;

  // Reserved paths that should not be treated as siteKey
  const RESERVED_PATHS = ["sites", "teruletek", "regions", "regionen", "admin", "static-pages", "static-page", "impresszum", "aszf", "adatvedelem", "pricing", "tarife", "preise"];

  // multi-site módban siteKey elvárt, single-site módban fix
  // Ha a siteKeyParam egy foglalt path, akkor redirectálunk a sites listára
  if (HAS_MULTIPLE_SITES && siteKeyParam && RESERVED_PATHS.includes(siteKeyParam)) {
    return <Navigate to={`/${lang}`} replace />;
  }

  const siteKey = HAS_MULTIPLE_SITES
    ? siteKeyParam ?? DEFAULT_SITE_SLUG
    : DEFAULT_SITE_SLUG;

  // Site-hez kötött platform settings / brand / instance betöltés (API-ból)
  // Hook-okat mindig a komponens elején kell hívni, még a korai return-ek előtt
  const { data: platform, isLoading, isError, refetch } = usePlatformSettings({ lang, siteKey });

  // rossz lang -> redirect a javított langra (megtartva a többit)
  if (langParam !== lang) {
    const prefix = HAS_MULTIPLE_SITES ? `/${lang}/${siteKey}` : `/${lang}`;
    return <Navigate to={prefix} replace />;
  }

  // Ha multi-site és nincs siteKey param, akkor nem kellene ide jönni
  // (mert a /:lang route már kezeli a SitesListPage-et)
  // De ha mégis ide jön, akkor redirectáljuk a default site-ra
  if (HAS_MULTIPLE_SITES && !siteKeyParam) {
    return <Navigate to={`/${lang}/${DEFAULT_SITE_SLUG}`} replace />;
  }

  // Full screen spinner for loading
  if (isLoading) {
    return <LoadingSpinner isLoading={true} delay={500} />;
  }

  // Hiba esetén (pl. rossz siteKey) - designhoz illeszkedő error state
  if (isError || !platform) {
    return (
      <ErrorState
        title={t("error.siteNotFound")}
        message={t("error.siteNotFoundMessage")}
        backLink={`/${lang}`}
        backLinkText={t("error.backToSites")}
        onRetry={() => refetch()}
        variant="default"
      />
    );
  }

  // Outlet context: mindent egy helyen adunk tovább (lang + siteKey + platform)
  // Wrap with PlatformSettingsProvider to provide platform settings to all children (hooks, etc.)
  return (
    <PlatformSettingsProvider value={platform}>
      <SiteLayoutContent lang={lang} siteKey={siteKey} platform={platform} />
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
  // Update favicon dynamically based on site settings (now inside provider)
  useFavicon();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ide később jöhet Header, site alapján brandelt */}
      <div style={{ flex: "1 0 auto" }}>
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
    </div>
  );
}
