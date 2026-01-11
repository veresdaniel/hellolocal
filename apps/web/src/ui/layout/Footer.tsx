import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { HAS_MULTIPLE_TENANTS } from "../../app/config";
import type { Lang } from "../../app/config";

export function Footer({
  lang,
  tenantSlug,
  compact = false,
}: {
  lang: Lang;
  tenantSlug?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const base = HAS_MULTIPLE_TENANTS && tenantSlug ? `/${lang}/${tenantSlug}` : `/${lang}`;
  const currentYear = new Date().getFullYear();
  const [isMobile, setIsMobile] = useState(false);

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
          marginTop: isMobile ? 0 : "auto",
          margin: 0,
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
            justifyContent: isMobile ? "flex-start" : "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: isMobile ? 8 : 16,
          }}
        >
          {/* Brand and Copyright - Mobile: left side only */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: isMobile ? 18 : 20 }}>📍</span>
              <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700 }}>HelloLocal</span>
            </div>
            {isMobile && (
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                © {currentYear}
              </div>
            )}
          </div>

          {/* Links - Desktop only */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
              <Link
                to={`${base}/static-pages`}
                style={{
                  color: "white",
                  textDecoration: "none",
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
              <Link
                to={`${base}/impresszum`}
                style={{
                  color: "white",
                  textDecoration: "none",
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
                to={`${base}/aszf`}
                style={{
                  color: "white",
                  textDecoration: "none",
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
                to={`${base}/adatvedelem`}
                style={{
                  color: "white",
                  textDecoration: "none",
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
            </div>
          )}

          {/* Copyright - Desktop only */}
          {!isMobile && (
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "right" }}>
              © {currentYear} HelloLocal
            </div>
          )}
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
          <div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 24 }}>📍</span>
              HelloLocal
            </h3>
            <p
              style={{
                fontSize: 14,
                opacity: 0.9,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {t("public.footer.tagline") || "Fedezd fel a helyi kincseket"}
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 600,
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
                to={`${base}/impresszum`}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
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
                to={`${base}/aszf`}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
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
                to={`${base}/adatvedelem`}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
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
                fontSize: 14,
                fontWeight: 600,
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
                to={`${base}`}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
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
              <Link
                to={`${base}/static-pages`}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: 14,
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
                Statikus Oldalak
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
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          © {currentYear} HelloLocal. {t("public.footer.rights") || "Minden jog fenntartva."}
        </div>
      </div>
    </footer>
  );
}
