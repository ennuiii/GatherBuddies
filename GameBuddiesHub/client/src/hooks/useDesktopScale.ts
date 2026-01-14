/**
 * Desktop Scale Hook
 *
 * Provides viewport-based zoom scaling for desktop displays.
 * Makes smaller screens (like 1920x1080) automatically zoom out
 * to show the same amount of content as larger screens (2560x1440).
 *
 * Formula: zoom = viewportWidth / DESIGN_WIDTH (clamped MIN to MAX)
 */

import { useState, useEffect } from 'react';

// Design width where zoom = 1.0 (no scaling)
// This is the effective viewport width when viewing at 1920x1080 @ 80% zoom
export const DESIGN_WIDTH = 2400;

// Minimum zoom factor (at ~1560px viewport)
export const MIN_SCALE = 0.65;

// Maximum zoom factor (no zooming beyond 100%)
export const MAX_SCALE = 1.0;

// Minimum viewport width to apply scaling (mobile uses its own layout)
export const DESKTOP_BREAKPOINT = 1024;

export interface ScaleInfo {
  scale: number;
  shouldScale: boolean;
}

/**
 * useDesktopScale - Viewport-based zoom scaling
 *
 * Returns scale factor based on viewport width:
 * - 2560px+: 1.0 (no scaling)
 * - 1920px: 0.8 (same as 80% browser zoom)
 * - 1366px: ~0.65 (minimum)
 * - <1024px: 1.0 (no scaling - mobile layout)
 */
export function useDesktopScale(): ScaleInfo {
  const [scaleInfo, setScaleInfo] = useState<ScaleInfo>({ scale: 1, shouldScale: false });

  // PERFORMANCE: RAF-throttled resize handler
  useEffect(() => {
    let rafId: number | null = null;

    const calculateScale = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const width = window.innerWidth;

        // Don't scale on mobile/tablet - use mobile layout instead
        if (width < DESKTOP_BREAKPOINT) {
          setScaleInfo({ scale: 1, shouldScale: false });
          return;
        }

        // Calculate scale: viewport / design width
        const rawScale = width / DESIGN_WIDTH;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));
        setScaleInfo({ scale, shouldScale: scale < MAX_SCALE });
      });
    };

    // Calculate initial scale
    calculateScale();

    // Recalculate on resize
    window.addEventListener('resize', calculateScale, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', calculateScale);
    };
  }, []);

  return scaleInfo;
}

/**
 * Get scale wrapper styles using transform: scale()
 *
 * This approach:
 * 1. Expands the container to "design size" (100vw/scale, 100vh/scale)
 * 2. Scales it down visually with transform: scale()
 * 3. Content renders at design size, then shrinks to fit viewport
 *
 * Unlike CSS zoom, transform: scale() works with fixed-position elements
 * and scales everything together (including backgrounds).
 */
export function getScaleWrapperStyle(scale: number, shouldScale: boolean): React.CSSProperties {
  if (!shouldScale) return {};

  return {
    width: `calc(100vw / ${scale})`,
    height: `calc(100vh / ${scale})`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };
}

export default useDesktopScale;
