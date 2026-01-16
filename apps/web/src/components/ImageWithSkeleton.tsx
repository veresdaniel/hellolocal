// src/components/ImageWithSkeleton.tsx
import { useState, useEffect } from "react";

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  skeletonStyle?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export function ImageWithSkeleton({
  src,
  alt,
  className,
  style,
  skeletonStyle,
  onLoad,
  onError,
  onMouseEnter,
  onMouseLeave,
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const combinedStyle: React.CSSProperties = {
    ...style,
    opacity: isLoading ? 0 : 1,
    transition: "opacity 0.3s ease-in-out",
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Skeleton Loader */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "skeleton-loading 1.5s ease-in-out infinite",
            ...skeletonStyle,
          }}
        />
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          ...combinedStyle,
          maxWidth: "100%",
          height: style?.height || "auto",
          width: style?.width || "100%",
          display: "block",
        }}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Error State */}
      {hasError && !isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#999",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          Image not available
        </div>
      )}

      <style>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
