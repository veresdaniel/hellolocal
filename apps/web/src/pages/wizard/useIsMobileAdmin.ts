import { useEffect, useState } from "react";

/** Admin mobile breakpoint — keep in sync with AdminDashboard (< 768) and CSS. */
export const ADMIN_MOBILE_MAX_WIDTH = 767;

/**
 * CSS grid that stacks below ~280px columns — prefer over `isMobile ? 1fr : 1fr 1fr`
 * so zoomed / odd viewports still collapse without relying on JS width.
 */
export const ADMIN_RESPONSIVE_2COL =
  "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" as const;

export function useIsMobileAdmin(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= ADMIN_MOBILE_MAX_WIDTH : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= ADMIN_MOBILE_MAX_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
}
