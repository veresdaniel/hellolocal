// Blocks public SPA routes when under-development mode is on.
// Admin/auth routes and logged-in staff are outside this lock.
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { isUserRole } from "@hellolocal/shared";
import { getUnderConstructionGate } from "../api/public.api";
import { DEFAULT_LANG, isLang, type Lang } from "../app/config";
import {
  clearAccessCookie,
  isAdminOrAuthPath,
  ucFailClosedCopy,
} from "../lib/underConstructionAccess";
import { useAuthStore } from "../stores/authStore";
import { LoadingSpinner } from "./LoadingSpinner";
import { UnderConstructionPage } from "../pages/UnderConstructionPage";

type GateState =
  | { status: "loading" }
  | { status: "open" }
  | { status: "blocked"; copy: { title: string; body: string; buttonLabel: string } };

export function UnderConstructionGate() {
  const location = useLocation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const user = useAuthStore((s) => s.user);
  const staffBypass = Boolean(user?.role && isUserRole(String(user.role)));
  const [state, setState] = useState<GateState>({ status: "loading" });
  const openedOnce = useRef(false);

  useEffect(() => {
    if (
      staffBypass ||
      isAdminOrAuthPath(location.pathname) ||
      location.pathname === "/offline"
    ) {
      setState({ status: "open" });
      openedOnce.current = true;
      return;
    }

    let cancelled = false;
    if (!openedOnce.current) {
      setState({ status: "loading" });
    }

    getUnderConstructionGate({ lang })
      .then((gate) => {
        if (cancelled) return;
        if (!gate.enabled) {
          clearAccessCookie();
          openedOnce.current = true;
          setState({ status: "open" });
          return;
        }
        // Strict lock: no public unlock via cookie/?access=.
        clearAccessCookie();
        openedOnce.current = false;
        setState({ status: "blocked", copy: gate.copy });
      })
      .catch(() => {
        if (cancelled) return;
        if (openedOnce.current) return;
        openedOnce.current = false;
        setState({ status: "blocked", copy: ucFailClosedCopy(lang) });
      });

    return () => {
      cancelled = true;
    };
  }, [lang, location.pathname, location.search, staffBypass]);

  if (state.status === "loading") {
    return (
      <div style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (state.status === "blocked") {
    return <UnderConstructionPage copy={state.copy} />;
  }

  return <Outlet />;
}
