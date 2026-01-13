import { useState, useEffect, useCallback, useRef } from 'react';
import { colyseusService, HubMessage } from '../../services/colyseusService';
import type { Room } from 'colyseus.js';

interface GameInvite {
  gameType: string;
  gameName: string;
  hubRoomCode: string;
  inviterName: string;
  inviterSessionId: string;
}

interface GameInviteNotificationProps {
  playerName: string;
}

export default function GameInviteNotification({ playerName }: GameInviteNotificationProps) {
  const [invite, setInvite] = useState<GameInvite | null>(null);
  const listenerSetupRef = useRef(false);
  const roomRef = useRef<Room | null>(null);

  // Set up listener when room becomes available
  useEffect(() => {
    // Poll for room availability
    const checkAndSetupListener = () => {
      const room = colyseusService.getRoom();

      // If no room or already set up for this room, skip
      if (!room || (listenerSetupRef.current && roomRef.current === room)) {
        return;
      }

      // New room - set up listener
      console.log('[GameInviteNotification] Setting up GAME_INVITE listener for room:', room.roomId);
      listenerSetupRef.current = true;
      roomRef.current = room;

      // Listen for game invite messages
      room.onMessage(HubMessage.GAME_INVITE, (data: GameInvite) => {
        const timestamp = new Date().toISOString();
        console.log(`[GameInviteNotification] ${timestamp} *** RECEIVED GAME_INVITE ***`);
        console.log('[GameInviteNotification] Invite data:', data);
        console.log('[GameInviteNotification] From:', data?.inviterName, 'Game:', data?.gameName);

        // Validate invite data before showing
        if (data && data.gameType && data.gameName && data.hubRoomCode && data.inviterName) {
          console.log('[GameInviteNotification] Valid invite - showing notification');
          setInvite(data);
        } else {
          console.warn('[GameInviteNotification] Invalid invite data received - NOT showing notification:', data);
        }
      });
    };

    // Check immediately
    checkAndSetupListener();

    // Then poll every 500ms until room is ready
    const interval = setInterval(checkAndSetupListener, 500);

    return () => {
      clearInterval(interval);
      // Note: Colyseus room.onMessage listeners are cleaned up when room.leave() is called
    };
  }, []);

  const handleAccept = useCallback(() => {
    if (!invite) return;

    // Open game in new tab (without role=gm, so they join as regular player)
    window.open(
      `https://gamebuddies.io/${invite.gameType}?room=${invite.hubRoomCode}&name=${encodeURIComponent(playerName)}`,
      '_blank'
    );

    setInvite(null);
  }, [invite, playerName]);

  const handleDecline = useCallback(() => {
    setInvite(null);
  }, []);

  if (!invite) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gray-800 border-2 border-purple-500 rounded-xl p-6 max-w-md shadow-2xl shadow-purple-500/30 animate-scale-in">
        <div className="text-center">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-xl font-bold text-white mb-2">Game Invite!</h2>
          <p className="text-gray-300">
            <span className="text-purple-400 font-semibold">{invite.inviterName}</span> wants to play
          </p>
          <p className="text-2xl font-bold text-green-400 mt-2">{invite.gameName}</p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}
