import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ImageWithSkeleton } from "./ImageWithSkeleton";
import { sanitizeImageUrl } from "../utils/urlValidation";

const MOBILE_MQ = "(max-width: 767px)";
const SWIPE_THRESHOLD_PX = 48;

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes zoomIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;
if (!document.head.querySelector("style[data-gallery-animations]")) {
  styleSheet.setAttribute("data-gallery-animations", "true");
  document.head.appendChild(styleSheet);
}

interface GalleryImage {
  id?: string;
  src: string;
  alt?: string;
  caption?: string;
  thumbSrc?: string;
  width?: number;
  height?: number;
}

interface GalleryViewerProps {
  images: GalleryImage[];
  name?: string;
  layout?: "grid" | "masonry" | "carousel";
  aspect?: "auto" | "square" | "4:3" | "16:9";
  compact?: boolean; // If true, render in compact mode (smaller size)
}

export function GalleryViewer({
  images,
  name,
  layout = "grid",
  aspect = "auto",
  compact = false,
}: GalleryViewerProps) {
  const { t, i18n } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false
  );
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Keyboard navigation (desktop / accessibility)
  useEffect(() => {
    if (!isFullscreen || selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null ? null : prev > 0 ? prev - 1 : images.length - 1
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === null ? null : prev < images.length - 1 ? prev + 1 : 0
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, selectedIndex, images.length]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const openFullscreen = (index: number) => {
    setSelectedIndex(index);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
  };

  const onSwipeStart = (clientX: number, clientY: number) => {
    swipeStartX.current = clientX;
    swipeStartY.current = clientY;
  };

  const onSwipeEnd = (clientX: number, clientY: number) => {
    if (swipeStartX.current == null || swipeStartY.current == null) return;
    const dx = clientX - swipeStartX.current;
    const dy = clientY - swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goToNext();
    else goToPrevious();
  };

  if (!images || images.length === 0) return null;

  // Randomize order for 4 images on each page load
  const shuffledImages = useMemo(() => {
    if (images.length === 4) {
      // Create a shuffled copy of the images array
      const shuffled = [...images];
      // Fisher-Yates shuffle algorithm
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return images;
  }, [images]);

  // Determine how many images to show and grid layout based on count
  const totalImages = shuffledImages.length;
  let imagesToShow = shuffledImages;
  let gridColumns = "1fr";
  let showCount = false;

  if (totalImages === 1) {
    gridColumns = "1fr";
    imagesToShow = shuffledImages;
  } else if (totalImages === 2) {
    gridColumns = "1fr 1fr";
    imagesToShow = shuffledImages;
  } else if (totalImages === 3) {
    gridColumns = "1fr 1fr";
    imagesToShow = shuffledImages.slice(0, 2); // Only show 2
    showCount = true;
  } else if (totalImages === 4) {
    gridColumns = "1fr 1fr";
    imagesToShow = shuffledImages;
  } else {
    // 5+ images: show only 4
    gridColumns = "1fr 1fr";
    imagesToShow = shuffledImages.slice(0, 4);
    showCount = true;
  }

  // Override with layout prop if it's not "grid"
  if (layout === "masonry") {
    gridColumns = "repeat(auto-fill, minmax(min(100%, clamp(200px, 30vw, 400px)), 1fr))";
  } else if (layout === "carousel") {
    gridColumns = "repeat(auto-fit, minmax(min(100%, clamp(250px, 35vw, 450px)), 1fr))";
  }

  return (
    <>
      <div style={{ margin: compact ? "0" : "clamp(16px, 4vw, 32px) 0" }}>
        {name && (
          <h3
            style={{
              fontSize: "clamp(18px, 3vw, 24px)",
              fontWeight: 600,
              fontFamily:
                '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              marginBottom: compact ? "8px" : "clamp(12px, 2vw, 20px)",
              marginTop: 0,
              color: "#1a1a1a",
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
            }}
          >
            <span>{name}</span>
            {showCount && (
              <span
                style={{
                  fontSize: "clamp(14px, 2vw, 18px)",
                  fontWeight: 400,
                  color: "#6b7280",
                }}
              >
                ({totalImages}{" "}
                {totalImages === 1
                  ? t("public.gallery.imageSingular", { defaultValue: "image" })
                  : t("public.gallery.imagePlural", { defaultValue: "images" })}
                )
              </span>
            )}
          </h3>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: compact
              ? "6px"
              : layout === "masonry"
                ? "clamp(8px, 2vw, 16px)"
                : "clamp(12px, 2vw, 20px)",
          }}
        >
          {imagesToShow.map((image, displayIndex) => {
            const imageSrc = sanitizeImageUrl(image.src) || "";
            // Find the original index in the full images array (not shuffled)
            const originalIndex = images.findIndex(
              (img) =>
                (img.id && image.id && img.id === image.id) ||
                (!img.id && !image.id && img.src === image.src)
            );

            return (
              <div
                key={image.id || image.src || displayIndex}
                onClick={() => openFullscreen(originalIndex >= 0 ? originalIndex : displayIndex)}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio:
                    aspect === "auto"
                      ? "4/3"
                      : aspect === "square"
                        ? "1"
                        : aspect === "4:3"
                          ? "4/3"
                          : aspect === "16:9"
                            ? "16/9"
                            : "4/3",
                  cursor: "pointer",
                  overflow: "hidden",
                  borderRadius: "clamp(6px, 1vw, 12px)",
                  backgroundColor: "transparent",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03) translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1) translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                }}
              >
                <ImageWithSkeleton
                  src={imageSrc}
                  alt={image.alt || `Gallery image ${displayIndex + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  skeletonStyle={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "clamp(6px, 1vw, 12px)",
                  }}
                />
                {image.caption && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
                      padding: "clamp(8px, 2vw, 16px) clamp(12px, 2vw, 20px)",
                      color: "white",
                      fontSize: "clamp(11px, 1.5vw, 14px)",
                      lineHeight: 1.5,
                      fontFamily:
                        '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {image.caption}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && selectedIndex !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.96)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={closeFullscreen}
        >
          {/* Close button — larger / higher contrast on mobile */}
          <button
            type="button"
            aria-label={t("common.close", { defaultValue: "Close" })}
            onClick={(e) => {
              e.stopPropagation();
              closeFullscreen();
            }}
            style={{
              position: "absolute",
              top: isMobile ? "max(12px, env(safe-area-inset-top))" : 20,
              right: isMobile ? "max(12px, env(safe-area-inset-right))" : 20,
              background: isMobile ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.1)",
              border: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
              width: isMobile ? 52 : 40,
              height: isMobile ? 52 : 40,
              color: isMobile ? "#111" : "white",
              fontSize: isMobile ? 32 : 24,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease, transform 0.15s ease",
              zIndex: 10000,
              boxShadow: isMobile ? "0 4px 18px rgba(0, 0, 0, 0.45)" : "none",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              if (!isMobile) e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              if (!isMobile) e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
          >
            ×
          </button>

          {/* Previous / next — desktop only; mobile uses swipe */}
          {!isMobile && images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              style={{
                position: "absolute",
                left: 20,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                width: 50,
                height: 50,
                color: "white",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s ease",
                zIndex: 10000,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              ‹
            </button>
          )}

          {!isMobile && images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              style={{
                position: "absolute",
                right: 20,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                width: 50,
                height: 50,
                color: "white",
                fontSize: 24,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s ease",
                zIndex: 10000,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
            >
              ›
            </button>
          )}

          {/* Image container — swipeable on mobile */}
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              if (e.touches.length !== 1) return;
              onSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={(e) => {
              if (!e.changedTouches.length) return;
              onSwipeEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }}
            style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              animation: "zoomIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              paddingBottom: images[selectedIndex].caption || images.length > 1 ? "80px" : "20px",
              touchAction: "pan-y",
              userSelect: "none",
            }}
          >
            <img
              src={sanitizeImageUrl(images[selectedIndex].src) || ""}
              alt={images[selectedIndex].alt || `Gallery image ${selectedIndex + 1}`}
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: "calc(100vh - 100px)",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                transition: "opacity 0.3s ease",
                pointerEvents: "none",
              }}
            />
            {(images[selectedIndex].caption || images.length > 1) && (
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "12px 20px",
                  background: "rgba(0, 0, 0, 0.8)",
                  borderRadius: 8,
                  backdropFilter: "blur(10px)",
                  maxWidth: "90vw",
                  width: "auto",
                  minWidth: "200px",
                }}
              >
                {images[selectedIndex].caption && (
                  <div
                    style={{
                      color: "white",
                      fontSize: 16,
                      lineHeight: 1.6,
                      textAlign: "center",
                      fontFamily:
                        '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      marginBottom: images.length > 1 ? 8 : 0,
                    }}
                  >
                    {images[selectedIndex].caption}
                  </div>
                )}
                {images.length > 1 && (
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: 14,
                      textAlign: "center",
                      fontFamily:
                        '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {selectedIndex + 1} / {images.length}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
