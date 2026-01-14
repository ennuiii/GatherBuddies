/**
 * Game Page
 *
 * Main game view. Routes to game-specific components based on game phase.
 * Desktop: Two-column layout (game area + sidebar)
 * Mobile: Full-width with hamburger menu
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Lobby, ChatMessage } from '../types';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import type { WebcamPlayer } from '../config/WebcamConfig';
import { GameHeader, SidebarTabs } from '../components/core';
import type { SidebarTab } from '../components/core';
import { ChatWindow, PlayerList } from '../components/lobby';
import { MobileDrawer } from '../components/mobile';
import type { DrawerContent } from '../components/mobile';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useIsMobile, useConversationVideo, useProximityVideo } from '../hooks';
import { PhaserGame, VideoGrid, ChatInput } from '../components/game';
import { RemoteAudioPlayer } from '../components/audio/RemoteAudioPlayer';

interface GamePageProps {
  lobby: Lobby;
  messages: ChatMessage[];
  gameBuddiesSession?: GameBuddiesSession | null;
  onLeave: () => void;
}

const GamePage: React.FC<GamePageProps> = ({
  lobby,
  messages,
  gameBuddiesSession,
  onLeave
}) => {
  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasAutoOpenedVideoRef = useRef(false);

  // Sidebar tabs state
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('players');
  const lastMessageCountRef = useRef(messages.length);

  const {
    prepareVideoChat,
    isVideoChatActive,
    disableVideoChat,
    autoEnableVideoChat,
    localStream,
    remoteStreams,
    connectionError
  } = useWebRTC();
  const isMobile = useIsMobile();
  const hasRequestedPermissions = useRef(false);
  const [videoStatus, setVideoStatus] = useState<string>('Initializing...');

  // Auto-request video/mic permissions when game launches
  // This enables proximity-based video to work automatically
  useEffect(() => {
    if (hasRequestedPermissions.current) return;
    hasRequestedPermissions.current = true;

    const requestPermissions = async () => {
      try {
        setVideoStatus('Requesting permissions...');
        console.log('[GamePage] Auto-requesting video/mic permissions...');

        // Auto-enable video chat (will request permissions)
        // Audio playback is now handled by RemoteAudioPlayer component
        await autoEnableVideoChat();

        setVideoStatus('Video enabled');
        console.log('[GamePage] Video/mic permissions granted, video enabled');
      } catch (error) {
        console.warn('[GamePage] Failed to auto-enable video:', error);
        setVideoStatus('Permission denied - click to enable');
        // User denied permissions - that's OK, they can enable manually later
      }
    };

    // Small delay to ensure component is fully mounted
    const timeoutId = setTimeout(requestPermissions, 500);
    return () => clearTimeout(timeoutId);
  }, [autoEnableVideoChat]);

  // Update video status based on connection state
  useEffect(() => {
    if (connectionError) {
      setVideoStatus(`Error: ${connectionError}`);
    } else if (isVideoChatActive && localStream) {
      const peerCount = remoteStreams.size;
      if (peerCount > 0) {
        setVideoStatus(`Connected (${peerCount} peer${peerCount > 1 ? 's' : ''})`);
      } else {
        setVideoStatus('Video active - walk near others');
      }
    } else if (isVideoChatActive) {
      setVideoStatus('Starting video...');
    }
  }, [isVideoChatActive, localStream, remoteStreams.size, connectionError]);

  // Activate conversation-based video connections (handles private conversation mode)
  useConversationVideo();

  // Activate proximity-based audio connections (audio-only, volume fades with distance)
  // This is now compatible with useConversationVideo - it clears tracking when in conversation
  const { isInConversation } = useProximityVideo();

  // Track unread messages when chat tab is not active (desktop sidebar)
  useEffect(() => {
    if (activeSidebarTab === 'chat') {
      // Clear unread when viewing chat
      setUnreadCount(0);
      lastMessageCountRef.current = messages.length;
    } else {
      // Count new messages since last view
      const newMessages = messages.length - lastMessageCountRef.current;
      if (newMessages > 0) {
        setUnreadCount(prev => prev + newMessages);
        lastMessageCountRef.current = messages.length;
      }
    }
  }, [messages.length, activeSidebarTab]);

  const handleOpenChat = useCallback(() => {
    setDrawerContent('chat');
    setUnreadCount(0);
  }, []);

  const handleOpenPlayers = useCallback(() => {
    setDrawerContent('players');
  }, []);

  const handleOpenVideo = useCallback(() => {
    // Video is only available in private conversations
    if (!isInConversation) return;

    if (isVideoChatActive) {
      setDrawerContent('video');
    } else {
      prepareVideoChat();
    }
  }, [isInConversation, isVideoChatActive, prepareVideoChat]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerContent(null);
  }, []);

  // Reset auto-open flag when video becomes inactive or when leaving conversation
  useEffect(() => {
    if (!isVideoChatActive || !isInConversation) {
      hasAutoOpenedVideoRef.current = false;
    }
  }, [isVideoChatActive, isInConversation]);

  // Auto-open video drawer ONCE when entering conversation on mobile
  useEffect(() => {
    if (isMobile && isInConversation && isVideoChatActive && !hasAutoOpenedVideoRef.current) {
      hasAutoOpenedVideoRef.current = true;
      setDrawerContent('video');
    }
  }, [isMobile, isInConversation, isVideoChatActive]);

  // Build webcam players list for mobile video drawer (memoized to prevent unnecessary re-renders)
  const webcamPlayers: WebcamPlayer[] = useMemo(() =>
    lobby.players
      .filter(p => p.socketId !== lobby.mySocketId)
      .map(p => ({
        id: p.socketId,
        name: p.name,
        avatarUrl: p.avatarUrl
      })),
    [lobby.players, lobby.mySocketId]
  );

  return (
    <>
      {/* Remote audio player - renders hidden <audio> elements for WebRTC streams */}
      <RemoteAudioPlayer />

      {/* app-layout is the flex child that shrinks when filmstrip grows */}
      <div className="app-layout game-page">
        {/* Header */}
        <GameHeader
          lobby={lobby}
          gameBuddiesSession={gameBuddiesSession}
          onOpenChat={handleOpenChat}
          onOpenPlayers={handleOpenPlayers}
          onOpenVideo={handleOpenVideo}
          unreadChatCount={unreadCount}
          isInConversation={isInConversation}
        />

        {/* game-content-wrapper: flex row with main + sidebar */}
        <div className="game-content-wrapper">
          {/* main-scroll-area: scrollable main content - Phaser game canvas */}
          <div className="main-scroll-area">
            <PhaserGame
              roomCode={lobby.code}
              playerName={lobby.players.find(p => p.socketId === lobby.mySocketId)?.name || 'Player'}
            />
          </div>{/* end main-scroll-area */}

          {/* right-sidebar: Desktop sidebar */}
          <aside className="right-sidebar desktop-only flex flex-col h-full">
            {/* Audio status - always visible so users can enable if needed */}
            {!isInConversation && (
              <div className="p-2 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Proximity Audio</span>
                  {isVideoChatActive && localStream ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">Active</span>
                  ) : connectionError ? (
                    <button
                      onClick={() => prepareVideoChat()}
                      className="text-xs px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white"
                    >
                      Enable Audio
                    </button>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-600 text-white">Starting...</span>
                  )}
                </div>
              </div>
            )}

            {/* Video Grid - ONLY shown when in a private conversation */}
            {isInConversation && (
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white text-sm font-medium">Private Conversation</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    isVideoChatActive && localStream
                      ? 'bg-green-600 text-white'
                      : connectionError
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                  }`}>
                    {videoStatus}
                  </span>
                </div>
                <VideoGrid maxVideos={4} />
              </div>
            )}

            {/* Players/Chat tabs in middle */}
            <div className="flex-1 overflow-hidden">
              <SidebarTabs
                activeTab={activeSidebarTab}
                onTabChange={setActiveSidebarTab}
                playerCount={lobby.players.filter(p => p.connected).length}
                unreadCount={unreadCount}
              >
                {activeSidebarTab === 'players' ? (
                  <PlayerList
                    players={lobby.players}
                    mySocketId={lobby.mySocketId}
                  />
                ) : (
                  <ChatWindow
                    messages={messages}
                    roomCode={lobby.code}
                    mySocketId={lobby.mySocketId}
                  />
                )}
              </SidebarTabs>
            </div>

            {/* Chat input at bottom */}
            <div className="p-2 border-t border-gray-700">
              <ChatInput />
            </div>
          </aside>
        </div>{/* end game-content-wrapper */}
      </div>{/* end app-layout */}

      {/* MobileDrawer outside app-layout */}
      <MobileDrawer
        isOpen={drawerContent !== null}
        content={drawerContent}
        onClose={handleCloseDrawer}
        messages={messages}
        roomCode={lobby.code}
        mySocketId={lobby.mySocketId}
        players={lobby.players}
        webcamPlayers={webcamPlayers}
        localPlayerName={lobby.players.find(p => p.socketId === lobby.mySocketId)?.name}
        onLeaveVideo={disableVideoChat}
        teams={lobby.gameData?.teams || []}
      />
    </>
  );
};

export default GamePage;
