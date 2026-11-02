// Blocks public SPA routes when under-development mode is on.
// Admin/auth routes, logged-in staff, and valid ?access= / preview session stay open.
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { isUserRole, UC_ACCESS_SESSION_KEY, UC_QUERY_PARAM } from "@hellolocal/shared";
import { getUnderConstructionGate } from "../api/public.api";
import { DEFAULT_LANG, isLang, type Lang } from "../app/config";
import {
  clearAccessCookie,
  isAdminOrAuthPath,
  readAccessQueryToken,
  ucFailClosedCopy,
} from "../lib/underConstructionAccess";
import { useAuthStore } from "../stores/authStore";
import { LoadingSpinner } from "./LoadingSpinner";
import { UnderConstructionPage } from "../pages/UnderConstructionPage";

type GateState =
  | { status: "loading" }
  | { status: "open" }
  | { status: "blocked"; copy: { title: string; body: string; buttonLabel: string } };

function persistPreviewToken(token: string | null) {
  try {
    if (!token) {
      sessionStorage.removeItem(UC_ACCESS_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(UC_ACCESS_SESSION_KEY, token);
  } catch {
    // ignore quota / private mode
  }
}

export function UnderConstructionGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const user = useAuthStore((s) => s.user);
  const staffBypass = Boolean(user?.role && isUserRole(String(user.role)));
  const [state, setState] = useState<GateState>({ status: "loading" });
  const openedOnce = useRef(false);
  const skipNextValidation = useRef(false);

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

    if (skipNextValidation.current) {
      skipNextValidation.current = false;
      return;
    }

    let cancelled = false;
    const queryToken = readAccessQueryToken(location.search);
    if (!openedOnce.current) {
      setState({ status: "loading" });
    }

    getUnderConstructionGate({ lang, accessToken: queryToken })
      .then((gate) => {
        if (cancelled) return;
        if (!gate.enabled) {
          clearAccessCookie();
          persistPreviewToken(null);
          openedOnce.current = true;
          setState({ status: "open" });
          return;
        }
        if (gate.allowed) {
          if (queryToken) persistPreviewToken(queryToken);
          if (queryToken) {
            const params = new URLSearchParams(location.search);
            if (params.has(UC_QUERY_PARAM)) {
              params.delete(UC_QUERY_PARAM);
              const search = params.toString();
              skipNextValidation.current = true;
              navigate(
                {
                  pathname: location.pathname,
                  search: search ? `?${search}` : "",
                  hash: location.hash,
                },
                { replace: true }
              );
            }
          }
          openedOnce.current = true;
          setState({ status: "open" });
          return;
        }
        clearAccessCookie();
        persistPreviewToken(null);
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
  }, [lang, location.pathname, location.search, location.hash, navigate, staffBypass]);

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
