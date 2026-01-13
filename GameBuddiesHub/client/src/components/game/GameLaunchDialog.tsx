import { useState, useEffect, useCallback } from 'react';
import { phaserEvents } from '../../game/events/EventCenter';

interface NearbyPlayer {
  sessionId: string;
  name: string;
}

interface CabinetInteractEvent {
  gameType: string;
  gameName: string;
  nearbyPlayers: NearbyPlayer[];
}

// Game routing config (matches gamebuddies.io AVAILABLE_GAMES)
const GAME_PATHS: Record<string, string> = {
  ddf: '/ddf',
  schoolquiz: '/schooled',
};

export default function GameLaunchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [gameData, setGameData] = useState<CabinetInteractEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get player name from localStorage (set during lobby join)
  const playerName = localStorage.getItem('playerName') || 'Player';

  useEffect(() => {
    const handleInteract = (data: CabinetInteractEvent) => {
      setGameData(data);
      setIsOpen(true);
      setError(null);
      phaserEvents.emit('dialog:opened');
    };

    phaserEvents.on('cabinet:interact', handleInteract);
    return () => {
      phaserEvents.off('cabinet:interact', handleInteract);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setGameData(null);
    setError(null);
    setIsLoading(false);
    phaserEvents.emit('dialog:closed');
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!gameData) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Create room on gamebuddies.io
      const createRes = await fetch('https://gamebuddies.io/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorName: playerName }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create room');
      }

      const room = await createRes.json();

      // 2. Select game for the room
      const selectRes = await fetch(
        `https://gamebuddies.io/api/rooms/${room.roomCode}/select-game`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameType: gameData.gameType }),
        }
      );

      if (!selectRes.ok) {
        throw new Error('Failed to select game');
      }

      // 3. TODO: Notify nearby players (future: through Colyseus)
      // For now, just log that we would invite them
      if (gameData.nearbyPlayers.length > 0) {
        console.log('[GameLaunchDialog] Would invite:', gameData.nearbyPlayers);
      }

      // 4. Navigate to game
      phaserEvents.emit('dialog:closed');
      const gamePath = GAME_PATHS[gameData.gameType] || '/';
      window.location.href = `https://gamebuddies.io${gamePath}?room=${room.roomCode}&name=${encodeURIComponent(playerName)}`;

    } catch (err) {
      console.error('[GameLaunchDialog] Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  }, [gameData, playerName]);

  if (!isOpen || !gameData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 text-white">
        <h2 className="text-xl font-bold mb-4">Launch Game</h2>

        <div className="mb-4">
          <p className="text-lg">{gameData.gameName}</p>
          {gameData.nearbyPlayers.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {gameData.nearbyPlayers.length} nearby player(s) will be invited to join
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50"
          >
            {isLoading ? 'Launching...' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
