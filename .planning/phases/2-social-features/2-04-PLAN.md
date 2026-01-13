---
phase: 2-social-features
plan: 04
type: execute
---

<objective>
Implement audio isolation for conversations using Web Audio API.

Purpose: Players in a conversation hear only each other (isolated), while players not in conversations hear ambient room audio.
Output: ConversationAudioRouter service with gain-based audio isolation.
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

**Key files:**
@GameBuddiesHub/client/src/contexts/WebRTCContext.tsx

**Tech stack available:**
- Web Audio API (browser native)
- WebRTCContext with remote streams

**Pattern from research:**
```typescript
const audioContext = new AudioContext()

function routeAudioStream(stream: MediaStream, isInMyConversation: boolean) {
  const source = audioContext.createMediaStreamSource(stream)
  const gainNode = audioContext.createGain()

  gainNode.gain.value = isInMyConversation ? 1.0 : 0.0

  source.connect(gainNode)
  gainNode.connect(audioContext.destination)

  return { source, gainNode }
}
```

**Constraining decisions:**
- Single shared AudioContext (don't create per stream)
- Conversation members: gain = 1.0 (full volume)
- Non-conversation audio: gain = 0.0 (muted) or low for ambient
- Smooth transitions (setTargetAtTime) to avoid clicks
- Explicitly disconnect() nodes when player leaves (prevent memory leaks)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ConversationAudioRouter service</name>
  <files>GameBuddiesHub/client/src/services/conversationAudioRouter.ts</files>
  <action>
Create audio routing service that manages gain nodes for each remote stream.

```typescript
/**
 * ConversationAudioRouter
 *
 * Routes remote audio streams through gain nodes for conversation isolation.
 * Players in the same conversation hear each other at full volume.
 * Players outside conversations hear ambient audio (or muted based on config).
 */

interface AudioNodes {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
}

class ConversationAudioRouter {
  private audioContext: AudioContext | null = null;
  private audioNodes = new Map<string, AudioNodes>();
  private myConversationId: string = '';

  // Initialize AudioContext (call on user gesture)
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();

    // Resume if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('[AudioRouter] Initialized');
  }

  // Attach a remote stream for audio routing
  attachStream(
    playerId: string,
    stream: MediaStream,
    playerConversationId: string
  ): void {
    if (!this.audioContext) {
      console.warn('[AudioRouter] Not initialized');
      return;
    }

    // Remove existing if re-attaching
    this.removeStream(playerId);

    const source = this.audioContext.createMediaStreamSource(stream);
    const gain = this.audioContext.createGain();

    // Set initial gain based on conversation membership
    const isInMyConversation =
      this.myConversationId !== '' &&
      playerConversationId === this.myConversationId;

    gain.gain.value = isInMyConversation ? 1.0 : 0.0;

    source.connect(gain);
    gain.connect(this.audioContext.destination);

    this.audioNodes.set(playerId, { source, gain });

    console.log(`[AudioRouter] Attached stream for ${playerId}, gain=${gain.gain.value}`);
  }

  // Update when conversation membership changes
  updateConversationMembership(
    playerId: string,
    playerConversationId: string
  ): void {
    const nodes = this.audioNodes.get(playerId);
    if (!nodes || !this.audioContext) return;

    const isInMyConversation =
      this.myConversationId !== '' &&
      playerConversationId === this.myConversationId;

    const targetGain = isInMyConversation ? 1.0 : 0.0;

    // Smooth transition to avoid clicks
    nodes.gain.gain.setTargetAtTime(
      targetGain,
      this.audioContext.currentTime,
      0.1 // 100ms time constant
    );

    console.log(`[AudioRouter] Updated ${playerId} gain to ${targetGain}`);
  }

  // Update my conversation ID (call when local player joins/leaves conversation)
  setMyConversation(conversationId: string): void {
    this.myConversationId = conversationId;

    // Update all streams based on new conversation state
    // (Caller should provide updated player conversation IDs)
    console.log(`[AudioRouter] My conversation set to: ${conversationId || 'none'}`);
  }

  // Remove stream when player disconnects
  removeStream(playerId: string): void {
    const nodes = this.audioNodes.get(playerId);
    if (nodes) {
      nodes.source.disconnect();
      nodes.gain.disconnect();
      this.audioNodes.delete(playerId);
      console.log(`[AudioRouter] Removed stream for ${playerId}`);
    }
  }

  // Cleanup all
  dispose(): void {
    this.audioNodes.forEach((nodes, playerId) => {
      nodes.source.disconnect();
      nodes.gain.disconnect();
    });
    this.audioNodes.clear();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('[AudioRouter] Disposed');
  }
}

// Singleton instance
export const conversationAudioRouter = new ConversationAudioRouter();
```
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>ConversationAudioRouter service with gain-based isolation, smooth transitions, proper cleanup</done>
</task>

<task type="auto">
  <name>Task 2: Integrate audio router with WebRTCContext</name>
  <files>GameBuddiesHub/client/src/contexts/WebRTCContext.tsx</files>
  <action>
Import and use conversationAudioRouter when remote streams are added/removed.

At top of file:
```typescript
import { conversationAudioRouter } from '../services/conversationAudioRouter';
```

When a new remote stream is received (in the existing ontrack handler or when adding to remoteStreams):
```typescript
// After adding stream to remoteStreams
conversationAudioRouter.attachStream(
  peerId,
  stream,
  '' // Conversation ID will be updated by conversation hook
);
```

When closing a peer connection:
```typescript
conversationAudioRouter.removeStream(peerId);
```

Initialize audio router when starting media (needs user gesture):
```typescript
// In startMedia function, after getting localStream
await conversationAudioRouter.initialize();
```

Dispose in cleanup:
```typescript
// In stopMedia or context cleanup
conversationAudioRouter.dispose();
```

Important: The video element for remote streams should be muted (muted={true}) since audio is now routed through Web Audio API. Otherwise there will be double audio.
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>Audio router integrated with WebRTCContext, streams routed through gain nodes</done>
</task>

<task type="auto">
  <name>Task 3: Connect audio routing to conversation state</name>
  <files>GameBuddiesHub/client/src/hooks/useConversationVideo.ts</files>
  <action>
Extend useConversationVideo hook (or create separate useConversationAudio hook) to update audio routing when conversation state changes.

Add to the hook:
```typescript
import { conversationAudioRouter } from '../services/conversationAudioRouter';
```

When my conversation changes:
```typescript
// In the conversation change handler
conversationAudioRouter.setMyConversation(newConversationId);
```

When any player's conversation changes, update their audio:
```typescript
// After detecting conversation change for a player
const room = getColyseusRoom();
if (room) {
  room.state.players.forEach((player: any, sessionId: string) => {
    if (sessionId !== room.sessionId) {
      conversationAudioRouter.updateConversationMembership(
        sessionId,
        player.conversationId || ''
      );
    }
  });
}
```

This ensures:
- When I join a conversation, I hear only those members
- When I leave a conversation, all remote audio is muted (or ambient)
- When someone else joins/leaves my conversation, their audio updates
  </action>
  <verify>
1. `cd GameBuddiesHub/client && npx tsc --noEmit` passes
2. Manual test: Two players in conversation hear each other
3. Manual test: Third player outside conversation does NOT hear conversation audio
4. Manual test: Player leaving conversation - audio properly isolates
  </verify>
  <done>Audio isolation works based on conversation membership, smooth gain transitions</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddiesHub/client && npx tsc --noEmit` passes
- [ ] Players in same conversation hear each other
- [ ] Players outside conversation don't hear conversation audio
- [ ] No audio clicks when conversation state changes (smooth transitions)
- [ ] No memory leaks (streams properly disconnected)
- [ ] Video elements are muted (audio through Web Audio API only)
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No TypeScript errors
- Audio properly isolated by conversation
- No echo/double audio issues
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-04-SUMMARY.md`:

# Phase 2 Plan 04: Audio Routing Summary

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
Ready for 2-05-PLAN.md (Text Chat)
</output>
