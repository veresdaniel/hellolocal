// src/contexts/ConfirmationModalContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { ConfirmationModal } from "../components/ConfirmationModal";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "warning";
export type ModalSize = "small" | "medium" | "large";

export interface ConfirmationButton {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export interface ConfirmationModalOptions {
  title?: string;
  message: string | ReactNode;
  buttons: ConfirmationButton[];
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  zIndex?: number;
  headerColor?: string;
  backgroundColor?: string;
}

interface ConfirmationModalContextType {
  showConfirmation: (options: ConfirmationModalOptions) => Promise<void>;
}

const ConfirmationModalContext = createContext<ConfirmationModalContextType | undefined>(undefined);

export function ConfirmationModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationModalOptions | null>(null);
  const [resolver, setResolver] = useState<((value: void) => void) | null>(null);

  const showConfirmation = useCallback((modalOptions: ConfirmationModalOptions): Promise<void> => {
    return new Promise((resolve) => {
      setOptions(modalOptions);
      setIsOpen(true);
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
    if (resolver) {
      resolver();
      setResolver(null);
    }
  }, [resolver]);

  const handleButtonClick = useCallback(
    async (button: ConfirmationButton) => {
      try {
        await button.onClick();
        handleClose();
      } catch (error) {
        // If button onClick throws, don't close modal
        console.error("Error in confirmation button action:", error);
      }
    },
    [handleClose]
  );

  return (
    <ConfirmationModalContext.Provider value={{ showConfirmation }}>
      {children}
      {isOpen && options && (
        <ConfirmationModal
          title={options.title}
          message={options.message}
          buttons={options.buttons}
          size={options.size || "medium"}
          closeOnBackdrop={options.closeOnBackdrop ?? true}
          showCloseButton={options.showCloseButton ?? true}
          zIndex={options.zIndex || 10000}
          headerColor={options.headerColor}
          backgroundColor={options.backgroundColor}
          onClose={handleClose}
          onButtonClick={handleButtonClick}
        />
      )}
    </ConfirmationModalContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationModalContext);
  if (!context) {
    throw new Error("useConfirmation must be used within ConfirmationModalProvider");
  }
  return context;
}
