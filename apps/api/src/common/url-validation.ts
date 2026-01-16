/**
 * Validates if a string is a valid HTTP/HTTPS URL
 * Prevents javascript: and data: protocol injection
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === "") {
    return false;
  }

  try {
    const parsedUrl = new URL(url);

    // Only allow http and https protocols
    const allowedProtocols = ["http:", "https:"];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return false;
    }

    // Basic validation - URL must be well-formed
    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitizes an image URL by validating it and returning null if invalid
 */
export function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") {
    return null;
  }

  if (!isValidImageUrl(url)) {
    return null;
  }

  return url.trim();
}
