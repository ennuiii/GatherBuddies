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
import { useIsMobile } from '../hooks/useIsMobile';
import { PhaserGame } from '../components/game';

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

  const { prepareVideoChat, isVideoChatActive, disableVideoChat } = useWebRTC();
  const isMobile = useIsMobile();

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
    if (isVideoChatActive) {
      setDrawerContent('video');
    } else {
      prepareVideoChat();
    }
  }, [isVideoChatActive, prepareVideoChat]);

  const handleCloseDrawer = useCallback(() => {
    setDrawerContent(null);
  }, []);

  // Reset auto-open flag when video becomes inactive
  useEffect(() => {
    if (!isVideoChatActive) {
      hasAutoOpenedVideoRef.current = false;
    }
  }, [isVideoChatActive]);

  // Auto-open video drawer ONCE when video becomes active on mobile
  useEffect(() => {
    if (isMobile && isVideoChatActive && !hasAutoOpenedVideoRef.current) {
      hasAutoOpenedVideoRef.current = true;
      setDrawerContent('video');
    }
  }, [isMobile, isVideoChatActive]);

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
          <aside className="right-sidebar desktop-only">
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
