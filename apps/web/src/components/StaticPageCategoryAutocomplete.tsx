// src/components/StaticPageCategoryAutocomplete.tsx
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

type CategoryOption = "blog" | "tudastar" | "infok";

interface StaticPageCategoryAutocompleteProps {
  value: CategoryOption;
  onChange: (category: CategoryOption) => void;
  placeholder?: string;
}

export function StaticPageCategoryAutocomplete({ value, onChange, placeholder = "Select category..." }: StaticPageCategoryAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const categories: { value: CategoryOption; label: string }[] = [
    { value: "blog", label: t("admin.categoryBlog") },
    { value: "tudastar", label: t("admin.categoryTudastar") },
    { value: "infok", label: t("admin.categoryInfok") },
  ];

  const selectedCategory = categories.find((cat) => cat.value === value);

  const filteredCategories = categories.filter((cat) => {
    const searchTerm = inputValue.toLowerCase();
    return cat.label.toLowerCase().includes(searchTerm) && cat.value !== value;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setInputValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleCategorySelect = (category: CategoryOption) => {
    onChange(category);
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredCategories.length > 0) {
      e.preventDefault();
      handleCategorySelect(filteredCategories[0].value);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInputValue("");
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label style={{ display: "block", marginBottom: 4, fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{t("admin.category")} *</label>
      <div
        style={{
          position: "relative",
          border: "1px solid #ddd",
          borderRadius: 4,
          background: "white",
        }}
      >
        {!showSuggestions && selectedCategory && (
          <div
            onClick={() => {
              setShowSuggestions(true);
              inputRef.current?.focus();
            }}
            style={{
              padding: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{selectedCategory.label}</span>
            <span style={{ color: "#999" }}>▼</span>
          </div>
        )}
        {showSuggestions && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus
            style={{
              width: "100%",
              padding: 8,
              fontSize: 16,
              border: "none",
              outline: "none",
              borderRadius: 4,
            }}
          />
        )}
      </div>
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
            zIndex: 800,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* Show selected category first if not searching */}
          {!inputValue && selectedCategory && (
            <div
              key={selectedCategory.value}
              style={{
                padding: "8px 12px",
                cursor: "default",
                borderBottom: "1px solid #f0f0f0",
                background: "#e7f3ff",
                color: "#007bff",
                fontWeight: 500,
              }}
            >
              {selectedCategory.label} ✓
            </div>
          )}
          {filteredCategories.map((cat) => (
            <div
              key={cat.value}
              onClick={() => handleCategorySelect(cat.value)}
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
              {cat.label}
            </div>
          ))}
          {inputValue && filteredCategories.length === 0 && (
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

