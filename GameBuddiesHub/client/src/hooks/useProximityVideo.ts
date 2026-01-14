/**
 * useProximityVideo Hook
 *
 * Manages video connections based on player proximity.
 * Auto-connects when players are nearby, disconnects when far.
 * Volume fades based on distance.
 *
 * DISABLED when player is in a conversation (conversationId is set).
 * In that case, useConversationVideo handles connections.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import colyseusService from '../services/colyseusService';
import { audioVolumeManager } from '../services/audioVolumeManager';
import {
  calculateDistanceInTiles,
  calculateVolumeByDistance,
  shouldConnect,
} from '../config/proximityConfig';

// How often to recalculate proximity (ms)
const PROXIMITY_UPDATE_INTERVAL = 200;

interface PlayerPosition {
  sessionId: string;
  socketId: string; // Socket.IO socket ID for WebRTC connections
  x: number;
  y: number;
  conversationId: string;
}

/**
 * Hook that manages proximity-based video connections.
 * Only active when NOT in a conversation.
 */
export function useProximityVideo() {
  const {
    connectToConversationPeers,
    disconnectFromConversationPeers,
    localStream,
    isVideoChatActive,
  } = useWebRTC();

  // Track current proximity connections (separate from conversation connections)
  const proximityPeersRef = useRef<Set<string>>(new Set());
  const myPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const myConversationIdRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // State to track conversation status (triggers re-renders unlike refs)
  const [isInConversation, setIsInConversation] = useState(false);

  /**
   * Get all player positions from Colyseus state
   */
  const getPlayerPositions = useCallback((): PlayerPosition[] => {
    const room = colyseusService.getRoom();
    if (!room) return [];

    const state = room.state as any;
    const mySessionId = room.sessionId;
    const positions: PlayerPosition[] = [];

    state.players?.forEach((player: any, sessionId: string) => {
      if (sessionId === mySessionId) {
        // Track our own position
        myPositionRef.current = { x: player.x, y: player.y };
        const newConvId = player.conversationId || '';
        // Update state if conversation changed (triggers re-render)
        if (myConversationIdRef.current !== newConvId) {
          myConversationIdRef.current = newConvId;
          setIsInConversation(newConvId !== '');
        }
      } else {
        // Only include players who have a socketId (needed for WebRTC)
        if (player.socketId) {
          positions.push({
            sessionId,
            socketId: player.socketId, // Use Socket.IO ID for WebRTC
            x: player.x,
            y: player.y,
            conversationId: player.conversationId || '',
          });
        }
      }
    });

    return positions;
  }, []);

  // Debug logging interval tracker
  const lastDebugLogRef = useRef<number>(0);

  /**
   * Calculate proximity and manage connections/volume
   */
  const updateProximity = useCallback(() => {
    // Skip if video not active
    if (!isVideoChatActive || !localStream) {
      // Debug log every 3 seconds when skipping
      const now = Date.now();
      if (now - lastDebugLogRef.current > 3000) {
        console.log('[ProximityVideo] Skipping update:', {
          isVideoChatActive,
          hasLocalStream: !!localStream,
          myConversation: myConversationIdRef.current || 'none'
        });
        lastDebugLogRef.current = now;
      }
      return;
    }

    // IMPORTANT: Always call getPlayerPositions() first to update conversation status
    // This ensures isInConversation state is updated even when in a conversation
    const otherPlayers = getPlayerPositions();
    const myPos = myPositionRef.current;

    // Skip proximity logic if in a conversation - useConversationVideo handles connections
    if (myConversationIdRef.current !== '') {
      // DON'T disconnect peers here! They might be needed for the conversation.
      // Just clear our local tracking - useConversationVideo manages conversation connections.
      if (proximityPeersRef.current.size > 0) {
        console.log('[ProximityVideo] In conversation, clearing proximity tracking (not disconnecting)');
        proximityPeersRef.current.clear();
      }
      return;
    }

    // Periodic debug log (every 3 seconds)
    const now = Date.now();
    if (now - lastDebugLogRef.current > 3000) {
      console.log('[ProximityVideo] 📍 State:', {
        myPosition: myPos,
        myConversation: myConversationIdRef.current || 'none',
        otherPlayers: otherPlayers.map(p => ({
          socketId: p.socketId.slice(0, 8),
          x: p.x,
          y: p.y,
          conversation: p.conversationId || 'none',
          distance: calculateDistanceInTiles(myPos.x, myPos.y, p.x, p.y).toFixed(1)
        })),
        currentProximityPeers: [...proximityPeersRef.current].map(id => id.slice(0, 8))
      });
      // Also dump volume manager state
      audioVolumeManager.debugState();
      lastDebugLogRef.current = now;
    }

    const shouldBeConnected = new Set<string>();
    const volumeUpdates: Array<{ peerId: string; volume: number }> = [];

    for (const player of otherPlayers) {
      // Skip players in conversations (they're isolated)
      if (player.conversationId !== '') {
        continue;
      }

      const distance = calculateDistanceInTiles(myPos.x, myPos.y, player.x, player.y);

      if (shouldConnect(distance)) {
        // Use socketId for WebRTC connections (not Colyseus sessionId)
        shouldBeConnected.add(player.socketId);
        const volume = calculateVolumeByDistance(distance);
        volumeUpdates.push({ peerId: player.socketId, volume });
      }
    }

    // Connect to new nearby players (using their Socket.IO socket IDs)
    const toConnect = [...shouldBeConnected].filter((id) => !proximityPeersRef.current.has(id));

    // Disconnect from far players
    const toDisconnect = [...proximityPeersRef.current].filter(
      (id) => !shouldBeConnected.has(id)
    );

    if (toConnect.length > 0) {
      console.log('[ProximityVideo] Connecting to nearby players (socketIds):', toConnect);
      // Audio-only for proximity (no video) - video is only enabled in private conversations
      connectToConversationPeers(toConnect, false);
      toConnect.forEach((id) => proximityPeersRef.current.add(id));
    }

    if (toDisconnect.length > 0) {
      console.log('[ProximityVideo] Disconnecting from far players:', toDisconnect);
      disconnectFromConversationPeers(toDisconnect);
      toDisconnect.forEach((id) => proximityPeersRef.current.delete(id));
    }

    // Update volumes based on distance
    for (const { peerId, volume } of volumeUpdates) {
      audioVolumeManager.setProximityVolume(peerId, volume);
    }

    // Log volume updates when there are connections (every 3 seconds)
    if (volumeUpdates.length > 0 && now - lastDebugLogRef.current < 100) {
      console.log('[ProximityVideo] Volume updates:', volumeUpdates.map(v => ({
        peer: v.peerId.slice(0, 8),
        volume: v.volume.toFixed(2)
      })));
    }
  }, [
    isVideoChatActive,
    localStream,
    getPlayerPositions,
    connectToConversationPeers,
    disconnectFromConversationPeers,
  ]);

  /**
   * Start proximity monitoring when video is active
   */
  useEffect(() => {
    if (!isVideoChatActive) {
      // Clear interval when video disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start periodic proximity updates
    console.log('[ProximityVideo] Starting proximity monitoring');
    intervalRef.current = setInterval(updateProximity, PROXIMITY_UPDATE_INTERVAL);

    // Run immediately
    updateProximity();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVideoChatActive, updateProximity]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (proximityPeersRef.current.size > 0) {
        disconnectFromConversationPeers([...proximityPeersRef.current]);
        proximityPeersRef.current.clear();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [disconnectFromConversationPeers]);

  /**
   * Return current proximity state for debugging/UI
   */
  return {
    proximityPeers: proximityPeersRef.current,
    isInConversation, // Now uses state, triggers re-renders
  };
}
