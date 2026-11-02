// Blocks public SPA routes when under-development mode is on and access is missing.
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { getUnderConstructionGate } from "../api/public.api";
import { DEFAULT_LANG, isLang, type Lang } from "../app/config";
import {
  clearAccessCookie,
  isAdminOrAuthPath,
  readAccessQueryToken,
  UC_QUERY_PARAM,
  ucFailClosedCopy,
} from "../lib/underConstructionAccess";
import { LoadingSpinner } from "./LoadingSpinner";
import { UnderConstructionPage } from "../pages/UnderConstructionPage";

type GateState =
  | { status: "loading" }
  | { status: "open" }
  | { status: "blocked"; copy: { title: string; body: string; buttonLabel: string } };

export function UnderConstructionGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang: Lang = isLang(langParam) ? langParam : DEFAULT_LANG;
  const [state, setState] = useState<GateState>({ status: "loading" });
  const openedOnce = useRef(false);

  useEffect(() => {
    if (isAdminOrAuthPath(location.pathname) || location.pathname === "/offline") {
      setState({ status: "open" });
      openedOnce.current = true;
      return;
    }

    let cancelled = false;
    const queryToken = readAccessQueryToken(location.search);
    // First paint only: keep Outlet mounted while revalidating on later navigations.
    if (!openedOnce.current) {
      setState({ status: "loading" });
    }

    getUnderConstructionGate({ lang, accessToken: queryToken })
      .then((gate) => {
        if (cancelled) return;
        if (!gate.enabled) {
          clearAccessCookie();
          openedOnce.current = true;
          setState({ status: "open" });
          return;
        }
        if (gate.allowed) {
          // HttpOnly cookie is set by the API Set-Cookie on this same-origin fetch.
          if (queryToken) {
            const params = new URLSearchParams(location.search);
            if (params.has(UC_QUERY_PARAM)) {
              params.delete(UC_QUERY_PARAM);
              const search = params.toString();
              navigate(
                { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
                { replace: true }
              );
            }
          }
          openedOnce.current = true;
          setState({ status: "open" });
          return;
        }
        clearAccessCookie();
        openedOnce.current = false;
        setState({ status: "blocked", copy: gate.copy });
      })
      .catch(() => {
        // Fail closed when the gate check cannot complete.
        if (!cancelled) {
          openedOnce.current = false;
          setState({ status: "blocked", copy: ucFailClosedCopy(lang) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lang, location.pathname, location.search, location.hash, navigate]);

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
