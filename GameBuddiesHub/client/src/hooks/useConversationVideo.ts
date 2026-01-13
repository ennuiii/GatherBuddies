/**
 * useConversationVideo Hook
 *
 * Connects/disconnects video based on conversation membership.
 * Listens to Colyseus state for conversation changes.
 */

import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import colyseusService from '../services/colyseusService';

/**
 * Hook that connects/disconnects video based on conversation membership.
 * Listens to Colyseus state for conversation changes.
 */
export function useConversationVideo() {
  const {
    connectToConversationPeers,
    disconnectFromConversationPeers,
    localStream
  } = useWebRTC();

  const currentConversationRef = useRef<string>('');
  const currentPeersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const room = colyseusService.getRoom();
    if (!room) return;

    const state = room.state as any;
    const mySessionId = room.sessionId;

    // Watch for changes to my conversationId
    const checkConversationChange = () => {
      const myPlayer = state.players?.get(mySessionId);
      if (!myPlayer) return;

      const newConversationId = myPlayer.conversationId || '';

      if (newConversationId !== currentConversationRef.current) {
        // Conversation changed
        const oldPeers = new Set(currentPeersRef.current);

        if (newConversationId === '') {
          // Left conversation - disconnect from all peers
          disconnectFromConversationPeers([...oldPeers]);
          currentPeersRef.current.clear();
        } else {
          // Joined/changed conversation - find new peers
          const newPeers = new Set<string>();
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId && player.conversationId === newConversationId) {
              newPeers.add(sessionId);
            }
          });

          // Disconnect from peers no longer in conversation
          const toDisconnect = [...oldPeers].filter(id => !newPeers.has(id));
          if (toDisconnect.length > 0) {
            disconnectFromConversationPeers(toDisconnect);
          }

          // Connect to new peers
          const toConnect = [...newPeers].filter(id => !oldPeers.has(id));
          if (toConnect.length > 0 && localStream) {
            connectToConversationPeers(toConnect);
          }

          currentPeersRef.current = newPeers;
        }

        currentConversationRef.current = newConversationId;
      }
    };

    // Initial check
    checkConversationChange();

    // Subscribe to player changes
    if (state.players) {
      state.players.onAdd((player: any, sessionId: string) => {
        player.listen('conversationId', () => {
          checkConversationChange();
        });
      });

      // Also check when any player's conversationId changes
      state.players.forEach((player: any, sessionId: string) => {
        player.listen('conversationId', () => {
          checkConversationChange();
        });
      });
    }

    return () => {
      // Cleanup handled by WebRTCContext
    };
  }, [connectToConversationPeers, disconnectFromConversationPeers, localStream]);
}
