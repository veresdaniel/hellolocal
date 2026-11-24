import { useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  id?: string;
  style?: CSSProperties;
};

/** Shared platform-settings accordion with a consistent chevron size. */
export function AdminSettingsCollapsible({
  title,
  children,
  defaultOpen = false,
  icon,
  id,
  style,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      style={{
        marginBottom: 24,
        background: "var(--admin-surface)",
        borderRadius: 12,
        border: "1px solid var(--admin-border-subtle)",
        overflow: "hidden",
        scrollMarginTop: 96,
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: 24,
          background: open ? "#f8f9fa" : "white",
          border: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
          {icon ? <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span> : null}
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "var(--admin-font-display)",
            }}
          >
            {title}
          </h2>
        </div>
        <span
          aria-hidden
          style={{
            fontSize: 20,
            lineHeight: 1,
            color: "var(--admin-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </button>
      {open ? (
        <div style={{ padding: 24, borderTop: "1px solid var(--admin-border-subtle)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
