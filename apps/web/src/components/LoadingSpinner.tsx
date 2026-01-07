// src/components/LoadingSpinner.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  isLoading: boolean;
  delay?: number; // Delay in milliseconds before showing spinner (default: 2000)
}

export function LoadingSpinner({ isLoading, delay = 2000 }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Hide spinner immediately when loading stops
      const hideTimer = setTimeout(() => {
        setShowSpinner(false);
      }, 0);
      return () => clearTimeout(hideTimer);
    }

    // Show spinner after delay
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  if (!isLoading || !showSpinner) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        gap: 24,
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 64,
          height: 64,
          border: "4px solid rgba(102, 126, 234, 0.2)",
          borderTopColor: "#667eea",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {/* Loading text */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: "#667eea",
          letterSpacing: "0.02em",
        }}
      >
        {t("common.loading")}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

