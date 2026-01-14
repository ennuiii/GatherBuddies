/**
 * Lobby Page
 *
 * Waiting room before game starts.
 * Desktop: Two-column layout (game area + sidebar)
 * Mobile: Full-width with hamburger menu for drawer access
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Play, Users, Copy, Check } from 'lucide-react';
import type { Lobby, ChatMessage } from '../types';
import type { GameBuddiesSession } from '../services/gameBuddiesSession';
import type { WebcamPlayer } from '../config/WebcamConfig';
import { t } from '../utils/translations';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { GameHeader, SidebarTabs } from '../components/core';
import type { SidebarTab } from '../components/core';
import { ChatWindow, PlayerList } from '../components/lobby';
import { MobileDrawer } from '../components/mobile';
import type { DrawerContent } from '../components/mobile';

interface LobbyPageProps {
  lobby: Lobby;
  messages: ChatMessage[];
  gameBuddiesSession?: GameBuddiesSession | null;
  onStartGame: () => void;
  onLeave: () => void;
}

const LobbyPage: React.FC<LobbyPageProps> = ({
  lobby,
  messages,
  gameBuddiesSession,
  onStartGame,
  onLeave
}) => {
  const [drawerContent, setDrawerContent] = useState<DrawerContent>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const hasAutoOpenedVideoRef = useRef(false);

  // Sidebar tabs state
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('players');
  const [unreadCount, setUnreadCount] = useState(0);
  const lastMessageCountRef = useRef(messages.length);

  const { prepareVideoChat, isVideoChatActive, disableVideoChat } = useWebRTC();
  const isMobile = useIsMobile();

  // Track unread messages when chat tab is not active
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

  const myPlayer = lobby.players.find(p => p.socketId === lobby.mySocketId);
  const isHost = myPlayer?.isHost || false;
  const connectedPlayers = lobby.players.filter(p => p.connected);
  const minPlayers = lobby.settings?.minPlayers || 1;
  const canStart = isHost && connectedPlayers.length >= minPlayers;

  // Build webcam players list for video modal (exclude self - local stream handled separately)
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

  const handleCopyLink = useCallback(async () => {
    const baseUrl = window.location.origin;
    const basePath = import.meta.env.BASE_URL || '/';
    const joinUrl = `${baseUrl}${basePath}?invite=${lobby.code}`;

    try {
      await navigator.clipboard.writeText(joinUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [lobby.code]);

  const handleOpenChat = useCallback(() => {
    setDrawerContent('chat');
  }, []);

  const handleOpenPlayers = useCallback(() => {
    setDrawerContent('players');
  }, []);

  const handleOpenVideo = useCallback(() => {
    if (isVideoChatActive) {
      // Already in video chat, just open the drawer
      setDrawerContent('video');
    } else {
      // Not in video chat yet, trigger setup modal first
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

  return (
    <>
      {/* app-layout is the flex child that shrinks when filmstrip grows */}
      <div className="app-layout lobby-page">
        {/* Header */}
        <GameHeader
          lobby={lobby}
          gameBuddiesSession={gameBuddiesSession}
          onOpenChat={handleOpenChat}
          onOpenPlayers={handleOpenPlayers}
          onOpenVideo={handleOpenVideo}
        />

        {/* game-content-wrapper: flex row with main + sidebar */}
        <div className="game-content-wrapper">
          {/* main-scroll-area: scrollable main content */}
          <div className="main-scroll-area">
            {/* Wrapper for proportional scaling */}
            <div className="lobby-content-wrapper">
              {/* Waiting Room Card */}
              <div className="lobby-waiting-card">
            <div className="lobby-waiting-header">
              <h2>{t('lobby.waitingForPlayers')}</h2>
              <p className="lobby-player-count">
                <Users className="w-4 h-4" />
                {connectedPlayers.length}/{lobby.maxPlayers || 8} {t('lobby.players')}
              </p>
            </div>

            {/* Room Code */}
            <div className="lobby-room-code-section">
              <p className="lobby-room-label">{t('lobby.shareCode')}</p>
              <div className="lobby-room-code-box">
                <span className="lobby-room-code">{lobby.code}</span>
                <button
                  onClick={handleCopyLink}
                  className="lobby-copy-btn"
                  title="Copy invite link"
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Player List (compact, mobile only) */}
            <div className="lobby-players-compact mobile-only">
              <PlayerList
                players={lobby.players}
                mySocketId={lobby.mySocketId}
                compact
              />
            </div>

            {/* Start Game Button (Host only) */}
            {isHost && (
              <div className="lobby-start-section">
                <button
                  onClick={onStartGame}
                  disabled={!canStart}
                  className="lobby-start-btn"
                >
                  <Play className="w-5 h-5" />
                  {t('lobby.startGame')}
                </button>
                {!canStart && (
                  <p className="lobby-start-hint">
                    {t('lobby.minPlayersRequired', { min: minPlayers })}
                  </p>
                )}
              </div>
            )}

            {!isHost && (
              <p className="lobby-waiting-host">{t('lobby.waitingForHost')}</p>
            )}
          </div>

              {/* Game-specific lobby content placeholder */}
              <div className="lobby-game-area">
                {/* TODO: Add game-specific lobby UI here */}
                {/* Examples: Game settings, team selection, character selection, etc. */}
              </div>
            </div>{/* end lobby-content-wrapper */}
          </div>{/* end main-scroll-area */}

          {/* right-sidebar: Desktop sidebar */}
          <aside className="right-sidebar desktop-only">
          <SidebarTabs
            activeTab={activeSidebarTab}
            onTabChange={setActiveSidebarTab}
            playerCount={connectedPlayers.length}
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
        localPlayerName={myPlayer?.name}
        onLeaveVideo={disableVideoChat}
        teams={lobby.gameData?.teams || []}
      />
    </>
  );
};

export default LobbyPage;
