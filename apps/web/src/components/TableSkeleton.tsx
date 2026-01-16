// src/components/TableSkeleton.tsx
import { useState, useEffect } from "react";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  isMobile?: boolean;
}

export function TableSkeleton({ rows = 5, columns = 4, isMobile = false }: TableSkeletonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Mobile: card skeleton
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
              borderRadius: 12,
              padding: 16,
              border: "1px solid rgba(102, 126, 234, 0.3)",
              minHeight: 120,
            }}
          >
            {/* Title skeleton */}
            <div
              style={{
                height: 20,
                width: "70%",
                background:
                  "linear-gradient(90deg, rgba(168, 179, 255, 0.2) 0%, rgba(168, 179, 255, 0.1) 50%, rgba(168, 179, 255, 0.2) 100%)",
                borderRadius: 4,
                marginBottom: 12,
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
            {/* Subtitle skeleton */}
            <div
              style={{
                height: 16,
                width: "50%",
                background:
                  "linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)",
                borderRadius: 4,
                marginBottom: 16,
                animation: "shimmer 1.5s ease-in-out infinite",
                animationDelay: "0.2s",
              }}
            />
            {/* Fields skeleton */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={j}
                  style={{
                    height: 14,
                    width: j === 0 ? "60%" : "40%",
                    background:
                      "linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(255, 255, 255, 0.08) 100%)",
                    borderRadius: 4,
                    animation: "shimmer 1.5s ease-in-out infinite",
                    animationDelay: `${0.3 + j * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <style>
          {`
            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
          `}
        </style>
      </div>
    );
  }

  // Desktop: table skeleton
  return (
    <div style={{ width: "100%" }}>
      {/* Search bar skeleton */}
      <div
        style={{
          height: 40,
          width: "100%",
          maxWidth: 400,
          background:
            "linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(102, 126, 234, 0.05) 50%, rgba(102, 126, 234, 0.1) 100%)",
          borderRadius: 8,
          marginBottom: 24,
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />

      {/* Table skeleton */}
      <div
        style={{
          background: "linear-gradient(135deg, #4a4564 0%, #3d3a58 100%)",
          borderRadius: 12,
          border: "1px solid rgba(102, 126, 234, 0.3)",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
            padding: "16px 20px",
            background: "rgba(102, 126, 234, 0.1)",
            borderBottom: "1px solid rgba(102, 126, 234, 0.2)",
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 18,
                width: i === 0 ? "80%" : i === columns - 1 ? "60%" : "100%",
                background:
                  "linear-gradient(90deg, rgba(168, 179, 255, 0.3) 0%, rgba(168, 179, 255, 0.15) 50%, rgba(168, 179, 255, 0.3) 100%)",
                borderRadius: 4,
                animation: "shimmer 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Table rows */}
        <div>
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: 16,
                padding: "16px 20px",
                borderBottom: i < rows - 1 ? "1px solid rgba(102, 126, 234, 0.1)" : "none",
              }}
            >
              {Array.from({ length: columns }).map((_, j) => (
                <div
                  key={j}
                  style={{
                    height: 16,
                    width: j === 0 ? "70%" : j === columns - 1 ? "50%" : "85%",
                    background:
                      "linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)",
                    borderRadius: 4,
                    animation: "shimmer 1.5s ease-in-out infinite",
                    animationDelay: `${(i * columns + j) * 0.05}s`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}
      </style>
    </div>
  );
}
