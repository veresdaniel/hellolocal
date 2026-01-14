// src/components/PublicAuthBadge.tsx
import { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_LANGS, DEFAULT_LANG, type Lang } from "../app/config";

function isLang(x: unknown): x is Lang {
  return typeof x === "string" && (APP_LANGS as readonly string[]).includes(x);
}

export function PublicAuthBadge() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Use useContext directly to avoid throwing error if AuthContext is not available
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
  
  // Get language from URL or use current i18n language or default
  const lang: Lang = isLang(langParam) ? langParam : (isLang(i18n.language) ? i18n.language : DEFAULT_LANG);
  
  // Default positions: jobb lent (bottom right)
  const defaultPositionDesktop = { bottom: 100, right: 16 };
  const defaultPositionMobile = { bottom: 80, right: 12 };

  // Load saved position from localStorage (device-specific)
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`publicAuthBadgePosition_${deviceKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
      }
    }
    return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load position when device type changes
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`publicAuthBadgePosition_${deviceKey}`);
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
    if (position.bottom !== defaultPos.bottom || position.right !== defaultPos.right) {
      localStorage.setItem(`publicAuthBadgePosition_${deviceKey}`, JSON.stringify(position));
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`publicAuthBadgePosition_${deviceKey}`);
    }
  }, [position, isDesktop]);

  // Drag handling useEffect - must be before early returns
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Detect if we've actually moved (dragged)
      const moved = Math.abs(e.clientX - dragStartPosRef.current.x) > 5 || Math.abs(e.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }

      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxTop = window.innerHeight - (badgeRef.current?.offsetHeight || 200);
      const maxLeft = window.innerWidth - (badgeRef.current?.offsetWidth || 300);

      // Convert to bottom/right positioning
      const newBottom = window.innerHeight - newTop - (badgeRef.current?.offsetHeight || 200);
      const newRight = window.innerWidth - newLeft - (badgeRef.current?.offsetWidth || 300);

      setPosition({
        bottom: Math.max(0, Math.min(newBottom, window.innerHeight - 100)),
        right: Math.max(0, Math.min(newRight, window.innerWidth - 100)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Reset hasDragged after a short delay to allow click events
      setTimeout(() => setHasDragged(false), 100);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // NOW we can do conditional returns after all hooks are called
  // Don't render if not logged in or AuthContext not available
  if (!authContext || !authContext.user) {
    return null;
  }
  
  const { user, logout, isLoading } = authContext;

  // Don't show on admin pages or auth pages (check for both /admin and /:lang/admin patterns)
  if (location.pathname.includes("/admin")) {
    return null;
  }

  // Don't show while loading or if not logged in
  if (isLoading || !user) {
    return null;
  }

  // Only show on desktop
  if (isMobile) {
    return null;
  }

  const handleDashboard = () => {
    if (!hasDragged) {
      // Navigate to admin dashboard with language prefix
      navigate(`/${lang}/admin`);
    }
  };

  const handleLogout = async () => {
    if (!hasDragged) {
      // Store current location as return URL before logout
      const currentPath = location.pathname + location.search + location.hash;
      if (!currentPath.includes('/admin') && !currentPath.includes('/login')) {
        sessionStorage.setItem("authReturnUrl", currentPath);
      }
      await logout(true); // Manual logout - will handle redirect based on location
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !badgeRef.current) return;
    // Don't allow dragging from button elements
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    e.preventDefault();
    setHasDragged(false);
    const rect = badgeRef.current.getBoundingClientRect();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  // Calculate dynamic z-index: higher when dragging or hovered
  const baseZIndex = 4000;
  const activeZIndex = 10000;
  const currentZIndex = (isDragging || isHovered) ? activeZIndex : baseZIndex;

  return (
    <div
      ref={badgeRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "fixed",
        bottom: position.bottom,
        right: position.right,
        zIndex: currentZIndex,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
      }}
    >
      {/* User info badge */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 16,
          boxShadow: isDragging 
            ? "0 12px 40px rgba(102, 126, 234, 0.5), 0 6px 12px rgba(0, 0, 0, 0.15)"
            : "0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 8px rgba(0, 0, 0, 0.1)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "white",
          fontWeight: 500,
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 0 3px rgba(74, 222, 128, 0.3), 0 0 8px rgba(74, 222, 128, 0.5)",
          }}
        />
        <span style={{ fontWeight: 500, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", whiteSpace: "nowrap" }}>
          {user.firstName} {user.lastName}
        </span>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "rgba(255, 255, 255, 0.25)",
            color: "white",
            fontSize: 10,
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            backdropFilter: "blur(10px)",
          }}
        >
          {user.role}
        </span>
      </div>

      {/* Button group */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "white",
          borderRadius: 12,
          boxShadow: isDragging
            ? "0 12px 40px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.1)"
            : "0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          border: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <button
          onClick={handleDashboard}
          style={{
            padding: "11px 18px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 7,
            position: "relative",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ fontSize: 16 }}>📊</span>
          <span>{t("admin.dashboard")}</span>
        </button>
        <div
          style={{
            width: 1,
            background: "rgba(0, 0, 0, 0.1)",
          }}
        />
        <button
          onClick={handleLogout}
          style={{
            padding: "11px 18px",
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            color: "white",
            border: "none",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 7,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ fontSize: 16 }}>🚪</span>
          <span>{t("admin.logout")}</span>
        </button>
      </div>
    </div>
  );
}

