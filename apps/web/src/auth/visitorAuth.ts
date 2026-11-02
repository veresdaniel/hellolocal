export type VisitorAuthPage = "login" | "register" | "forgot-password" | "reset-password";

export function isVisitorAuthPath(pathname: string) {
  return (
    !pathname.includes("/admin/") &&
    /\/(login|register|forgot-password|reset-password)\/?$/.test(pathname)
  );
}

export function visitorAuthPath(lang: string, page: VisitorAuthPage) {
  return `/${lang}/${page}`;
}

/** Remember the content page so login and registration can return there. */
export function rememberAuthReturn() {
  const next = window.location.pathname + window.location.search;
  if (isVisitorAuthPath(next) || next.includes("/admin/")) return;
  sessionStorage.setItem("authReturnUrl", next);
}
