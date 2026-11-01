import { useTranslation } from "react-i18next";
import "../styles/empty-results.css";

type EmptyResultsProps = {
  /** Primary line — defaults to public.noResults ("Nincs találat") */
  title?: string;
  /** Optional supporting hint (search vs empty catalog) */
  description?: string;
  className?: string;
};

/**
 * In-list empty state for search/filter/list results.
 * Distinct from NotFoundPage (404) and ErrorPage (500) — never shows a status code.
 */
export function EmptyResults({ title, description, className }: EmptyResultsProps) {
  const { t } = useTranslation();
  const heading = title ?? t("public.noResults");

  return (
    <div
      className={`empty-results${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <p className="empty-results__title">{heading}</p>
      {description ? <p className="empty-results__description">{description}</p> : null}
    </div>
  );
}
