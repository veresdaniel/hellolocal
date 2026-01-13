import { useState, useEffect } from "react";
import { ImageWithSkeleton } from "./ImageWithSkeleton";
import { sanitizeImageUrl } from "../utils/urlValidation";

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
if (!document.head.querySelector('style[data-gallery-animations]')) {
  styleSheet.setAttribute('data-gallery-animations', 'true');
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
}

export function GalleryViewer({ images, name, layout = "grid", aspect = "auto" }: GalleryViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard navigation
  useEffect(() => {
    if (!isFullscreen || selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? null : prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev === null ? null : prev < images.length - 1 ? prev + 1 : 0));
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

  if (!images || images.length === 0) return null;

  // Calculate aspect ratio height
  const getAspectHeight = (baseWidth: number = 200) => {
    switch (aspect) {
      case "square":
        return baseWidth;
      case "4:3":
        return (baseWidth * 3) / 4;
      case "16:9":
        return (baseWidth * 9) / 16;
      default:
        return "auto";
    }
  };

  return (
    <>
      <div style={{ margin: "clamp(16px, 4vw, 32px) 0" }}>
        {name && (
          <h3
            style={{
              fontSize: "clamp(18px, 3vw, 24px)",
              fontWeight: 600,
              fontFamily: '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              marginBottom: "clamp(12px, 2vw, 20px)",
              color: "#1a1a1a",
            }}
          >
            {name}
          </h3>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              layout === "masonry"
                ? "repeat(auto-fill, minmax(min(100%, clamp(200px, 30vw, 400px)), 1fr))"
                : layout === "carousel"
                ? "repeat(auto-fit, minmax(min(100%, clamp(250px, 35vw, 450px)), 1fr))"
                : "repeat(auto-fit, minmax(min(100%, clamp(200px, 30vw, 400px)), 1fr))",
            gap: layout === "masonry" ? "clamp(8px, 2vw, 16px)" : "clamp(12px, 2vw, 20px)",
          }}
        >
          {images.map((image, index) => {
            const imageSrc = sanitizeImageUrl(image.src) || "";

            return (
              <div
                key={image.id || index}
                onClick={() => openFullscreen(index)}
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: aspect === "auto" ? "clamp(250px, 40vh, 400px)" : aspect === "square" ? "clamp(250px, 30vw, 400px)" : aspect === "4:3" ? "clamp(188px, 22.5vw, 300px)" : "clamp(141px, 17vw, 225px)",
                  aspectRatio: aspect === "auto" ? "auto" : aspect === "square" ? "1" : aspect === "4:3" ? "4/3" : "16/9",
                  cursor: "pointer",
                  overflow: "hidden",
                  borderRadius: "clamp(6px, 1vw, 12px)",
                  backgroundColor: "#f5f5f5",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
                  alt={image.alt || `Gallery image ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
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
                      background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)",
                      padding: "clamp(8px, 2vw, 16px) clamp(12px, 2vw, 20px)",
                      color: "white",
                      fontSize: "clamp(11px, 1.5vw, 14px)",
                      lineHeight: 1.5,
                      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFullscreen();
            }}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
              width: 40,
              height: 40,
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
            ×
          </button>

          {/* Previous button */}
          {images.length > 1 && (
            <button
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

          {/* Next button */}
          {images.length > 1 && (
            <button
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

          {/* Image container */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              animation: "zoomIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <img
              src={sanitizeImageUrl(images[selectedIndex].src) || ""}
              alt={images[selectedIndex].alt || `Gallery image ${selectedIndex + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                transition: "opacity 0.3s ease",
              }}
            />
            {(images[selectedIndex].caption || images.length > 1) && (
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 20px",
                  background: "rgba(0, 0, 0, 0.6)",
                  borderRadius: 8,
                  backdropFilter: "blur(10px)",
                  maxWidth: "80vw",
                }}
              >
                {images[selectedIndex].caption && (
                  <div
                    style={{
                      color: "white",
                      fontSize: 16,
                      lineHeight: 1.6,
                      textAlign: "center",
                      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
                      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
