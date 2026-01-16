// src/hooks/useSessionWarning.ts
import { useState, useEffect, useCallback } from "react";
import { isTokenExpired, getTokenExpiration } from "../utils/tokenUtils";
import { TIMING } from "../app/config";

interface SessionWarningState {
  showWarning: boolean;
  secondsRemaining: number;
}

/**
 * Hook to track session expiration and show warning 30 seconds before expiration
 * if there's no user interaction
 */
export function useSessionWarning() {
  const [warning, setWarning] = useState<SessionWarningState>({
    showWarning: false,
    secondsRemaining: 0,
  });
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now());

  // Track user interactions
  const recordInteraction = useCallback(() => {
    setLastInteraction(Date.now());
  }, []);

  useEffect(() => {
    // Set up event listeners for user interactions
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    const handleInteraction = () => {
      recordInteraction();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleInteraction, { passive: true });
    });

    // Listen for API interaction events
    const handleApiInteraction = () => {
      recordInteraction();
    };
    window.addEventListener("api:interaction", handleApiInteraction);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
      window.removeEventListener("api:interaction", handleApiInteraction);
    };
  }, [recordInteraction]);

  useEffect(() => {
    const updateWarning = () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken || isTokenExpired(accessToken)) {
        setWarning({ showWarning: false, secondsRemaining: 0 });
        return;
      }

      const expirationTime = getTokenExpiration(accessToken);
      if (!expirationTime) {
        setWarning({ showWarning: false, secondsRemaining: 0 });
        return;
      }

      // Calculate seconds remaining based on current time (not interval-based)
      const now = Date.now();
      const timeUntilExpiration = expirationTime - now;
      const secondsUntilExpiration = Math.max(0, Math.floor(timeUntilExpiration / 1000));

      // Check if we're within threshold of expiration
      const warningThresholdSeconds = TIMING.SESSION_WARNING_THRESHOLD_MS / 1000;
      if (secondsUntilExpiration <= warningThresholdSeconds && secondsUntilExpiration > 0) {
        // Check if there was interaction in the last debounce period
        const timeSinceLastInteraction = now - lastInteraction;
        const hasRecentInteraction = timeSinceLastInteraction < TIMING.SESSION_EXTEND_DEBOUNCE_MS;

        if (!hasRecentInteraction) {
          setWarning({
            showWarning: true,
            secondsRemaining: secondsUntilExpiration,
          });
        } else {
          setWarning({ showWarning: false, secondsRemaining: 0 });
        }
      } else {
        setWarning({ showWarning: false, secondsRemaining: 0 });
      }
    };

    // Update immediately
    updateWarning();

    // Update every second to refresh the countdown
    // Even if the tab is inactive, when it becomes active again, the calculation
    // will be based on the actual expiration time, not a timer
    const interval = setInterval(updateWarning, TIMING.SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [lastInteraction]);

  return {
    showWarning: warning.showWarning,
    secondsRemaining: warning.secondsRemaining,
    recordInteraction,
  };
}
