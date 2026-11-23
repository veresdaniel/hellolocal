/**
 * Image with cream skeleton overlay until load/error.
 * Parent should reserve layout (aspect-ratio / width+height) to avoid CLS;
 * Cloudinary URLs get f_auto,q_auto via preferModernImageUrl.
 */
import { useState, useEffect, useRef } from "react";
import { preferModernImageUrl } from "../seo/cloudinaryImage";
import "../styles/public-skeleton.css";

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  skeletonStyle?: React.CSSProperties;
  /** LCP hero: eager + high fetch priority (default lazy). */
  priority?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
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
  priority = false,
  width,
  height,
  sizes,
  onLoad,
  onError,
  onMouseEnter,
  onMouseLeave,
}: ImageWithSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const deliverySrc = preferModernImageUrl(src, { width: width && width > 0 ? width : 1600 });

  // Cached images often fire onLoad before this effect; img.complete avoids a stuck skeleton.
  useEffect(() => {
    setHasError(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
  }, [deliverySrc]);

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

  const fillBox = style?.height === "100%";

  return (
    <div
      style={{
        position: fillBox ? "absolute" : "relative",
        inset: fillBox ? 0 : undefined,
        width: "100%",
        height: "100%",
      }}
    >
      {isLoading && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(90deg, rgba(27, 23, 48, 0.06) 25%, rgba(27, 23, 48, 0.12) 50%, rgba(27, 23, 48, 0.06) 75%)",
            backgroundSize: "200% 100%",
            animation: "skeleton-loading 1.5s ease-in-out infinite",
            ...skeletonStyle,
          }}
        />
      )}

      <img
        ref={imgRef}
        src={deliverySrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        sizes={sizes}
        style={{
          ...combinedStyle,
          ...(fillBox
            ? {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                maxWidth: "none",
                objectFit: (style?.objectFit as React.CSSProperties["objectFit"]) || "cover",
                objectPosition:
                  (style?.objectPosition as React.CSSProperties["objectPosition"]) || "center top",
              }
            : {
                maxWidth: "100%",
                height: style?.height || "auto",
                width: style?.width || "100%",
              }),
          display: "block",
        }}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={handleLoad}
        onError={handleError}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

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
    </div>
  );
}
