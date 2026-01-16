// FloorplanEditor.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  getFloorplans,
  createFloorplan,
  updateFloorplan,
  deleteFloorplan,
  getFloorplanPins,
  createFloorplanPin,
  updateFloorplanPin,
  deleteFloorplanPin,
  type PlaceFloorplan,
  type FloorplanPin,
  type CreateFloorplanDto,
  type CreateFloorplanPinDto,
} from "../api/admin.api";
import { uploadService } from "../services/upload/uploadService";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../hooks/useConfirm";

interface FloorplanEditorProps {
  placeId: string;
  siteId: string;
}

export function FloorplanEditor({ placeId, siteId }: FloorplanEditorProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [floorplans, setFloorplans] = useState<PlaceFloorplan[]>([]);
  const [selectedFloorplan, setSelectedFloorplan] = useState<PlaceFloorplan | null>(null);
  const [pins, setPins] = useState<FloorplanPin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingPin, setEditingPin] = useState<FloorplanPin | null>(null);
  const [editingPinLabel, setEditingPinLabel] = useState<string | null>(null); // For inline editing in the list
  const [pinLabel, setPinLabel] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedPinPosition, setDraggedPinPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.5); // Minimum scale to fit container width
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const hasPannedRef = useRef(false); // Track if panning occurred to prevent accidental clicks
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(() => {
    // Load from localStorage, default to true
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("floorplanInstructionsOpen");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });
  const instructionsRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [instructionsHeight, setInstructionsHeight] = useState<number | null>(null);
  const [rightPanelHeight, setRightPanelHeight] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fullscreenImageRef = useRef<HTMLImageElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    loadFloorplans();
  }, [placeId]);

  useEffect(() => {
    if (selectedFloorplan) {
      loadPins(selectedFloorplan.id);
      // Reset scale and pan when floorplan changes
      setScale(1);
      setMinScale(0.5);
      setPan({ x: 0, y: 0 });
    } else {
      setPins([]);
    }
  }, [selectedFloorplan]);

  // Calculate right panel height when instructions is OPEN (to fix the height)
  // This height will be used for the image container, and the pin list will grow when instructions is closed
  useEffect(() => {
    const currentIsMobile = typeof window !== "undefined" && window.innerWidth < 768;

    if (rightPanelRef.current && isInstructionsOpen && !currentIsMobile) {
      // Wait for animation to complete, then measure the entire right panel when OPEN
      const timer = setTimeout(() => {
        if (rightPanelRef.current) {
          const fullHeight = rightPanelRef.current.getBoundingClientRect().height;
          setRightPanelHeight(fullHeight);
        }
      }, 350); // Wait for animation to complete (300ms + small buffer)

      return () => clearTimeout(timer);
    }
  }, [isInstructionsOpen]);

  // Also measure on initial mount if open
  useEffect(() => {
    const currentIsMobile = typeof window !== "undefined" && window.innerWidth < 768;

    if (
      rightPanelRef.current &&
      isInstructionsOpen &&
      rightPanelHeight === null &&
      !currentIsMobile
    ) {
      const timer = setTimeout(() => {
        if (rightPanelRef.current) {
          const fullHeight = rightPanelRef.current.getBoundingClientRect().height;
          setRightPanelHeight(fullHeight);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedFloorplan, isInstructionsOpen, rightPanelHeight]);

  // Calculate initial scale to fit container when image loads
  useEffect(() => {
    if (imageRef.current && containerRef.current && selectedFloorplan) {
      const img = imageRef.current;
      const container = containerRef.current;

      const handleImageLoad = () => {
        // Use setTimeout to ensure container has rendered dimensions
        setTimeout(() => {
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;

          if (containerWidth > 0 && containerHeight > 0 && imgWidth > 0 && imgHeight > 0) {
            // Calculate scale to fit container (cover mode - minimum fills container)
            const scaleX = containerWidth / imgWidth;
            const scaleY = containerHeight / imgHeight;
            const initialScale = Math.max(scaleX, scaleY);

            // Set minimum scale to fit container width (at least fill width)
            setMinScale(scaleX);
            setScale(initialScale);
            // Reset pan when image loads
            setPan({ x: 0, y: 0 });
          }
        }, 100);
      };

      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener("load", handleImageLoad);
        return () => img.removeEventListener("load", handleImageLoad);
      }
    }
  }, [selectedFloorplan]);

  const loadFloorplans = async () => {
    setIsLoading(true);
    try {
      const data = await getFloorplans(placeId);
      setFloorplans(data);
      if (data.length > 0 && !selectedFloorplan) {
        setSelectedFloorplan(data[0]);
      }
    } catch (error) {
      console.error("Failed to load floorplans:", error);
      showToast(t("admin.errorLoadingData") || "Hiba az adatok betöltésekor", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPins = async (floorplanId: string) => {
    try {
      const data = await getFloorplanPins(floorplanId);
      setPins(data);
    } catch (error) {
      console.error("Failed to load pins:", error);
      showToast(t("admin.errorLoadingData") || "Hiba az adatok betöltésekor", "error");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(t("admin.errorInvalidImage") || "Csak képfájl tölthető fel", "error");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadService.uploadImage(file, {
        folder: `floorplans/${placeId}`,
      });

      const dto: CreateFloorplanDto = {
        placeId,
        imageUrl,
        title: file.name.replace(/\.[^/.]+$/, ""),
      };

      const newFloorplan = await createFloorplan(dto);
      // Reload floorplans to get fresh data
      await loadFloorplans();
      setSelectedFloorplan(newFloorplan);
      showToast(t("admin.floorplan.uploaded") || "Alaprajz feltöltve", "success");
    } catch (error: any) {
      console.error("Failed to upload floorplan:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "";
      showToast(errorMessage || t("admin.errorUploading") || "Hiba a feltöltéskor", "error");
      // Reload floorplans on error to refresh state
      await loadFloorplans();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFloorplan = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.floorplan.delete") || "Alaprajz törlése",
      message:
        t("admin.floorplan.deleteConfirm") || "Biztosan törölni szeretnéd ezt az alaprajzot?",
      confirmLabel: t("common.delete") || "Törlés",
      cancelLabel: t("common.cancel") || "Mégse",
      confirmVariant: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteFloorplan(id);
      const updatedFloorplans = floorplans.filter((f) => f.id !== id);
      setFloorplans(updatedFloorplans);

      // Clear selected floorplan and reset state
      if (selectedFloorplan?.id === id) {
        setSelectedFloorplan(null);
        setPins([]);
        setScale(1);
        setMinScale(0.5);
        setPan({ x: 0, y: 0 });
        setEditingPin(null);
        setPinLabel("");
        setEditingPinLabel(null);
      }

      showToast(t("admin.floorplan.deleted") || "Alaprajz törölve", "success");
    } catch (error) {
      console.error("Failed to delete floorplan:", error);
      showToast(t("admin.errorDeleting") || "Hiba a törléskor", "error");
    }
  };

  const handleImageClick = async (
    e:
      | React.MouseEvent<HTMLImageElement>
      | { currentTarget: HTMLImageElement; clientX: number; clientY: number }
  ) => {
    if (!selectedFloorplan || editingPin || isPanning || !imageRef.current || !containerRef.current)
      return;

    // Prevent creating pin if panning just occurred
    if (hasPannedRef.current) {
      hasPannedRef.current = false;
      return;
    }

    let x: number, y: number;

    if (isFullscreen) {
      // In fullscreen, use direct coordinates
      const rect = e.currentTarget.getBoundingClientRect();
      x = (e.clientX - rect.left) / rect.width;
      y = (e.clientY - rect.top) / rect.height;
    } else {
      // In normal view, account for zoom and pan (same logic as handlePinDrag)
      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate the center of the container (where the transform origin is)
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;

      // Calculate mouse position relative to container center
      const mouseXRelativeToCenter = e.clientX - containerCenterX;
      const mouseYRelativeToCenter = e.clientY - containerCenterY;

      // Account for pan: subtract pan offset
      const mouseXAfterPan = mouseXRelativeToCenter - pan.x;
      const mouseYAfterPan = mouseYRelativeToCenter - pan.y;

      // Account for scale: divide by scale to get position in the transform div's coordinate space
      const mouseXInTransformSpace = mouseXAfterPan / scale;
      const mouseYInTransformSpace = mouseYAfterPan / scale;

      // The transform div is centered, so we need to convert from center-relative to top-left-relative
      // Then normalize to 0-1 range
      x = mouseXInTransformSpace / containerRect.width + 0.5;
      y = mouseYInTransformSpace / containerRect.height + 0.5;
    }

    // Create new pin
    try {
      const dto: CreateFloorplanPinDto = {
        floorplanId: selectedFloorplan.id,
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
        label: "",
      };

      const newPin = await createFloorplanPin(dto);
      setPins([...pins, newPin]);
      setEditingPin(newPin);
      setPinLabel("");

      // Immediately start dragging the new pin
      if (imageRef.current && !isFullscreen && containerRef.current) {
        const pinElement = document.querySelector(`[data-pin-id="${newPin.id}"]`) as HTMLElement;
        if (pinElement) {
          const pinRect = pinElement.getBoundingClientRect();
          setDragOffset({
            x: e.clientX - (pinRect.left + pinRect.width / 2),
            y: e.clientY - (pinRect.top + pinRect.height / 2),
          });
          setIsDragging(true);
        }
      }
    } catch (error) {
      console.error("Failed to create pin:", error);
      showToast(t("admin.errorCreatingPin") || "Hiba a jelölő létrehozásakor", "error");
    }
  };

  const handlePinClick = (pin: FloorplanPin) => {
    // Highlight the pin when clicked on the image
    setEditingPin(pin);
    // Also start editing the label in the list
    setEditingPinLabel(pin.id);
    setPinLabel(pin.label);
  };

  const handlePinLabelEdit = (pin: FloorplanPin) => {
    setEditingPinLabel(pin.id);
    setPinLabel(pin.label);
  };

  // Debounce timer for label updates
  const labelUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLabelUpdateRef = useRef<{ pinId: string; label: string } | null>(null);

  const handlePinLabelUpdate = useCallback(
    async (pinId: string, label: string, immediate = false) => {
      // Clear any pending update
      if (labelUpdateTimerRef.current) {
        clearTimeout(labelUpdateTimerRef.current);
        labelUpdateTimerRef.current = null;
      }

      // Store the pending update
      pendingLabelUpdateRef.current = { pinId, label };

      const performUpdate = async () => {
        const update = pendingLabelUpdateRef.current;
        if (!update) return;

        try {
          await updateFloorplanPin(update.pinId, { label: update.label });
          setPins((prevPins) =>
            prevPins.map((p) => (p.id === update.pinId ? { ...p, label: update.label } : p))
          );
          pendingLabelUpdateRef.current = null;
          // Don't show toast for every update to avoid spam
        } catch (error) {
          console.error("Failed to update pin:", error);
          showToast(t("admin.errorUpdatingPin") || "Hiba a jelölő frissítésekor", "error");
          // Reload pins to revert to server state
          if (selectedFloorplan) {
            const data = await getFloorplanPins(selectedFloorplan.id);
            setPins(data);
          }
        }
      };

      if (immediate) {
        // For blur/Enter, save immediately
        await performUpdate();
      } else {
        // For typing, debounce by 500ms
        labelUpdateTimerRef.current = setTimeout(performUpdate, 500);
      }
    },
    [selectedFloorplan, t, showToast]
  );

  const handlePinLabelSave = async () => {
    if (!editingPin) return;

    try {
      await updateFloorplanPin(editingPin.id, { label: pinLabel });
      setPins(pins.map((p) => (p.id === editingPin.id ? { ...p, label: pinLabel } : p)));
      setEditingPin(null);
      setPinLabel("");
      showToast(t("admin.pin.updated") || "Jelölő frissítve", "success");
    } catch (error) {
      console.error("Failed to update pin:", error);
      showToast(t("admin.errorUpdatingPin") || "Hiba a jelölő frissítésekor", "error");
    }
  };

  const handlePinDelete = async (pinId: string) => {
    const confirmed = await confirm({
      title: t("admin.pin.delete") || "Jelölő törlése",
      message: t("admin.pin.deleteConfirm") || "Biztosan törölni szeretnéd ezt a jelölőt?",
      confirmLabel: t("common.delete") || "Törlés",
      cancelLabel: t("common.cancel") || "Mégse",
      confirmVariant: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteFloorplanPin(pinId);
      setPins(pins.filter((p) => p.id !== pinId));
      if (editingPin?.id === pinId) {
        setEditingPin(null);
        setPinLabel("");
      }
      if (editingPinLabel === pinId) {
        setEditingPinLabel(null);
        setPinLabel("");
      }
      showToast(t("admin.pin.deleted") || "Jelölő törölve", "success");
    } catch (error) {
      console.error("Failed to delete pin:", error);
      showToast(t("admin.errorDeletingPin") || "Hiba a jelölő törlésekor", "error");
    }
  };

  const handlePinDragStart = (pin: FloorplanPin, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setEditingPin(pin);
    // Calculate drag offset based on the pin's actual screen position
    const pinElement = e.currentTarget as HTMLElement;
    const pinRect = pinElement.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - (pinRect.left + pinRect.width / 2),
      y: e.clientY - (pinRect.top + pinRect.height / 2),
    });
  };

  const handlePinDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !editingPin || !imageRef.current || !containerRef.current) return;

      // Get container dimensions
      const containerRect = containerRef.current.getBoundingClientRect();

      // Calculate the center of the container (where the transform origin is)
      const containerCenterX = containerRect.left + containerRect.width / 2;
      const containerCenterY = containerRect.top + containerRect.height / 2;

      // Calculate mouse position relative to container center, accounting for drag offset
      const mouseXRelativeToCenter = e.clientX - containerCenterX - dragOffset.x;
      const mouseYRelativeToCenter = e.clientY - containerCenterY - dragOffset.y;

      // Account for pan: subtract pan offset
      const mouseXAfterPan = mouseXRelativeToCenter - pan.x;
      const mouseYAfterPan = mouseYRelativeToCenter - pan.y;

      // Account for scale: divide by scale to get position in the transform div's coordinate space
      // The transform div is 100% width/height of container
      const mouseXInTransformSpace = mouseXAfterPan / scale;
      const mouseYInTransformSpace = mouseYAfterPan / scale;

      // The transform div is centered, so we need to convert from center-relative to top-left-relative
      // Then normalize to 0-1 range
      // The transform div is 100% of container, so we use container dimensions
      const x = mouseXInTransformSpace / containerRect.width + 0.5;
      const y = mouseYInTransformSpace / containerRect.height + 0.5;

      // Don't clamp during dragging - allow smooth movement
      // Clamp only when saving to API
      const finalX = x;
      const finalY = y;

      // Update local state immediately for smooth dragging (no API call)
      setDraggedPinPosition({ x: finalX, y: finalY });
      setPins(pins.map((p) => (p.id === editingPin.id ? { ...p, x: finalX, y: finalY } : p)));
    },
    [isDragging, editingPin, dragOffset, pins, scale, pan]
  );

  const handlePinDragEnd = useCallback(async () => {
    if (isDragging && editingPin && draggedPinPosition) {
      // Clamp coordinates to 0-1 range before saving to API (API requirement)
      const pinToSave = {
        x: Math.max(0, Math.min(1, draggedPinPosition.x)),
        y: Math.max(0, Math.min(1, draggedPinPosition.y)),
      };
      setIsDragging(false);
      setDraggedPinPosition(null);

      // Save to API only when drag ends
      try {
        await updateFloorplanPin(editingPin.id, { x: pinToSave.x, y: pinToSave.y });
        // Clear editingPin after successful save to allow creating new pins
        setEditingPin(null);
      } catch (error) {
        console.error("Failed to update pin position:", error);
        showToast(t("admin.errorUpdatingPin") || "Hiba a jelölő frissítésekor", "error");
        // Reload pins to revert to server state
        if (selectedFloorplan) {
          loadPins(selectedFloorplan.id);
        }
        // Clear editingPin even on error to allow creating new pins
        setEditingPin(null);
      }
    } else {
      setIsDragging(false);
      setDraggedPinPosition(null);
      // Clear editingPin if not dragging
      setEditingPin(null);
    }
  }, [isDragging, editingPin, draggedPinPosition, selectedFloorplan, t, showToast]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handlePinDrag);
      window.addEventListener("mouseup", handlePinDragEnd);
      return () => {
        window.removeEventListener("mousemove", handlePinDrag);
        window.removeEventListener("mouseup", handlePinDragEnd);
      };
    } else {
      // Reset dragged position when not dragging
      setDraggedPinPosition(null);
    }
  }, [isDragging, handlePinDrag, handlePinDragEnd]);

  const toggleInstructions = () => {
    const newState = !isInstructionsOpen;
    setIsInstructionsOpen(newState);
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("floorplanInstructionsOpen", String(newState));
    }
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: isMobile ? 8 : 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? 18 : 20,
              fontWeight: 700,
              fontFamily:
                "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {t("admin.floorplans") || "Alaprajzok"}
          </h3>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectedFloorplan ? (
            // Show delete button if floorplan is uploaded
            <button
              onClick={() => handleDeleteFloorplan(selectedFloorplan.id)}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid #ef4444",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                transition: "background 0.2s, color 0.2s",
                fontWeight: 600,
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ef4444";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#ef4444";
              }}
              title={t("common.delete") || "Törlés"}
            >
              {t("common.delete") || "Törlés"}
            </button>
          ) : (
            // Show upload button if no floorplan is selected
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  padding: "8px 16px",
                  background: isUploading ? "#9ca3af" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isUploading ? "not-allowed" : "pointer",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {isUploading
                  ? t("common.uploading") || "Feltöltés..."
                  : t("admin.floorplan.upload") || "Alaprajz feltöltése"}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 16 : 24,
          alignItems: "stretch",
          overflow: "hidden", // Prevent outer scrollbar
        }}
      >
        {/* Floorplan image or placeholder - 2/3 width on desktop, full width on mobile */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            border: "2px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            background: "#f9fafb",
            cursor: "default",
            flex: isMobile ? "none" : "2",
            width: isMobile ? "100%" : "auto",
            maxWidth: isMobile ? "100%" : "66.666%",
            // Minimum height matching the right panel (instructions + pin list) when instructions is open
            // Height can be larger if needed to fill available space
            // When no floorplan, use fixed height; when floorplan exists, match right panel
            minHeight: isMobile ? "300px" : rightPanelHeight ? `${rightPanelHeight}px` : "400px",
            height: isMobile ? "auto" : rightPanelHeight ? `${rightPanelHeight}px` : "400px",
            touchAction: "none",
            overscrollBehavior: "contain",
            cursor: selectedFloorplan
              ? isPanning
                ? "grabbing"
                : scale > minScale && isSpacePressed
                  ? "grab"
                  : "default"
              : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseDown={(e) => {
            if (!selectedFloorplan) return;
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
              hasPannedRef.current = false; // Reset flag when starting pan
            }
          }}
          onMouseMove={(e) => {
            if (!selectedFloorplan) return;
            // If space is not pressed, stop panning
            if (isPanning && !isSpacePressed) {
              setIsPanning(false);
              return;
            }
            if (isPanning && scale > minScale && isSpacePressed) {
              e.preventDefault();

              // Mark that panning occurred
              hasPannedRef.current = true;

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
            const wasPanning = isPanning;
            setIsPanning(false);
            // Also clear isSpacePressed if mouse is released (in case space was released while dragging)
            if (!isSpacePressed) {
              setIsPanning(false);
            }
            // If panning occurred, prevent click event from creating a pin
            // Reset the flag after a short delay to allow normal clicks
            if (wasPanning && hasPannedRef.current) {
              setTimeout(() => {
                hasPannedRef.current = false;
              }, 100);
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
          {selectedFloorplan ? (
            <>
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
                  src={selectedFloorplan.imageUrl}
                  alt={selectedFloorplan.title}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    userSelect: "none",
                    pointerEvents: editingPin ? "none" : "auto",
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
                  onClick={handleImageClick}
                  draggable={false}
                />
                {pins.map((pin) => {
                  // Use normalized coordinates directly - the transform div handles scale and pan
                  // Position is relative to the image's natural size (0-1), transform handles the rest
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
                        cursor: "move",
                        zIndex: editingPin?.id === pin.id ? 10 : 5,
                        transition:
                          isDragging && editingPin?.id === pin.id ? "none" : "left 0.1s, top 0.1s",
                      }}
                      onMouseDown={(e) => handlePinDragStart(pin, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinClick(pin);
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#ef4444",
                          border: "1px solid white",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                        }}
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
                            fontSize: 14, // Slightly larger default font size
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

              {/* Zoom slider - hidden when not in fullscreen */}
              {!isFullscreen && (
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
            </>
          ) : (
            // Placeholder when no floorplan is selected
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                color: "#9ca3af",
              }}
            >
              <svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  marginBottom: 16,
                  opacity: 0.5,
                }}
              >
                {/* Stylized floorplan icon */}
                <rect
                  x="20"
                  y="20"
                  width="80"
                  height="80"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  rx="4"
                />
                <rect
                  x="30"
                  y="30"
                  width="25"
                  height="25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  rx="2"
                />
                <rect
                  x="65"
                  y="30"
                  width="25"
                  height="25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  rx="2"
                />
                <rect
                  x="30"
                  y="65"
                  width="25"
                  height="25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  rx="2"
                />
                <rect
                  x="65"
                  y="65"
                  width="25"
                  height="25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  rx="2"
                />
                <line x1="55" y1="30" x2="55" y2="90" stroke="currentColor" strokeWidth="1.5" />
                <line x1="30" y1="55" x2="90" y2="55" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#6b7280",
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  textAlign: "center",
                }}
              >
                {t("admin.floorplan.noFloorplan") || "Nincs alaprajz feltöltve"}
              </p>
            </div>
          )}
        </div>

        {/* Right panel - 1/3 width on desktop, full width on mobile - always show */}
        <div
          ref={rightPanelRef}
          style={{
            flex: isMobile ? "none" : "1",
            width: isMobile ? "100%" : "auto",
            minWidth: isMobile ? "auto" : 300,
            display: "flex",
            flexDirection: "column",
            // Fix height when instructions is open (desktop only)
            height: isMobile
              ? "auto"
              : rightPanelHeight && isInstructionsOpen
                ? `${rightPanelHeight}px`
                : undefined,
            minHeight: isMobile
              ? "auto"
              : rightPanelHeight && isInstructionsOpen
                ? `${rightPanelHeight}px`
                : undefined,
          }}
        >
          {/* Instructions - Collapsible */}
          <div
            ref={instructionsRef}
            style={{
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: 8,
              marginBottom: isMobile ? 16 : 24,
              overflow: "hidden",
            }}
          >
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleInstructions();
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: isMobile ? 12 : 16,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: 600,
                  color: "#0369a1",
                  fontFamily:
                    "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {t("admin.floorplan.howItWorks") || "Hogyan működik?"}
              </h4>
              <span
                style={{
                  fontSize: 18,
                  color: "#0369a1",
                  transform: isInstructionsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.3s ease",
                }}
              >
                ▼
              </span>
            </div>
            <div
              style={{
                maxHeight: isInstructionsOpen ? "500px" : "0",
                overflow: "hidden",
                transition: "max-height 0.3s ease, padding 0.3s ease",
                padding: isInstructionsOpen
                  ? `0 ${isMobile ? 12 : 16}px ${isMobile ? 12 : 16}px`
                  : "0",
              }}
            >
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: isMobile ? 12 : 14,
                  color: "#0c4a6e",
                  lineHeight: 1.6,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                <li>
                  {t("admin.floorplan.instruction1") ||
                    "Kattints az alaprajzra egy új jelölő hozzáadásához"}
                </li>
                <li>
                  {t("admin.floorplan.instruction2") ||
                    "Húzd a jelölőket az egérrel a pozíciójuk módosításához"}
                </li>
                <li>
                  {t("admin.floorplan.instruction3") ||
                    "Kattints a jelölő címkéjére a jobb oldali listában az átnevezéshez"}
                </li>
                <li>
                  {t("admin.floorplan.instruction4") ||
                    "Használd az egér görgetését a nagyításhoz/kicsinyítéshez"}
                </li>
                <li>
                  {t("admin.floorplan.instruction5") ||
                    "Ctrl + egér vagy középső gomb + húzás a panorámázáshoz"}
                </li>
              </ul>
            </div>
          </div>

          {/* Pin list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1, // Take remaining space
              minHeight: 0, // Allow flex to shrink
            }}
          >
            <h4
              style={{
                margin: "0 0 12px 0",
                fontSize: isMobile ? 14 : 16,
                fontWeight: 600,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {selectedFloorplan ? (
                <>
                  {t("admin.floorplan.pins") || "Jelölők"} ({pins.length})
                </>
              ) : (
                <>{t("admin.floorplan.pins") || "Jelölők"}</>
              )}
            </h4>
            {selectedFloorplan ? (
              pins.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: 14,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    border: "1px solid #d1d5db",
                    borderRadius: 4,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {t("admin.floorplan.noPins") ||
                    "Még nincsenek jelölők. Kattints az alaprajzra egy hozzáadásához."}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: isMobile ? 6 : 8,
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    border: "1px solid #d1d5db",
                    borderRadius: 4,
                    padding: isMobile ? 8 : 12,
                    // Enable touch scrolling
                    WebkitOverflowScrolling: "touch",
                    // Custom scrollbar styling
                    scrollbarWidth: "thin",
                    scrollbarColor: "#cbd5e1 #f1f5f9",
                  }}
                >
                  {pins.map((pin) => (
                    <div
                      key={pin.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? 8 : 12,
                        padding: isMobile ? 10 : 12,
                        background: editingPin?.id === pin.id ? "#eef2ff" : "white",
                        border: `1px solid ${editingPin?.id === pin.id ? "#667eea" : "#e5e7eb"}`,
                        borderRadius: 6,
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Pin dot */}
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#ef4444",
                          border: "2px solid white",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          flexShrink: 0,
                        }}
                      />
                      {/* Label - editable */}
                      {editingPinLabel === pin.id ? (
                        <input
                          type="text"
                          value={pinLabel}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setPinLabel(newLabel);
                            // Debounced update while typing
                            if (newLabel.trim() !== pin.label) {
                              handlePinLabelUpdate(pin.id, newLabel.trim(), false);
                            }
                          }}
                          onBlur={async () => {
                            // Save immediately on blur
                            if (pinLabel.trim() !== pin.label) {
                              await handlePinLabelUpdate(pin.id, pinLabel.trim(), true);
                            }
                            setEditingPinLabel(null);
                            setPinLabel("");
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              // Save immediately on Enter
                              if (pinLabel.trim() !== pin.label) {
                                await handlePinLabelUpdate(pin.id, pinLabel.trim(), true);
                              }
                              setEditingPinLabel(null);
                              setPinLabel("");
                            } else if (e.key === "Escape") {
                              // Cancel editing, revert to original
                              if (labelUpdateTimerRef.current) {
                                clearTimeout(labelUpdateTimerRef.current);
                                labelUpdateTimerRef.current = null;
                              }
                              pendingLabelUpdateRef.current = null;
                              setEditingPinLabel(null);
                              setPinLabel("");
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            border: "1px solid #667eea",
                            borderRadius: 4,
                            fontSize: isMobile ? 14 : 16, // Slightly larger default font size
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            outline: "none",
                            fontWeight: 400,
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => handlePinLabelEdit(pin)}
                          style={{
                            flex: 1,
                            fontSize: isMobile ? 14 : 16, // Slightly larger default font size
                            color: pin.label ? "#1f2937" : "#9ca3af",
                            fontStyle: pin.label ? "normal" : "italic",
                            cursor: "pointer",
                            fontFamily:
                              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                            padding: "4px 0",
                            fontWeight: 400,
                          }}
                          title={t("admin.floorplan.clickToEdit") || "Kattints a szerkesztéshez"}
                        >
                          {pin.label || t("admin.floorplan.noLabel") || "(címke nélkül)"}
                        </span>
                      )}
                      {/* Delete button */}
                      <button
                        onClick={() => handlePinDelete(pin.id)}
                        style={{
                          padding: "4px 8px",
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 18,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 4,
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#fee2e2";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title={t("common.delete") || "Törlés"}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Skeleton for pin list when no floorplan
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  padding: isMobile ? 8 : 12,
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 8 : 12,
                      padding: isMobile ? 8 : 10,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#e5e7eb",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        height: 20,
                        background: "#e5e7eb",
                        borderRadius: 4,
                      }}
                    />
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        background: "#e5e7eb",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
          {t("common.loading") || "Betöltés..."}
        </div>
      )}

      {/* Fullscreen modal */}
      {isFullscreen && selectedFloorplan && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.95)",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          onWheel={(e) => {
            // Prevent page scrolling in fullscreen
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent page scrolling in fullscreen
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            // Close on background click
            if (e.target === e.currentTarget) {
              setIsFullscreen(false);
            }
          }}
        >
          {/* Header with close button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              background: "rgba(0, 0, 0, 0.8)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "white",
                fontSize: 18,
                fontWeight: 600,
                fontFamily:
                  "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {selectedFloorplan.title}
            </h3>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              {t("common.close") || "Bezárás"}
            </button>
          </div>

          {/* Fullscreen image container */}
          <div
            ref={fullscreenContainerRef}
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              touchAction: "none",
            }}
            onWheel={(e) => {
              // Prevent page scrolling
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Prevent page scrolling
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              <img
                ref={fullscreenImageRef}
                src={selectedFloorplan.imageUrl}
                alt={selectedFloorplan.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "calc(100vh - 100px)",
                  height: "auto",
                  userSelect: "none",
                  objectFit: "contain",
                  touchAction: "none",
                  pointerEvents: editingPin ? "none" : "auto",
                }}
                onWheel={(e) => {
                  // Prevent page scrolling
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchMove={(e) => {
                  // Prevent page scrolling
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  if (!editingPin && fullscreenImageRef.current) {
                    const rect = fullscreenImageRef.current.getBoundingClientRect();
                    const containerRect = fullscreenContainerRef.current?.getBoundingClientRect();
                    if (!containerRect) return;

                    // Create new pin
                    handleImageClick({
                      currentTarget: fullscreenImageRef.current,
                      clientX: e.clientX,
                      clientY: e.clientY,
                    } as any);
                  }
                }}
                draggable={false}
              />
              {/* Pins on fullscreen image */}
              {pins.map((pin) => {
                if (!fullscreenImageRef.current) return null;
                const rect = fullscreenImageRef.current.getBoundingClientRect();
                const x = pin.x * rect.width;
                const y = pin.y * rect.height;
                return (
                  <div
                    key={pin.id}
                    style={{
                      position: "absolute",
                      left: x,
                      top: y,
                      transform: "translate(-50%, -50%)",
                      cursor: "pointer",
                      zIndex: editingPin?.id === pin.id ? 10 : 5,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick(pin);
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#ef4444",
                        border: "1px solid white",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}
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
          </div>

          {/* Pin editing modal in fullscreen */}
          {editingPin && (
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "white",
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
                zIndex: 10001,
                minWidth: 300,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 600 }}>
                {t("admin.pin.edit") || "Jelölő szerkesztése"}
              </h4>
              <input
                type="text"
                value={pinLabel}
                onChange={(e) => setPinLabel(e.target.value)}
                placeholder={t("admin.pin.label") || "Címke"}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  marginBottom: 16,
                  fontFamily:
                    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handlePinLabelSave}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    background: "#667eea",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("common.save") || "Mentés"}
                </button>
                <button
                  onClick={() => {
                    setEditingPin(null);
                    setPinLabel("");
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    background: "#f3f4f6",
                    color: "#333",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("common.cancel") || "Mégse"}
                </button>
                <button
                  onClick={() => handlePinDelete(editingPin.id)}
                  style={{
                    padding: "8px 16px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {t("common.delete") || "Törlés"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
