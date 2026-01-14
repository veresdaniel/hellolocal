// src/components/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "../pages/ErrorPage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Create a route error response-like object for ErrorPage
      const routeError = {
        status: 500,
        statusText: "Internal Error",
        data: {
          message: this.state.error.message || "An unexpected error occurred",
          error: this.state.error.name || "Error",
          stack: import.meta.env.DEV ? this.state.error.stack : undefined,
        },
      };

      // We need to render ErrorPage, but it uses useRouteError hook
      // So we'll create a wrapper that provides the error via context or props
      return <ErrorPageWrapper error={routeError} />;
    }

    return this.props.children;
  }
}

// Wrapper component to provide error to ErrorPage
// Uses the same blue theme as ErrorPage for 500 errors
function ErrorPageWrapper({ error }: { error: any }) {
  // Use the same blue gradient theme as ErrorPage for 500 errors
  const theme = {
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    accentColor: "rgba(255, 255, 255, 0.2)",
    textColor: "white",
  };

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
        background: theme.gradient,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements - same as ErrorPage */}
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
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
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
            fontSize: "clamp(120px, 20vw, 200px)",
            fontWeight: 900,
            margin: 0,
            color: "rgba(255, 255, 255, 0.95)",
            lineHeight: 1,
            marginBottom: 16,
            textShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            animation: "shake 0.5s ease-in-out",
            letterSpacing: "-0.05em",
            WebkitTextStroke: "2px rgba(255, 255, 255, 0.3)",
          }}
        >
          500
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            margin: 0,
            color: theme.textColor,
            marginBottom: 16,
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
          }}
        >
          Internal Error
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 40,
            lineHeight: 1.6,
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          {error.data?.message || "An unexpected error occurred"}
        </p>
        {import.meta.env.DEV && error.data?.stack && (
          <details
            style={{
              marginBottom: 32,
              padding: 16,
              background: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: 8,
              textAlign: "left",
              maxWidth: "100%",
              overflow: "auto",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: 8,
              }}
            >
              Error Details
            </summary>
            <pre
              style={{
                fontSize: "clamp(13px, 3vw, 15px)",
                fontFamily: "'Monaco', 'Courier New', monospace",
                color: "rgba(255, 255, 255, 0.9)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
              }}
            >
              {error.data.stack}
            </pre>
          </details>
        )}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "14px 32px",
            background: "white",
            color: "#6366f1",
            border: "none",
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: 16,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
