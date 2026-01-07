// src/components/TagAutocomplete.tsx
import { useState, useRef, useEffect } from "react";

interface Tag {
  id: string;
  translations: Array<{ lang: string; name: string }>;
}

interface TagAutocompleteProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
}

export function TagAutocomplete({ tags, selectedTagIds, onChange, placeholder = "Add tags..." }: TagAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const availableTags = tags.filter((tag) => !selectedTagIds.includes(tag.id));

  const filteredTags = availableTags.filter((tag) => {
    const searchTerm = inputValue.toLowerCase();
    return tag.translations.some((t) => t.name.toLowerCase().includes(searchTerm));
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
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

  const handleTagSelect = (tagId: string) => {
    onChange([...selectedTagIds, tagId]);
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleTagRemove = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredTags.length > 0) {
      e.preventDefault();
      handleTagSelect(filteredTags[0].id);
    } else if (e.key === "Backspace" && inputValue === "" && selectedTagIds.length > 0) {
      handleTagRemove(selectedTagIds[selectedTagIds.length - 1]);
    }
  };

  const getTagName = (tag: Tag) => {
    return tag.translations.find((t) => t.lang === "hu")?.name || tag.translations[0]?.name || tag.id;
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label style={{ display: "block", marginBottom: 4 }}>Tags</label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: 8,
          border: "1px solid #ddd",
          borderRadius: 4,
          minHeight: 40,
          background: "white",
          alignItems: "center",
        }}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              background: "#007bff",
              color: "white",
              borderRadius: 4,
              fontSize: 14,
            }}
          >
            {getTagName(tag)}
            <button
              type="button"
              onClick={() => handleTagRemove(tag.id)}
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
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedTagIds.length === 0 ? placeholder : ""}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: 4,
            fontSize: 14,
            minWidth: 120,
          }}
        />
      </div>
      {showSuggestions && filteredTags.length > 0 && (
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
            zIndex: 1000,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              onClick={() => handleTagSelect(tag.id)}
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
              {getTagName(tag)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

