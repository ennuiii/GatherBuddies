---
phase: 2-social-features
plan: 03
type: execute
---

<objective>
Connect WebRTC video calls to proximity/conversation state changes.

Purpose: Automatically establish video connections when players enter conversations, disconnect when they leave.
Output: Proximity-triggered WebRTC connections using existing WebRTCContext infrastructure.
</objective>

<execution_context>
~/.claude/get-shit-done/workflows/execute-phase.md
~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/2-social-features/2-RESEARCH.md
@.planning/phases/2-social-features/2-CONTEXT.md
@.planning/phases/1.5-integration/1.5-02-SUMMARY.md

**Key files:**
@GameBuddiesHub/client/src/contexts/WebRTCContext.tsx
@GameBuddiesHub/client/src/game/events/EventCenter.ts
@GameBuddiesHub/client/src/services/colyseusService.ts

**Tech stack available:**
- WebRTCContext with STUN/TURN configuration (mobile-ready)
- H.264 codec preference (iOS-ready)
- Device selection
- EventCenter for Phaser-React communication

**Pattern from research:**
- Use existing WebRTCContext infrastructure (Native WebRTC, not PeerJS)
- Listen for proximity events from Phaser
- Trigger peer connections based on conversation membership
- Template already has: getICEServers(), setH264CodecPreference(), addEnhancedDiagnostics()

**Constraining decisions:**
- Keep existing WebRTCContext architecture
- Only connect to players in same conversation
- Don't hand-roll WebRTC - use existing infrastructure
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create proximity-aware connection hook</name>
  <files>GameBuddiesHub/client/src/hooks/useProximityVideo.ts</files>
  <action>
Create new hook that bridges Phaser proximity events to WebRTC.

```typescript
import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import EventCenter from '../game/events/EventCenter';

/**
 * Hook that connects WebRTC to Phaser proximity events.
 * When players enter/leave proximity, triggers video connections.
 */
export function useProximityVideo(enabled: boolean = true) {
  const {
    localStream,
    startMedia,
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

    EventCenter.on('proximity:connect', handleProximityConnect);
    EventCenter.on('proximity:disconnect', handleProximityDisconnect);

    return () => {
      EventCenter.off('proximity:connect', handleProximityConnect);
      EventCenter.off('proximity:disconnect', handleProximityDisconnect);
    };
  }, [enabled]);

  return {
    proximityPeers: proximityPeersRef.current,
    isVideoChatActive,
    remoteStreams
  };
}
```

Export from hooks/index.ts.
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>useProximityVideo hook created, tracks proximity peers via EventCenter</done>
</task>

<task type="auto">
  <name>Task 2: Add conversation-triggered video connections to WebRTCContext</name>
  <files>GameBuddiesHub/client/src/contexts/WebRTCContext.tsx</files>
  <action>
Extend WebRTCContext to handle conversation-based connections.

Add new methods to context interface:
```typescript
// Conversation-based connections
connectToConversationPeers: (peerIds: string[]) => Promise<void>;
disconnectFromConversationPeers: (peerIds: string[]) => Promise<void>;
conversationPeers: Set<string>;
```

Add state:
```typescript
const [conversationPeers, setConversationPeers] = useState<Set<string>>(new Set());
```

Implement connectToConversationPeers:
- For each peerId in list that we're not already connected to
- Create RTCPeerConnection with getICEServers()
- Add local tracks
- Set H.264 codec preference
- Create offer and send via socket
- Track in peerConnections ref and conversationPeers state

Implement disconnectFromConversationPeers:
- For each peerId in list
- Close RTCPeerConnection
- Remove from peerConnections ref
- Remove remote stream from remoteStreams
- Update conversationPeers state

The existing signaling handlers (webrtc:offer, webrtc:answer, webrtc:ice-candidate) should continue to work.

Important: Only initiate connection from higher sessionId (prevents duplicates).
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>WebRTCContext has conversation-aware connection methods</done>
</task>

<task type="auto">
  <name>Task 3: Wire conversation state changes to video connections</name>
  <files>GameBuddiesHub/client/src/hooks/useConversationVideo.ts</files>
  <action>
Create hook that listens to Colyseus conversation state and triggers video connections.

```typescript
import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { getColyseusRoom } from '../services/colyseusService';

/**
 * Hook that connects/disconnects video based on conversation membership.
 * Listens to Colyseus state for conversation changes.
 */
export function useConversationVideo() {
  const {
    connectToConversationPeers,
    disconnectFromConversationPeers,
    localStream,
    startMedia
  } = useWebRTC();

  const currentConversationRef = useRef<string>('');
  const currentPeersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const room = getColyseusRoom();
    if (!room) return;

    const state = room.state as any;
    const mySessionId = room.sessionId;

    // Watch for changes to my conversationId
    const checkConversationChange = () => {
      const myPlayer = state.players.get(mySessionId);
      if (!myPlayer) return;

      const newConversationId = myPlayer.conversationId || '';

      if (newConversationId !== currentConversationRef.current) {
        // Conversation changed
        const oldPeers = new Set(currentPeersRef.current);

        if (newConversationId === '') {
          // Left conversation - disconnect from all peers
          disconnectFromConversationPeers([...oldPeers]);
          currentPeersRef.current.clear();
        } else {
          // Joined/changed conversation - find new peers
          const newPeers = new Set<string>();
          state.players.forEach((player: any, sessionId: string) => {
            if (sessionId !== mySessionId && player.conversationId === newConversationId) {
              newPeers.add(sessionId);
            }
          });

          // Disconnect from peers no longer in conversation
          const toDisconnect = [...oldPeers].filter(id => !newPeers.has(id));
          if (toDisconnect.length > 0) {
            disconnectFromConversationPeers(toDisconnect);
          }

          // Connect to new peers
          const toConnect = [...newPeers].filter(id => !oldPeers.has(id));
          if (toConnect.length > 0 && localStream) {
            connectToConversationPeers(toConnect);
          }

          currentPeersRef.current = newPeers;
        }

        currentConversationRef.current = newConversationId;
      }
    };

    // Initial check
    checkConversationChange();

    // Subscribe to player changes
    state.players.onAdd((player: any, sessionId: string) => {
      player.listen('conversationId', () => {
        checkConversationChange();
      });
    });

    // Also check when any player's conversationId changes
    state.players.forEach((player: any, sessionId: string) => {
      player.listen('conversationId', () => {
        checkConversationChange();
      });
    });

    return () => {
      // Cleanup handled by WebRTCContext
    };
  }, [connectToConversationPeers, disconnectFromConversationPeers, localStream]);
}
```

Export from hooks/index.ts.

Use this hook in GamePage component to activate conversation-based video.
  </action>
  <verify>
1. `cd GameBuddiesHub/client && npx tsc --noEmit` passes
2. Manual test: Two players approach each other, start conversation, video connects
3. Manual test: One player leaves conversation, video disconnects
  </verify>
  <done>Conversation state changes trigger WebRTC connect/disconnect automatically</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddiesHub/client && npx tsc --noEmit` passes
- [ ] Video connections established when conversation starts
- [ ] Video connections close when leaving conversation
- [ ] Only one side initiates connection (higher sessionId)
- [ ] Multiple peers in conversation all get connected
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No TypeScript errors
- Video automatically follows conversation state
- Uses existing WebRTC infrastructure (STUN/TURN, H.264)
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-03-SUMMARY.md`:

# Phase 2 Plan 03: Video Connections Summary

**[One-liner: What was built]**

## Accomplishments
- [Key outcomes]

## Files Created/Modified
- `path/to/file.ts` - Description

## Decisions Made
[Key decisions and rationale]

## Issues Encountered
[Problems and resolutions]

## Next Step
Ready for 2-04-PLAN.md (Audio Routing)
</output>
