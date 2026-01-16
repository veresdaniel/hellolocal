/**
 * Utility functions for HTML content manipulation
 */

/**
 * Strips HTML tags from a string and returns plain text
 * @param html - HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";

  // Create a temporary DOM element to parse HTML
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Get text content (automatically strips HTML tags)
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Truncates text to a maximum number of characters
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated (default: "...")
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix: string = "..."): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length).trim() + suffix;
}
