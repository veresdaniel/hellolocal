// src/components/VersionChecker.tsx
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TIMING } from "../app/config";

interface VersionInfo {
  version: string;
  buildHash: string;
  timestamp: number;
}

export function VersionChecker() {
  const { t } = useTranslation();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentVersionRef = useRef<VersionInfo | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_THROTTLE = 60 * 1000; // Throttle: max 1 request per minute

  const fetchVersion = async (): Promise<VersionInfo | null> => {
    // Throttle requests - don't fetch if we fetched recently
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_THROTTLE) {
      return currentVersionRef.current;
    }
    lastFetchTimeRef.current = now;

    try {
      // Only add timestamp on first fetch or if version changed (cache-busting)
      const cacheBust = !currentVersionRef.current ? `?t=${Date.now()}` : '';
      const response = await fetch(`/version.json${cacheBust}`, {
        cache: currentVersionRef.current ? 'default' : 'no-store',
      });
      if (!response.ok) {
        console.warn("[VersionChecker] Failed to fetch version.json:", response.status);
        return null;
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("[VersionChecker] Error fetching version:", error);
      return null;
    }
  };

  const checkForUpdates = async () => {
    const newVersion = await fetchVersion();
    
    if (!newVersion) return;

    // First time - store current version
    if (!currentVersionRef.current) {
      currentVersionRef.current = newVersion;
      return;
    }

    // Check if version changed
    const hasUpdate = 
      currentVersionRef.current.buildHash !== newVersion.buildHash ||
      currentVersionRef.current.version !== newVersion.version;

    if (hasUpdate) {
      setShowUpdateNotification(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Force reload from server (bypass cache)
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdateNotification(false);
    // Check again in 5 minutes (reduced from 1 minute to avoid too many requests)
    if (checkIntervalRef.current) {
      window.clearInterval(checkIntervalRef.current);
    }
    checkIntervalRef.current = window.setInterval(checkForUpdates, TIMING.VERSION_CHECK_INTERVAL_MS);
  };

  useEffect(() => {
    // Initial check
    checkForUpdates();

    // Set up periodic checks
    checkIntervalRef.current = window.setInterval(checkForUpdates, TIMING.VERSION_CHECK_INTERVAL_MS);

    // Check on window focus (user returns to tab) - with debouncing
    let focusTimeout: number | null = null;
    const handleFocus = () => {
      // Debounce: only check if we haven't checked in the last 2 minutes
      if (focusTimeout) {
        window.clearTimeout(focusTimeout);
      }
      focusTimeout = window.setTimeout(() => {
        const timeSinceLastCheck = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastCheck > TIMING.FOCUS_CHECK_THRESHOLD_MS) { // Only if last check was > threshold ago
          checkForUpdates();
        }
      }, TIMING.FOCUS_DEBOUNCE_MS); // Wait after focus before checking
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      if (checkIntervalRef.current) {
        window.clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener("focus", handleFocus);
      if (focusTimeout) {
        window.clearTimeout(focusTimeout);
      }
    };
  }, []);

  if (!showUpdateNotification) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 10000,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "clamp(12px, 3vw, 16px)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)",
        display: "flex",
        flexDirection: window.innerWidth < 640 ? "column" : "row",
        alignItems: window.innerWidth < 640 ? "stretch" : "center",
        gap: window.innerWidth < 640 ? 12 : 16,
        maxWidth: 600,
        margin: "0 auto",
        animation: "slideDown 0.3s ease-out",
      }}
    >
      {/* Close button (X) */}
      <button
        onClick={handleDismiss}
        disabled={isRefreshing}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          padding: 0,
          background: "rgba(255, 255, 255, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "50%",
          color: "white",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 700,
          cursor: isRefreshing ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          opacity: isRefreshing ? 0.4 : 0.8,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            e.currentTarget.style.opacity = "1";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          e.currentTarget.style.opacity = "0.8";
        }}
      >
        ✕
      </button>

      <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
        <div style={{ 
          fontWeight: 700, 
          fontSize: "clamp(13px, 3.5vw, 14px)", 
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span>🎉</span>
          <span>{t("public.updateAvailable") || "Új verzió érhető el!"}</span>
        </div>
        <div style={{ 
          fontSize: "clamp(11px, 3vw, 12px)", 
          opacity: 0.9,
          lineHeight: 1.4,
        }}>
          {t("public.updateDescription") || "Frissítsd az alkalmazást a legújabb funkciók eléréséhez."}
        </div>
      </div>
      <div style={{ 
        display: "flex", 
        gap: 8,
        flexDirection: "row",
        justifyContent: window.innerWidth < 640 ? "stretch" : "flex-end",
      }}>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{
            flex: window.innerWidth < 640 ? 1 : "0 0 auto",
            padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
            background: "rgba(255, 255, 255, 0.95)",
            color: "#667eea",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "clamp(12px, 3vw, 13px)",
            cursor: isRefreshing ? "wait" : "pointer",
            transition: "all 0.2s",
            opacity: isRefreshing ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isRefreshing ? "⏳" : "🔄"} {t("public.refresh") || "Frissítés"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isRefreshing}
          style={{
            flex: window.innerWidth < 640 ? 1 : "0 0 auto",
            padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "clamp(12px, 3vw, 13px)",
            cursor: isRefreshing ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            opacity: isRefreshing ? 0.4 : 1,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          }}
        >
          {t("public.later") || "Később"}
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
