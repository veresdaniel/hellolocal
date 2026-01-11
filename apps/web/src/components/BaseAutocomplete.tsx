// src/components/BaseAutocomplete.tsx
import { useState, useRef, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface AutocompleteItem {
  id: string;
  translations?: Array<{ lang: string; name: string }>;
  name?: string; // Fallback if no translations
}

interface BaseAutocompleteProps<T extends AutocompleteItem> {
  items: T[];
  selectedItemIds: string[];
  onSelect: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  getItemName: (item: T) => string;
  placeholder?: string;
  label?: ReactNode;
  required?: boolean;
  error?: string;
  multiple?: boolean;
  renderSingleSelect?: (selectedItem: T | null, onToggle: () => void, onClear: () => void) => ReactNode;
  renderChip?: (item: T, onRemove: () => void) => ReactNode;
  chipColor?: string;
  zIndex?: number;
}

export function BaseAutocomplete<T extends AutocompleteItem>({
  items,
  selectedItemIds,
  onSelect,
  onRemove,
  getItemName,
  placeholder = "Select...",
  label,
  required = false,
  error,
  multiple = true,
  renderSingleSelect,
  renderChip,
  chipColor = "#007bff",
  zIndex = 800,
}: BaseAutocompleteProps<T>) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure selectedItemIds is always an array
  const safeSelectedItemIds = Array.isArray(selectedItemIds) ? selectedItemIds : [];
  
  const selectedItems = items.filter((item) => safeSelectedItemIds.includes(item.id));
  const availableItems = items.filter((item) => !safeSelectedItemIds.includes(item.id));

  const filteredItems = availableItems.filter((item) => {
    const searchTerm = inputValue.toLowerCase();
    return getItemName(item).toLowerCase().includes(searchTerm);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        if (!multiple) {
          setInputValue("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [multiple]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    setInputValue(""); // Clear input when focusing to show all items
  };

  const handleItemSelect = (itemId: string) => {
    onSelect(itemId);
    setInputValue("");
    setShowSuggestions(false);
    if (multiple) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  };

  const handleItemRemove = (itemId: string) => {
    onRemove(itemId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredItems.length > 0) {
      e.preventDefault();
      handleItemSelect(filteredItems[0].id);
    } else if (e.key === "Backspace" && inputValue === "" && safeSelectedItemIds.length > 0 && multiple) {
      handleItemRemove(safeSelectedItemIds[safeSelectedItemIds.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInputValue("");
      inputRef.current?.blur();
    }
  };

  const defaultRenderChip = (item: T, onRemove: () => void) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        background: chipColor,
        color: "white",
        borderRadius: 4,
        fontSize: 14,
      }}
    >
      {getItemName(item)}
      <button
        type="button"
        onClick={onRemove}
        style={{
          background: "none",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: 0,
          marginLeft: 4,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </span>
  );

  // Single select mode
  if (!multiple) {
    const selectedItem = selectedItems.length > 0 ? selectedItems[0] : null;

    if (renderSingleSelect) {
      return (
        <div ref={containerRef} style={{ position: "relative" }}>
          {label && (
            <label style={{ display: "block", marginBottom: 4 }}>
              {label} {required && "*"}
            </label>
          )}
          {renderSingleSelect(
            selectedItem,
            () => {
              setShowSuggestions(true);
              inputRef.current?.focus();
            },
            () => handleItemRemove(selectedItem?.id || "")
          )}
          {error && (
            <div style={{ color: "#dc3545", fontSize: 12, marginTop: 4 }}>
              {error}
            </div>
          )}
        {showSuggestions && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
              maxHeight: 200,
              overflowY: "auto",
              zIndex,
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            {!inputValue && selectedItem && (
              <div
                key={selectedItem.id}
                style={{
                  padding: "8px 12px",
                  cursor: "default",
                  borderBottom: "1px solid #f0f0f0",
                  background: "#e7f3ff",
                  color: "#007bff",
                  fontWeight: 500,
                }}
              >
                {getItemName(selectedItem)} ✓
              </div>
            )}
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f0f0f0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  {getItemName(item)}
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: "8px 12px",
                  color: "#999",
                  fontStyle: "italic",
                }}
              >
                {t("admin.table.noData")}
              </div>
            )}
          </div>
        )}
        </div>
      );
    }

    // Default single select UI
    return (
      <div ref={containerRef} style={{ position: "relative" }}>
        {label && (
          <label style={{ 
            display: "block", 
            marginBottom: 8,
            color: error ? "#dc2626" : "#667eea",
            fontWeight: 600,
            fontSize: "clamp(13px, 3vw, 14px)",
          }}>
            {label} {required && "*"}
          </label>
        )}
        <div
          style={{
            position: "relative",
            border: error ? "2px solid #fca5a5" : "2px solid #e0e7ff",
            borderRadius: 8,
            background: error ? "#fef2f2" : "white",
            transition: "all 0.3s ease",
            boxSizing: "border-box",
          }}
        >
          {!showSuggestions && selectedItem && (
            <div
              onClick={() => {
                setShowSuggestions(true);
                inputRef.current?.focus();
              }}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 15,
                fontFamily: "inherit",
              }}
            >
              <span>{getItemName(selectedItem)}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemRemove(selectedItem.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#999",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 18,
                    lineHeight: 1,
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
                <span style={{ color: "#999", fontSize: 12 }}>▼</span>
              </div>
            </div>
          )}
          {(!selectedItem || showSuggestions) && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={(e) => {
                handleInputFocus();
                const parent = e.target.parentElement;
                if (parent) {
                  parent.style.borderColor = "#667eea";
                  parent.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                }
              }}
              onBlur={(e) => {
                const parent = e.target.parentElement;
                if (parent && !error) {
                  parent.style.borderColor = "#e0e7ff";
                  parent.style.boxShadow = "none";
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={selectedItem ? "" : placeholder}
              autoFocus={showSuggestions}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 15,
                border: "none",
                outline: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                background: "transparent",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>
        {error && (
          <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
            {error}
          </div>
        )}
        {showSuggestions && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 4,
              marginTop: 4,
              maxHeight: 200,
              overflowY: "auto",
              zIndex,
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            {!inputValue && selectedItem && (
              <div
                key={selectedItem.id}
                style={{
                  padding: "8px 12px",
                  cursor: "default",
                  borderBottom: "1px solid #f0f0f0",
                  background: "#e7f3ff",
                  color: "#007bff",
                  fontWeight: 500,
                }}
              >
                {getItemName(selectedItem)} ✓
              </div>
            )}
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemSelect(item.id)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #f0f0f0",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f0f0f0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                }}
              >
                {getItemName(item)}
              </div>
            ))}
            {inputValue && filteredItems.length === 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  color: "#999",
                  fontStyle: "italic",
                }}
              >
                No results found
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Multiple select mode - chips
  const chipRenderer = renderChip || defaultRenderChip;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {label && (
        <label style={{ 
          display: "block", 
          marginBottom: 8,
          color: error ? "#dc2626" : "#667eea",
          fontWeight: 600,
          fontSize: "clamp(13px, 3vw, 14px)",
        }}>
          {label} {required && "*"}
        </label>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "10px 16px",
          border: error ? "2px solid #fca5a5" : "2px solid #e0e7ff",
          borderRadius: 8,
          minHeight: 47,
          background: "white",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        {selectedItems.map((item) =>
          chipRenderer(item, () => handleItemRemove(item.id))
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={safeSelectedItemIds.length === 0 ? placeholder : ""}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: "2px 4px",
            fontSize: 15,
            minWidth: 120,
            fontFamily: "inherit",
          }}
        />
      </div>
      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
          {error}
        </div>
      )}
      {showSuggestions && filteredItems.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 200,
            overflowY: "auto",
            zIndex,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemSelect(item.id)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #f0f0f0",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              {getItemName(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

