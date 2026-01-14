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
import { audioVolumeManager } from '../services/audioVolumeManager';

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
        audioVolumeManager.setMyConversation(newConversationId);

        if (newConversationId === '') {
          // Left conversation - disconnect from conversation peers
          // NOTE: Do NOT call disableVideoChat() - keep local stream active for proximity audio
          if (wasInConversation) {
            console.log('[ConversationVideo] Left conversation, disconnecting from conversation peers');
            disconnectFromConversationPeers([...oldPeers]);
          }
          currentPeersRef.current.clear();
          connectedPeersRef.current.clear();

          // Update all remote audio routing (proximity will handle reconnections)
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId && player.socketId) {
              audioVolumeManager.setPeerConversation(
                player.socketId, // Use Socket.IO ID
                player.conversationId || ''
              );
            }
          });
        } else {
          // Joined/changed conversation - find new peers (use socketId for WebRTC)
          const newPeers = new Set<string>();
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId && player.conversationId === newConversationId && player.socketId) {
              newPeers.add(player.socketId); // Use Socket.IO ID, not Colyseus sessionId
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
              console.log('[ConversationVideo] Connecting to peers with VIDEO:', toConnect);
              // Include video for private conversations (true = default, but explicit for clarity)
              connectToConversationPeers(toConnect, true);
              toConnect.forEach(id => connectedPeersRef.current.add(id));
            } else {
              // Store pending peers - they'll be connected when localStream is ready
              console.log('[ConversationVideo] Stream not ready, queuing peers:', toConnect);
              pendingPeersRef.current = [...new Set([...pendingPeersRef.current, ...toConnect])];
            }
          }

          currentPeersRef.current = newPeers;

          // Update audio routing for all remote players (use socketId)
          state.players?.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId && player.socketId) {
              audioVolumeManager.setPeerConversation(
                player.socketId, // Use Socket.IO ID for audio routing
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
  }, [roomReady, connectToConversationPeers, disconnectFromConversationPeers, localStream, isVideoChatActive, autoEnableVideoChat]);

  // Effect to connect pending peers when localStream becomes available
  useEffect(() => {
    if (localStream && pendingPeersRef.current.length > 0) {
      const toConnect = pendingPeersRef.current.filter(id => !connectedPeersRef.current.has(id));
      if (toConnect.length > 0) {
        console.log('[ConversationVideo] Stream ready, connecting pending peers with VIDEO:', toConnect);
        // Include video for private conversations
        connectToConversationPeers(toConnect, true);
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
