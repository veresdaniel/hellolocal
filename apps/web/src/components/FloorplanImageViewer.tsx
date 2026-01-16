// FloorplanImageViewer.tsx - Shared pan/zoom image viewer component for floorplans
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface FloorplanPin {
  id: string;
  x: number;
  y: number;
  label: string | null;
}

interface FloorplanImageViewerProps {
  imageUrl: string;
  imageAlt?: string;
  pins?: FloorplanPin[];
  onImageClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onPinClick?: (pin: FloorplanPin, e: React.MouseEvent) => void;
  onPinDragStart?: (pin: FloorplanPin, e: React.MouseEvent) => void;
  editingPin?: FloorplanPin | null;
  isDragging?: boolean;
  draggedPinPosition?: { x: number; y: number } | null;
  showZoomSlider?: boolean;
  containerStyle?: React.CSSProperties;
  imagePointerEvents?: "auto" | "none";
  pinCursor?: "pointer" | "move" | "default";
  pinZIndex?: (pin: FloorplanPin) => number;
  pinTransition?: (pin: FloorplanPin) => string;
}

export function FloorplanImageViewer({
  imageUrl,
  imageAlt = "Floorplan",
  pins = [],
  onImageClick,
  onPinClick,
  onPinDragStart,
  editingPin = null,
  isDragging = false,
  draggedPinPosition = null,
  showZoomSlider = true,
  containerStyle = {},
  imagePointerEvents = "auto",
  pinCursor = "pointer",
  pinZIndex = () => 5,
  pinTransition = () => "left 0.1s, top 0.1s",
}: FloorplanImageViewerProps) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle space key for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault(); // Prevent page scrolling
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false); // Stop panning when space is released
      }
    };

    // Also handle when window loses focus (e.g., user clicks outside)
    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isSpacePressed]);

  // Calculate min scale when image loads
  useEffect(() => {
    const handleImageLoad = () => {
      if (imageRef.current && containerRef.current) {
        const img = imageRef.current;
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imgNaturalWidth = img.naturalWidth;
        const imgNaturalHeight = img.naturalHeight;

        if (
          containerWidth > 0 &&
          containerHeight > 0 &&
          imgNaturalWidth > 0 &&
          imgNaturalHeight > 0
        ) {
          // Calculate scale to fit container (cover mode - minimum fills container)
          const scaleX = containerWidth / imgNaturalWidth;
          const scaleY = containerHeight / imgNaturalHeight;
          const initialScale = Math.max(scaleX, scaleY);

          // Set minimum scale to fit container width (at least fill width)
          setMinScale(scaleX);
          setScale(initialScale);
          // Reset pan when image loads
          setPan({ x: 0, y: 0 });
        }
      }
    };

    const img = imageRef.current;
    if (img) {
      if (img.complete) {
        // Use setTimeout to ensure container has rendered dimensions
        setTimeout(handleImageLoad, 100);
      } else {
        img.addEventListener("load", () => {
          setTimeout(handleImageLoad, 100);
        });
        return () => img.removeEventListener("load", handleImageLoad);
      }
    }
  }, [imageUrl]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        border: "2px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        background: "#f9fafb",
        width: "100%",
        minHeight: isMobile ? "300px" : "400px",
        height: isMobile ? "300px" : "400px",
        cursor: isPanning ? "grabbing" : scale > minScale && isSpacePressed ? "grab" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        overscrollBehavior: "contain",
        ...containerStyle,
      }}
      onMouseDown={(e) => {
        // Don't allow panning if clicking on the zoom slider area
        const target = e.target as HTMLElement;
        const isSliderArea =
          target.closest('input[type="range"]') ||
          target.closest("button") ||
          target.closest('[style*="position: absolute"][style*="bottom"]');

        // Only allow panning when zoomed in (scale > minScale), space is pressed, and not on slider area
        if (
          scale > minScale &&
          isSpacePressed &&
          (e.button === 0 || e.button === 1) &&
          !isSliderArea
        ) {
          e.preventDefault();
          setIsPanning(true);
          setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
      }}
      onMouseMove={(e) => {
        // If space is not pressed, stop panning
        if (isPanning && !isSpacePressed) {
          setIsPanning(false);
          return;
        }
        if (isPanning && scale > minScale && isSpacePressed) {
          e.preventDefault();

          // Calculate new pan position
          let newPanX = e.clientX - panStart.x;
          let newPanY = e.clientY - panStart.y;

          // Constrain pan to keep image within container bounds
          if (imageRef.current && containerRef.current) {
            const rect = imageRef.current.getBoundingClientRect();
            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = containerRef.current.clientHeight;

            // Calculate scaled image dimensions
            const scaledWidth = rect.width * scale;
            const scaledHeight = rect.height * scale;

            // Calculate how much the image extends beyond container
            // When zoomed in, scaledWidth > containerWidth, so this is positive
            const overflowX = (scaledWidth - containerWidth) / 2;
            const overflowY = (scaledHeight - containerHeight) / 2;

            // Constrain pan: can pan from -overflow to +overflow
            // Positive pan.x moves image right (shows left edge)
            // Negative pan.x moves image left (shows right edge)
            newPanX = Math.max(-overflowX, Math.min(overflowX, newPanX));
            newPanY = Math.max(-overflowY, Math.min(overflowY, newPanY));
          }

          setPan({
            x: newPanX,
            y: newPanY,
          });
        }
      }}
      onMouseUp={() => {
        setIsPanning(false);
        // Also clear isSpacePressed if mouse is released (in case space was released while dragging)
        if (!isSpacePressed) {
          setIsPanning(false);
        }
      }}
      onMouseLeave={() => {
        setIsPanning(false);
        // Clear isSpacePressed when mouse leaves to prevent stuck state
        setIsSpacePressed(false);
      }}
      onWheel={(e) => {
        // Prevent page scrolling when hovering over image
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        // Prevent page scrolling when touching image
        e.stopPropagation();
      }}
    >
      <div
        style={{
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging || isPanning ? "none" : "transform 0.2s",
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageAlt}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            userSelect: "none",
            pointerEvents: imagePointerEvents,
            objectFit: "contain",
            touchAction: "none",
          }}
          onWheel={(e) => {
            // Prevent page scrolling
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent page scrolling
            e.stopPropagation();
          }}
          onClick={onImageClick}
          draggable={false}
        />
        {pins.map((pin) => {
          // Use dragged position if available for smooth dragging
          const displayPin =
            isDragging && editingPin?.id === pin.id && draggedPinPosition
              ? { ...pin, x: draggedPinPosition.x, y: draggedPinPosition.y }
              : pin;

          return (
            <div
              key={pin.id}
              data-pin-id={pin.id}
              style={{
                position: "absolute",
                left: `${displayPin.x * 100}%`,
                top: `${displayPin.y * 100}%`,
                transform: "translate(-50%, -50%)",
                cursor: pinCursor,
                zIndex: pinZIndex(pin),
                transition: pinTransition(pin),
                pointerEvents: onPinClick || onPinDragStart ? "auto" : "auto",
              }}
              onMouseDown={onPinDragStart ? (e) => onPinDragStart(pin, e) : undefined}
              onClick={
                onPinClick
                  ? (e) => {
                      e.stopPropagation();
                      onPinClick(pin, e);
                    }
                  : undefined
              }
              title={pin.label || undefined}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "1px solid white",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transition: pinCursor === "pointer" ? "transform 0.2s" : "none",
                }}
                onMouseEnter={
                  pinCursor === "pointer"
                    ? (e) => {
                        e.currentTarget.style.transform = "scale(1.5)";
                      }
                    : undefined
                }
                onMouseLeave={
                  pinCursor === "pointer"
                    ? (e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }
                    : undefined
                }
              />
              {pin.label && (
                <div
                  style={{
                    position: "absolute",
                    top: 30,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "white",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    pointerEvents: "none",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 400,
                  }}
                >
                  {pin.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom slider */}
      {showZoomSlider && !isMobile && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.95)",
            padding: "8px 12px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            zIndex: 10,
            pointerEvents: "auto",
          }}
          onMouseDown={(e) => {
            // Stop panning when interacting with slider
            e.stopPropagation();
          }}
          onMouseMove={(e) => {
            // Stop panning when interacting with slider
            e.stopPropagation();
          }}
        >
          <input
            type="range"
            min={Math.max(50, Math.round(minScale * 100))}
            max="300"
            value={Math.max(minScale * 100, Math.min(300, scale * 100))}
            onChange={(e) => {
              const newScale = parseInt(e.target.value) / 100;
              setScale(Math.max(minScale, newScale));
              // Reset pan when zooming to minimum
              if (newScale <= minScale) {
                setPan({ x: 0, y: 0 });
              }
            }}
            style={{
              width: 120,
              cursor: "pointer",
            }}
            title={t("admin.floorplan.zoom") || "Nagyítás"}
          />
          <span
            style={{
              fontSize: 12,
              color: "#666",
              minWidth: 40,
              textAlign: "center",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {Math.round(Math.max(minScale * 100, scale * 100))}%
          </span>
        </div>
      )}
    </div>
  );
}
