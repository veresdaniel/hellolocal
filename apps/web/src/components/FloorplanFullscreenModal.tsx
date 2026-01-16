// FloorplanFullscreenModal.tsx - Fullscreen modal for floorplan viewing
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { PublicFloorplan } from "../api/places.api";
import { FloorplanImageViewer, type FloorplanPin } from "./FloorplanImageViewer";

interface FloorplanFullscreenModalProps {
  floorplans: PublicFloorplan[];
  isOpen: boolean;
  onClose: () => void;
}

export function FloorplanFullscreenModal({
  floorplans,
  isOpen,
  onClose,
}: FloorplanFullscreenModalProps) {
  const { t } = useTranslation();
  const [selectedFloorplanIndex, setSelectedFloorplanIndex] = useState(0);

  // Reset to first floorplan when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFloorplanIndex(0);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || floorplans.length === 0) return null;

  const currentFloorplan = floorplans[selectedFloorplanIndex];
  const pins: FloorplanPin[] =
    currentFloorplan.pins?.map((pin) => ({
      id: pin.id,
      x: pin.x,
      y: pin.y,
      label: pin.label,
    })) || [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(20px, 4vw, 24px)",
              fontWeight: 600,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "#fff",
              marginBottom: 4,
            }}
          >
            {t("public.floorplan.title") || "Helyszín alaprajza"}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(14px, 3vw, 16px)",
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            {t("public.floorplan.subtitle") || "Kattints a pontokra a helyiségek megtekintéséhez"}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 8,
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          }}
          aria-label={t("public.close") || "Bezárás"}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Floorplan viewer - takes remaining space */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <FloorplanImageViewer
          imageUrl={currentFloorplan.imageUrl}
          imageAlt={currentFloorplan.title}
          pins={pins}
          showZoomSlider={true}
          pinCursor="pointer"
          enableMousePan={true}
          fitMode="contain"
          containerStyle={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: 0,
            minHeight: "unset",
          }}
        />
      </div>

      {/* Floorplan selector (if multiple) */}
      {floorplans.length > 1 && (
        <div
          style={{
            padding: "16px 24px",
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {floorplans.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedFloorplanIndex(index)}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                border: "none",
                background: index === selectedFloorplanIndex ? "#fff" : "rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (index !== selectedFloorplanIndex) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (index !== selectedFloorplanIndex) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }
              }}
              aria-label={`Floorplan ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
