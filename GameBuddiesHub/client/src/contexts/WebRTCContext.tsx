/**
 * WebRTC Context
 *
 * Manages WebRTC peer connections for video chat functionality.
 * Handles media streams, peer connections, and signaling via Socket.IO.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import {
  getICEServers,
  getVideoConstraints,
  getAudioConstraints,
  setH264CodecPreference,
  addEnhancedDiagnostics
} from '../utils/webrtcMobileFixes';
import { VirtualBackgroundService, DEFAULT_VIRTUAL_BACKGROUND_CONFIG } from '../services/virtualBackgroundService';
import { audioVolumeManager } from '../services/audioVolumeManager';
import colyseusService from '../services/colyseusService';

// ============================================================================
// Types
// ============================================================================

export interface PeerStream {
  peerId: string;
  stream: MediaStream;
}

export interface WebRTCContextState {
  // Local stream
  localStream: MediaStream | null;
  isVideoChatActive: boolean;  // Whether user has joined video chat
  isCameraEnabled: boolean;    // Whether camera track is enabled
  isAudioEnabled: boolean;     // Whether microphone track is enabled

  // Legacy alias (same as isVideoChatActive for backwards compatibility)
  isVideoEnabled: boolean;

  // Remote streams
  remoteStreams: Map<string, MediaStream>;

  // Controls
  startMedia: () => Promise<void>;
  stopMedia: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;

  // Two-stage video join flow
  isVideoPrepairing: boolean;
  prepareVideoChat: () => Promise<void>;
  confirmVideoChat: () => void;
  cancelVideoPreparation: () => void;
  disableVideoChat: () => void;
  autoEnableVideoChat: () => Promise<void>; // Direct enable without modal

  // Connection state
  isConnecting: boolean;
  connectionError: string | null;

  // Device selection
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  setSelectedCamera: (deviceId: string) => Promise<void>;
  setSelectedMicrophone: (deviceId: string) => Promise<void>;
  availableDevices: MediaDeviceInfo[];
  refreshDevices: () => Promise<void>;

  // Conversation-based connections
  conversationPeers: Set<string>;
  connectToConversationPeers: (peerIds: string[], includeVideo?: boolean) => Promise<void>;
  disconnectFromConversationPeers: (peerIds: string[]) => void;
}

// ============================================================================
// Context
// ============================================================================

const WebRTCContext = createContext<WebRTCContextState | undefined>(undefined);

export const useWebRTC = (): WebRTCContextState => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

// ============================================================================
// Provider Props
// ============================================================================

interface WebRTCProviderProps {
  socket: Socket | null;
  roomCode: string | null;
  children: React.ReactNode;
}

// ============================================================================
// Provider
// ============================================================================

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({
  socket,
  roomCode,
  children
}) => {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoChatActive, setIsVideoChatActive] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoPrepairing, setIsVideoPrepairing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [conversationPeers, setConversationPeers] = useState<Set<string>>(new Set());

  // Refs
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const virtualBgServiceRef = useRef<VirtualBackgroundService | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // Track peers who have enabled video (so we can connect when we get our stream)
  const videoPeersRef = useRef<Set<string>>(new Set());

  // ============================================================================
  // Device Management
  // ============================================================================

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('[WebRTC] Failed to enumerate devices:', error);
    }
  }, []);

  // ============================================================================
  // Media Management
  // ============================================================================

  const startMedia = useCallback(async () => {
    if (localStream) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('[WebRTC] Requesting media access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(selectedCameraId || undefined),
        audio: getAudioConstraints(selectedMicrophoneId || undefined)
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsCameraEnabled(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled);
      setIsAudioEnabled(stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled);

      console.log('[WebRTC] Media access granted');

      // Refresh devices after getting permissions
      await refreshDevices();

      // Notify server that we're enabling video
      if (socket && roomCode) {
        socket.emit('webrtc:enable-video', { roomCode, connectionType: 'camera' });
        console.log('[WebRTC] Emitted webrtc:enable-video');
      }
    } catch (error) {
      console.error('[WebRTC] Media access failed:', error);
      setConnectionError('Failed to access camera/microphone');
    } finally {
      setIsConnecting(false);
    }
  }, [localStream, selectedCameraId, selectedMicrophoneId, socket, roomCode, refreshDevices]);

  const stopMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnections.current.forEach((pc, peerId) => {
      pc.close();
      console.log(`[WebRTC] Closed connection with ${peerId}`);
    });
    peerConnections.current.clear();

    setRemoteStreams(new Map());
    console.log('[WebRTC] Media stopped');
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraEnabled(videoTracks.length > 0 && videoTracks[0].enabled);
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(audioTracks.length > 0 && audioTracks[0].enabled);
    }
  }, [localStream]);

  // ============================================================================
  // Two-Stage Video Join Flow
  // ============================================================================

  const prepareVideoChat = useCallback(async () => {
    if (isVideoPrepairing || isVideoChatActive) return;

    setIsVideoPrepairing(true);
    setConnectionError(null);

    try {
      console.log('[WebRTC] Preparing video chat...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(selectedCameraId || undefined),
        audio: getAudioConstraints(selectedMicrophoneId || undefined)
      });

      setLocalStream(stream);
      localStreamRef.current = stream;
      console.log('[WebRTC] Setting localStream - tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));

      // Mute audio during preview so user doesn't hear echo
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      console.log('[WebRTC] Video chat prepared - waiting for user to confirm in modal');

      // Refresh devices after getting permissions
      await refreshDevices();

      // DO NOT auto-confirm - modal will open and user must click to confirm
      // isVideoPrepairing stays true, modal shows based on this state
    } catch (error) {
      console.error('[WebRTC] Failed to prepare video chat:', error);
      setConnectionError('Failed to access camera/microphone');
      setIsVideoPrepairing(false);
    }
  }, [isVideoPrepairing, isVideoChatActive, selectedCameraId, selectedMicrophoneId, refreshDevices]);

  const confirmVideoChat = useCallback(async () => {
    if (!localStream || !isVideoPrepairing) return;

    console.log('[WebRTC] Confirming video chat...');

    // Note: Audio is now handled via HTML <audio> elements in RemoteAudioPlayer

    // Read privacy settings from localStorage
    const joinMuted = localStorage.getItem('joinMuted') === 'true';
    const joinCameraOff = localStorage.getItem('joinCameraOff') === 'true';

    // Read virtual background settings
    const virtualBgEnabled = localStorage.getItem('virtualBgEnabled') === 'true';
    const virtualBgType = localStorage.getItem('virtualBgType') || 'blur';
    const virtualBgImage = localStorage.getItem('virtualBgImage') || '';

    // Check browser support for virtual background
    const supportsVirtualBg = 'MediaStreamTrackProcessor' in window && 'MediaStreamTrackGenerator' in window;

    let activeStream = localStream;

    // Apply virtual background if enabled and supported
    if (virtualBgEnabled && supportsVirtualBg && !joinCameraOff) {
      try {
        console.log('[WebRTC] Initializing virtual background...');

        const config = {
          ...DEFAULT_VIRTUAL_BACKGROUND_CONFIG,
          useBlur: virtualBgType === 'blur',
          backgroundImageUrl: virtualBgType === 'image' ? virtualBgImage : undefined
        };

        const vbService = new VirtualBackgroundService(config);
        await vbService.initialize();
        activeStream = await vbService.setupAndStart(localStream);
        virtualBgServiceRef.current = vbService;

        // Update the local stream reference
        setLocalStream(activeStream);
        localStreamRef.current = activeStream;
        console.log('[WebRTC] Virtual background applied successfully');
        console.log('[WebRTC] After VB - activeStream tracks:', activeStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      } catch (error) {
        console.error('[WebRTC] ========== VIRTUAL BACKGROUND FAILED ==========');
        console.error('[WebRTC] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[WebRTC] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[WebRTC] Full error:', error);
        console.error('[WebRTC] Falling back to original stream');
        // Continue with original stream
        activeStream = localStream;
      }
    } else if (virtualBgEnabled && !supportsVirtualBg) {
      console.warn('[WebRTC] Virtual background not supported in this browser');
    }

    // Apply privacy settings to tracks
    activeStream.getAudioTracks().forEach(track => {
      track.enabled = !joinMuted;
    });
    activeStream.getVideoTracks().forEach(track => {
      track.enabled = !joinCameraOff;
    });

    // Update state to reflect track status
    setIsAudioEnabled(!joinMuted);
    setIsCameraEnabled(!joinCameraOff);
    setIsVideoChatActive(true);
    setIsVideoPrepairing(false);

    // Notify server that we're enabling video
    if (socket && roomCode) {
      socket.emit('webrtc:enable-video', { roomCode, connectionType: 'camera' });
      console.log('[WebRTC] Emitted webrtc:enable-video');
    }

    console.log('[WebRTC] Video chat enabled (muted:', joinMuted, ', camera off:', joinCameraOff, ', virtualBg:', virtualBgEnabled && supportsVirtualBg, ')');
  }, [localStream, isVideoPrepairing, socket, roomCode]);

  // Auto-enable video without showing the configuration modal
  // Used for automatic proximity-based connections
  const autoEnableVideoChat = useCallback(async () => {
    if (isVideoChatActive) {
      console.log('[WebRTC] Auto-enable: already active, skipping');
      return;
    }

    console.log('[WebRTC] Auto-enabling video chat (no modal)...');
    setConnectionError(null);

    try {
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(selectedCameraId || undefined),
        audio: getAudioConstraints(selectedMicrophoneId || undefined)
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      // Note: Audio is now handled via HTML <audio> elements in RemoteAudioPlayer

      // Read privacy settings from localStorage
      const joinMuted = localStorage.getItem('joinMuted') === 'true';
      const joinCameraOff = localStorage.getItem('joinCameraOff') === 'true';

      // Apply privacy settings to tracks
      stream.getAudioTracks().forEach(track => {
        track.enabled = !joinMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = !joinCameraOff;
      });

      // Update state - directly active, no preparing phase
      setIsAudioEnabled(!joinMuted);
      setIsCameraEnabled(!joinCameraOff);
      setIsVideoChatActive(true);
      // Note: NOT setting isVideoPrepairing - this skips the modal

      // Notify server
      if (socket && roomCode) {
        socket.emit('webrtc:enable-video', { roomCode, connectionType: 'camera' });
      }

      console.log('[WebRTC] Auto-enabled video chat (muted:', joinMuted, ', camera off:', joinCameraOff, ')');
    } catch (error) {
      console.error('[WebRTC] Auto-enable failed:', error);
      setConnectionError('Failed to access camera/microphone');
    }
  }, [isVideoChatActive, selectedCameraId, selectedMicrophoneId, socket, roomCode]);

  const disableVideoChat = useCallback(() => {
    console.log('[WebRTC] Disabling video chat...');

    // Notify server that we're disabling video
    if (socket && roomCode) {
      socket.emit('webrtc:disable-video', { roomCode });
      console.log('[WebRTC] Emitted webrtc:disable-video');
    }

    // Note: Audio cleanup handled by React (RemoteAudioPlayer unmounts)

    // Clean up virtual background service
    if (virtualBgServiceRef.current) {
      virtualBgServiceRef.current.dispose();
      virtualBgServiceRef.current = null;
      console.log('[WebRTC] Virtual background service disposed');
    }

    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnections.current.forEach((pc, peerId) => {
      pc.close();
      console.log(`[WebRTC] Closed connection with ${peerId}`);
    });
    peerConnections.current.clear();

    // Reset state
    setRemoteStreams(new Map());
    setIsVideoChatActive(false);
    setIsCameraEnabled(true); // Reset for next join
    setIsVideoPrepairing(false);

    // Clear tracked video peers
    videoPeersRef.current.clear();

    console.log('[WebRTC] Video chat disabled');
  }, [localStream, socket, roomCode]);

  const cancelVideoPreparation = useCallback(() => {
    console.log('[WebRTC] Canceling video preparation...');

    // Stop the local stream preview
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    // Reset preparation state only (not full video chat state)
    setIsVideoPrepairing(false);

    console.log('[WebRTC] Video preparation canceled');
  }, [localStream]);

  const setSelectedCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(deviceId),
          audio: getAudioConstraints(selectedMicrophoneId || undefined)
        });

        // Stop old tracks
        localStream.getTracks().forEach(track => track.stop());

        // Update local stream
        setLocalStream(newStream);
        localStreamRef.current = newStream;

        // Update peer connections with new track
        const videoTrack = newStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      } catch (error) {
        console.error('[WebRTC] Failed to switch camera:', error);
      }
    }
  }, [localStream, selectedMicrophoneId]);

  const setSelectedMicrophone = useCallback(async (deviceId: string) => {
    setSelectedMicrophoneId(deviceId);

    if (localStream) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(selectedCameraId || undefined),
          audio: getAudioConstraints(deviceId)
        });

        // Stop old tracks
        localStream.getTracks().forEach(track => track.stop());

        // Update local stream
        setLocalStream(newStream);
        localStreamRef.current = newStream;

        // Update peer connections with new track
        const audioTrack = newStream.getAudioTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (sender && audioTrack) {
            sender.replaceTrack(audioTrack);
          }
        });
      } catch (error) {
        console.error('[WebRTC] Failed to switch microphone:', error);
      }
    }
  }, [localStream, selectedCameraId]);

  // ============================================================================
  // Peer Connection Management
  // ============================================================================

  const createPeerConnection = useCallback((peerId: string, includeVideo: boolean = true): RTCPeerConnection => {
    console.log(`[WebRTC] Creating peer connection for ${peerId} (includeVideo: ${includeVideo})`);

    const pc = new RTCPeerConnection({
      iceServers: getICEServers(),
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Add local tracks (optionally exclude video for proximity-only connections)
    if (localStream) {
      localStream.getTracks().forEach(track => {
        if (track.kind === 'audio' || (track.kind === 'video' && includeVideo)) {
          pc.addTrack(track, localStream);
        }
      });
    }

    // Apply mobile fixes
    setH264CodecPreference(pc, peerId);
    addEnhancedDiagnostics(pc, peerId);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          roomCode,
          toPeerId: peerId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      const track = event.track;
      const [stream] = event.streams;
      console.log(`[WebRTC] 🎵 Received track from ${peerId}:`, {
        trackKind: track.kind,
        trackEnabled: track.enabled,
        trackMuted: track.muted,
        trackReadyState: track.readyState,
        streamAudioTracks: stream?.getAudioTracks().length || 0,
        streamVideoTracks: stream?.getVideoTracks().length || 0
      });

      if (stream) {
        setRemoteStreams(prev => new Map(prev).set(peerId, stream));

        // Look up peer's conversation ID from Colyseus state
        const room = colyseusService.getRoom();
        let peerConversationId = '';
        if (room) {
          const state = room.state as any;
          // Find player by socketId (peerId is the Socket.IO ID)
          state.players?.forEach((player: any) => {
            if (player.socketId === peerId) {
              peerConversationId = player.conversationId || '';
            }
          });
        }

        console.log(`[WebRTC] Attaching stream for ${peerId.slice(0, 8)}, peerConversationId: ${peerConversationId || 'none'}`);
        // Note: Audio playback is handled by RemoteAudioPlayer component
        // Update audioVolumeManager with peer's conversation state
        audioVolumeManager.setPeerConversation(peerId, peerConversationId);
      } else {
        console.warn(`[WebRTC] No stream in track event from ${peerId}`);
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`[WebRTC] Connection ${pc.connectionState} with ${peerId}`);
        peerConnections.current.delete(peerId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
        // Clean up volume manager
        audioVolumeManager.removePeer(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [localStream, socket, roomCode]);

  // ============================================================================
  // Conversation-Based Connection Management
  // ============================================================================

  /**
   * Connect to peers in a conversation.
   * Only initiates connection from higher sessionId to prevent duplicates.
   * @param peerIds Array of peer socket IDs to connect to
   * @param includeVideo Whether to include video track (default: true for conversations, false for proximity)
   */
  const connectToConversationPeers = useCallback(async (peerIds: string[], includeVideo: boolean = true) => {
    if (!socket || !localStream) {
      console.warn('[WebRTC] Cannot connect to conversation peers - no socket or local stream');
      return;
    }

    console.log(`[WebRTC] Connecting to peers:`, peerIds, `(includeVideo: ${includeVideo})`);

    for (const peerId of peerIds) {
      if (peerId === socket.id) continue;

      // Check if already connected
      const existingPc = peerConnections.current.get(peerId);
      if (existingPc && existingPc.connectionState !== 'failed') {
        // Check if we need to upgrade from audio-only to video
        const hasVideoSender = existingPc.getSenders().some(s => s.track?.kind === 'video');
        if (includeVideo && !hasVideoSender) {
          // Need to upgrade: close existing and create new with video
          console.log(`[WebRTC] Upgrading connection to ${peerId} (adding video)`);
          existingPc.close();
          peerConnections.current.delete(peerId);
          // Remove from remote streams so we get fresh ones
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        } else {
          console.log(`[WebRTC] Already connected to ${peerId}, skipping`);
          continue;
        }
      }

      // Only initiate from higher sessionId to prevent duplicate connections
      const shouldInitiate = socket.id && socket.id > peerId;
      console.log(`[WebRTC] Peer ${peerId}: shouldInitiate=${shouldInitiate} (our ID: ${socket.id})`);

      if (shouldInitiate) {
        const pc = createPeerConnection(peerId, includeVideo);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('webrtc:offer', {
            roomCode,
            toPeerId: peerId,
            offer: pc.localDescription
          });
          console.log(`[WebRTC] Sent offer to ${peerId} (includeVideo: ${includeVideo})`);
        } catch (error) {
          console.error(`[WebRTC] Failed to create offer for ${peerId}:`, error);
        }
      }
    }

    // Update conversation peers state
    setConversationPeers(prev => {
      const next = new Set(prev);
      peerIds.forEach(id => next.add(id));
      return next;
    });
  }, [socket, localStream, roomCode, createPeerConnection]);

  /**
   * Disconnect from peers no longer in conversation.
   */
  const disconnectFromConversationPeers = useCallback((peerIds: string[]) => {
    console.log('[WebRTC] Disconnecting from conversation peers:', peerIds);

    for (const peerId of peerIds) {
      const pc = peerConnections.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(peerId);
        console.log(`[WebRTC] Closed conversation connection with ${peerId}`);
      }

      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    }

    // Update conversation peers state
    setConversationPeers(prev => {
      const next = new Set(prev);
      peerIds.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  // ============================================================================
  // Signaling Handlers
  // ============================================================================

  useEffect(() => {
    if (!socket) return;

    // Handle peer enabling video - create peer connection if we should initiate
    const handlePeerEnabledVideo = async ({ peerId, connectionType }: { peerId: string; connectionType?: string }) => {
      console.log(`[WebRTC] Peer enabled video: ${peerId}, type: ${connectionType}`);

      if (peerId === socket.id) {
        console.log(`[WebRTC] Ignoring self peer ${peerId}`);
        return;
      }

      // Always track this peer as having video enabled
      videoPeersRef.current.add(peerId);
      console.log(`[WebRTC] Added ${peerId} to videoPeers, total: ${videoPeersRef.current.size}`);

      if (!localStream) {
        console.log(`[WebRTC] No local stream yet, will connect to ${peerId} when we enable video`);
        return;
      }

      // Check if we already have a connection
      const existingPc = peerConnections.current.get(peerId);
      if (existingPc && existingPc.connectionState !== 'failed') {
        console.log(`[WebRTC] Already have connection to ${peerId}, skipping`);
        return;
      }

      // Check if we should initiate (higher ID initiates to avoid race condition)
      // IMPORTANT: Must match logic in connectToConversationPeers
      const shouldInitiate = socket.id && socket.id > peerId;
      console.log(`[WebRTC] shouldInitiate: ${shouldInitiate} (our ID: ${socket.id}, peer ID: ${peerId})`);

      if (shouldInitiate) {
        const pc = createPeerConnection(peerId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('webrtc:offer', {
            roomCode,
            toPeerId: peerId,
            offer: pc.localDescription
          });
          console.log(`[WebRTC] Sent offer to ${peerId}`);
        } catch (error) {
          console.error(`[WebRTC] Failed to create offer for ${peerId}:`, error);
        }
      } else {
        console.log(`[WebRTC] Waiting for ${peerId} to initiate (they have smaller ID)`);
      }
    };

    // Handle peer disabling video - clean up connection
    const handlePeerDisabledVideo = ({ peerId }: { peerId: string }) => {
      console.log(`[WebRTC] Peer disabled video: ${peerId}`);

      // Remove from tracked video peers
      videoPeersRef.current.delete(peerId);

      const pc = peerConnections.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(peerId);
      }

      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });

      // Clean up volume manager
      audioVolumeManager.removePeer(peerId);
    };

    // Handle offer from peer
    const handleOffer = async ({ fromPeerId, offer }: { fromPeerId: string; offer: RTCSessionDescriptionInit }) => {
      // Detect if offer includes video by checking for video m-line in SDP
      const hasVideoInOffer = offer.sdp?.includes('m=video') ?? false;
      console.log(`[WebRTC] Received offer from ${fromPeerId} (hasVideo: ${hasVideoInOffer})`);

      let pc = peerConnections.current.get(fromPeerId);
      if (!pc) {
        // Match the offer's media types to avoid negotiation issues
        pc = createPeerConnection(fromPeerId, hasVideoInOffer);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Apply pending candidates
        const candidates = pendingCandidates.current.get(fromPeerId) || [];
        for (const candidate of candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(fromPeerId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          roomCode,
          toPeerId: fromPeerId,
          answer: pc.localDescription
        });
      } catch (error) {
        console.error(`[WebRTC] Failed to handle offer from ${fromPeerId}:`, error);
      }
    };

    // Handle answer from peer
    const handleAnswer = async ({ fromPeerId, answer }: { fromPeerId: string; answer: RTCSessionDescriptionInit }) => {
      console.log(`[WebRTC] Received answer from ${fromPeerId}`);

      const pc = peerConnections.current.get(fromPeerId);
      if (!pc) {
        console.warn(`[WebRTC] No connection found for ${fromPeerId}`);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Apply pending candidates
        const candidates = pendingCandidates.current.get(fromPeerId) || [];
        for (const candidate of candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(fromPeerId);
      } catch (error) {
        console.error(`[WebRTC] Failed to handle answer from ${fromPeerId}:`, error);
      }
    };

    // Handle ICE candidate from peer
    const handleIceCandidate = async ({ fromPeerId, candidate }: { fromPeerId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromPeerId);

      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error(`[WebRTC] Failed to add ICE candidate from ${fromPeerId}:`, error);
        }
      } else {
        // Queue candidate for later
        const pending = pendingCandidates.current.get(fromPeerId) || [];
        pending.push(candidate);
        pendingCandidates.current.set(fromPeerId, pending);
      }
    };

    // Handle peer leaving
    const handlePeerLeft = ({ peerId }: { peerId: string }) => {
      console.log(`[WebRTC] Peer left: ${peerId}`);

      const pc = peerConnections.current.get(peerId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(peerId);
      }

      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });

      // Clean up volume manager
      audioVolumeManager.removePeer(peerId);
    };

    socket.on('webrtc:peer-enabled-video', handlePeerEnabledVideo);
    socket.on('webrtc:peer-disabled-video', handlePeerDisabledVideo);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:peer-left', handlePeerLeft);

    console.log('[WebRTC] Registered socket event handlers');

    return () => {
      socket.off('webrtc:peer-enabled-video', handlePeerEnabledVideo);
      socket.off('webrtc:peer-disabled-video', handlePeerDisabledVideo);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:peer-left', handlePeerLeft);
    };
  }, [socket, roomCode, localStream, createPeerConnection]);

  // Connect to known video peers when we get our local stream
  // This handles the case where we received peer-enabled-video before we had our stream
  useEffect(() => {
    if (!socket || !localStream || !isVideoChatActive) return;

    const connectToKnownPeers = async () => {
      console.log(`[WebRTC] Checking for known video peers to connect to: ${videoPeersRef.current.size} peers`);

      for (const peerId of videoPeersRef.current) {
        if (peerId === socket.id) continue;

        const existingPc = peerConnections.current.get(peerId);
        if (existingPc && existingPc.connectionState !== 'failed') {
          console.log(`[WebRTC] Already connected to ${peerId}, skipping`);
          continue;
        }

        // Check if we should initiate (higher ID initiates)
        // IMPORTANT: Must match logic in connectToConversationPeers and handlePeerEnabledVideo
        const shouldInitiate = socket.id && socket.id > peerId;
        console.log(`[WebRTC] Checking peer ${peerId}: shouldInitiate=${shouldInitiate}`);

        if (shouldInitiate) {
          console.log(`[WebRTC] Initiating connection to known peer ${peerId}`);
          const pc = createPeerConnection(peerId);

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('webrtc:offer', {
              roomCode,
              toPeerId: peerId,
              offer: pc.localDescription
            });
            console.log(`[WebRTC] Sent offer to known peer ${peerId}`);
          } catch (error) {
            console.error(`[WebRTC] Failed to create offer for ${peerId}:`, error);
          }
        }
      }
    };

    // Small delay to ensure everything is set up
    const timeoutId = setTimeout(connectToKnownPeers, 100);
    return () => clearTimeout(timeoutId);
  }, [socket, roomCode, localStream, isVideoChatActive, createPeerConnection]);

  // Cleanup on unmount - use ref to avoid dependency on stopMedia callback
  useEffect(() => {
    return () => {
      // Inline cleanup to avoid dependency chain issues
      // stopMedia depends on localStream, which causes the cleanup to fire on every stream change
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      console.log('[WebRTC] Cleanup on unmount');
    };
  }, []); // Empty deps - only runs on actual unmount

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo<WebRTCContextState>(() => ({
    localStream,
    isVideoChatActive,
    isCameraEnabled,
    isAudioEnabled,
    isVideoEnabled: isVideoChatActive, // Legacy alias for backwards compatibility
    remoteStreams,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
    isVideoPrepairing,
    prepareVideoChat,
    confirmVideoChat,
    cancelVideoPreparation,
    disableVideoChat,
    autoEnableVideoChat,
    isConnecting,
    connectionError,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCamera,
    setSelectedMicrophone,
    availableDevices,
    refreshDevices,
    conversationPeers,
    connectToConversationPeers,
    disconnectFromConversationPeers
  }), [
    localStream,
    isVideoChatActive,
    isCameraEnabled,
    isAudioEnabled,
    remoteStreams,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
    isVideoPrepairing,
    prepareVideoChat,
    confirmVideoChat,
    cancelVideoPreparation,
    disableVideoChat,
    autoEnableVideoChat,
    isConnecting,
    connectionError,
    selectedCameraId,
    selectedMicrophoneId,
    setSelectedCamera,
    setSelectedMicrophone,
    availableDevices,
    refreshDevices,
    conversationPeers,
    connectToConversationPeers,
    disconnectFromConversationPeers
  ]);

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

export default WebRTCContext;
