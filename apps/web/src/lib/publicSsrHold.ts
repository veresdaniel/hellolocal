/**
 * Keep crawlable SSR HTML visible until the SPA can paint the real public page.
 * createRoot clears `#root`; we park the SSR markup in `#hl-ssr-hold` first.
 */

const HOLD_ID = "hl-ssr-hold";
const PENDING_CLASS = "hl-spa-pending";

function hasSsrBody(root: HTMLElement): boolean {
  return Boolean(
    root.querySelector(
      ".hl-ssr, .hl-ssr-explore, main.hl-ssr, article.hl-ssr, .hl-ssr-discover"
    )
  );
}

/** Move SSR children out of `#root` before React mounts. No-op when no SSR body. */
export function parkPublicSsr(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(HOLD_ID)) return;
  const root = document.getElementById("root");
  if (!root || !hasSsrBody(root)) return;

  const hold = document.createElement("div");
  hold.id = HOLD_ID;
  hold.className = root.className || "hl-public";
  const theme = root.getAttribute("data-theme");
  if (theme) hold.setAttribute("data-theme", theme);
  hold.setAttribute("aria-hidden", "true");
  while (root.firstChild) hold.appendChild(root.firstChild);
  root.parentNode?.insertBefore(hold, root);
  document.documentElement.classList.add(PENDING_CLASS);
}

export function isPublicSsrPending(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains(PENDING_CLASS);
}

/** Drop the parked SSR and show the SPA (idempotent). */
export function revealPublicSpa(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(PENDING_CLASS);
  document.getElementById(HOLD_ID)?.remove();
}

/** Safety net so a stuck pending state cannot leave the SPA invisible. */
export function armPublicSsrRevealFallback(ms = 8000): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isPublicSsrPending()) return () => {};
  const id = window.setTimeout(() => revealPublicSpa(), ms);
  return () => window.clearTimeout(id);
}
