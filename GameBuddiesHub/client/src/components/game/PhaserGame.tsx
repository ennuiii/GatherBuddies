/**
 * PhaserGame Component
 *
 * React wrapper for the Phaser game instance.
 * Connects to Colyseus on mount and passes room to Phaser via registry.
 * Includes avatar customization UI.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import Phaser from 'phaser';
import { Bootstrap, Game, AvatarEditorScene } from '../../game/scenes';
import { colyseusService } from '../../services/colyseusService';
import GameLaunchDialog from './GameLaunchDialog';
import GameInviteNotification from './GameInviteNotification';
import AvatarEditor from '../ui/AvatarEditor';
import { useAvatar } from '../../hooks/useAvatar';

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

  // Avatar customization
  const { avatarConfig, isEditorOpen, closeEditor, saveAvatar } = useAvatar();

  console.log('[PhaserGame] Render - roomCode:', roomCode, 'playerName:', playerName);

  const initializeGame = useCallback(async () => {
    console.log('[PhaserGame] initializeGame called - containerRef:', !!containerRef.current, 'gameRef:', !!gameRef.current);
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
        scene: [Bootstrap, Game, AvatarEditorScene],
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
    console.log('[PhaserGame] useEffect triggered - calling initializeGame');
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

  // Always render the container with ref - overlay loading/error states
  return (
    <div ref={containerRef} className="phaser-game-container">
      {error && (
        <div className="phaser-game-overlay phaser-game-error">
          <div className="phaser-error-content">
            <h3>Connection Error</h3>
            <p>{error}</p>
            <button onClick={initializeGame} className="phaser-retry-btn">
              Retry Connection
            </button>
          </div>
        </div>
      )}
      {isConnecting && !error && (
        <div className="phaser-game-overlay phaser-game-loading">
          <div className="phaser-loading-content">
            <div className="phaser-spinner" />
            <p>Connecting to virtual world...</p>
          </div>
        </div>
      )}
      <GameLaunchDialog playerName={playerName} />
      <GameInviteNotification playerName={playerName} />
      <AvatarEditor
        isOpen={isEditorOpen}
        onClose={closeEditor}
        currentConfig={avatarConfig}
        onSave={saveAvatar}
      />
    </div>
  );
}

export default PhaserGame;
