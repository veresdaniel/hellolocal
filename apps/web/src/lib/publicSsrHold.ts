/**
 * Park crawlable SSR HTML beside `#root` before React mounts.
 * The markup stays in the document for bots/SEO, but first-paint CSS keeps it
 * visually hidden so humans only see the finished SPA (no raw-link flash).
 */

const HOLD_ID = "hl-ssr-hold";
const PENDING_CLASS = "hl-spa-pending";

function hasSsrBody(root: HTMLElement): boolean {
  return Boolean(
    root.querySelector(
      ".hl-ssr, .hl-ssr-explore, main.hl-ssr, article.hl-ssr, .hl-ssr-discover, .overview--ssr, main.overview"
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

/** True when platform overview SSR was parked (or is still in `#root`). */
export function isOverviewSsrBoot(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      "#hl-ssr-hold .overview--ssr, #hl-ssr-hold main.overview, #root > .overview--ssr, #root > .overview"
    )
  );
}

/**
 * Wait until async SPA stylesheets (preload→stylesheet) are applied.
 * Overview defers index.css for LCP; revealing before it loads FOUCs the hero.
 */
export function whenPublicStylesReady(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"][href*="/assets/"], link[rel="preload"][as="style"][href*="/assets/"]'
    )
  );
  if (!links.length) return Promise.resolve();
  return Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.rel === "stylesheet" && link.sheet) {
            resolve();
            return;
          }
          const done = () => resolve();
          link.addEventListener("load", done, { once: true });
          link.addEventListener("error", done, { once: true });
          window.setTimeout(done, 2500);
        })
    )
  ).then(() => undefined);
}

/** Drop the parked SSR and show the SPA (idempotent). */
export function revealPublicSpa(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(PENDING_CLASS);
  document.documentElement.classList.remove("hl-booting");
  document.getElementById(HOLD_ID)?.remove();
}

/** Safety net so a stuck pending state cannot leave the SPA invisible. */
export function armPublicSsrRevealFallback(ms = 8000): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isPublicSsrPending()) return () => {};
  const id = window.setTimeout(() => revealPublicSpa(), ms);
  return () => window.clearTimeout(id);
}
