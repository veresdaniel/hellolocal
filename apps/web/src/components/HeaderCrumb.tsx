import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ViewCrumb } from "../app/viewTitle";

/** Parent steps go up. The last step is the current page and does not navigate. */
export function HeaderCrumb({ crumbs }: { crumbs: ViewCrumb[] }) {
  const { t } = useTranslation();
  return (
    <nav className="hl-crumb" aria-label={t("public.breadcrumb")}>
      <ol>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${index}-${crumb.label}`}>
              {index > 0 && (
                <svg className="hl-crumb__sep" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M4.2 2.2 8 6 4.2 9.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {last || !crumb.to ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <Link to={crumb.to}>{crumb.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
