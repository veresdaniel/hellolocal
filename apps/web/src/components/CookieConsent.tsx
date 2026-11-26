// src/components/CookieConsent.tsx
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  acceptCookieConsent,
  dismissCookieConsent,
  hasCookieConsent,
  COOKIE_CONSENT_OPEN_EVENT,
} from "../lib/cookieConsent";

function isAdminPath(pathname: string) {
  return /(?:^|\/)admin(?:\/|$)/.test(pathname);
}

export function CookieConsent() {
  const { t } = useTranslation();
  const location = useLocation();
  const onAdmin = isAdminPath(location.pathname);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const showBanner = (immediate = false) => {
    if (immediate) {
      setIsVisible(true);
      window.setTimeout(() => setIsAnimatingIn(true), 20);
      return;
    }
    const showTimer = window.setTimeout(() => {
      setIsVisible(true);
      window.setTimeout(() => setIsAnimatingIn(true), 50);
    }, 2000);
    return showTimer;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Admin never shows cookie consent (staff session, not public tracking UI).
    if (onAdmin) {
      setIsVisible(false);
      setIsAnimatingIn(false);
      return;
    }
    // Already accepted → stay hidden until user opens settings.
    if (hasCookieConsent()) return;

    const showTimer = showBanner(false);
    return () => {
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, [onAdmin]);

  useEffect(() => {
    const onOpen = () => {
      if (isAdminPath(window.location.pathname)) return;
      setIsVisible(true);
      window.setTimeout(() => setIsAnimatingIn(true), 20);
    };
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, onOpen);
  }, []);

  const hide = () => {
    setIsAnimatingIn(false);
    window.setTimeout(() => setIsVisible(false), 300);
  };

  const handleAccept = () => {
    acceptCookieConsent();
    hide();
  };

  const handleDismiss = () => {
    dismissCookieConsent();
    hide();
  };

  if (onAdmin || !isVisible) return null;

  const alreadyAccepted = hasCookieConsent();

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("cookieConsent.message")}
      style={{
        position: "fixed",
        bottom: isMobile ? 0 : 20,
        left: isMobile ? 0 : "auto",
        right: isMobile ? 0 : 20,
        background: "rgba(0, 0, 0, 0.95)",
        color: "white",
        padding: isMobile ? "20px 20px max(20px, env(safe-area-inset-bottom))" : 24,
        boxShadow: isMobile ? "0 -4px 20px rgba(0, 0, 0, 0.3)" : "0 8px 32px rgba(0, 0, 0, 0.4)",
        // Above map dock (~1300); below open mobile menu (12000).
        zIndex: 11000,
        opacity: isAnimatingIn ? 1 : 0,
        transition: "opacity 0.25s ease-out",
        pointerEvents: isAnimatingIn ? "auto" : "none",
        backdropFilter: "blur(10px)",
        borderRadius: isMobile ? "0" : 16,
        maxWidth: isMobile ? "100%" : 420,
        border: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(14px, 3.5vw, 16px)",
            lineHeight: 1.5,
            color: "rgba(255, 255, 255, 0.95)",
          }}
        >
          {alreadyAccepted
            ? t("cookieConsent.acceptedMessage")
            : t("cookieConsent.message")}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              flex: isMobile ? 1 : "none",
              padding: "10px 20px",
              background: "white",
              color: "#000",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontFamily: "inherit",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(255, 255, 255, 0.2)",
              whiteSpace: "nowrap",
            }}
          >
            {alreadyAccepted ? t("cookieConsent.ok") : t("cookieConsent.accept")}
          </button>

          {!alreadyAccepted ? (
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                flex: isMobile ? 1 : "none",
                padding: "12px 20px",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily: "inherit",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {t("cookieConsent.later")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
