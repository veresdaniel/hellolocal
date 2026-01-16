import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStaticPages } from "../../api/static-pages.api";
import type { Lang } from "../../app/config";
import type { PlatformSettings } from "../../app/site/SiteOutletContext";
import { buildUrl } from "../../app/urls";
import { usePlatformSettingsContextOptional } from "../../context/PlatformSettingsContext";

export function Footer({
  lang,
  siteSlug,
  platform,
  compact = false,
}: {
  lang: Lang;
  siteSlug?: string; // Optional - not available on site list page
  platform?: PlatformSettings; // Optional - not available on site list page
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const effectiveSiteSlug = siteSlug;
  const currentYear = new Date().getFullYear();
  const [isMobile, setIsMobile] = useState(false);

  // Check if there are any static pages
  const { data: staticPages = [] } = useQuery({
    queryKey: ["staticPages", lang, effectiveSiteSlug, "all"],
    queryFn: () => getStaticPages(lang, effectiveSiteSlug),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasStaticPages = staticPages.length > 0;
  const queryClient = useQueryClient();

  // Use platform settings from prop (passed from SiteLayout) or try to get from context
  const contextPlatformSettings = usePlatformSettingsContextOptional();
  const platformSettings = platform || contextPlatformSettings;

  // Listen for platform settings changes from admin
  useEffect(() => {
    if (!effectiveSiteSlug) return; // Skip if no site slug

    const handlePlatformSettingsChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["platformSettings", lang, effectiveSiteSlug] });
      queryClient.refetchQueries({ queryKey: ["platformSettings", lang, effectiveSiteSlug] });
    };

    window.addEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    return () => {
      window.removeEventListener("admin:platformSettings:changed", handlePlatformSettingsChanged);
    };
  }, [lang, effectiveSiteSlug, queryClient]);

  // Map new DTO structure to legacy format for compatibility
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
        style={{
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderTop: "none",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile ? "12px 16px" : "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: isMobile ? "nowrap" : "wrap",
            gap: isMobile ? 8 : 16,
          }}
        >
          {/* Brand - Always on left */}
          {(siteName || brandBadgeIcon) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {brandBadgeIcon && !logoError && (
                <img
                  src={brandBadgeIcon}
                  alt={siteName || ""}
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
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "impresszum" })}
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
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "aszf" })}
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
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "adatvedelem" })}
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
                to={buildUrl({
                  lang,
                  siteKey: effectiveSiteSlug,
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
      </footer>
    );
  }

  // Full version for other pages
  return (
    <footer
      style={{
        marginTop: "auto",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        borderTop: "none",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 32px",
        }}
      >
        {/* Main Footer Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Brand Section */}
          {(siteName || brandBadgeIcon) && (
            <div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {brandBadgeIcon && !logoError && (
                  <img
                    src={brandBadgeIcon}
                    alt={siteName || ""}
                    style={{
                      height: 32,
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
                {siteName && <span>{siteName}</span>}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  opacity: 0.9,
                  lineHeight: 1.6,
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                {t("public.footer.tagline") || "Fedezd fel a helyi kincseket"}
              </p>
            </div>
          )}

          {/* Legal Links */}
          <div>
            <h4
              style={{
                fontSize: 15,
                fontWeight: 700,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.8,
              }}
            >
              {t("public.footer.legal") || "Jogi információk"}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "impresszum" })}
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
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {t("public.legal.imprint.title")}
              </Link>
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "aszf" })}
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
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {t("public.legal.terms.title")}
              </Link>
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug, path: "adatvedelem" })}
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
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {t("public.legal.privacy.title")}
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              style={{
                fontSize: 15,
                fontWeight: 700,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: 0.8,
              }}
            >
              {t("public.footer.quickLinks") || "Gyors linkek"}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                to={buildUrl({ lang, siteKey: effectiveSiteSlug })}
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
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {t("public.home.title")}
              </Link>
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
                    e.currentTarget.style.textDecoration = "underline";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                    e.currentTarget.style.textDecoration = "none";
                  }}
                >
                  {t("public.staticPages.title")}
                </Link>
              )}
              <Link
                to={buildUrl({
                  lang,
                  siteKey: effectiveSiteSlug,
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
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {t("public.pricing.title")}
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            textAlign: "center",
            fontSize: 15,
            fontWeight: 500,
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            opacity: 0.8,
          }}
        >
          © {currentYear} {siteName || t("common.siteName", { defaultValue: "" })}.{" "}
          {t("public.footer.rights") || "Minden jog fenntartva."}
        </div>
      </div>
    </footer>
  );
}
