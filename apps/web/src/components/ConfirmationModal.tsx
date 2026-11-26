import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ConfirmationButton, ModalSize } from "../contexts/ConfirmationModalContext";
import "../styles/admin-modal.css";

interface ConfirmationModalProps {
  title?: string;
  message: string | ReactNode;
  buttons: ConfirmationButton[];
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  zIndex?: number;
  /** @deprecated Ignored — admin modals use a unified light chrome. */
  headerColor?: string;
  backgroundColor?: string;
  onClose: () => void;
  onButtonClick: (button: ConfirmationButton) => void | Promise<void>;
}

export function ConfirmationModal({
  title,
  message,
  buttons,
  size = "medium",
  closeOnBackdrop = true,
  showCloseButton = true,
  zIndex = 10000,
  backgroundColor,
  onClose,
  onButtonClick,
}: ConfirmationModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = "confirmation-modal-title";
  const isDanger = buttons.some((button) => button.variant === "danger");
  const resolvedTitle =
    title?.trim() ||
    (isDanger ? t("admin.confirmations.deleteTitle") : t("admin.confirmations.title"));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTarget =
      modalRef.current?.querySelector<HTMLElement>(
        ".admin-modal__btn--primary, .admin-modal__btn--danger, .admin-modal__btn"
      ) || closeBtnRef.current;
    focusTarget?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnBackdrop) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, closeOnBackdrop]);

  const sizeClass =
    size === "small" ? "admin-modal--sm" : size === "large" ? "admin-modal--lg" : "";

  return (
    <div
      className="admin-modal-backdrop"
      style={{ zIndex }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`admin-modal ${sizeClass}${isDanger ? " admin-modal--danger" : ""}`.trim()}
        style={backgroundColor ? { background: backgroundColor } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal__header">
          <span className="admin-modal__accent" aria-hidden="true" />
          <div className="admin-modal__header-main">
            <h2 id={titleId} className="admin-modal__title">
              {resolvedTitle}
            </h2>
          </div>
          {showCloseButton ? (
            <button
              ref={closeBtnRef}
              type="button"
              className="admin-modal__close"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="admin-modal__body">
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>

        <div className="admin-modal__footer">
          {buttons.map((button, index) => {
            const variant = button.variant || "primary";
            return (
              <button
                key={`${button.label}-${index}`}
                type="button"
                className={`admin-modal__btn admin-modal__btn--${variant}`}
                disabled={button.isLoading}
                onClick={() => void onButtonClick(button)}
              >
                {button.isLoading ? "…" : button.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
