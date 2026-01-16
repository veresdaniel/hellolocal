// src/hooks/useConfirm.ts
import { useCallback } from "react";
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
 * Hook for showing confirmation dialogs
 * Returns a function that shows a confirmation modal and returns a promise
 * that resolves when the user confirms or rejects
 *
 * @example
 * const confirm = useConfirm();
 *
 * // Simple confirmation
 * if (await confirm({ message: "Are you sure?" })) {
 *   // User confirmed
 * }
 *
 * // With custom labels
 * if (await confirm({
 *   message: "Delete this item?",
 *   confirmLabel: "Delete",
 *   cancelLabel: "Cancel",
 *   confirmVariant: "danger"
 * })) {
 *   // User confirmed
 * }
 */
export function useConfirm() {
  const { showConfirmation } = useConfirmation();

  return useCallback(
    async (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;

        showConfirmation({
          title: options.title,
          message: options.message,
          size: options.size,
          closeOnBackdrop: options.closeOnBackdrop,
          showCloseButton: options.showCloseButton,
          headerColor: options.headerColor,
          backgroundColor: options.backgroundColor,
          buttons: [
            {
              label: options.cancelLabel || "Cancel",
              onClick: () => {
                if (!resolved) {
                  resolved = true;
                  resolve(false);
                }
              },
              variant: options.cancelVariant || "secondary",
            },
            {
              label: options.confirmLabel || "Confirm",
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
    [showConfirmation]
  );
}
