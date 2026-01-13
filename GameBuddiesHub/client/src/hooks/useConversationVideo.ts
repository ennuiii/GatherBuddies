/**
 * useConversationVideo Hook
 *
 * Connects/disconnects video based on conversation membership.
 * Listens to Colyseus state for conversation changes.
 * Auto-enables video when entering a conversation.
 */

import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import colyseusService from '../services/colyseusService';
import { conversationAudioRouter } from '../services/conversationAudioRouter';

/**
 * Hook that connects/disconnects video based on conversation membership.
 * Listens to Colyseus state for conversation changes.
 * Auto-enables video when entering a conversation.
 */
export function useConversationVideo() {
  const {
    connectToConversationPeers,
    disconnectFromConversationPeers,
    localStream,
    isVideoChatActive,
    prepareVideoChat,
    confirmVideoChat,
    disableVideoChat
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
        const wasInConversation = currentConversationRef.current !== '';

        // Update audio router with my new conversation ID
        conversationAudioRouter.setMyConversation(newConversationId);

        if (newConversationId === '') {
          // Left conversation - disconnect from all peers
          disconnectFromConversationPeers([...oldPeers]);
          currentPeersRef.current.clear();

          // Disable video when leaving conversation
          if (wasInConversation) {
            console.log('[ConversationVideo] Left conversation, disabling video');
            disableVideoChat();
          }

          // Update all remote audio to muted (not in any conversation)
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId) {
              conversationAudioRouter.updateConversationMembership(
                sessionId,
                player.conversationId || ''
              );
            }
          });
        } else {
          // Joined/changed conversation - find new peers
          const newPeers = new Set<string>();
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId && player.conversationId === newConversationId) {
              newPeers.add(sessionId);
            }
          });

          // Auto-enable video when entering conversation (if not already active)
          if (!wasInConversation && !isVideoChatActive) {
            console.log('[ConversationVideo] Entered conversation, auto-enabling video');
            prepareVideoChat().then(() => {
              // Small delay to ensure stream is ready, then auto-confirm
              setTimeout(() => {
                confirmVideoChat();
              }, 100);
            }).catch(err => {
              console.warn('[ConversationVideo] Failed to auto-enable video:', err);
            });
          }

          // Disconnect from peers no longer in conversation
          const toDisconnect = [...oldPeers].filter(id => !newPeers.has(id));
          if (toDisconnect.length > 0) {
            disconnectFromConversationPeers(toDisconnect);
          }

          // Connect to new peers (will happen after video is ready)
          const toConnect = [...newPeers].filter(id => !oldPeers.has(id));
          if (toConnect.length > 0 && localStream) {
            connectToConversationPeers(toConnect);
          }

          currentPeersRef.current = newPeers;

          // Update audio routing for all remote players
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId) {
              conversationAudioRouter.updateConversationMembership(
                sessionId,
                player.conversationId || ''
              );
            }
          });
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
  }, [connectToConversationPeers, disconnectFromConversationPeers, localStream, isVideoChatActive, prepareVideoChat, confirmVideoChat, disableVideoChat]);
}
