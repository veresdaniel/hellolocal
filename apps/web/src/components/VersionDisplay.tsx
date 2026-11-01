// src/components/VersionDisplay.tsx
import { useEffect, useState } from "react";
import { fetchVersionInfo, type VersionInfo } from "../services/version.service";
import { APP_VERSION } from "../app/config";

export function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    const loadVersion = async () => {
      const info = await fetchVersionInfo();
      if (info) {
        setVersionInfo(info);
      }
    };
    loadVersion();
  }, []);

  const displayVersion = versionInfo?.version || APP_VERSION;
  const buildHash = versionInfo?.buildHash ? ` (${versionInfo.buildHash.substring(0, 7)})` : "";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        fontSize: "10px",
        color: "var(--hl-muted, #665d78)",
        fontFamily: "monospace",
        zIndex: 1000,
        background: "var(--hl-card, #fffdf9)",
        padding: "4px 8px",
        borderRadius: 4,
        border: "1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.12))",
      }}
    >
      v{displayVersion}
      {buildHash}
    </div>
  );
}
