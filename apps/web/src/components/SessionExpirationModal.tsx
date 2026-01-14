// src/components/SessionExpirationModal.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { TIMING } from "../app/config";
import { refreshToken } from "../api/auth.api";
import { getTokenExpiration } from "../utils/tokenUtils";

interface SessionExpirationModalProps {
  onExtend: () => void;
  onDismiss: () => void;
}

export function SessionExpirationModal({ onExtend, onDismiss }: SessionExpirationModalProps) {
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

      const expirationTime = getTokenExpiration(accessToken);
      if (!expirationTime) {
        setTimeRemaining(null);
        return;
      }

      const now = Date.now();
      const remaining = Math.max(0, expirationTime - now);
      setTimeRemaining(remaining);
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
          
          // Update every second when tab is visible
          if (elapsed >= TIMING.UI_UPDATE_INTERVAL_MS) {
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
    }, TIMING.UI_UPDATE_INTERVAL_MS);

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
      console.error("[SessionExpirationModal] Failed to extend session", error);
      // Still call onExtend to dismiss modal, but user will be logged out soon
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

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
        padding: isMobile ? 16 : 24,
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        // Don't allow dismissing by clicking outside
        e.stopPropagation();
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modalSlideIn {
          from {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
      
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "clamp(24px, 5vw, 32px)",
          maxWidth: isMobile ? "calc(100% - 32px)" : "min(500px, calc(100% - 48px))",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          animation: "modalSlideIn 0.3s ease-out",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(16px, 3vw, 24px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "clamp(12px, 3vw, 16px)" }}>
          <div style={{ 
            fontSize: "clamp(32px, 8vw, 40px)",
            lineHeight: 1,
            flexShrink: 0,
          }}>
            ⏰
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ 
              margin: 0,
              marginBottom: "clamp(8px, 2vw, 12px)",
              fontSize: "clamp(18px, 4.5vw, 24px)",
              fontWeight: 700,
              fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "#1a1a1a",
              lineHeight: 1.3,
            }}>
              {t("admin.sessionExpiringSoon")}
            </h2>
            <p style={{ 
              margin: 0,
              fontSize: "clamp(14px, 3.5vw, 16px)",
              color: "#666",
              lineHeight: 1.5,
              marginBottom: "clamp(12px, 3vw, 16px)",
            }}>
              {t("admin.sessionExpiringWarning")}
            </p>
            {timeRemaining !== null && (
              <div style={{ 
                fontSize: "clamp(16px, 4vw, 20px)",
                fontWeight: 600,
                color: "#d97706",
                marginTop: "clamp(8px, 2vw, 12px)",
              }}>
                {t("admin.sessionTimeRemaining", { time: formatTime(timeRemaining) })}
              </div>
            )}
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          gap: "clamp(12px, 3vw, 16px)",
          flexWrap: "wrap",
          marginTop: "clamp(8px, 2vw, 12px)",
        }}>
          <button
            onClick={handleExtend}
            disabled={isExtending}
            style={{
              flex: 1,
              minWidth: "clamp(140px, 35vw, 200px)",
              padding: "clamp(12px, 3vw, 16px) clamp(20px, 5vw, 24px)",
              background: isExtending 
                ? "#e5e7eb" 
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: isExtending 
                ? "#9ca3af" 
                : "white",
              border: "none",
              borderRadius: "clamp(8px, 2vw, 12px)",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontWeight: 600,
              cursor: isExtending ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              boxShadow: isExtending 
                ? "none" 
                : "0 4px 12px rgba(102, 126, 234, 0.4)",
            }}
            onMouseEnter={(e) => {
              if (!isExtending) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isExtending) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }
            }}
          >
            {isExtending ? t("admin.extending") : t("admin.extendSession")}
          </button>
        </div>
      </div>
    </div>
  );
}
