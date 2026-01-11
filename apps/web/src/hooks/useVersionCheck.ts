// src/hooks/useVersionCheck.ts
import { useEffect, useState } from "react";
import { checkVersionChange, handleVersionUpdate, fetchVersionInfo, type VersionInfo } from "../services/version.service";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "react-i18next";

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

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
          const serverVersion = await fetchVersionInfo();
          if (serverVersion) {
            setVersionInfo(serverVersion);
            showToast(
              t("common.newVersionAvailable") || "Új verzió érhető el. Az oldal frissül...",
              "info"
            );
            await handleVersionUpdate(serverVersion.version);
          }
        } else {
          // Update version info even if no change
          const info = await fetchVersionInfo();
          if (info) {
            setVersionInfo(info);
          }
        }
      } catch (error) {
        console.error("[useVersionCheck] Error checking version:", error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check after 2 seconds
    const initialTimer = setTimeout(performCheck, 2000);

    // Periodic checks
    const interval = setInterval(performCheck, VERSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isChecking, showToast, t]);

  return { versionInfo, isChecking };
}
