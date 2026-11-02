import { createContext, useContext, type ReactNode } from "react";

export type AdminPageChromeValue = {
  /** Host for AdminPageHeader title + page actions (same row as Vissza). */
  toolbarMainEl: HTMLElement | null;
  /** True when AdminLayout mounts the shared toolbar (even before the slot ref attaches). */
  hasToolbarSlot: boolean;
};

const defaultValue: AdminPageChromeValue = {
  toolbarMainEl: null,
  hasToolbarSlot: false,
};

export const AdminPageChromeContext =
  createContext<AdminPageChromeValue>(defaultValue);

export function useAdminPageChrome(): AdminPageChromeValue {
  return useContext(AdminPageChromeContext);
}

export function AdminPageChromeProvider({
  value,
  children,
}: {
  value: AdminPageChromeValue;
  children: ReactNode;
}) {
  return (
    <AdminPageChromeContext.Provider value={value}>
      {children}
    </AdminPageChromeContext.Provider>
  );
}
