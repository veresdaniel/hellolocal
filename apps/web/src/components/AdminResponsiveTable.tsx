// src/components/AdminResponsiveTable.tsx
import { useState, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pagination } from "./Pagination";

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
  pagination,
  isLoading = false,
  error = null,
}: AdminResponsiveTableProps<T>) {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [swipedCardId, setSwipedCardId] = useState<string | null>(null);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter data
  const filteredData = searchQuery
    ? data.filter((item) => filterFn(item, searchQuery))
    : data;

  // Reset mobile index when data changes
  useEffect(() => {
    if (currentMobileIndex >= filteredData.length) {
      setCurrentMobileIndex(Math.max(0, filteredData.length - 1));
    }
  }, [filteredData.length, currentMobileIndex]);

  if (isLoading) {
    return null; // LoadingSpinner handles this outside
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
              setCurrentMobileIndex(0); // Reset to first card when searching
            }}
            placeholder={searchPlaceholder || t("admin.searchPlaceholder")}
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 15,
              border: "2px solid #e0e7ff",
              borderRadius: 8,
              outline: "none",
              transition: "all 0.3s ease",
              fontFamily: "inherit",
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
            <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
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
        style={{
          background: "white",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #ddd",
          display: isMobile ? "none" : "block",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: 12,
                    textAlign: col.align || "left",
                    borderBottom: "2px solid #ddd",
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
              <th
                style={{
                  padding: 12,
                  textAlign: "right",
                  borderBottom: "2px solid #ddd",
                  width: "1%",
                  whiteSpace: "nowrap",
                }}
              >
                {t("admin.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={getItemId(item)} style={{ borderBottom: "1px solid #eee" }}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: 12,
                      textAlign: col.align || "left",
                    }}
                  >
                    {col.render(item)}
                  </td>
                ))}
                <td style={{ padding: 12, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => onEdit(item)}
                      style={{
                        padding: "6px 12px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
                      }}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      style={{
                        padding: "6px 12px",
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 87, 108, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 87, 108, 0.3)";
                      }}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#999" }}>
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
                    // Infinite loop: go to last if at first
                    if (currentMobileIndex === 0) {
                      setCurrentMobileIndex(filteredData.length - 1);
                    } else {
                      setCurrentMobileIndex(currentMobileIndex - 1);
                    }
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
                <span style={{ fontSize: 15, fontWeight: 600, color: "#667eea" }}>
                  {currentMobileIndex + 1} / {filteredData.length}
                </span>
                <button
                  onClick={() => {
                    // Infinite loop: go to first if at last
                    if (currentMobileIndex === filteredData.length - 1) {
                      setCurrentMobileIndex(0);
                    } else {
                      setCurrentMobileIndex(currentMobileIndex + 1);
                    }
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
                const touch = e.touches[0];
                (e.currentTarget as any).swipeStartX = touch.clientX;
                (e.currentTarget as any).swipeStartY = touch.clientY;
                (e.currentTarget as any).swipeStartTime = Date.now();
              }}
              onTouchMove={(e) => {
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
                  if (diffX < -50 && timeDiff < 400) {
                    // Swipe left = next card (infinite)
                    if (currentMobileIndex === filteredData.length - 1) {
                      setCurrentMobileIndex(0); // Loop to first
                    } else {
                      setCurrentMobileIndex(currentMobileIndex + 1);
                    }
                    setSwipedCardId(null);
                  } else if (diffX > 50 && timeDiff < 400) {
                    // Swipe right = previous card (infinite)
                    if (currentMobileIndex === 0) {
                      setCurrentMobileIndex(filteredData.length - 1); // Loop to last
                    } else {
                      setCurrentMobileIndex(currentMobileIndex - 1);
                    }
                    setSwipedCardId(null);
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
                const isVisible = Math.abs(offset) <= 2;

                if (!isVisible) return null;

                // Styling based on position
                const getCardStyle = () => {
                  const baseStyle = {
                    position: "absolute" as const,
                    width: "100%",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    transformOrigin: "center center",
                  };

                  if (offset === 0) {
                    return {
                      ...baseStyle,
                      zIndex: 30,
                      transform: "translateY(0) scale(1)",
                      opacity: 1,
                    };
                  } else if (offset === 1) {
                    return {
                      ...baseStyle,
                      zIndex: 20,
                      transform: "translateY(12px) scale(0.95)",
                      opacity: 0.6,
                      pointerEvents: "none" as const,
                    };
                  } else if (offset === 2) {
                    return {
                      ...baseStyle,
                      zIndex: 10,
                      transform: "translateY(24px) scale(0.9)",
                      opacity: 0.3,
                      pointerEvents: "none" as const,
                    };
                  } else if (offset === -1) {
                    return {
                      ...baseStyle,
                      zIndex: 5,
                      transform: "translateX(-20%) translateY(-12px) scale(0.9)",
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
                          offset === 0
                            ? "0 8px 24px rgba(0, 0, 0, 0.15)"
                            : "0 2px 8px rgba(0, 0, 0, 0.1)",
                      }}
                    >
                      {/* Action buttons (slide over card) - PONTOSAN AZ EVENTSPAGE-RŐL */}
                      {offset === 0 && (
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
                            transform: isOpen ? "translateX(0)" : "translateX(100%)",
                            transition: "transform 0.3s ease",
                            zIndex: 10,
                          }}
                        >
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
                          >
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ display: "block" }}
                            >
                              <path
                                d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.43741 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
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
                          >
                            <svg
                              width="26"
                              height="26"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ display: "block" }}
                            >
                              <path
                                d="M3 6H5H21"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10 11V17"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14 11V17"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Card content (DOES NOT MOVE) - PONTOSAN AZ EVENTSPAGE-RŐL */}
                      <div
                        onClick={() => {
                          if (offset === 0) {
                            if (isOpen) {
                              setSwipedCardId(null);
                            } else {
                              setSwipedCardId(itemId);
                            }
                          }
                        }}
                        onTouchStart={(e) => {
                          if (offset !== 0) return;
                          e.stopPropagation();
                          const touch = e.touches[0];
                          (e.currentTarget as any).cardTouchStartX = touch.clientX;
                          (e.currentTarget as any).cardTouchStartTime = Date.now();
                        }}
                        onTouchEnd={(e) => {
                          if (offset !== 0) return;
                          e.stopPropagation();
                          const touch = e.changedTouches[0];
                          const startX = (e.currentTarget as any).cardTouchStartX || 0;
                          const diffX = startX - touch.clientX;
                          const timeDiff =
                            Date.now() - ((e.currentTarget as any).cardTouchStartTime || 0);

                          // Left swipe = actions slide in (only if not swiping right for navigation)
                          if ((diffX > 60 && timeDiff < 300) || diffX > 90) {
                            // Only show actions if we're not doing a navigation swipe
                            // Check if this is a deliberate left swipe (not just a small movement)
                            if (Math.abs(diffX) > 50 && diffX > 0) {
                              setSwipedCardId(itemId);
                            }
                          } else if (diffX < -50 && timeDiff < 300) {
                            // Right swipe = navigate to next card (infinite)
                            // Don't close actions, just navigate
                            if (currentMobileIndex === filteredData.length - 1) {
                              setCurrentMobileIndex(0); // Loop to first
                            } else {
                              setCurrentMobileIndex(currentMobileIndex + 1);
                            }
                            setSwipedCardId(null);
                          } else if (diffX < -30 && diffX > -50) {
                            // Small right swipe = close actions only
                            setSwipedCardId(null);
                          }
                        }}
                        style={{
                          background: "white",
                          padding: 20,
                          border: "1px solid #e0e0e0",
                          cursor: offset === 0 ? "pointer" : "default",
                          position: "relative",
                          touchAction: offset === 0 ? "pan-y" : "none",
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
                            {cardTitle(item)}
                          </div>
                          {cardSubtitle && (
                            <div style={{ fontSize: 13, color: "#666" }}>{cardSubtitle(item)}</div>
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
                              {field.icon && <span style={{ fontWeight: 600 }}>{field.icon}</span>}
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
