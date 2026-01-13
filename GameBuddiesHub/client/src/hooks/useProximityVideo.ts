/**
 * useProximityVideo Hook
 *
 * Bridges Phaser proximity events to WebRTC.
 * When players enter/leave proximity, tracks them for potential video connections.
 * Actual video connections are handled by conversation state, not raw proximity.
 */

import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { phaserEvents } from '../game/events/EventCenter';

/**
 * Hook that connects WebRTC to Phaser proximity events.
 * When players enter/leave proximity, triggers video connections.
 */
export function useProximityVideo(enabled: boolean = true) {
  const {
    localStream,
    isVideoChatActive,
    remoteStreams
  } = useWebRTC();

  const proximityPeersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const handleProximityConnect = ({ playerId }: { playerId: string }) => {
      console.log('[ProximityVideo] Player in proximity:', playerId);
      proximityPeersRef.current.add(playerId);
      // Video connection will be handled by conversation state
      // This just tracks who is physically nearby
    };

    const handleProximityDisconnect = ({ playerId }: { playerId: string }) => {
      console.log('[ProximityVideo] Player left proximity:', playerId);
      proximityPeersRef.current.delete(playerId);
    };

    phaserEvents.on('proximity:connect', handleProximityConnect);
    phaserEvents.on('proximity:disconnect', handleProximityDisconnect);

    return () => {
      phaserEvents.off('proximity:connect', handleProximityConnect);
      phaserEvents.off('proximity:disconnect', handleProximityDisconnect);
    };
  }, [enabled]);

  return {
    proximityPeers: proximityPeersRef.current,
    isVideoChatActive,
    remoteStreams
  };
}
