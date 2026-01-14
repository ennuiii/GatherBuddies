/**
 * RemoteAudioPlayer
 *
 * Renders <audio> elements for remote WebRTC streams (SkyOffice pattern).
 * Audio plays through browser-native handling - no Web Audio API.
 * Volume controlled via element.volume property.
 *
 * This component should be rendered always (not just in conversations)
 * to enable proximity-based audio.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { audioVolumeManager } from '../../services/audioVolumeManager';

interface AudioElementProps {
  peerId: string;
  stream: MediaStream;
}

/**
 * Individual audio element for a remote peer
 */
const AudioElement: React.FC<AudioElementProps> = ({ peerId, stream }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set up the stream on the audio element
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      console.log(`[RemoteAudioPlayer] Attached stream to audio element for ${peerId.slice(0, 8)}`);
    }
  }, [stream, peerId]);

  // Poll for volume changes from the audioVolumeManager
  useEffect(() => {
    const updateVolume = () => {
      if (audioRef.current) {
        const volume = audioVolumeManager.getVolume(peerId);
        audioRef.current.volume = volume;
      }
    };

    // Update immediately
    updateVolume();

    // Poll every 50ms for volume changes (matches proximity update interval)
    volumeIntervalRef.current = setInterval(updateVolume, 50);

    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
      }
    };
  }, [peerId]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      data-peer-id={peerId}
    />
  );
};

/**
 * Container component that renders audio elements for all remote streams
 */
export const RemoteAudioPlayer: React.FC = () => {
  const { remoteStreams } = useWebRTC();

  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      {[...remoteStreams.entries()].map(([peerId, stream]) => (
        <AudioElement
          key={peerId}
          peerId={peerId}
          stream={stream}
        />
      ))}
    </div>
  );
};

export default RemoteAudioPlayer;
