import { useEffect, useId, useMemo, useRef, useState } from "react";

export type AdminAutocompleteOption = {
  value: string;
  label: string;
};

type AdminAutocompleteProps = {
  value: string;
  options: AdminAutocompleteOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  id?: string;
};

/**
 * Single-select autocomplete for admin forms.
 * Type to filter, arrows and Enter to choose, click a row, Escape to close.
 */
export function AdminAutocomplete({
  value,
  options,
  onChange,
  placeholder,
  emptyLabel,
  disabled,
  id,
}: AdminAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value) || null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle)
    );
  }, [options, query]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%", maxWidth: 420 }}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : selected?.label || ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && filtered[active]) {
            event.preventDefault();
            choose(filtered[active].value);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: 15,
          boxSizing: "border-box",
          background: disabled ? "#f3f4f6" : "#fff",
        }}
      />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 240,
            overflow: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          }}
        >
          {filtered.length === 0 ? (
            <li style={{ padding: "8px 10px", color: "#6b7280", fontSize: 14 }}>{emptyLabel}</li>
          ) : (
            filtered.map((option, index) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 4,
                    background: index === active ? "#eef2ff" : "transparent",
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
