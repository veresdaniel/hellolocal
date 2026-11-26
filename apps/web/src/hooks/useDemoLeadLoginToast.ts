import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getQuoteRequests } from "../api/admin.api";
import { useToast } from "../contexts/ToastContext";

const SESSION_KEY = "hellolocal.demoLeadToastShown";

/**
 * Once per browser session, toast superadmins when uncontacted demo leads exist.
 */
export function useDemoLeadLoginToast(enabled: boolean) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      /* private mode etc. */
    }

    let cancelled = false;
    void (async () => {
      try {
        const data = await getQuoteRequests({
          plan: "demo",
          contacted: false,
          take: 1,
          skip: 0,
        });
        if (cancelled || data.total < 1) return;
        showToast(
          t("admin.quoteRequests.newDemoToast", { count: data.total }),
          "info"
        );
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
      } catch {
        /* list may 403 for non-superadmin; ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, showToast, t]);
}
