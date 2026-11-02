import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HAS_MULTIPLE_SITES, type Lang} from "../app/config";
import { useRouteCtx } from "../app/useRouteCtx";
import { FloatingHeader } from "../components/FloatingHeader";
import { PlanPicker } from "../components/PlanPicker";
import { Footer } from "../ui/layout/Footer";
import { getPlatformSettings } from "../api/places.api";
import { useApplyPublicFonts } from "../hooks/useApplyPublicFonts";
import { useApplyPublicTheme, publicThemeStyle } from "../hooks/useApplyPublicTheme";
import { publicFontCssVars } from "../styles/publicFonts";
import "../styles/overview.css";

const RESERVED = new Set([
  "pricing",
  "preise",
  "tarife",
  "impresszum",
  "aszf",
  "adatvedelem",
  "imprint",
  "terms",
  "privacy",
  "impressum",
  "agb",
  "datenschutz",
  "overview",
]);

export function PublicPricingPage() {
  const { lang } = useRouteCtx();
  const { siteKey } = useParams<{ siteKey?: string }>();
  const insideSiteLayout = HAS_MULTIPLE_SITES && Boolean(siteKey) && !RESERVED.has(siteKey ?? "");
  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", lang, "default", "fonts"],
    queryFn: () => getPlatformSettings(lang as Lang),
    staleTime: 5 * 60 * 1000,
    enabled: !insideSiteLayout,
  });
  useApplyPublicFonts(platformSettings?.brand?.theme);
  useApplyPublicTheme(platformSettings?.siteTheme, platformSettings?.brand?.theme);

  return (
    <div
      className="hl-public"
      style={{
        ...publicFontCssVars(platformSettings?.brand?.theme),
        ...publicThemeStyle(platformSettings?.siteTheme, platformSettings?.brand?.theme),
      }}
    >
      <FloatingHeader hideMapViewButton />
      <main className="overview overview--pricing">
        <div className="overview__sky" aria-hidden="true" />
        <div className="overview__wrap">
          <PlanPicker lang={lang as Lang} />
        </div>
      </main>
      {!insideSiteLayout && <Footer lang={lang} />}
    </div>
  );
}
