import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

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
  /** Extra first row that clears the value (e.g. “All towns”). */
  clearOptionLabel?: string;
  disabled?: boolean;
  id?: string;
  label?: ReactNode;
  required?: boolean;
  error?: string;
  /** Hint under the field. */
  hint?: ReactNode;
  className?: string;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  /** Default full width of the parent. */
  fullWidth?: boolean;
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "var(--admin-primary)",
  fontWeight: 600,
  fontSize: "clamp(14px, 3.5vw, 16px)",
  fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/**
 * Single-select autocomplete for admin forms and filters.
 * Type to filter, arrows + Enter to choose, Escape to close.
 */
export function AdminAutocomplete({
  value,
  options,
  onChange,
  placeholder,
  emptyLabel = "—",
  clearOptionLabel,
  disabled,
  id,
  label,
  required = false,
  error,
  hint,
  className,
  style,
  inputStyle,
  fullWidth = true,
}: AdminAutocompleteProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value) || null;

  const rows = useMemo(() => {
    const base = clearOptionLabel
      ? [{ value: "", label: clearOptionLabel }, ...options]
      : options;
    const needle = query.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle)
    );
  }, [options, query, clearOptionLabel]);

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

  const displayValue = open ? query : selected?.label || "";

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        width: fullWidth ? "100%" : undefined,
        maxWidth: fullWidth ? undefined : 420,
        ...style,
      }}
    >
      {label ? (
        <label htmlFor={id} style={labelStyle}>
          {label}
          {required ? " *" : null}
        </label>
      ) : null}
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={placeholder || clearOptionLabel}
        value={displayValue}
        onFocus={() => {
          if (disabled) return;
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
            setActive((index) => Math.min(index + 1, Math.max(rows.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && rows[active]) {
            event.preventDefault();
            choose(rows[active].value);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          } else if (event.key === "Backspace" && !query && value && clearOptionLabel) {
            choose("");
          }
        }}
        style={{
          width: "100%",
          padding: "12px 16px",
          fontSize: 15,
          border: error
            ? "2px solid #dc2626"
            : "2px solid var(--admin-primary-border, #c7d2fe)",
          borderRadius: 8,
          outline: "none",
          boxSizing: "border-box",
          background: disabled ? "#f3f4f6" : "var(--admin-surface, #fff)",
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          cursor: disabled ? "not-allowed" : "text",
          ...inputStyle,
        }}
      />
      {error ? (
        <div style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</div>
      ) : null}
      {hint && !error ? (
        <p className="admin-section-card__help" style={{ marginTop: 6 }}>
          {hint}
        </p>
      ) : null}
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 900,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 260,
            overflow: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "#fff",
            border: "1px solid var(--admin-primary-border, #d1d5db)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
          }}
        >
          {rows.length === 0 ? (
            <li style={{ padding: "8px 10px", color: "#6b7280", fontSize: 14 }}>{emptyLabel}</li>
          ) : (
            rows.map((option, index) => (
              <li key={`${option.value || "__clear"}-${index}`} role="option" aria-selected={option.value === value}>
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
                    background:
                      index === active || option.value === value
                        ? "rgba(37, 99, 235, 0.08)"
                        : "transparent",
                    color: option.value === value ? "var(--admin-primary, #2563eb)" : "inherit",
                    fontWeight: option.value === value ? 600 : 400,
                    cursor: "pointer",
                    fontSize: 15,
                    fontFamily:
                      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  }}
                >
                  {option.label}
                  {option.value === value ? " ✓" : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
