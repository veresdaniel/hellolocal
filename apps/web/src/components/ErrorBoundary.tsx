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
          stack: process.env.NODE_ENV !== "production" ? this.state.error.stack : undefined,
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
function ErrorPageWrapper({ error }: { error: any }) {
  // Since ErrorPage uses useRouteError, we need to mock it
  // We'll create a simpler version that accepts error as prop
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
        background: "linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)",
      }}
    >
      <div style={{ maxWidth: 700 }}>
        <h1
          style={{
            fontSize: "clamp(48px, 10vw, 120px)",
            fontWeight: 700,
            margin: 0,
            color: "#dc3545",
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          500
        </h1>
        <h2
          style={{
            fontSize: "clamp(24px, 5vw, 36px)",
            fontWeight: 600,
            margin: 0,
            color: "#1a1a1a",
            marginBottom: 16,
          }}
        >
          Internal Error
        </h2>
        <p
          style={{
            fontSize: "clamp(16px, 3vw, 20px)",
            color: "#666",
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          {error.data?.message || "An unexpected error occurred"}
        </p>
        {process.env.NODE_ENV !== "production" && error.data?.stack && (
          <details
            style={{
              marginBottom: 32,
              padding: 16,
              background: "#f8f9fa",
              borderRadius: 8,
              textAlign: "left",
              maxWidth: "100%",
              overflow: "auto",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontWeight: 500,
                color: "#666",
                marginBottom: 8,
              }}
            >
              Error Details
            </summary>
            <pre
              style={{
                fontSize: "clamp(13px, 3vw, 15px)",
                fontFamily: "'Monaco', 'Courier New', monospace",
                color: "#333",
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
            padding: "10px 20px",
            background: "#667eea",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 16,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#5568d3";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#667eea";
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
