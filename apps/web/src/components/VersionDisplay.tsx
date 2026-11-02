// src/components/VersionDisplay.tsx
import { useContext, useEffect, useState } from "react";
import { fetchVersionInfo, type VersionInfo } from "../services/version.service";
import { APP_VERSION } from "../app/config";
import { AuthContext } from "../contexts/AuthContext";
import { isSuperadmin } from "../utils/roleHelpers";
import type { UserRole } from "../types/enums";
import { getUnderConstructionSettings } from "../api/admin.api";

/** Superadmin-only admin footer: app version + BETA when under-development gate is on. */
export function VersionDisplay() {
  const auth = useContext(AuthContext);
  const role = (auth?.user?.role ?? null) as UserRole | null;
  const allowed = isSuperadmin(role);

  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [betaOn, setBetaOn] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchVersionInfo().then((info) => {
      if (!cancelled && info) setVersionInfo(info);
    });
    getUnderConstructionSettings()
      .then((status) => {
        if (!cancelled) setBetaOn(Boolean(status.enabled));
      })
      .catch(() => {
        if (!cancelled) setBetaOn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) return null;

  const displayVersion = versionInfo?.version || APP_VERSION;
  const buildHash = versionInfo?.buildHash ? versionInfo.buildHash.substring(0, 7) : "";
  const label = `v${displayVersion}${buildHash ? ` · ${buildHash}` : ""}`;

  return (
    <footer
      className="admin-on-dark-muted"
      style={{
        marginTop: "auto",
        padding: "10px 16px 14px",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 8,
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        maxWidth: 1400,
        marginLeft: "auto",
        marginRight: "auto",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
      }}
      aria-label={`App version ${label}${betaOn ? " BETA" : ""}`}
    >
      {betaOn ? (
        <span
          title="Fejlesztés alatt mód bekapcsolva (?access=… linkkel nyitható)"
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0.6,
            color: "#fff",
            background: "#b45309",
            padding: "2px 6px",
            borderRadius: 4,
            lineHeight: 1.2,
          }}
        >
          BETA
        </span>
      ) : null}
      <span style={{ color: "rgba(242, 244, 251, 0.85)" }}>{label}</span>
    </footer>
  );
}
