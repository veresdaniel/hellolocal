/**
 * iOS Safari keeps page zoom after focusing inputs with font-size &lt; 16px.
 * Briefly lock maximum-scale then restore so SPA navigations (e.g. login → admin)
 * land at 1× without permanently disabling pinch-zoom.
 */
export function resetMobileViewportZoom(): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;

  const prev =
    meta.getAttribute("content") || "width=device-width, initial-scale=1.0";
  meta.setAttribute(
    "content",
    "width=device-width, initial-scale=1.0, maximum-scale=1.0"
  );
  window.setTimeout(() => {
    meta.setAttribute("content", prev.includes("initial-scale") ? prev : "width=device-width, initial-scale=1.0");
  }, 100);
}
