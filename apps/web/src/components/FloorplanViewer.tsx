// FloorplanViewer.tsx - Read-only floorplan viewer for public display
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PublicFloorplan } from "../api/places.api";
import { FloorplanFullscreenModal } from "./FloorplanFullscreenModal";
import { FloorplanImageViewer, type FloorplanPin } from "./FloorplanImageViewer";

interface FloorplanViewerProps {
  floorplan: PublicFloorplan;
  isPublic?: boolean; // If true, show CTA button instead of inline viewer
}

export function FloorplanViewer({ floorplan, isPublic = false }: FloorplanViewerProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Public view: show CTA button
  if (isPublic) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            width: "100%",
            padding: "16px 24px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: 12,
            color: "white",
            fontSize: "clamp(16px, 3vw, 18px)",
            fontWeight: 600,
            fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          {t("public.floorplan.openFullscreen") || "Megnyitás teljes képernyőn"}
        </button>
        <FloorplanFullscreenModal
          floorplans={[floorplan]}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  // Admin/editor view: show inline viewer (backward compatibility)
  const pins: FloorplanPin[] = floorplan.pins?.map((pin) => ({
    id: pin.id,
    x: pin.x,
    y: pin.y,
    label: pin.label,
  })) || [];

  return (
    <FloorplanImageViewer
      imageUrl={floorplan.imageUrl}
      imageAlt={floorplan.title}
      pins={pins}
      showZoomSlider={true}
      pinCursor="pointer"
    />
  );
}
