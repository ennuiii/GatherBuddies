/**
 * PhaserGame Component
 *
 * React wrapper for the Phaser game instance.
 * Connects to Colyseus on mount and passes room to Phaser via registry.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import Phaser from 'phaser';
import { Bootstrap, Game } from '../../game/scenes';
import { colyseusService } from '../../services/colyseusService';

interface PhaserGameProps {
  roomCode: string;
  playerName: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function PhaserGame({ roomCode, playerName, onReady, onError }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeGame = useCallback(async () => {
    if (!containerRef.current || gameRef.current) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Connect to Colyseus first
      console.log('[PhaserGame] Connecting to Colyseus...');
      const room = await colyseusService.joinHub(roomCode, playerName);
      console.log('[PhaserGame] Connected to Colyseus room:', room.roomId);

      // Create Phaser game config
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: 800,
        height: 600,
        pixelArt: true,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [Bootstrap, Game],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        backgroundColor: '#1a1a2e',
      };

      // Create game instance
      gameRef.current = new Phaser.Game(config);

      // Store Colyseus room and player info in registry for scenes to access
      gameRef.current.registry.set('colyseusRoom', room);
      gameRef.current.registry.set('playerName', playerName);
      gameRef.current.registry.set('roomCode', roomCode);

      setIsConnecting(false);
      onReady?.();

      console.log('[PhaserGame] Phaser game initialized');
    } catch (err) {
      console.error('[PhaserGame] Failed to initialize:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [roomCode, playerName, onReady, onError]);

  useEffect(() => {
    initializeGame();

    return () => {
      // Cleanup on unmount
      console.log('[PhaserGame] Cleaning up...');
      colyseusService.leave();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [initializeGame]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        gameRef.current.scale.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className="phaser-game-container phaser-game-error">
        <div className="phaser-error-content">
          <h3>Connection Error</h3>
          <p>{error}</p>
          <button onClick={initializeGame} className="phaser-retry-btn">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="phaser-game-container phaser-game-loading">
        <div className="phaser-loading-content">
          <div className="phaser-spinner" />
          <p>Connecting to virtual world...</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="phaser-game-container" />;
}

export default PhaserGame;
