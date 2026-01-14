// src/utils/viewport.ts
// Viewport utility functions and constants

/**
 * Breakpoint constants (in pixels)
 */
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

/**
 * Check if current viewport is mobile
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < BREAKPOINTS.tablet;
}

/**
 * Check if current viewport is tablet
 */
export function isTablet(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= BREAKPOINTS.tablet && window.innerWidth < BREAKPOINTS.desktop;
}

/**
 * Check if current viewport is desktop
 */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= BREAKPOINTS.desktop;
}

/**
 * Get current viewport width
 */
export function getViewportWidth(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth;
}

/**
 * Get current viewport height
 */
export function getViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.innerHeight;
}

/**
 * Check if device has touch capability (pointer: coarse)
 */
export function hasTouchCapability(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
