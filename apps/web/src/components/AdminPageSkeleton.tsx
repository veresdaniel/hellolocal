// src/components/AdminPageSkeleton.tsx
import { useState, useEffect } from "react";

/**
 * Skeleton screen for admin pages during route transitions.
 * Shows skeleton content matching the admin page layout to prevent layout shift.
 * Note: This component is rendered inside AdminLayout's <main> tag, so it doesn't need its own container.
 */
export function AdminPageSkeleton() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    // Add shimmer animation to document head
    const styleId = "admin-page-skeleton-shimmer";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      window.removeEventListener("resize", checkScreenSize);
      // Don't remove the style as it might be used by other components
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Page header skeleton - matches admin page header style */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "clamp(24px, 5vw, 32px)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{
            height: isMobile ? "clamp(20px, 4vw, 28px)" : "clamp(20px, 4vw, 28px)",
            width: 300,
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 44,
            width: 150,
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            animation: "shimmer 1.5s ease-in-out infinite",
            animationDelay: "0.2s",
          }}
        />
      </div>

      {/* Table skeleton - matches AdminResponsiveTable style */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #e0e0e0",
          overflow: "hidden",
          minHeight: 400,
        }}
      >
        {/* Search bar skeleton */}
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <div
            style={{
              height: 40,
              width: "100%",
              maxWidth: 400,
              background: "linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)",
              backgroundSize: "200% 100%",
              borderRadius: 8,
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Table header skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            padding: "16px 20px",
            background: "#f5f5f5",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 18,
                width: i === 0 ? "80%" : i === 3 ? "60%" : "100%",
                background: "linear-gradient(90deg, #e0e0e0 0%, #d0d0d0 50%, #e0e0e0 100%)",
                backgroundSize: "200% 100%",
                borderRadius: 4,
                animation: "shimmer 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Table rows skeleton */}
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                padding: "16px 20px",
                borderBottom: i < 4 ? "1px solid #f0f0f0" : "none",
              }}
            >
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  style={{
                    height: 16,
                    width: j === 0 ? "70%" : j === 3 ? "50%" : "85%",
                    background: "linear-gradient(90deg, #f5f5f5 0%, #e5e5e5 50%, #f5f5f5 100%)",
                    backgroundSize: "200% 100%",
                    borderRadius: 4,
                    animation: "shimmer 1.5s ease-in-out infinite",
                    animationDelay: `${(i * 4 + j) * 0.05}s`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
