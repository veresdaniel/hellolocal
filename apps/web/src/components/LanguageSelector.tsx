// src/components/LanguageSelector.tsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { legalKeyFromSegment, legalSegment } from "../app/entityPaths";
import { buildUrl } from "../app/urls";
import { useRouteCtx } from "../app/useRouteCtx";
import { type Lang } from "../app/config";
import { usePublishedLanguages } from "../hooks/useContentLanguages";

/** Keep the open menu off the viewport edge while staying right-aligned to the trigger. */
const VIEWPORT_INSET = 16;

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: currentLang, siteKey } = useRouteCtx();
  const languages = usePublishedLanguages();
  const isAdminPage = location.pathname.includes("/admin");
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeCode = (i18n.language || "hu").split("-")[0];

  const handleLanguageChange = (lang: Lang) => {
    setOpen(false);
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);

    // If we're on a public page (has lang in URL), navigate to new language URL
    if (!isAdminPage && currentLang) {
      const currentPath = location.pathname;
      // Replace the language segment, and the legal page slug that belongs to it.
      const swapped = currentPath.replace(`/${currentLang}`, `/${lang}`);
      const newPath = swapped
        .split("/")
        .map((part) => {
          const key = legalKeyFromSegment(part);
          return key ? legalSegment(lang, key) : part;
        })
        .join("/");
      if (newPath !== currentPath) {
        navigate(newPath + location.search, { replace: true });
      } else {
        // If no lang in path, build new path with language
        const basePath = buildUrl({ lang, siteKey, path: "" });
        navigate(basePath + location.search, { replace: true });
      }
    }

    // Admin pages: replace language in URL
    if (isAdminPage && currentLang) {
      const currentPath = location.pathname;
      const newPath = currentPath.replace(`/${currentLang}/admin`, `/${lang}/admin`);
      if (newPath !== currentPath) {
        navigate(newPath + location.search, { replace: true });
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const place = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const rect = menu.getBoundingClientRect();
      const alignedRight = rect.right + shift;
      const alignedLeft = rect.left + shift;
      let next = Math.max(0, alignedRight - (window.innerWidth - VIEWPORT_INSET));
      const room = Math.max(0, alignedLeft - VIEWPORT_INSET);
      next = Math.min(next, room);
      if (Math.abs(next - shift) > 0.5) setShift(next);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, shift, languages]);

  return (
    <div ref={rootRef} className="hl-lang-switch">
      <button
        type="button"
        className="hl-lang-switch__trigger"
        aria-label={t("common.language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{activeCode.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.5 L6 8 L9.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="hl-lang-switch__menu"
          role="listbox"
          aria-label={t("common.language")}
          style={{ right: shift }}
        >
          {languages.map((code) => {
            const selected = code === activeCode;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                className={
                  selected ? "hl-lang-switch__option is-selected" : "hl-lang-switch__option"
                }
                onClick={() => handleLanguageChange(code)}
              >
                {code.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
      <style>{`
        .hl-lang-switch {
          position: relative;
          display: inline-flex;
          flex: 0 0 auto;
        }
        .hl-lang-switch__trigger {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px 8px 14px;
          font-size: clamp(14px, 3.5vw, 16px);
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: transparent;
          cursor: pointer;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: var(--hl-ink, #1b1730);
          font-weight: 500;
          line-height: 1;
          box-sizing: border-box;
          height: auto;
        }
        .hl-lang-switch__trigger:hover {
          border-color: rgba(0, 0, 0, 0.1);
          background: transparent;
        }
        .hl-lang-switch__trigger:focus {
          outline: none;
        }
        .hl-lang-switch__trigger:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }
        .hl-lang-switch__trigger svg {
          display: block;
          flex-shrink: 0;
          margin-right: 2px;
        }
        .hl-lang-switch__menu {
          position: absolute;
          top: calc(100% + 8px);
          z-index: 40;
          min-width: max(100%, 7.5rem);
          margin: 0;
          padding: 6px;
          box-sizing: border-box;
          background: #fffdf9;
          color: #1b1730;
          border: 1px solid rgba(27, 23, 48, 0.12);
          border-radius: 10px;
          box-shadow: 0 12px 28px rgba(27, 23, 48, 0.18);
        }
        .hl-lang-switch__option {
          display: block;
          width: 100%;
          margin: 0;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #1b1730;
          font: inherit;
          font-weight: 500;
          text-align: start;
          cursor: pointer;
          box-sizing: border-box;
        }
        .hl-lang-switch__option:hover,
        .hl-lang-switch__option:focus-visible {
          background: rgba(27, 23, 48, 0.06);
          outline: none;
        }
        .hl-lang-switch__option.is-selected {
          font-weight: 700;
          background: rgba(27, 23, 48, 0.08);
        }
      `}</style>
    </div>
  );
}
