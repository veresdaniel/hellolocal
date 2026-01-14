// src/hooks/useVersionCheck.ts
import { useEffect, useState } from "react";
import { checkVersionChange, handleVersionUpdate, fetchVersionInfo, type VersionInfo } from "../services/version.service";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "react-i18next";

const VERSION_CHECK_INTERVAL = 15 * 60 * 1000; // Check every 15 minutes (reduced frequency)

export function useVersionCheck() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // Initial version check
    const performCheck = async () => {
      if (isChecking) return;
      setIsChecking(true);

      try {
        const hasChanged = await checkVersionChange();
        if (hasChanged) {
          // checkVersionChange already fetched the version, get it from cache
          const serverVersion = await fetchVersionInfo(false);
          if (serverVersion) {
            setVersionInfo(serverVersion);
            showToast(
              t("common.newVersionAvailable"),
              "info"
            );
            await handleVersionUpdate(serverVersion.version);
          }
        }
        // Don't fetch again if no change - checkVersionChange already fetched and cached it
      } catch (error) {
        console.error("[useVersionCheck] Error checking version:", error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check after 5 seconds (increased to avoid immediate request on page load)
    const initialTimer = setTimeout(performCheck, 5000);

    // Periodic checks
    const interval = setInterval(performCheck, VERSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isChecking, showToast, t]);

  return { versionInfo, isChecking };
}
