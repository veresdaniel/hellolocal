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
        color: "#999",
        fontFamily: "monospace",
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.8)",
        padding: "4px 8px",
        borderRadius: 4,
        border: "1px solid #e0e0e0",
      }}
    >
      v{displayVersion}
      {buildHash}
    </div>
  );
}
