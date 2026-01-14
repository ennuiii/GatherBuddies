/**
 * Avatar Preview Component
 *
 * Renders a live preview of the avatar configuration.
 * Uses AvatarPreviewRenderer for canvas-based composition.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { AvatarConfig } from '../../types/avatar';
import { avatarPreviewRenderer } from '../../services/AvatarPreviewRenderer';

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: number;
  animate?: boolean;
  direction?: 'down' | 'left' | 'right' | 'up';
}

const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  config,
  size = 128,
  animate = false,
  direction = 'down',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stopAnimationRef = useRef<(() => void) | null>(null);

  // Calculate canvas dimensions (LPC sprites are 64x64, roughly square)
  const canvasWidth = size;
  const canvasHeight = size;

  // Stop any running animation
  const stopAnimation = useCallback(() => {
    if (stopAnimationRef.current) {
      stopAnimationRef.current();
      stopAnimationRef.current = null;
    }
  }, []);

  // Render preview when config changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Stop any existing animation
    stopAnimation();

    setLoading(true);
    setError(null);

    console.log('[AvatarPreview] Rendering with config:', config);

    if (animate) {
      // Start animation
      try {
        stopAnimationRef.current = avatarPreviewRenderer.startAnimation(
          canvas,
          config,
          direction
        );
        setLoading(false);
      } catch (err) {
        console.error('[AvatarPreview] Animation error:', err);
        setError('Failed to animate avatar');
        setLoading(false);
      }
    } else {
      // Static render
      avatarPreviewRenderer.renderToCanvas(canvas, config, direction)
        .then(() => {
          console.log('[AvatarPreview] Render complete');
          setLoading(false);
        })
        .catch((err) => {
          console.error('[AvatarPreview] Render error:', err);
          setError('Failed to render avatar');
          setLoading(false);
        });
    }

    // Cleanup on unmount or config change
    return () => {
      stopAnimation();
    };
  }, [config, animate, direction, stopAnimation]);

  return (
    <div
      className="avatar-preview-container"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading && (
        <div
          className="avatar-preview-loading"
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '12px',
          }}
        >
          <div
            className="loading-spinner"
            style={{
              width: 24,
              height: 24,
              border: '2px solid #e5e7eb',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ marginTop: 8 }}>Loading...</span>
        </div>
      )}

      {error && (
        <div
          className="avatar-preview-error"
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            fontSize: '12px',
            textAlign: 'center',
            padding: 8,
          }}
        >
          <span>{error}</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          imageRendering: 'pixelated',
          opacity: loading || error ? 0.3 : 1,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Inline keyframes for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AvatarPreview;
