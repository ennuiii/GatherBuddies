/**
 * VideoGrid Component
 *
 * Displays video feeds in a grid layout (SkyOffice style).
 * Shows local video and remote streams from conversation peers.
 */

import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../../contexts/WebRTCContext';

interface VideoGridProps {
  maxVideos?: number;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ maxVideos = 6 }) => {
  const { localStream, remoteStreams, isCameraEnabled } = useWebRTC();

  return (
    <div className="video-grid bg-gray-900/95 rounded-lg p-2 flex flex-col gap-2 max-h-[400px] overflow-auto">
      {/* Local video */}
      {localStream && (
        <div className="relative">
          <VideoTile
            stream={localStream}
            label="You"
            muted={true}
            mirrored={true}
          />
          {!isCameraEnabled && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-gray-400 rounded">
              Camera off
            </div>
          )}
        </div>
      )}

      {/* Remote videos */}
      {[...remoteStreams.entries()].slice(0, maxVideos).map(([peerId, stream]) => (
        <VideoTile
          key={peerId}
          stream={stream}
          label={peerId.slice(0, 8)}
          muted={true} // Audio handled by RemoteAudioPlayer component
          mirrored={false}
        />
      ))}

      {remoteStreams.size === 0 && localStream && (
        <div className="text-gray-400 text-sm text-center py-2">
          Walk near someone to start a conversation
        </div>
      )}
    </div>
  );
};

interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted: boolean;
  mirrored?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ stream, label, muted, mirrored = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-video bg-gray-800 rounded overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      />
      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
        {label}
      </div>
    </div>
  );
};

export default VideoGrid;
