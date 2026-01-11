// src/components/CookieConsent.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const COOKIE_CONSENT_KEY = "hellolocal_cookie_consent";

export function CookieConsent() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (!hasConsent) {
      // Show with delay for smooth animation
      setTimeout(() => {
        setIsVisible(true);
        setTimeout(() => setIsAnimatingIn(true), 50);
      }, 1000);
    }
  }, []);

  const handleAccept = () => {
    // Save consent to localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    
    // Animate out
    setIsAnimatingIn(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: isMobile ? 0 : 20,
        left: isMobile ? 0 : "auto",
        right: isMobile ? 0 : 20,
        background: "rgba(0, 0, 0, 0.95)",
        color: "white",
        padding: isMobile ? 20 : 24,
        boxShadow: isMobile 
          ? "0 -4px 20px rgba(0, 0, 0, 0.3)" 
          : "0 8px 32px rgba(0, 0, 0, 0.4)",
        zIndex: 9999,
        transform: isMobile 
          ? (isAnimatingIn ? "translateY(0)" : "translateY(100%)")
          : (isAnimatingIn ? "translateX(0) scale(1)" : "translateX(100%) scale(0.9)"),
        transition: "all 0.3s ease-out",
        backdropFilter: "blur(10px)",
        borderRadius: isMobile ? "0" : 16,
        maxWidth: isMobile ? "100%" : 420,
        border: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(14px, 3vw, 15px)",
              lineHeight: 1.5,
              color: "rgba(255, 255, 255, 0.95)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("cookieConsent.message")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleAccept}
            style={{
              flex: isMobile ? 1 : "none",
              padding: "12px 24px",
              background: "white",
              color: "#000",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(255, 255, 255, 0.2)",
              whiteSpace: "nowrap",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 255, 255, 0.2)";
            }}
          >
            {t("cookieConsent.accept")}
          </button>

          <button
            onClick={handleAccept}
            style={{
              flex: isMobile ? 1 : "none",
              padding: "12px 20px",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
          >
            {t("cookieConsent.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
