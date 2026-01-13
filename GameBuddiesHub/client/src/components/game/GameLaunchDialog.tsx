import { useState, useEffect, useCallback } from 'react';
import { phaserEvents } from '../../game/events/EventCenter';
import { colyseusService } from '../../services/colyseusService';

interface CabinetInteractEvent {
  gameType: string;
  gameName: string;
  nearbyPlayers: string[];
  hubRoomCode: string;
}

interface GameLaunchDialogProps {
  playerName: string;
}

export default function GameLaunchDialog({ playerName }: GameLaunchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gameData, setGameData] = useState<CabinetInteractEvent | null>(null);

  useEffect(() => {
    const handleInteract = (data: CabinetInteractEvent) => {
      console.log('[GameLaunchDialog] cabinet:interact received - opening dialog (NOT sending invite yet)');
      console.log('[GameLaunchDialog] Game:', data.gameName, 'Nearby players:', data.nearbyPlayers.length);
      setGameData(data);
      setIsOpen(true);
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
    phaserEvents.emit('dialog:closed');
  }, []);

  const handleLaunch = useCallback(() => {
    if (!gameData) return;

    console.log('[GameLaunchDialog] *** PLAY BUTTON CLICKED - Now sending invites ***');

    // Get current session ID to filter out self from invites
    const room = colyseusService.getRoom();
    const mySessionId = room?.sessionId;

    // Filter nearby players to exclude self (first element is always self)
    const playersToInvite = gameData.nearbyPlayers.filter(id => id !== mySessionId);

    console.log('[GameLaunchDialog] nearbyPlayers:', gameData.nearbyPlayers);
    console.log('[GameLaunchDialog] mySessionId:', mySessionId);
    console.log('[GameLaunchDialog] playersToInvite:', playersToInvite);

    // Send invite to nearby players via Colyseus
    if (playersToInvite.length > 0) {
      console.log('[GameLaunchDialog] Sending GAME_INVITE to', playersToInvite.length, 'players:', playersToInvite);
      colyseusService.sendGameInvite(
        gameData.gameType,
        gameData.gameName,
        gameData.hubRoomCode,
        playersToInvite,
        playerName
      );
    } else {
      console.log('[GameLaunchDialog] No nearby players to invite');
    }

    // Open game in new tab with Hub room code and role=gm (initiator creates the room)
    const gameUrl = `https://gamebuddies.io/${gameData.gameType}?room=${gameData.hubRoomCode}&name=${encodeURIComponent(playerName)}&role=gm`;
    console.log('[GameLaunchDialog] Opening game URL:', gameUrl);

    phaserEvents.emit('dialog:closed');
    window.open(gameUrl, '_blank');

    setIsOpen(false);
    setGameData(null);
  }, [gameData, playerName]);

  if (!isOpen || !gameData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 text-white">
        <h2 className="text-xl font-bold mb-4">Launch Game</h2>

        <div className="mb-6">
          <p className="text-lg font-medium">{gameData.gameName}</p>
          <p className="text-sm text-gray-400 mt-2">
            You'll be taken to the game lobby to create or join a room.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors"
          >
            Play
          </button>
        </div>
      </div>
    </div>
  );
}
