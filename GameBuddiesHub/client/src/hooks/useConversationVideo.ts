/**
 * useConversationVideo Hook
 *
 * Connects/disconnects video based on conversation membership.
 * Listens to Colyseus state for conversation changes.
 * Auto-enables video when entering a conversation.
 */

import { useEffect, useRef, useState } from 'react';
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
    autoEnableVideoChat,
    disableVideoChat
  } = useWebRTC();

  const currentConversationRef = useRef<string>('');
  const currentPeersRef = useRef<Set<string>>(new Set());
  const pendingPeersRef = useRef<string[]>([]); // Peers waiting for localStream
  const connectedPeersRef = useRef<Set<string>>(new Set()); // Actually connected peers
  const [roomReady, setRoomReady] = useState(false);

  // Poll for room availability
  useEffect(() => {
    const interval = setInterval(() => {
      const room = colyseusService.getRoom();
      if (room && !roomReady) {
        console.log('[ConversationVideo] Room became available');
        setRoomReady(true);
        clearInterval(interval);
      }
    }, 200);

    // Check immediately too
    const room = colyseusService.getRoom();
    if (room) {
      console.log('[ConversationVideo] Room already available');
      setRoomReady(true);
    }

    return () => clearInterval(interval);
  }, [roomReady]);

  // Main effect - only runs when room is ready
  useEffect(() => {
    if (!roomReady) {
      console.log('[ConversationVideo] Waiting for room...');
      return;
    }

    const room = colyseusService.getRoom();
    if (!room) {
      console.log('[ConversationVideo] Room not available despite roomReady=true');
      return;
    }

    console.log('[ConversationVideo] Room available, setting up listeners...');

    const state = room.state as any;
    const mySessionId = room.sessionId;

    // Watch for changes to my conversationId
    const checkConversationChange = () => {
      const myPlayer = state.players?.get(mySessionId);
      if (!myPlayer) {
        console.log('[ConversationVideo] My player not found in state');
        return;
      }

      const newConversationId = myPlayer.conversationId || '';

      console.log('[ConversationVideo] Checking conversation change:', {
        current: currentConversationRef.current,
        new: newConversationId,
        isVideoChatActive,
        hasLocalStream: !!localStream
      });

      if (newConversationId !== currentConversationRef.current) {
        console.log('[ConversationVideo] CONVERSATION CHANGED!', currentConversationRef.current, '->', newConversationId);
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
          console.log('[ConversationVideo] Check auto-enable:', { wasInConversation, isVideoChatActive });
          if (!wasInConversation && !isVideoChatActive) {
            console.log('[ConversationVideo] Entered conversation, auto-enabling video (no modal)...');
            autoEnableVideoChat().catch(err => {
              console.error('[ConversationVideo] Failed to auto-enable video:', err);
            });
          } else {
            console.log('[ConversationVideo] Skipping auto-enable:', { wasInConversation, isVideoChatActive });
          }

          // Disconnect from peers no longer in conversation
          const toDisconnect = [...oldPeers].filter(id => !newPeers.has(id));
          if (toDisconnect.length > 0) {
            disconnectFromConversationPeers(toDisconnect);
            // Remove from connected tracking
            toDisconnect.forEach(id => connectedPeersRef.current.delete(id));
          }

          // Connect to new peers
          const toConnect = [...newPeers].filter(id => !connectedPeersRef.current.has(id));
          if (toConnect.length > 0) {
            if (localStream) {
              console.log('[ConversationVideo] Connecting to peers:', toConnect);
              connectToConversationPeers(toConnect);
              toConnect.forEach(id => connectedPeersRef.current.add(id));
            } else {
              // Store pending peers - they'll be connected when localStream is ready
              console.log('[ConversationVideo] Stream not ready, queuing peers:', toConnect);
              pendingPeersRef.current = [...new Set([...pendingPeersRef.current, ...toConnect])];
            }
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
    console.log('[ConversationVideo] Running initial check');
    checkConversationChange();

    // Subscribe to player changes
    if (state.players) {
      console.log('[ConversationVideo] Setting up player listeners, current players:', state.players.size);

      state.players.onAdd((player: any, sessionId: string) => {
        console.log('[ConversationVideo] Player added, setting up listener for:', sessionId);
        player.listen('conversationId', (newValue: string, oldValue: string) => {
          console.log('[ConversationVideo] conversationId changed for', sessionId, ':', oldValue, '->', newValue);
          checkConversationChange();
        });
      });

      // Also check when any player's conversationId changes
      state.players.forEach((player: any, sessionId: string) => {
        console.log('[ConversationVideo] Setting up existing player listener for:', sessionId);
        player.listen('conversationId', (newValue: string, oldValue: string) => {
          console.log('[ConversationVideo] conversationId changed for', sessionId, ':', oldValue, '->', newValue);
          checkConversationChange();
        });
      });
    } else {
      console.log('[ConversationVideo] No state.players available!');
    }

    return () => {
      // Cleanup handled by WebRTCContext
    };
  }, [roomReady, connectToConversationPeers, disconnectFromConversationPeers, localStream, isVideoChatActive, autoEnableVideoChat, disableVideoChat]);

  // Effect to connect pending peers when localStream becomes available
  useEffect(() => {
    if (localStream && pendingPeersRef.current.length > 0) {
      const toConnect = pendingPeersRef.current.filter(id => !connectedPeersRef.current.has(id));
      if (toConnect.length > 0) {
        console.log('[ConversationVideo] Stream ready, connecting pending peers:', toConnect);
        connectToConversationPeers(toConnect);
        toConnect.forEach(id => connectedPeersRef.current.add(id));
      }
      pendingPeersRef.current = [];
    }
  }, [localStream, connectToConversationPeers]);

  // Clear connected peers when leaving all conversations
  useEffect(() => {
    if (currentConversationRef.current === '') {
      connectedPeersRef.current.clear();
      pendingPeersRef.current = [];
    }
  }, []);
}
