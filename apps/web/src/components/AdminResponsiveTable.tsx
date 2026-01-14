// src/components/AdminResponsiveTable.tsx
import { useState, useEffect, useRef, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BREAKPOINTS } from "../utils/viewport";
import { Pagination } from "./Pagination";
import { TableSkeleton } from "./TableSkeleton";

export interface TableColumn<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface CardField<T> {
  key: string;
  icon?: string;
  render: (item: T) => ReactNode;
  condition?: (item: T) => boolean;
}

export interface AdminResponsiveTableProps<T> {
  // Data
  data: T[];
  getItemId: (item: T) => string;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filterFn: (item: T, query: string) => boolean;
  
  // Desktop columns
  columns: TableColumn<T>[];
  
  // Mobile card
  cardTitle: (item: T) => ReactNode;
  cardSubtitle?: (item: T) => ReactNode;
  cardFields: CardField<T>[];
  
  // Actions
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onView?: (item: T) => void; // Optional: view button (magnifying glass icon)
  shouldShowView?: (item: T) => boolean; // Optional: condition to show view button
  
  // Pagination (optional - only for desktop)
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  
  // Loading & error
  isLoading?: boolean;
  error?: string | null;
}

export function AdminResponsiveTable<T>({
  data,
  getItemId,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filterFn,
  columns,
  cardTitle,
  cardSubtitle,
  cardFields,
  onEdit,
  onDelete,
  onView,
  shouldShowView,
  pagination,
  isLoading = false,
  error = null,
}: AdminResponsiveTableProps<T>) {
  const { t } = useTranslation();
  
  // Validate cardTitle prop
  if (!cardTitle || typeof cardTitle !== 'function') {
    console.error('AdminResponsiveTable: cardTitle prop is required and must be a function', { 
      cardTitle, 
      cardTitleType: typeof cardTitle,
      hasCardTitle: !!cardTitle 
    });
  }
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < BREAKPOINTS.tablet;
  });
  const [swipedCardId, setSwipedCardId] = useState<string | null>(null);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [previousMobileIndex, setPreviousMobileIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  // Drag state for smooth following
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter data
  const filteredData = searchQuery
    ? data.filter((item) => filterFn(item, searchQuery))
    : data;

  // Helper function to update index with previous tracking
  const updateMobileIndex = (newIndex: number) => {
    setPreviousMobileIndex(currentMobileIndex);
    setCurrentMobileIndex(newIndex);
  };

  // Reset mobile index when data changes
  useEffect(() => {
    if (currentMobileIndex >= filteredData.length) {
      setCurrentMobileIndex(Math.max(0, filteredData.length - 1));
    }
  }, [filteredData.length, currentMobileIndex]);

  // Show skeleton screen while loading
  if (isLoading) {
    return (
      <div style={{ minHeight: 400 }}>
        <TableSkeleton 
          rows={5} 
          columns={columns.length} 
          isMobile={isMobile}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Search Input - only show if there is data */}
      {data.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              updateMobileIndex(0); // Reset to first card when searching
            }}
            placeholder={searchPlaceholder || t("admin.searchPlaceholder")}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: "clamp(15px, 3.5vw, 16px)",
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              border: "2px solid #e0e7ff",
              borderRadius: 8,
              outline: "none",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e0e7ff";
              e.target.style.boxShadow = "none";
            }}
          />
          {filteredData.length !== data.length && (
            <div style={{ 
              marginTop: 12, 
              fontSize: "clamp(14px, 3.5vw, 16px)", 
              color: "white", 
              fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              textAlign: "center",
              opacity: 0.9,
            }}>
              {t("admin.searchResults", { count: filteredData.length, total: data.length })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            marginBottom: 24,
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            color: "#991b1b",
            borderRadius: 12,
            border: "1px solid #fca5a5",
            fontSize: "clamp(13px, 3vw, 14px)",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <div
        className="admin-table-wrapper"
        style={{
          background: "white",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #ddd",
          display: isMobile ? "none" : "block",
        }}
      >
        <table 
          className="admin-table" 
          data-font="poppins" 
          style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            tableLayout: "auto",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          }}
        >
          <thead style={{ fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            <tr style={{ background: "#f5f5f5", fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: 12,
                    textAlign: col.align || "left",
                    borderBottom: "2px solid #ddd",
                    width: col.width,
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#333",
                    fontStyle: "normal",
                    fontVariant: "normal",
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                  }}
                >
                  <span style={{ 
                    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
                    fontWeight: 600,
                    display: "inline-block",
                  }}>
                    {col.label}
                  </span>
                </th>
              ))}
              <th
                style={{
                  padding: 12,
                  textAlign: "right",
                  borderBottom: "2px solid #ddd",
                  width: "1%",
                  whiteSpace: "nowrap",
                  fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#333",
                  fontStyle: "normal",
                  fontVariant: "normal",
                  textRendering: "optimizeLegibility",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                }}
              >
                <span style={{ 
                  fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
                  fontWeight: 600,
                  display: "inline-block",
                }}>
                  {t("admin.table.actions")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
            {filteredData.map((item) => (
              <tr key={getItemId(item)} style={{ borderBottom: "1px solid #eee", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: 12,
                      textAlign: col.align || "left",
                      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: 14,
                    }}
                  >
                    {col.render(item)}
                  </td>
                ))}
                <td style={{ padding: 12, textAlign: "right", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    {onView && (!shouldShowView || shouldShowView(item)) && (
                      <button
                        onClick={() => onView(item)}
                        style={{
                          padding: "6px 10px",
                          background: "rgba(16, 185, 129, 0.1)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: "clamp(13px, 3vw, 15px)",
                          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#10b981",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)";
                          e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.3)";
                        }}
                        title={t("admin.viewPublic") || "Megnézem"}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ display: "block" }}
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(item)}
                      style={{
                        padding: "6px 10px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                      }}
                      title={t("common.edit")}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" />
                        <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      style={{
                        padding: "6px 10px",
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "clamp(13px, 3vw, 15px)",
                        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 87, 108, 0.3)";
                      }}
                      title={t("common.delete")}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#999", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 14 }}>
            {searchQuery ? t("admin.table.noSearchResults") : t("admin.table.noData")}
          </div>
        )}
        {pagination && pagination.total > 0 && !searchQuery && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={pagination.onPageChange}
            onLimitChange={pagination.onLimitChange}
          />
        )}
      </div>

      {/* Mobile Carousel View - PONTOSAN AZ EVENTSPAGE-RŐL */}
      <div
        style={{
          display: isMobile ? "flex" : "none",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {filteredData.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: "#999",
              background: "white",
              borderRadius: 12,
            }}
          >
            {searchQuery ? t("admin.table.noSearchResults") : t("admin.table.noData")}
          </div>
        ) : (
          <>
            {/* Card counter and navigation - CSAK HA VAN ELEM */}
            {filteredData.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "white",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <button
                  onClick={() => {
                    setSwipeDirection("right"); // Previous button = swipe right
                    // Infinite loop: go to last if at first
                    if (currentMobileIndex === 0) {
                      updateMobileIndex(filteredData.length - 1);
                    } else {
                      updateMobileIndex(currentMobileIndex - 1);
                    }
                    setTimeout(() => setSwipeDirection(null), 400);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  ‹
                </button>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#667eea", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
                  {currentMobileIndex + 1} / {filteredData.length}
                </span>
                <button
                  onClick={() => {
                    setSwipeDirection("left"); // Next button = swipe left
                    // Infinite loop: go to first if at last
                    if (currentMobileIndex === filteredData.length - 1) {
                      updateMobileIndex(0);
                    } else {
                      updateMobileIndex(currentMobileIndex + 1);
                    }
                    setTimeout(() => setSwipeDirection(null), 400);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  ›
                </button>
              </div>
            )}

            {/* Stacked cards container - CSAK HA VAN ELEM */}
            {filteredData.length > 0 && (
              <div
              style={{
                position: "relative",
                minHeight: 280,
                perspective: "1000px",
              }}
              onTouchStart={(e) => {
                // Don't interfere if card is being dragged
                if (isDragging) return;
                
                const touch = e.touches[0];
                (e.currentTarget as any).swipeStartX = touch.clientX;
                (e.currentTarget as any).swipeStartY = touch.clientY;
                (e.currentTarget as any).swipeStartTime = Date.now();
              }}
              onTouchMove={(e) => {
                // Don't interfere if card is being dragged
                if (isDragging) return;
                
                const touch = e.touches[0];
                const startX = (e.currentTarget as any).swipeStartX || 0;
                const startY = (e.currentTarget as any).swipeStartY || 0;
                const diffX = touch.clientX - startX;
                const diffY = touch.clientY - startY;

                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
                  e.preventDefault();
                  (e.currentTarget as any).isHorizontalSwipe = true;
                }
              }}
              onTouchEnd={(e) => {
                // Don't interfere if card is being dragged
                if (isDragging) return;
                
                // Only handle container swipe if no card has actions open
                if (swipedCardId) return;
                
                // Check if the touch was on a card content (let card handler take priority)
                const target = e.target as HTMLElement;
                const isCardContent = target.closest('[data-card-content]');
                if (isCardContent) return; // Let card handler process this
                
                const touch = e.changedTouches[0];
                const startX = (e.currentTarget as any).swipeStartX || 0;
                const startY = (e.currentTarget as any).swipeStartY || 0;
                const diffX = touch.clientX - startX;
                const diffY = touch.clientY - startY;
                const timeDiff = Date.now() - ((e.currentTarget as any).swipeStartTime || 0);
                const isHorizontalSwipe = (e.currentTarget as any).isHorizontalSwipe;

                if (
                  isHorizontalSwipe ||
                  (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50)
                ) {
                  // Threshold based on screen width (same as card swipe)
                  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.mobile;
                  const SWIPE_THRESHOLD = screenWidth * 0.25; // 25% of screen width
                  const QUICK_SWIPE_THRESHOLD = screenWidth * 0.15; // 15% for quick swipes
                  const velocity = Math.abs(diffX) / timeDiff;
                  const FAST_SWIPE_VELOCITY = 0.5;
                  const quickSwipe = timeDiff < 300;
                  
                  // Swipe right (diffX > 0) = previous card (infinite)
                  // Current card goes right, previous card comes from right
                  if (diffX > SWIPE_THRESHOLD || (diffX > QUICK_SWIPE_THRESHOLD && (quickSwipe || velocity > FAST_SWIPE_VELOCITY))) {
                    setSwipeDirection("right"); // Swipe right = previous card
                    setDragOffsetX(0); // Reset drag offset immediately for smooth transition
                    if (currentMobileIndex === 0) {
                      updateMobileIndex(filteredData.length - 1); // Loop to last
                    } else {
                      updateMobileIndex(currentMobileIndex - 1);
                    }
                    setSwipedCardId(null);
                    // Reset swipe direction after animation completes
                    setTimeout(() => setSwipeDirection(null), 400);
                  } 
                  // Swipe left (diffX < 0) = next card (infinite)
                  // Current card goes left, next card comes from left
                  else if (diffX < -SWIPE_THRESHOLD || (diffX < -QUICK_SWIPE_THRESHOLD && (quickSwipe || velocity > FAST_SWIPE_VELOCITY))) {
                    setSwipeDirection("left"); // Swipe left = next card
                    setDragOffsetX(0); // Reset drag offset immediately for smooth transition
                    if (currentMobileIndex === filteredData.length - 1) {
                      updateMobileIndex(0); // Loop to first
                    } else {
                      updateMobileIndex(currentMobileIndex + 1);
                    }
                    setSwipedCardId(null);
                    // Reset swipe direction after animation completes
                    setTimeout(() => setSwipeDirection(null), 400);
                  }
                }

                (e.currentTarget as any).isHorizontalSwipe = false;
              }}
            >
              {filteredData.map((item, index) => {
                const itemId = getItemId(item);
                const isOpen = swipedCardId === itemId;

                // Calculate position relative to current index
                const offset = index - currentMobileIndex;
                let previousOffset = index - previousMobileIndex;
                
                // For infinite loop: normalize offsets to show adjacent cards when wrapping
                // This allows seamless carousel without jumps
                let displayOffset = offset;
                let displayPreviousOffset = previousOffset;
                
                if (filteredData.length > 0) {
                  // Normalize offset for display
                  if (Math.abs(offset) > filteredData.length / 2) {
                    displayOffset = offset > 0 
                      ? offset - filteredData.length 
                      : offset + filteredData.length;
                  }
                  
                  // Normalize previousOffset for display
                  if (Math.abs(previousOffset) > filteredData.length / 2) {
                    displayPreviousOffset = previousOffset > 0 
                      ? previousOffset - filteredData.length 
                      : previousOffset + filteredData.length;
                  }
                }
                
                const isVisible = Math.abs(displayOffset) <= 2;

                if (!isVisible) return null;

                // Check if this card is transitioning in (was offset 1/-1, now offset 0)
                const isTransitioningIn = displayOffset === 0 && displayPreviousOffset !== 0 && swipeDirection !== null;

                // Styling based on position - Carousel layout (cards side by side with gap)
                const getCardStyle = () => {
                  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.mobile;
                  const CARD_GAP = 16; // Gap between cards in pixels
                  const baseStyle = {
                    position: "absolute" as const,
                    width: "100%",
                    // Smooth carousel transition
                    transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    transformOrigin: "center center",
                  };

                  // Use displayOffset for styling to handle infinite loop smoothly
                  const styleOffset = displayOffset;

                  if (styleOffset === 0) {
                    // Current card - center position
                    if (isDragging) {
                      // During drag: follow finger exactly
                      return {
                        ...baseStyle,
                        zIndex: 30,
                        transform: `translateX(${dragOffsetX}px) translateY(0) scale(1)`,
                        opacity: 1,
                      };
                    }
                    
                    // Final position: center
                    return {
                      ...baseStyle,
                      zIndex: 30,
                      transform: "translateX(0) translateY(0) scale(1)",
                      opacity: 1,
                    };
                  } else if (styleOffset === 1) {
                    // Next card - carousel layout (side by side with gap)
                    if (isDragging && dragOffsetX < 0) {
                      // Dragging left: next card comes in from left
                      // Perfect 1:1 movement - next card moves exactly opposite to current
                      const absDragX = Math.abs(dragOffsetX);
                      const translateX = -screenWidth - CARD_GAP + absDragX; // From -(100% + gap) to 0px
                      
                      return {
                        ...baseStyle,
                        zIndex: 20,
                        transform: `translateX(${translateX}px) translateY(0) scale(1)`,
                        opacity: 1,
                        pointerEvents: "none" as const,
                      };
                    }
                    
                    // Default position: off-screen left with gap, ready to come in
                    return {
                      ...baseStyle,
                      zIndex: 20,
                      transform: `translateX(calc(-100% - ${CARD_GAP}px)) translateY(0) scale(1)`,
                      opacity: 1,
                      pointerEvents: "none" as const,
                    };
                  } else if (styleOffset === -1) {
                    // Previous card - carousel layout (side by side with gap)
                    if (isDragging && dragOffsetX > 0) {
                      // Dragging right: previous card comes in from right
                      // Perfect 1:1 movement - previous card moves exactly opposite to current
                      const absDragX = Math.abs(dragOffsetX);
                      const translateX = screenWidth + CARD_GAP - absDragX; // From +(100% + gap) to 0px
                      
                      return {
                        ...baseStyle,
                        zIndex: 20,
                        transform: `translateX(${translateX}px) translateY(0) scale(1)`,
                        opacity: 1,
                        pointerEvents: "none" as const,
                      };
                    }
                    
                    // Default position: off-screen right with gap, ready to come in
                    return {
                      ...baseStyle,
                      zIndex: 20,
                      transform: `translateX(calc(100% + ${CARD_GAP}px)) translateY(0) scale(1)`,
                      opacity: 1,
                      pointerEvents: "none" as const,
                    };
                  } else if (styleOffset === 2) {
                    // Card 2 positions ahead - off screen left
                    return {
                      ...baseStyle,
                      zIndex: 10,
                      transform: `translateX(calc(-200% - ${CARD_GAP * 2}px)) translateY(0) scale(1)`,
                      opacity: 0,
                      pointerEvents: "none" as const,
                    };
                  } else if (styleOffset === -2) {
                    // Card 2 positions behind - off screen right
                    return {
                      ...baseStyle,
                      zIndex: 10,
                      transform: `translateX(calc(200% + ${CARD_GAP * 2}px)) translateY(0) scale(1)`,
                      opacity: 0,
                      pointerEvents: "none" as const,
                    };
                  } else {
                    return {
                      ...baseStyle,
                      zIndex: 1,
                      transform: "translateY(30px) scale(0.85)",
                      opacity: 0,
                      pointerEvents: "none" as const,
                    };
                  }
                };

                return (
                  <div key={itemId} style={getCardStyle()}>
                    <div
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 12,
                        boxShadow:
                          displayOffset === 0
                            ? "0 8px 24px rgba(0, 0, 0, 0.15)"
                            : "0 2px 8px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {/* Action buttons (slide over card) - PONTOSAN AZ EVENTSPAGE-RŐL */}
                      {displayOffset === 0 && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: 0,
                            bottom: 0,
                            display: "flex",
                            alignItems: "stretch",
                            gap: 0,
                            borderTopRightRadius: 12,
                            borderBottomRightRadius: 12,
                            overflow: "hidden",
                            transform: isOpen ? "translateX(0)" : `translateX(${onView ? 240 : 160}px)`,
                            transition: "transform 0.3s ease",
                            zIndex: 10,
                            width: onView ? 240 : 160,
                          }}
                        >
                          {onView && (!shouldShowView || shouldShowView(item)) && (
                            <button
                              onClick={() => {
                                onView(item);
                                setSwipedCardId(null);
                              }}
                              style={{
                                width: 80,
                                background: "rgba(16, 185, 129, 0.9)",
                                color: "white",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease",
                                boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                                padding: 0,
                              }}
                              onTouchStart={(e) => {
                                e.currentTarget.style.filter = "brightness(0.9)";
                              }}
                              onTouchEnd={(e) => {
                                e.currentTarget.style.filter = "brightness(1)";
                              }}
                              title={t("admin.viewPublic") || "Megnézem"}
                            >
                              <svg
                                width="26"
                                height="26"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ display: "block" }}
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onEdit(item);
                              setSwipedCardId(null);
                            }}
                            style={{
                              width: 80,
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                              boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                              padding: 0,
                            }}
                            onTouchStart={(e) => {
                              e.currentTarget.style.filter = "brightness(0.9)";
                            }}
                            onTouchEnd={(e) => {
                              e.currentTarget.style.filter = "brightness(1)";
                            }}
                            title={t("common.edit")}
                          >
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ display: "block" }}
                            >
                              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" />
                              <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              onDelete(item);
                              setSwipedCardId(null);
                            }}
                            style={{
                              width: 80,
                              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.2s ease",
                              boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.15)",
                              padding: 0,
                            }}
                            onTouchStart={(e) => {
                              e.currentTarget.style.filter = "brightness(0.9)";
                            }}
                            onTouchEnd={(e) => {
                              e.currentTarget.style.filter = "brightness(1)";
                            }}
                            title={t("common.delete")}
                          >
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ display: "block" }}
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Card content (DOES NOT MOVE) - PONTOSAN AZ EVENTSPAGE-RŐL */}
                      <div
                        data-card-content
                        onClick={() => {
                          if (displayOffset === 0) {
                            if (isOpen) {
                              setSwipedCardId(null);
                            } else {
                              setSwipedCardId(itemId);
                            }
                          }
                        }}
                        onTouchStart={(e) => {
                          if (displayOffset !== 0) return;
                          e.stopPropagation();
                          const touch = e.touches[0];
                          dragStartXRef.current = touch.clientX;
                          setIsDragging(true);
                          setDragOffsetX(0);
                          (e.currentTarget as any).cardTouchStartX = touch.clientX;
                          (e.currentTarget as any).cardTouchStartTime = Date.now();
                        }}
                        onTouchMove={(e) => {
                          if (displayOffset !== 0 || !isDragging) return;
                          e.stopPropagation();
                          const touch = e.touches[0];
                          const diffX = touch.clientX - dragStartXRef.current;
                          
                          // Only allow horizontal dragging (prevent vertical scroll interference)
                          if (Math.abs(diffX) > 10) {
                            e.preventDefault();
                            setDragOffsetX(diffX);
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (displayOffset !== 0) return;
                          e.stopPropagation();
                          const touch = e.changedTouches[0];
                          const startX = (e.currentTarget as any).cardTouchStartX || 0;
                          const diffX = startX - touch.clientX;
                          const timeDiff =
                            Date.now() - ((e.currentTarget as any).cardTouchStartTime || 0);
                          
                          // Reset drag state
                          setIsDragging(false);
                          
                          // Threshold based on screen width (25% of screen = swipe)
                          const screenWidth = typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.mobile;
                          const SWIPE_THRESHOLD = screenWidth * 0.25; // 25% of screen width
                          const QUICK_SWIPE_THRESHOLD = screenWidth * 0.15; // 15% for quick swipes
                          const quickSwipe = timeDiff < 300;
                          const velocity = Math.abs(diffX) / timeDiff; // pixels per ms
                          const FAST_SWIPE_VELOCITY = 0.5; // pixels per ms

                          // Left swipe (diffX > 0) = actions slide in
                          if (diffX > SWIPE_THRESHOLD || (diffX > QUICK_SWIPE_THRESHOLD && (quickSwipe || velocity > FAST_SWIPE_VELOCITY))) {
                            // Deliberate left swipe = show actions
                            e.preventDefault();
                            setSwipedCardId(itemId);
                            setDragOffsetX(0);
                          } 
                          // Swipe left (diffX < 0) = navigate to next card (infinite)
                          // Current card goes left, next card comes from left
                          else if (diffX < -SWIPE_THRESHOLD || (diffX < -QUICK_SWIPE_THRESHOLD && (quickSwipe || velocity > FAST_SWIPE_VELOCITY))) {
                            // Set swipe direction for animation
                            e.preventDefault();
                            setSwipeDirection("left"); // Swipe left = next card
                            setDragOffsetX(0); // Reset drag offset immediately for smooth transition
                            // Navigate to next card (infinite loop)
                            if (currentMobileIndex === filteredData.length - 1) {
                              updateMobileIndex(0); // Loop to first
                            } else {
                              updateMobileIndex(currentMobileIndex + 1);
                            }
                            setSwipedCardId(null);
                            // Reset swipe direction after animation completes
                            setTimeout(() => setSwipeDirection(null), 400);
                          } 
                          // Small right swipe = close actions only
                          else if (diffX < -30 && diffX > -SWIPE_THRESHOLD) {
                            e.preventDefault();
                            setSwipedCardId(null);
                            setDragOffsetX(0);
                          }
                          // Not enough movement - smooth snap back
                          else {
                            setDragOffsetX(0);
                          }
                        }}
                        style={{
                          background: "white",
                          padding: 20,
                          border: "1px solid #e0e0e0",
                          cursor: displayOffset === 0 ? "pointer" : "default",
                          position: "relative",
                          touchAction: displayOffset === 0 ? "pan-y" : "none",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          MozUserSelect: "none",
                          msUserSelect: "none",
                        }}
                      >
                        {/* Title */}
                        <div style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "#333",
                              marginBottom: 4,
                            }}
                          >
                            {cardTitle && typeof cardTitle === 'function' ? cardTitle(item) : String(item)}
                          </div>
                          {cardSubtitle && (
                            <div style={{ fontSize: 13, color: "#666", fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{cardSubtitle(item)}</div>
                          )}
                        </div>

                        {/* Fields */}
                        {cardFields.map((field) => {
                          if (field.condition && !field.condition(item)) return null;
                          return (
                            <div
                              key={field.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                                fontSize: 14,
                                color: "#666",
                              }}
                            >
                              {field.icon && <span style={{ fontWeight: 600, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{field.icon}</span>}
                              <div style={{ flex: 1 }}>{field.render(item)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
