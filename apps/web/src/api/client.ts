import { isTokenExpired } from "../utils/tokenUtils";
import { refreshToken } from "./auth.api";
import { DEFAULT_LANG, APP_LANGS, DEFAULT_BACKEND_URL, type Lang } from "../app/config";

/**
 * Get API base URL from environment variable or use relative path for development
 * In production, set VITE_API_URL environment variable to the backend URL
 * Example: VITE_API_URL=https://hellolocal.onrender.com
 * 
 * IMPORTANT: On Render.com, this must be set as an environment variable
 * in the frontend service settings BEFORE building.
 */
function getApiBaseUrl(): string {
  // In production, use environment variable if set
  const apiUrl = import.meta.env.VITE_API_URL;
  
  
  if (apiUrl) {
    // Remove trailing slash if present
    // Also remove /api suffix if present (apiPost will add it)
    return apiUrl.replace(/\/$/, "").replace(/\/api$/, "");
  }
  
  // In development, use relative path (Vite proxy will handle it)
  // In production without VITE_API_URL, this will cause issues
  return "";
}

/**
 * Records user interaction (API call)
 */
function recordApiInteraction() {
  window.dispatchEvent(new CustomEvent("api:interaction"));
}

/**
 * Helper function to extract language code from URL or localStorage
 */
function getLanguageCode(): Lang {
  const currentPath = window.location.pathname;
  // Try to extract lang from URL (e.g., /hu/admin or /en/admin)
  const pathMatch = currentPath.match(/^\/(hu|en|de)(\/|$)/);
  if (pathMatch && APP_LANGS.includes(pathMatch[1] as Lang)) {
    return pathMatch[1] as Lang;
  }
  // Fallback to localStorage i18nextLng
  const storedLang = localStorage.getItem("i18nextLng");
  if (storedLang && APP_LANGS.includes(storedLang as Lang)) {
    return storedLang as Lang;
  }
  // Final fallback to default
  return DEFAULT_LANG;
}

/**
 * Redirects to login page when session expires
 */
function redirectToLogin() {
  const currentPath = window.location.pathname;
  const lang = getLanguageCode();
  
  // Only redirect if we're in admin area
  const isInAdminArea = currentPath.includes('/admin') && !currentPath.includes('/admin/login');
  
  if (!isInAdminArea) {
    // Not in admin area, don't redirect to login
    return;
  }
  
  if (currentPath.startsWith(`/${lang}/admin/login`)) {
    // Already on login page
    return;
  }
  
  // Clear tokens and user data
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  
  // Set session expired flag
  sessionStorage.setItem("sessionExpired", "true");
  
  // Redirect to login page
  window.location.href = `/${lang}/admin/login`;
}

/**
 * Checks if session might be expired (no tokens or both tokens expired)
 * Returns true if session is likely expired
 */
function isSessionLikelyExpired(): boolean {
  const accessToken = localStorage.getItem("accessToken");
  const refreshTokenValue = localStorage.getItem("refreshToken");
  
  // If no tokens, session is expired
  if (!accessToken && !refreshTokenValue) {
    return true;
  }
  
  // If both tokens are expired, session is expired
  if (accessToken && isTokenExpired(accessToken) && 
      (!refreshTokenValue || isTokenExpired(refreshTokenValue))) {
    return true;
  }
  
  return false;
}

/**
 * Checks if we're in admin area and session is expired, then redirects to login
 * Returns true if redirect happened, false otherwise
 */
function checkAndRedirectIfSessionExpired(): boolean {
  const currentPath = window.location.pathname;
  const isInAdminArea = currentPath.includes('/admin') && !currentPath.includes('/admin/login');
  
  if (isInAdminArea && isSessionLikelyExpired()) {
    redirectToLogin();
    return true;
  }
  
  return false;
}

/**
 * Refreshes the access token if it's expired
 */
async function ensureValidToken(): Promise<void> {
  const accessToken = localStorage.getItem("accessToken");
  const refreshTokenValue = localStorage.getItem("refreshToken");

  if (!accessToken || !refreshTokenValue) {
    throw new Error("No tokens available");
  }

  if (isTokenExpired(accessToken)) {
    try {
      const data = await refreshToken({ refreshToken: refreshTokenValue });
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      recordApiInteraction(); // Record interaction after successful refresh
    } catch {
      // Refresh failed, redirect to login immediately
      redirectToLogin();
      throw new Error("Session expired. Please log in again.");
    }
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  await ensureValidToken();
  recordApiInteraction(); // Record API interaction
  const token = localStorage.getItem("accessToken");
  const apiBaseUrl = getApiBaseUrl();
  
  // Add cache-busting headers and options for GET requests
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api${path}`, {
      method: "GET",
      cache: "no-store", // Prevent browser cache
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    // Handle network errors (server not running, CORS, etc.)
    const isDev = import.meta.env.DEV;
    const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
    const errorMessage = isDev
      ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
      : "Failed to connect to the server. Please check your internet connection or try again later.";
    throw new Error(errorMessage);
  }

  if (!res.ok) {
    // If 401 (unauthorized), try to refresh token once more, then redirect to login if still fails
    if (res.status === 401) {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (refreshTokenValue) {
        try {
          const data = await refreshToken({ refreshToken: refreshTokenValue });
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          // Retry the original request with cache-busting
          let retryRes: Response;
          try {
            retryRes = await fetch(`${apiBaseUrl}/api${path}`, {
              method: "GET",
              cache: "no-store", // Prevent browser cache
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${data.accessToken}`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
              },
            });
          } catch (err) {
            // Handle network errors during retry
            const isDev = import.meta.env.DEV;
            const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
            const errorMessage = isDev
              ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
              : "Failed to connect to the server. Please check your internet connection or try again later.";
            throw new Error(errorMessage);
          }
          if (!retryRes.ok) {
            // If still 401 after refresh, redirect to login
            if (retryRes.status === 401) {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");
              redirectToLogin();
              throw new Error("Session expired. Please log in again.");
            }
            const text = await retryRes.text().catch(() => "");
            throw new Error(text || `Request failed: ${retryRes.status}`);
          }
          return (await retryRes.json()) as T;
        } catch (err) {
          // Refresh failed, redirect to login immediately
          redirectToLogin();
          if (err instanceof Error && err.message.includes("Session expired")) {
            throw err;
          }
          throw new Error("Session expired. Please log in again.");
        }
      } else {
        // No refresh token, redirect to login immediately
        redirectToLogin();
        throw new Error("Session expired. Please log in again.");
      }
    }
    let errorMessage = `Request failed: ${res.status}`;
    const contentType = res.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      try {
        const json = await res.json();
        if (json && json.message) {
          errorMessage = json.message;
        } else if (json && typeof json === "string") {
          errorMessage = json;
        }
      } catch {
        // If JSON parsing fails, try text
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch {
          errorMessage = res.statusText || `Request failed: ${res.status}`;
        }
      }
    } else {
      try {
        const text = await res.text();
        if (text) errorMessage = text;
      } catch {
        errorMessage = res.statusText || `Request failed: ${res.status}`;
      }
    }
    
    // Only redirect to login for 401 errors, not for 500 or other errors
    // 500 errors should be displayed to the user, not cause a redirect
    
    throw new Error(errorMessage);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    // If response is empty or not JSON, return empty object or throw
    if (res.status === 204 || res.status === 201) {
      return {} as T;
    }
    throw new Error("Invalid JSON response from server");
  }
}

/**
 * Public API GET function that doesn't require authentication
 * Use this for public endpoints like places, legal pages, etc.
 */
export async function apiGetPublic<T>(path: string): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const fullUrl = `${apiBaseUrl}/api${path}`;
  let res: Response;
  try {
    res = await fetch(fullUrl, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch (err: any) {
    // Handle network errors (server not running, CORS, etc.)
    console.error(`[apiGetPublic] Network error:`, {
      path,
      fullUrl,
      error: err.message,
      apiBaseUrl: apiBaseUrl || 'empty',
      viteApiUrl: import.meta.env.VITE_API_URL || 'not set',
    });
    
    const isDev = import.meta.env.DEV;
    const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
    const errorMessage = isDev
      ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
      : "Failed to connect to the server. Please check your internet connection or try again later.";
    throw new Error(errorMessage);
  }

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const errorData = (await res.json()) as { message?: string; error?: string };
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      const text = await res.text().catch(() => "");
      errorMessage = text || errorMessage;
    }
    
    console.error(`[apiGetPublic] Request failed:`, {
      path,
      fullUrl,
      status: res.status,
      statusText: res.statusText,
      errorMessage,
      headers: Object.fromEntries(res.headers.entries()),
    });
    
    const error = new Error(errorMessage) as Error & { status: number; response: Response };
    error.status = res.status;
    error.response = res;
    throw error;
  }

  return (await res.json()) as T;
}

/**
 * Public API POST function that doesn't require authentication
 * Use this for login, register, forgot-password, etc.
 */
export async function apiPostPublic<T>(path: string, data: unknown): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    // Handle network errors (server not running, CORS, etc.)
    const isDev = import.meta.env.DEV;
    const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
    const errorMessage = isDev
      ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
      : "Failed to connect to the server. Please check your internet connection or try again later.";
    throw new Error(errorMessage);
  }

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const errorData = await res.json() as { message?: string; error?: string };
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      const text = await res.text().catch(() => "");
      errorMessage = text || errorMessage;
    }
    const error = new Error(errorMessage) as Error & { status: number; response: Response };
    error.status = res.status;
    error.response = res;
    throw error;
  }

  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  await ensureValidToken();
  recordApiInteraction(); // Record API interaction
  const token = localStorage.getItem("accessToken");
  const apiBaseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    // Handle network errors (server not running, CORS, etc.)
    const isDev = import.meta.env.DEV;
    const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
    const errorMessage = isDev
      ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
      : "Failed to connect to the server. Please check your internet connection or try again later.";
    throw new Error(errorMessage);
  }

  if (!res.ok) {
    // If 401, try to refresh token once more
    if (res.status === 401) {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (refreshTokenValue) {
        try {
          const refreshData = await refreshToken({ refreshToken: refreshTokenValue });
          localStorage.setItem("accessToken", refreshData.accessToken);
          localStorage.setItem("refreshToken", refreshData.refreshToken);
          // Retry the original request
          let retryRes: Response;
          try {
            retryRes = await fetch(`${apiBaseUrl}/api${path}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${refreshData.accessToken}`,
              },
              body: JSON.stringify(data),
            });
          } catch (err) {
            // Handle network errors during retry
            const isDev = import.meta.env.DEV;
            const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
            const errorMessage = isDev
              ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
              : "Failed to connect to the server. Please check your internet connection or try again later.";
            throw new Error(errorMessage);
          }
          if (!retryRes.ok) {
            // If still 401 after refresh, redirect to login
            if (retryRes.status === 401) {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");
              redirectToLogin();
              throw new Error("Session expired. Please log in again.");
            }
            const text = await retryRes.text().catch(() => "");
            throw new Error(text || `Request failed: ${retryRes.status}`);
          }
          return (await retryRes.json()) as T;
        } catch {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          redirectToLogin();
          throw new Error("Session expired. Please log in again.");
        }
      } else {
        // No refresh token, redirect to login immediately
        redirectToLogin();
        throw new Error("Session expired. Please log in again.");
      }
    }
    let errorMessage = `Request failed: ${res.status}`;
    let errorResponse: { message?: string } | null = null;
    const contentType = res.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      try {
        const json = await res.json();
        errorResponse = json;
        if (json && json.message) {
          errorMessage = json.message;
        } else if (json && typeof json === "string") {
          errorMessage = json;
        }
      } catch {
        // If JSON parsing fails, try text
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch {
          errorMessage = res.statusText || `Request failed: ${res.status}`;
        }
      }
    } else {
      try {
        const text = await res.text();
        if (text) errorMessage = text;
      } catch {
        errorMessage = res.statusText || `Request failed: ${res.status}`;
      }
    }
    
    // For 500 errors in admin area, check if session might be expired
    // Sometimes backend returns 500 instead of 401 for session issues
    if (res.status === 500) {
      if (checkAndRedirectIfSessionExpired()) {
        throw new Error("Session expired. Please log in again.");
      }
    }
    
    // Only redirect to login for 401 errors, not for 500 or other errors
    // 500 errors should be displayed to the user, not cause a redirect
    
    const error = new Error(errorMessage) as Error & { status?: number; response?: { message?: string } | null };
    error.status = res.status;
    error.response = errorResponse;
    throw error;
  }

  return (await res.json()) as T;
}

export async function apiPut<T>(path: string, data: unknown): Promise<T> {
  await ensureValidToken();
  recordApiInteraction(); // Record API interaction
  const token = localStorage.getItem("accessToken");
  const apiBaseUrl = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    // Handle network errors (server not running, CORS, etc.)
    const isDev = import.meta.env.DEV;
    const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
    const errorMessage = isDev
      ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
      : "Failed to connect to the server. Please check your internet connection or try again later.";
    throw new Error(errorMessage);
  }

  if (!res.ok) {
    // If 401 (unauthorized), try to refresh token once more
    if (res.status === 401) {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (refreshTokenValue) {
        try {
          const refreshData = await refreshToken({ refreshToken: refreshTokenValue });
          localStorage.setItem("accessToken", refreshData.accessToken);
          localStorage.setItem("refreshToken", refreshData.refreshToken);
          // Retry the original request
          let retryRes: Response;
          try {
            retryRes = await fetch(`${apiBaseUrl}/api${path}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${refreshData.accessToken}`,
              },
              body: JSON.stringify(data),
            });
          } catch (err) {
            // Handle network errors during retry
            const isDev = import.meta.env.DEV;
            const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
            const errorMessage = isDev
              ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
              : "Failed to connect to the server. Please check your internet connection or try again later.";
            throw new Error(errorMessage);
          }
          if (!retryRes.ok) {
            // If still 401 after refresh, redirect to login
            if (retryRes.status === 401) {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");
              redirectToLogin();
              throw new Error("Session expired. Please log in again.");
            }
            const text = await retryRes.text().catch(() => "");
            throw new Error(text || `Request failed: ${retryRes.status}`);
          }
          return (await retryRes.json()) as T;
        } catch {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          redirectToLogin();
          throw new Error("Session expired. Please log in again.");
        }
      } else {
        // No refresh token, redirect to login immediately
        redirectToLogin();
        throw new Error("Session expired. Please log in again.");
      }
    }
    
    // For 500 errors in admin area, check if session might be expired
    // Sometimes backend returns 500 instead of 401 for session issues
    if (res.status === 500) {
      if (checkAndRedirectIfSessionExpired()) {
        throw new Error("Session expired. Please log in again.");
      }
    }
    
    let errorMessage = `Request failed: ${res.status}`;
    
    // Handle 404 specifically - endpoint not found
    if (res.status === 404) {
      errorMessage = `Endpoint not found (404). Path: ${path}. Check if backend is running on port 3002 and route /api${path} exists.`;
    } else {
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const json = await res.json();
          if (json && json.message) {
            errorMessage = json.message;
          } else if (json && typeof json === "string") {
            errorMessage = json;
          }
        } catch {
          // If JSON parsing fails, try text
          try {
            const text = await res.text();
            if (text) errorMessage = text;
          } catch {
            errorMessage = res.statusText || `Request failed: ${res.status}`;
          }
        }
      } else {
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch {
          errorMessage = res.statusText || `Request failed: ${res.status}`;
        }
      }
    }
    
    // Only redirect to login for 401 errors, not for 500 or other errors
    // 500 errors should be displayed to the user, not cause a redirect
    
    throw new Error(errorMessage);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    // If response is empty or not JSON, return empty object or throw
    if (res.status === 204 || res.status === 201) {
      return {} as T;
    }
    throw new Error("Invalid JSON response from server");
  }
}

export async function apiDelete<T>(path: string): Promise<T> {
  await ensureValidToken();
  recordApiInteraction(); // Record API interaction
  const token = localStorage.getItem("accessToken");
  const apiBaseUrl = getApiBaseUrl();
  
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}/api${path}`, {
      method: "DELETE",
      cache: "no-store", // Prevent browser cache
      headers: {
        Accept: "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        // Add cache-busting headers
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err) {
    // Handle network errors (server not running, CORS, etc.)
    const isDev = import.meta.env.DEV;
    const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
    const errorMessage = isDev
      ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
      : "Failed to connect to the server. Please check your internet connection or try again later.";
    throw new Error(errorMessage);
  }

  if (!res.ok) {
    // If 401 (unauthorized), try to refresh token once more
    if (res.status === 401) {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (refreshTokenValue) {
        try {
          const refreshData = await refreshToken({ refreshToken: refreshTokenValue });
          localStorage.setItem("accessToken", refreshData.accessToken);
          localStorage.setItem("refreshToken", refreshData.refreshToken);
          // Retry the original request with cache-busting
          let retryRes: Response;
          try {
            retryRes = await fetch(`${apiBaseUrl}/api${path}`, {
              method: "DELETE",
              cache: "no-store", // Prevent browser cache
              headers: {
                Accept: "application/json",
                Authorization: `Bearer ${refreshData.accessToken}`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
              },
            });
          } catch (err) {
            // Handle network errors during retry
            const isDev = import.meta.env.DEV;
            const backendUrl = apiBaseUrl || DEFAULT_BACKEND_URL;
            const errorMessage = isDev
              ? `Failed to connect to backend API at ${backendUrl}. Make sure the backend server is running.`
              : "Failed to connect to the server. Please check your internet connection or try again later.";
            throw new Error(errorMessage);
          }
          if (!retryRes.ok) {
            // If still 401 after refresh, redirect to login
            if (retryRes.status === 401) {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("user");
              redirectToLogin();
              throw new Error("Session expired. Please log in again.");
            }
            const text = await retryRes.text().catch(() => "");
            throw new Error(text || `Request failed: ${retryRes.status}`);
          }
          const data = await retryRes.json() as T;
          return data;
        } catch {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          redirectToLogin();
          throw new Error("Session expired. Please log in again.");
        }
      } else {
        // No refresh token, redirect to login immediately
        redirectToLogin();
        throw new Error("Session expired. Please log in again.");
      }
    }
    let errorMessage = `Request failed: ${res.status}`;
    const contentType = res.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      try {
        const json = await res.json();
        if (json && json.message) {
          errorMessage = json.message;
        } else if (json && typeof json === "string") {
          errorMessage = json;
        }
      } catch {
        // If JSON parsing fails, try text
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch {
          errorMessage = res.statusText || `Request failed: ${res.status}`;
        }
      }
    } else {
      try {
        const text = await res.text();
        if (text) errorMessage = text;
      } catch {
        errorMessage = res.statusText || `Request failed: ${res.status}`;
      }
    }
    
    // For 500 errors in admin area, check if session might be expired
    // Sometimes backend returns 500 instead of 401 for session issues
    if (res.status === 500) {
      if (checkAndRedirectIfSessionExpired()) {
        throw new Error("Session expired. Please log in again.");
      }
    }
    
    // Only redirect to login for 401 errors, not for 500 or other errors
    // 500 errors should be displayed to the user, not cause a redirect

    console.error(`[apiDelete] Failed: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  try {
    const data = await res.json() as T;
    return data;
  } catch (err) {
    // If response is empty or not JSON, return empty object or throw
    if (res.status === 204 || res.status === 201) {
      return {} as T;
    }
    throw new Error("Invalid JSON response from server");
  }
}
