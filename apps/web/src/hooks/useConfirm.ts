import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  useConfirmation,
  type ButtonVariant,
  type ModalSize,
} from "../contexts/ConfirmationModalContext";

import type { ReactNode } from "react";

interface ConfirmOptions {
  title?: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  cancelVariant?: ButtonVariant;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  headerColor?: string;
  backgroundColor?: string;
}

/**
 * Promise-based confirm dialog with shared admin modal chrome.
 */
export function useConfirm() {
  const { showConfirmation } = useConfirmation();
  const { t } = useTranslation();

  return useCallback(
    async (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;
        const danger = options.confirmVariant === "danger";

        showConfirmation({
          title:
            options.title?.trim() ||
            (danger ? t("admin.confirmations.deleteTitle") : t("admin.confirmations.title")),
          message: options.message,
          size: options.size,
          closeOnBackdrop: options.closeOnBackdrop,
          showCloseButton: options.showCloseButton,
          backgroundColor: options.backgroundColor,
          buttons: [
            {
              label: options.cancelLabel || t("common.cancel"),
              onClick: () => {
                if (!resolved) {
                  resolved = true;
                  resolve(false);
                }
              },
              variant: options.cancelVariant || "secondary",
            },
            {
              label:
                options.confirmLabel ||
                (danger ? t("common.delete") : t("common.confirm")),
              onClick: () => {
                if (!resolved) {
                  resolved = true;
                  resolve(true);
                }
              },
              variant: options.confirmVariant || "primary",
            },
          ],
        });
      });
    },
    [showConfirmation, t]
  );
}
