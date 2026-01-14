// src/components/ConfirmationModal.tsx
import { useEffect, useRef, type ReactNode } from "react";
import type { ConfirmationButton, ModalSize } from "../contexts/ConfirmationModalContext";

interface ConfirmationModalProps {
  title?: string;
  message: string | ReactNode;
  buttons: ConfirmationButton[];
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  zIndex?: number;
  headerColor?: string;
  backgroundColor?: string;
  onClose: () => void;
  onButtonClick: (button: ConfirmationButton) => void | Promise<void>;
}

export function ConfirmationModal({
  title,
  message,
  buttons,
  size = "medium",
  closeOnBackdrop = true,
  showCloseButton = true,
  zIndex = 10000,
  headerColor,
  backgroundColor,
  onClose,
  onButtonClick,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnBackdrop) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, closeOnBackdrop]);

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case "small":
        return { maxWidth: 400, width: "90%" };
      case "large":
        return { maxWidth: 600, width: "90%" };
      case "medium":
      default:
        return { maxWidth: 500, width: "90%" };
    }
  };

  const getButtonStyles = (variant: string = "primary"): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      padding: "12px 24px",
      borderRadius: 8,
      border: "none",
      fontSize: "clamp(14px, 3.5vw, 16px)",
      fontWeight: 600,
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      cursor: "pointer",
      transition: "all 0.2s ease",
      minWidth: 100,
      flex: buttons.length === 1 ? 1 : undefined,
    };

    switch (variant) {
      case "danger":
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          color: "white",
          boxShadow: "0 4px 12px rgba(245, 87, 108, 0.3)",
        };
      case "success":
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          color: "white",
          boxShadow: "0 4px 12px rgba(79, 172, 254, 0.3)",
        };
      case "warning":
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #fad961 0%, #f76b1c 100%)",
          color: "white",
          boxShadow: "0 4px 12px rgba(247, 107, 28, 0.3)",
        };
      case "secondary":
        return {
          ...baseStyles,
          background: "#f3f4f6",
          color: "#374151",
          border: "1px solid #d1d5db",
        };
      case "primary":
      default:
        return {
          ...baseStyles,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
        };
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
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
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex,
          padding: isMobile ? 16 : 24,
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          style={{
            background: backgroundColor || "white",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)",
            width: "100%",
            ...getSizeStyles(),
            animation: "modalSlideIn 0.3s ease-out",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: headerColor || "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: headerColor ? "inherit" : "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              {title && (
                <h2
                  style={{
                    margin: 0,
                    fontSize: "clamp(18px, 4vw, 22px)",
                    fontWeight: 700,
                    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    color: headerColor ? "inherit" : "white",
                  }}
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  style={{
                    background: headerColor ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: headerColor ? "inherit" : "white",
                    fontSize: 20,
                    fontWeight: 700,
                    transition: "all 0.2s",
                    padding: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = headerColor ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.3)";
                    e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = headerColor ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.2)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div
            style={{
              padding: "24px",
              flex: 1,
              overflowY: "auto",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              lineHeight: 1.6,
              color: "#374151",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {typeof message === "string" ? (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Buttons */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: 12,
              justifyContent: buttons.length === 1 ? "flex-end" : "flex-end",
              flexDirection: isMobile && buttons.length > 1 ? "column" : "row",
            }}
          >
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(button)}
                disabled={button.isLoading}
                style={{
                  ...getButtonStyles(button.variant),
                  opacity: button.isLoading ? 0.6 : 1,
                  cursor: button.isLoading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!button.isLoading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = getButtonStyles(button.variant).boxShadow || "none";
                }}
              >
                {button.isLoading ? "..." : button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
