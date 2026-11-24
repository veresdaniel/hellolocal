import { useId, useState, type ReactNode } from "react";

type AdminCollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  /** Open on first paint; user can still toggle. */
  defaultOpen?: boolean;
  /** Optional short hint under the title in the summary. */
  hint?: string;
  className?: string;
};

/** Shared admin form accordion (SEO, contact, domain, …). */
export function AdminCollapsibleSection({
  title,
  children,
  defaultOpen = false,
  hint,
  className,
}: AdminCollapsibleSectionProps) {
  const panelId = useId();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={["admin-collapsible", className].filter(Boolean).join(" ")}
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary
        className="admin-collapsible__summary"
        aria-controls={panelId}
        aria-expanded={open}
      >
        <span className="admin-collapsible__chevron" aria-hidden />
        <span className="admin-collapsible__title-wrap">
          <span className="admin-collapsible__title">{title}</span>
          {hint ? <span className="admin-collapsible__hint">{hint}</span> : null}
        </span>
      </summary>
      <div id={panelId} className="admin-collapsible__body">
        {children}
      </div>
    </details>
  );
}
