import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStaticPages } from "../../api/static-pages.api";
import type { Lang} from "../../app/config";
import type { PlatformSettings } from "../../app/site/SiteOutletContext";
import { legalSegment, overviewSegment } from "../../app/entityPaths";
import { buildUrl } from "../../app/urls";
import { usePlatformSettingsContextOptional } from "../../context/PlatformSettingsContext";

export function Footer({
  lang,
  siteSlug,
  platform,
  compact = false,
  variant,
}: {
  lang: Lang;
  siteSlug?: string; // Optional - not available on site list page
  platform?: PlatformSettings; // Optional - not available on site list page
  compact?: boolean;
  variant?: "overview";
}) {
  const { t } = useTranslation();
  const effectiveSiteSlug = siteSlug;
  const currentYear = new Date().getFullYear();
  const [isMobile, setIsMobile] = useState(false);

  // Check if there are any static pages
  const { data: staticPages = [] } = useQuery({
    queryKey: ["staticPages", lang, effectiveSiteSlug, "all"],
    queryFn: () => getStaticPages(lang, effectiveSiteSlug ?? ""),
    enabled: Boolean(effectiveSiteSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasStaticPages = staticPages.length > 0;

  const contextPlatformSettings = usePlatformSettingsContextOptional();
  const platformSettings = platform || contextPlatformSettings;

  const siteName = platformSettings?.site?.name;
  const brandBadgeIcon = platformSettings?.placeholders?.avatar;
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Compact version for map view
  if (compact) {
    return (
      <footer
        className="hl-public"
        style={{
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
          background: "#1b1730",
          color: "white",
          borderTop: "none",
        }}
      >
        <div
          className="hl-public-pad-x"
          style={{
            paddingTop: isMobile ? 12 : 16,
            paddingBottom: isMobile ? 12 : 16,
          }}
        >
        <div
          className="hl-public-width"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: isMobile ? 8 : 16,
          }}
        >
          {/* Brand - Always on left */}
          {(siteName || brandBadgeIcon) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {brandBadgeIcon && !logoError && (
                <img
                  src={brandBadgeIcon}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{
                    height: isMobile ? 23 : 28,
                    width: "auto",
                    objectFit: "contain",
                    borderRadius: 4,
                    display: "block",
                  }}
                  onError={(e) => {
                    console.warn("[Footer] Failed to load brandBadgeIcon:", brandBadgeIcon);
                    setLogoError(true);
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={() => {
                    setLogoError(false);
                  }}
                />
              )}
              {siteName && (
                <span
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: 700,
                    fontFamily:
                      "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {siteName}
                </span>
              )}
            </div>
          )}

          {/* Links - Desktop only */}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                fontSize: 14,
                fontWeight: 500,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {hasStaticPages && (
                <Link
                  to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "static-pages" })}
                  style={{
                    color: "white",
                    textDecoration: "none",
                    fontSize: 15,
                    fontWeight: 500,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    opacity: 0.9,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                  }}
                >
                  {t("admin.dashboardCards.staticPages")}
                </Link>
              )}
              {effectiveSiteSlug ? (
                <Link
                  to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "products" })}
                  style={{
                    color: "white",
                    textDecoration: "none",
                    fontSize: 15,
                    fontWeight: 500,
                    opacity: 0.9,
                  }}
                >
                  {t("public.catalog.title")}
                </Link>
              ) : null}
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: legalSegment(lang, "imprint") })}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: 0.9,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
              >
                {t("public.legal.imprint.title")}
              </Link>
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: legalSegment(lang, "terms") })}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: 0.9,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
              >
                {t("public.legal.terms.title")}
              </Link>
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: legalSegment(lang, "privacy") })}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: 0.9,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
              >
                {t("public.legal.privacy.title")}
              </Link>
              <Link
                to={buildUrl({ lang, path: overviewSegment(lang) })}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: 0.9,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
              >
                {t("public.overview.menu")}
              </Link>
              <Link
                to={buildUrl({
                  lang,
                  path: lang === "de" ? "preise" : "pricing",
                })}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: 0.9,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
              >
                {t("public.pricing.title")}
              </Link>
            </div>
          )}

          {/* Copyright - Always on right */}
          <div
            style={{
              fontSize: isMobile ? 14 : 14,
              opacity: 0.8,
              textAlign: "right",
              fontWeight: 500,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            © {currentYear}
          </div>
        </div>
        </div>
      </footer>
    );
  }

  // Full version for other pages
  const imprint = buildUrl({ lang, siteKey: effectiveSiteSlug, path: legalSegment(lang, "imprint") });
  const terms = buildUrl({ lang, siteKey: effectiveSiteSlug, path: legalSegment(lang, "terms") });
  const privacy = buildUrl({ lang, siteKey: effectiveSiteSlug, path: legalSegment(lang, "privacy") });
  const home = buildUrl({ lang, siteKey: effectiveSiteSlug });
  const overview = buildUrl({ lang, path: overviewSegment(lang) });
  const staticPagesPath = buildUrl({ lang, siteKey: effectiveSiteSlug, path: "static-pages" });
  const products = buildUrl({ lang, siteKey: effectiveSiteSlug, path: "products" });
  const pricing = buildUrl({ lang, path: lang === "de" ? "preise" : "pricing" });

  return (
    <footer className={variant === "overview" ? "hl-public hl-footer hl-footer--overview" : "hl-public hl-footer"}>
      <div className="hl-public-pad-x hl-footer__pad">
        <div className="hl-public-width">
          <div className="hl-footer__grid">
            {(siteName || brandBadgeIcon) && (
              <div className="hl-footer__brand">
                <h3>
                  {brandBadgeIcon && !logoError && (
                    <img
                      src={brandBadgeIcon}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        console.warn("[Footer] Failed to load brandBadgeIcon:", brandBadgeIcon);
                        setLogoError(true);
                        e.currentTarget.style.display = "none";
                      }}
                      onLoad={() => {
                        setLogoError(false);
                      }}
                    />
                  )}
                  {siteName && <span>{siteName}</span>}
                </h3>
                <p>{t("public.footer.tagline") || "Fedezd fel a helyi kincseket"}</p>
              </div>
            )}

            <nav className="hl-footer__nav" aria-label={t("public.footer.quickLinks") || "Gyors linkek"}>
              <div>
                <h4>{t("public.footer.legal") || "Jogi információk"}</h4>
                <ul>
                  <li><Link to={imprint}>{t("public.legal.imprint.title")}</Link></li>
                  <li><Link to={terms}>{t("public.legal.terms.title")}</Link></li>
                  <li><Link to={privacy}>{t("public.legal.privacy.title")}</Link></li>
                </ul>
              </div>
              <div>
                <h4>{t("public.footer.quickLinks") || "Gyors linkek"}</h4>
                <ul>
                  <li><Link to={home}>{t("public.home.title")}</Link></li>
                  <li><Link to={overview}>{t("public.overview.menu")}</Link></li>
                  {hasStaticPages && (
                    <li><Link to={staticPagesPath}>{t("public.staticPages.title")}</Link></li>
                  )}
                  {effectiveSiteSlug ? (
                    <li><Link to={products}>{t("public.catalog.title")}</Link></li>
                  ) : null}
                  <li><Link to={pricing}>{t("public.pricing.title")}</Link></li>
                </ul>
              </div>
            </nav>

            <div className="hl-footer__bar">
              <span>© {currentYear} {siteName || t("common.siteName", { defaultValue: "" })}</span>
              <span>{t("public.footer.rights") || "Minden jog fenntartva."}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
