// src/components/SessionExtensionToast.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { refreshToken } from "../api/auth.api";
import { isTokenExpired } from "../utils/tokenUtils";

interface SessionExtensionToastProps {
  onExtend: () => void;
  onDismiss: () => void;
}

export function SessionExtensionToast({ onExtend, onDismiss }: SessionExtensionToastProps) {
  const { t } = useTranslation();
  const [isExtending, setIsExtending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(!document.hidden);

  // Reliable time tracking that works even when tab is inactive
  useEffect(() => {
    const updateTimeRemaining = () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setTimeRemaining(null);
        return;
      }

      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const now = Date.now();
        const remaining = Math.max(0, expiresAt - now);
        setTimeRemaining(remaining);
      } catch (error) {
        console.error("[SessionExtensionToast] Failed to parse token", error);
        setTimeRemaining(null);
      }
    };

    // Use Page Visibility API to detect tab visibility
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isVisibleRef.current = isVisible;

      if (isVisible) {
        // Tab became visible: update immediately and use RAF
        lastUpdateTimeRef.current = Date.now();
        updateTimeRemaining();

        // Use requestAnimationFrame for smooth updates when tab is visible
        const updateWithRAF = () => {
          if (!isVisibleRef.current) {
            rafRef.current = null;
            return;
          }

          const now = Date.now();
          const elapsed = now - lastUpdateTimeRef.current;
          
          // Update every second (1000ms) when tab is visible
          if (elapsed >= 1000) {
            lastUpdateTimeRef.current = now;
            updateTimeRemaining();
          }

          rafRef.current = requestAnimationFrame(updateWithRAF);
        };

        // Cancel previous RAF if exists
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(updateWithRAF);
      } else {
        // Tab became hidden: cancel RAF and use interval
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    };

    // Initial update
    updateTimeRemaining();
    handleVisibilityChange();

    // Listen to visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Use interval as fallback for inactive tabs (updates every second)
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastUpdateTimeRef.current;
      
      // Update every second
      if (elapsed >= 1000) {
        lastUpdateTimeRef.current = now;
        updateTimeRemaining();
      }
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleExtend = useCallback(async () => {
    setIsExtending(true);
    try {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (!refreshTokenValue) {
        throw new Error("No refresh token available");
      }

      const data = await refreshToken({ refreshToken: refreshTokenValue });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      
      onExtend();
    } catch (error) {
      console.error("[SessionExtensionToast] Failed to extend session", error);
      // Still call onExtend to dismiss toast, but user will be logged out soon
      onExtend();
    } finally {
      setIsExtending(false);
    }
  }, [onExtend]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "clamp(16px, 4vw, 24px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        maxWidth: "clamp(320px, 90vw, 500px)",
        width: "100%",
        padding: "clamp(12px, 3vw, 16px)",
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        color: "white",
        borderRadius: "clamp(8px, 2vw, 12px)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(8px, 2vw, 12px)",
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      
      <div style={{ display: "flex", alignItems: "flex-start", gap: "clamp(8px, 2vw, 12px)" }}>
        <div style={{ 
          fontSize: "clamp(20px, 5vw, 24px)",
          lineHeight: 1,
          flexShrink: 0,
        }}>
          ⏰
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontWeight: 600,
            marginBottom: "clamp(4px, 1vw, 6px)",
            lineHeight: 1.3,
          }}>
            {t("admin.sessionExpiringSoon")}
          </div>
          <div style={{ 
            fontSize: "clamp(12px, 3vw, 14px)",
            opacity: 0.95,
            lineHeight: 1.4,
          }}>
            {timeRemaining !== null && (
              <span>
                {t("admin.sessionTimeRemaining", { time: formatTime(timeRemaining) })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        gap: "clamp(8px, 2vw, 12px)",
        flexWrap: "wrap",
      }}>
        <button
          onClick={handleExtend}
          disabled={isExtending}
          style={{
            flex: 1,
            minWidth: "clamp(120px, 30vw, 180px)",
            padding: "clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)",
            background: isExtending 
              ? "rgba(255, 255, 255, 0.3)" 
              : "white",
            color: isExtending 
              ? "rgba(255, 255, 255, 0.7)" 
              : "#d97706",
            border: "none",
            borderRadius: "clamp(6px, 1.5vw, 8px)",
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 600,
            cursor: isExtending ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            boxShadow: isExtending 
              ? "none" 
              : "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
          onMouseEnter={(e) => {
            if (!isExtending) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isExtending) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
            }
          }}
        >
          {isExtending ? t("admin.extending") : t("admin.extendSession")}
        </button>
      </div>
    </div>
  );
}
