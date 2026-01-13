// src/contexts/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<Toast | null>(null);
  const queueRef = useRef<Toast[]>([]);
  const processingRef = useRef(false);

  const processQueue = useCallback(() => {
    if (processingRef.current || currentToast !== null) {
      return;
    }

    if (queueRef.current.length > 0) {
      processingRef.current = true;
      const nextToast = queueRef.current.shift()!;
      setCurrentToast(nextToast);
      
      // Auto remove after 5 seconds for success/info, 7 seconds for error/warning
      const duration = nextToast.type === "error" || nextToast.type === "warning" ? 7000 : 5000;
      setTimeout(() => {
        setCurrentToast(null);
        processingRef.current = false;
        // Process next toast in queue after a short delay
        setTimeout(() => {
          processQueue();
        }, 300);
      }, duration);
    }
  }, [currentToast]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };
    
    if (currentToast === null && !processingRef.current) {
      // No toast currently showing, show immediately
      processingRef.current = true;
      setCurrentToast(newToast);
      const duration = type === "error" || type === "warning" ? 7000 : 5000;
      setTimeout(() => {
        setCurrentToast(null);
        processingRef.current = false;
        // Process queue after a short delay
        setTimeout(() => {
          processQueue();
        }, 300);
      }, duration);
    } else {
      // Toast already showing, add to queue
      queueRef.current.push(newToast);
    }
  }, [currentToast, processQueue]);

  const removeToast = useCallback((id: string) => {
    if (currentToast?.id === id) {
      setCurrentToast(null);
      processingRef.current = false;
      // Process next toast in queue after a short delay
      setTimeout(() => {
        processQueue();
      }, 300);
    } else {
      // Remove from queue if it's there
      queueRef.current = queueRef.current.filter((toast) => toast.id !== id);
    }
  }, [currentToast, processQueue]);

  // Process queue when currentToast becomes null
  useEffect(() => {
    if (currentToast === null && queueRef.current.length > 0) {
      processQueue();
    }
  }, [currentToast, processQueue]);

  // Keep toasts array for backward compatibility, but only show current toast
  const toastsForDisplay = currentToast ? [currentToast] : [];

  return (
    <ToastContext.Provider value={{ toasts: toastsForDisplay, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
