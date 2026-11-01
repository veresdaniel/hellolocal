// src/services/notification.service.ts

export class NotificationService {
  private static registration: ServiceWorkerRegistration | null = null;

  /**
   * Register the app service worker. Notification permission is requested only when a push subscription is needed.
   */
  static async register(): Promise<boolean> {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers are not supported");
      return false;
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });
      this.registration = registration;
      return true;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  static isSupported(): boolean {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  /**
   * Check if notification permission is granted
   */
  static hasPermission(): boolean {
    return Notification.permission === "granted";
  }

  /**
   * Request notification permission
   */
  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  /**
   * Subscribe to push notifications
   */
  static async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.register();
    }

    if (!this.registration) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ""
        ) as BufferSource,
      });
      return subscription;
    } catch (error) {
      console.error("Push subscription failed:", error);
      return null;
    }
  }

  /**
   * Show a local notification (for testing or immediate notifications)
   */
  static async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.hasPermission()) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn("Notification permission not granted");
        return;
      }
    }

    if (this.registration) {
      await this.registration.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        ...options,
      });
    } else {
      // Fallback to browser notification if service worker is not registered
      new Notification(title, {
        icon: "/icons/icon-192.png",
        ...options,
      });
    }
  }

  /**
   * Convert VAPID public key from URL-safe base64 to Uint8Array
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check for new events and show notifications
   */
  static async checkForNewEvents(lang: string): Promise<void> {
    // This would be called periodically to check for new events
    // For now, it's a placeholder that can be extended
    try {
      // In a real implementation, you would:
      // 1. Fetch events from API
      // 2. Compare with stored last checked timestamp
      // 3. Show notifications for new events
    } catch (error) {
      console.error("Error checking for new events:", error);
    }
  }
}
