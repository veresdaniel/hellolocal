// src/components/DraggableBox.tsx
import { useState, useEffect, useRef, ReactNode } from "react";

interface DraggableBoxProps {
  // Position and storage
  defaultPositionDesktop: { top: number; right: number };
  defaultPositionMobile: { top: number; right: number };
  localStorageKey: string;
  
  // Appearance
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  minWidth?: number;
  
  // Content
  children: ReactNode;
  
  // Z-index control
  baseZIndex?: number;
  activeZIndex?: number;
}

export function DraggableBox({
  defaultPositionDesktop,
  defaultPositionMobile,
  localStorageKey,
  title,
  icon,
  isOpen,
  onToggle,
  minWidth = 280,
  children,
  baseZIndex = 3000,
  activeZIndex = 10000,
}: DraggableBoxProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < BREAKPOINTS.tablet;
  });
  const isDesktop = typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;

  // Load saved position from localStorage with lazy initializer (device-specific)
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return defaultPositionDesktop;
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`${localStorageKey}_${deviceKey}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
      }
    }
    return isDesktop ? defaultPositionDesktop : defaultPositionMobile;
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport changes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.tablet);
    };
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load position when device type changes
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const saved = localStorage.getItem(`${localStorageKey}_${deviceKey}`);
    if (saved) {
      try {
        const savedPos = JSON.parse(saved);
        setPosition(savedPos);
      } catch {
        setPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
      }
    } else {
      setPosition(isDesktop ? defaultPositionDesktop : defaultPositionMobile);
    }
  }, [isDesktop, localStorageKey, defaultPositionDesktop, defaultPositionMobile]);
  
  // Save position to localStorage (device-specific)
  useEffect(() => {
    const deviceKey = isDesktop ? "desktop" : "mobile";
    const defaultPos = isDesktop ? defaultPositionDesktop : defaultPositionMobile;
    // Only save if position differs from default (user has moved it)
    if (position.top !== defaultPos.top || position.right !== defaultPos.right) {
      localStorage.setItem(`${localStorageKey}_${deviceKey}`, JSON.stringify(position));
    } else {
      // Remove saved position if it's back to default
      localStorage.removeItem(`${localStorageKey}_${deviceKey}`);
    }
  }, [position, isDesktop, localStorageKey, defaultPositionDesktop, defaultPositionMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDesktop || !boxRef.current) return;
    // Don't allow dragging from input elements or labels
    if ((e.target as HTMLElement).closest("input")) {
      return;
    }
    if ((e.target as HTMLElement).closest("label")) {
      return;
    }
    e.preventDefault();
    setHasDragged(false);
    const rect = boxRef.current.getBoundingClientRect();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!boxRef.current) return;
    // Don't allow dragging from input elements or labels
    if ((e.target as HTMLElement).closest("input")) {
      return;
    }
    if ((e.target as HTMLElement).closest("label")) {
      return;
    }
    e.preventDefault();
    setHasDragged(false);
    const touch = e.touches[0];
    const rect = boxRef.current.getBoundingClientRect();
    dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Detect if we've actually moved (dragged)
      const moved = Math.abs(e.clientX - dragStartPosRef.current.x) > 5 || Math.abs(e.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }

      const newLeft = e.clientX - dragOffset.x;
      const newTop = e.clientY - dragOffset.y;

      // Constrain to viewport
      const elementWidth = boxRef.current?.offsetWidth || 280;
      const elementHeight = boxRef.current?.offsetHeight || 200;
      const maxTop = window.innerHeight - elementHeight;

      // Convert left to right for positioning
      const newRight = window.innerWidth - newLeft - elementWidth;

      setPosition({
        top: Math.max(0, Math.min(newTop, maxTop)),
        right: Math.max(0, Math.min(newRight, window.innerWidth - elementWidth)),
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      e.preventDefault();
      const touch = e.touches[0];

      // Detect if we've actually moved (dragged)
      const moved = Math.abs(touch.clientX - dragStartPosRef.current.x) > 5 || Math.abs(touch.clientY - dragStartPosRef.current.y) > 5;
      if (moved) {
        setHasDragged(true);
      }

      const newLeft = touch.clientX - dragOffset.x;
      const newTop = touch.clientY - dragOffset.y;

      // Constrain to viewport
      const elementWidth = boxRef.current?.offsetWidth || 280;
      const elementHeight = boxRef.current?.offsetHeight || 200;
      const maxTop = window.innerHeight - elementHeight;

      // Convert left to right for positioning
      const newRight = window.innerWidth - newLeft - elementWidth;

      setPosition({
        top: Math.max(0, Math.min(newTop, maxTop)),
        right: Math.max(0, Math.min(newRight, window.innerWidth - elementWidth)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragOffset]);

  // Calculate dynamic z-index: higher only when actively dragging (not when just open)
  const currentZIndex = isDragging ? activeZIndex : baseZIndex;

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: "absolute",
        top: position.top,
        right: position.right,
        zIndex: currentZIndex,
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: isMobile ? 12 : 16,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        overflow: "hidden",
        minWidth: isMobile && !isOpen ? "auto" : minWidth,
        cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "default",
        userSelect: "none",
        transition: isDragging ? "none" : "box-shadow 0.2s ease",
        touchAction: "none",
      }}
      onMouseEnter={(e) => {
        if (isDesktop && !isDragging) {
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)";
        }
      }}
    >
      {/* Header */}
      <div
        onClick={() => {
          // Only toggle if we didn't drag
          if (!hasDragged) {
            onToggle();
          }
          setHasDragged(false);
        }}
        style={{
          padding: 10,
          paddingLeft: 16,
          display: "flex",
          justifyContent: isMobile && !isOpen ? "center" : "space-between",
          alignItems: "center",
          cursor: isDesktop ? (isDragging ? "grabbing" : "grab") : "pointer",
          userSelect: "none",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          width: isMobile && !isOpen ? 44 : "auto",
          minHeight: 48,
          boxSizing: "border-box",
          borderRadius: isMobile && !isOpen ? 12 : 0,
        }}
      >
        <h3 style={{ 
          margin: 0, 
          color: "white", 
          fontSize: isMobile && !isOpen ? 20 : "clamp(15px, 3.5vw, 16px)",
          fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile && !isOpen ? 0 : 8,
          paddingLeft: 0,
        }}>
          <span style={{ display: "flex", alignItems: "center", lineHeight: 1 }}>{icon}</span>
          {(!isMobile || isOpen) && <span style={{ display: "flex", alignItems: "center", lineHeight: 1 }}>{title}</span>}
        </h3>
        {(!isMobile || isOpen) && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 16,
              transition: "background 0.2s",
              pointerEvents: "none",
            }}
          >
            {isOpen ? "−" : "+"}
          </div>
        )}
      </div>

      {/* Content */}
      {isOpen && children}
    </div>
  );
}
