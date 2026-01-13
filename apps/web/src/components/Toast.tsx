// src/components/Toast.tsx
import { useEffect, useState } from "react";
import { useToast, type Toast as ToastType } from "../contexts/ToastContext";

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Match animation duration
  };

  const getToastStyles = () => {
    const baseStyles: React.CSSProperties = {
      padding: "16px 20px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      minWidth: "300px",
      maxWidth: "500px",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: isVisible && !isExiting ? "translateX(0)" : "translateX(400px)",
      opacity: isVisible && !isExiting ? 1 : 0,
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    };

    switch (toast.type) {
      case "success":
        return {
          ...baseStyles,
          background: "#d1f2eb",
          color: "#0d5d47",
          borderLeft: "4px solid #10b981",
        };
      case "error":
        return {
          ...baseStyles,
          background: "#fee2e2",
          color: "#991b1b",
          borderLeft: "4px solid #ef4444",
        };
      case "warning":
        return {
          ...baseStyles,
          background: "#fed7aa",
          color: "#9a3412",
          borderLeft: "4px solid #f97316",
        };
      case "info":
        return {
          ...baseStyles,
          background: "#fef3c7",
          color: "#92400e",
          borderLeft: "4px solid #fbbf24",
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "";
    }
  };

  return (
    <div style={getToastStyles()}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
        <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{getIcon()}</span>
        <span style={{ 
          fontSize: "clamp(14px, 3.5vw, 16px)", 
          lineHeight: "1.5", 
          flex: 1, 
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
          fontWeight: 400,
        }}>{toast.message}</span>
      </div>
      <button
        onClick={handleClose}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "inherit",
          opacity: 0.7,
          transition: "opacity 0.2s",
          fontSize: "18px",
          lineHeight: 1,
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "20px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
