import { useEffect, useState } from "react";

/** Admin mobile breakpoint — keep in sync with AdminDashboard (< 768). */
export const ADMIN_MOBILE_MAX_WIDTH = 767;

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
