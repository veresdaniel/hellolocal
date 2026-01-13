// src/components/ErrorState.tsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  title?: string;
  message?: string;
  backLink?: string;
  backLinkText?: string;
  onRetry?: () => void;
  variant?: "default" | "minimal";
}

export function ErrorState({
  title,
  message,
  backLink,
  backLinkText,
  onRetry,
  variant = "default",
}: ErrorStateProps) {
  const { t } = useTranslation();

  const defaultTitle = title || t("error.errorOccurred");
  const defaultMessage = message || t("error.unknownError");
  const defaultBackLinkText = backLinkText || t("error.goHome");

  if (variant === "minimal") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            maxWidth: 500,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#667eea",
              marginBottom: 16,
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontSize: "clamp(20px, 4vw, 24px)",
              fontWeight: 600,
              margin: "0 0 12px 0",
              color: "#1a1a1a",
              fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {defaultTitle}
          </h2>
          <p
            style={{
              fontSize: "clamp(14px, 3vw, 16px)",
              color: "#666",
              margin: "0 0 24px 0",
              lineHeight: 1.6,
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {defaultMessage}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {backLink && (
              <Link
                to={backLink}
                style={{
                  padding: "10px 20px",
                  background: "#667eea",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                }}
              >
                {defaultBackLinkText}
              </Link>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: "10px 20px",
                  background: "white",
                  color: "#667eea",
                  border: "2px solid #667eea",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f8f8ff";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {t("error.reload")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant - matches ErrorPage design
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          animation: "float 20s infinite linear",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: "300px",
          height: "300px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          filter: "blur(40px)",
          animation: "pulse 4s infinite ease-in-out",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "10%",
          width: "200px",
          height: "200px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          filter: "blur(30px)",
          animation: "pulse 6s infinite ease-in-out",
          animationDelay: "2s",
        }}
      />

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0) rotate(0deg); }
            100% { transform: translate(-50px, -50px) rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div
        style={{
          maxWidth: 700,
          position: "relative",
          zIndex: 1,
          animation: "slideIn 0.6s ease-out",
        }}
      >
        <div
          style={{
            fontSize: "clamp(80px, 15vw, 120px)",
            fontWeight: 900,
            margin: 0,
            color: "rgba(255, 255, 255, 0.95)",
            lineHeight: 1,
            marginBottom: 16,
            textShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            letterSpacing: "-0.05em",
          }}
        >
          ⚠️
        </div>
        <h2
          style={{
            fontSize: "clamp(24px, 4vw, 32px)",
            fontWeight: 700,
            margin: 0,
            color: "white",
            marginBottom: 16,
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {defaultTitle}
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 18px)",
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 40,
            lineHeight: 1.6,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {defaultMessage}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {backLink && (
            <Link
              to={backLink}
              style={{
                padding: "14px 32px",
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "2px solid rgba(255, 255, 255, 0.5)",
                textDecoration: "none",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: 16,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.8)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {defaultBackLinkText}
            </Link>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: "14px 32px",
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "2px solid rgba(255, 255, 255, 0.5)",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: 16,
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                cursor: "pointer",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.8)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {t("error.reload")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
