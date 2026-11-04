// src/ui/layout/Header.tsx
import { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buildUrl } from "../../app/urls";
import { mapViewSegment, townEntityPath, townSlugFromPath } from "../../app/entityPaths";
import { useRouteCtx } from "../../app/useRouteCtx";
import { useHostScope } from "../../app/hostScope";
import { usePlatformSettingsContext } from "../../context/PlatformSettingsContext";
import { LanguageSelector } from "../../components/LanguageSelector";
import { AuthContext } from "../../contexts/AuthContext";
import { rememberAuthReturn, visitorAuthPath } from "../../auth/visitorAuth";
import { useViewTitle } from "../../app/viewTitle";

export function Header() {
  const { lang, siteKey } = useRouteCtx();
  const hostScope = useHostScope();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop =
    typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Header only renders on the map. A selected town stays in the path.
  const townInPath = townSlugFromPath(
    location.pathname,
    hostScope.status === "ready" ? hostScope : undefined
  );
  const explorePath = buildUrl({
    lang,
    siteKey,
    path: townInPath ? townEntityPath(lang, townInPath, "map") : mapViewSegment(lang),
  });
  const barePath = location.pathname.replace(/\/$/, "") || "/";
  const isOnMapView =
    location.pathname.includes("/admin") === false &&
    barePath === (explorePath.replace(/\/$/, "") || "/");

  // Default positions: bal fent (top left)
  const defaultPositionDesktop = { top: 16, left: 16 };
  const defaultPositionMobile = { top: 12, left: 12 };

  // Load saved position from localStorage with lazy initializer (device-specific)
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`headerPosition_${deviceKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
      }
    }
    return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const headerRef = useRef<HTMLElement>(null);

  // Calculate dynamic z-index: higher only when actively dragging
  const baseZIndex = 1000;
  const activeZIndex = 10000; // High z-index when actively being used (dragging)
  const currentZIndex = isDragging ? activeZIndex : baseZIndex;

  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;
  const platformSettings = usePlatformSettingsContext();

  const siteName = useViewTitle();
  const brandBadgeIcon = platformSettings?.placeholders.avatar;

  // Load position when device type changes
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`headerPosition_${deviceKey}`);
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        setPosition(savedPos);
      } catch {
        setPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
      }
    } else {
      setPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
    }
  }, [isDesktop]);

  // Save position to localStorage (device-specific)
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const defaultPos = isDesktop ? defaultPositionDesktop : defaultPositionMobile;
    // Only save if position differs from default (user has moved it)
    if (position.top !== defaultPos.top || position.left !== defaultPos.left) {
      localStorage.setItem(`headerPosition_${deviceKey}`, JSON.stringify(position));
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`headerPosition_${deviceKey}`);
    }
  }, [position, isDesktop]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !headerRef.current) return;
    e.preventDefault();
    const rect = headerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!headerRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = headerRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxLeft = window.innerWidth - (headerRef.current?.offsetWidth || 200);
      const maxTop = window.innerHeight - (headerRef.current?.offsetHeight || 60);

      setPosition({
        left: Math.max(0, Math.min(newLeft, maxLeft)),
        top: Math.max(0, Math.min(newTop, maxTop)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      const newLeft = touch.clientX - dragOffset.x;
      const newTop = touch.clientY - dragOffset.y;

      // Constrain to viewport
      const maxLeft = window.innerWidth - (headerRef.current?.offsetWidth || 200);
      const maxTop = window.innerHeight - (headerRef.current?.offsetHeight || 60);

      setPosition({
        left: Math.max(0, Math.min(newLeft, maxLeft)),
        top: Math.max(0, Math.min(newTop, maxTop)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  return (
    <header
      className="hl-public"
      ref={headerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: currentZIndex, // Dynamic z-index based on active state
        overflow: "visible", // Allow dropdown to overflow
        background: "rgba(255, 253, 249, 0.94)",
        borderRadius: 999,
        padding: isMobile ? "8px 12px" : "10px 16px",
        maxWidth: isMobile ? "calc(100vw - 168px)" : "none",
        boxShadow: "0 12px 32px rgba(27, 23, 48, 0.16)",
        border: "1px solid rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
        touchAction: "none", // Prevent default touch behaviors
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        if (isDesktop && !isDragging) {
          e.currentTarget.style.boxShadow =
            "0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow =
            "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)";
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, minWidth: 0 }}>
        {(siteName || brandBadgeIcon) && (
          <Link
            to={buildUrl({ lang, siteKey, path: "" })}
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 12,
              color: "#1b1730",
              pointerEvents: isDragging ? "none" : "auto",
              minWidth: 0,
              flex: "1 1 auto",
            }}
            onClick={(e) => {
              if (isDragging) {
                e.preventDefault();
              }
            }}
          >
            {brandBadgeIcon && (
              <img
                src={brandBadgeIcon}
                alt={siteName || ""}
                style={{
                  width: 28,
                  height: 28,
                  objectFit: "contain",
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              />
            )}
            {siteName && (
              <span
                style={{
                  fontSize: isMobile ? 15 : 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: "1 1 auto",
                }}
              >
                {siteName}
              </span>
            )}
          </Link>
        )}
        {/* Language selector after site name. On a phone it sits in the menu. */}
        {!isMobile && (siteName || brandBadgeIcon) && (
          <div
            style={{
              paddingLeft: 4,
              pointerEvents: isDragging ? "none" : "auto",
              position: "relative",
              zIndex: currentZIndex + 1, // Higher z-index for dropdown
              touchAction: "auto", // Allow touch interactions for select
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent header drag when clicking on language selector
            onTouchStart={(e) => e.stopPropagation()} // Prevent header drag when touching language selector
          >
            <div
              style={{
                position: "relative",
              }}
            >
              <LanguageSelector />
              <style>{`
                header .hl-lang-switch__trigger {
                  color: #1b1730 !important;
                  border-color: rgba(27, 23, 48, 0.16) !important;
                  background: transparent !important;
                  padding: 4px 10px 4px 12px !important;
                  height: auto !important;
                }
                header .hl-lang-switch__trigger:hover {
                  color: #1b1730 !important;
                  border-color: rgba(27, 23, 48, 0.16) !important;
                  background: transparent !important;
                }
              `}</style>
            </div>
          </div>
        )}
        {isMobile ? (
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={t("public.menu")}
            onClick={() => setMenuOpen((open) => !open)}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              flex: "none",
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid rgba(27, 23, 48, 0.16)",
              background: menuOpen ? "#1b1730" : "transparent",
              color: menuOpen ? "#fffdf9" : "#1b1730",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            {menuOpen ? "×" : "☰"}
          </button>
        ) : (
        <div
          style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8 }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {user ? (
            <button
              type="button"
              onClick={() => auth?.logout(true)}
              style={{
                background: "transparent",
                border: "1px solid rgba(27, 23, 48, 0.16)",
                borderRadius: 999,
                color: "#1b1730",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              {t("public.visitorAuth.logout")}
            </button>
          ) : (
            <>
              <Link
                to={visitorAuthPath(lang, "login")}
                onClick={rememberAuthReturn}
                style={{
                  color: "#1b1730",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "6px 10px",
                }}
              >
                {t("public.visitorAuth.login")}
              </Link>
              <Link
                to={visitorAuthPath(lang, "register")}
                onClick={rememberAuthReturn}
                style={{
                  background: "#1b1730",
                  color: "#fffdf9",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  borderRadius: 999,
                  padding: "6px 12px",
                }}
              >
                {t("public.visitorAuth.register")}
              </Link>
            </>
          )}
        </div>
        )}
        {isMobile && menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 180,
              padding: 10,
              borderRadius: 16,
              background: "rgba(255, 253, 249, 0.98)",
              border: "1px solid rgba(27, 23, 48, 0.08)",
              boxShadow: "0 12px 32px rgba(27, 23, 48, 0.16)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <LanguageSelector />
            {user ? (
              <button
                type="button"
                onClick={() => auth?.logout(true)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(27, 23, 48, 0.16)",
                  borderRadius: 999,
                  color: "#1b1730",
                  fontSize: 15,
                  fontWeight: 650,
                  padding: "10px 14px",
                  cursor: "pointer",
                }}
              >
                {t("public.visitorAuth.logout")}
              </button>
            ) : (
              <>
                <Link
                  to={visitorAuthPath(lang, "login")}
                  onClick={rememberAuthReturn}
                  style={{
                    color: "#1b1730",
                    fontSize: 15,
                    fontWeight: 650,
                    textDecoration: "none",
                    padding: "10px 14px",
                  }}
                >
                  {t("public.visitorAuth.login")}
                </Link>
                <Link
                  to={visitorAuthPath(lang, "register")}
                  onClick={rememberAuthReturn}
                  style={{
                    background: "#1b1730",
                    color: "#fffdf9",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    borderRadius: 999,
                    padding: "10px 14px",
                    textAlign: "center",
                  }}
                >
                  {t("public.visitorAuth.register")}
                </Link>
              </>
            )}
          </div>
        )}
        {/* Map view button - show when NOT on map view */}
        {!isOnMapView && (
          <>
            <div
              style={{
                width: 1,
                height: 24,
                background: "rgba(27, 23, 48, 0.12)",
                marginLeft: 8,
                marginRight: 8,
              }}
            />
            <button
              onClick={() => {
                navigate(explorePath);
                // Trigger map view after navigation
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("showMapView"));
                }, 100);
              }}
              style={{
                background: "#1b1730",
                border: "1px solid #1b1730",
                borderRadius: 999,
                color: "#fffdf9",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                fontWeight: 500,
                height: "clamp(32px, 4vw, 36px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                cursor: "pointer",
                padding: "6px 12px",
                transition: "all 0.2s",
                gap: 6,
                lineHeight: 1,
                pointerEvents: isDragging ? "none" : "auto",
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.background = "#322b52";
                  e.currentTarget.style.borderColor = "#322b52";
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.background = "#1b1730";
                  e.currentTarget.style.borderColor = "#1b1730";
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              📍 {t("public.mapView")}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
