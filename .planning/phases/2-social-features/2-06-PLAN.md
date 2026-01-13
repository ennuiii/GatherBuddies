---
phase: 2-social-features
plan: 06
type: execute
---

<objective>
Add visual conversation indicators and video grid display.

Purpose: Show conversation boundaries visually in Phaser and display video feeds in a grid panel.
Output: Conversation circles with lock icons in Phaser, video grid panel in React.
</objective>

<execution_context>
~/.claude/get-shit-done/workflows/execute-phase.md
~/.claude/get-shit-done/templates/summary.md
~/.claude/get-shit-done/references/checkpoints.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/2-social-features/2-CONTEXT.md
@.planning/phases/2-social-features/2-RESEARCH.md

**Key files:**
@GameBuddiesHub/client/src/game/scenes/Game.ts
@GameBuddiesHub/client/src/pages/GamePage.tsx
@GameBuddiesHub/client/src/contexts/WebRTCContext.tsx

**Tech stack available:**
- Phaser 3 graphics for drawing shapes
- React + Tailwind for video grid
- Colyseus state for conversation data

**Pattern from research (CONTEXT.md):**
- Visual circle/line drawn around avatars in conversation
- Lock icon when conversation is locked
- Video display: SkyOffice grid approach (NOT filmstrip)

**Constraining decisions:**
- Video grid in side panel (React), not embedded in Phaser canvas
- Conversation indicators drawn in Phaser scene
- Join request UI: "Press E to request join" prompt
</context>

<tasks>

<task type="auto">
  <name>Task 1: Draw conversation indicators in Game scene</name>
  <files>GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
Add graphics layer for conversation indicators.

Add properties:
```typescript
private conversationGraphics!: Phaser.GameObjects.Graphics;
private lockIcon?: Phaser.GameObjects.Image;
```

In create(), after tilemap setup:
```typescript
// Graphics layer for conversation indicators
this.conversationGraphics = this.add.graphics();
this.conversationGraphics.setDepth(999);

// Load lock icon if not already loaded (add to Bootstrap preload)
// For now use a simple shape if image not available
```

Add method to draw conversation boundaries:
```typescript
private drawConversationIndicators(): void {
  this.conversationGraphics.clear();

  const state = this.room.state as any;
  const conversations = new Map<string, { players: Array<{x: number, y: number}>, locked: boolean }>();

  // Group players by conversationId
  state.players.forEach((player: any, sessionId: string) => {
    if (!player.conversationId) return;

    let conv = conversations.get(player.conversationId);
    if (!conv) {
      // Find conversation locked state
      const convState = state.conversations?.get(player.conversationId);
      conv = { players: [], locked: convState?.locked || false };
      conversations.set(player.conversationId, conv);
    }

    // Get player position
    if (sessionId === this.room.sessionId && this.myPlayer) {
      conv.players.push({ x: this.myPlayer.x, y: this.myPlayer.y });
    } else if (this.otherPlayerMap.has(sessionId)) {
      const other = this.otherPlayerMap.get(sessionId)!;
      conv.players.push({ x: other.x, y: other.y });
    }
  });

  // Draw indicator for each conversation
  conversations.forEach((conv, convId) => {
    if (conv.players.length < 2) return;

    // Calculate center and radius
    let centerX = 0, centerY = 0;
    conv.players.forEach(p => {
      centerX += p.x;
      centerY += p.y;
    });
    centerX /= conv.players.length;
    centerY /= conv.players.length;

    // Calculate radius to encompass all players + padding
    let maxDist = 0;
    conv.players.forEach(p => {
      const dist = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
      if (dist > maxDist) maxDist = dist;
    });
    const radius = maxDist + 40; // padding

    // Draw circle
    this.conversationGraphics.lineStyle(3, conv.locked ? 0xff6b6b : 0x4CAF50, 0.6);
    this.conversationGraphics.strokeCircle(centerX, centerY, radius);

    // Fill with semi-transparent
    this.conversationGraphics.fillStyle(conv.locked ? 0xff6b6b : 0x4CAF50, 0.1);
    this.conversationGraphics.fillCircle(centerX, centerY, radius);

    // Draw lock icon if locked (simple text for now)
    if (conv.locked) {
      // Could use an image, but text works
      // The lock indicator is already shown by the red color
    }
  });
}
```

Call drawConversationIndicators() in update() loop (throttle to every 100ms to save perf):
```typescript
private lastIndicatorUpdate = 0;

update(t: number, dt: number) {
  // ... existing update code

  // Update conversation indicators periodically
  if (t - this.lastIndicatorUpdate > 100) {
    this.drawConversationIndicators();
    this.lastIndicatorUpdate = t;
  }
}
```
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>Conversation circles drawn around grouped players, red for locked, green for open</done>
</task>

<task type="auto">
  <name>Task 2: Create video grid component</name>
  <files>GameBuddiesHub/client/src/components/game/VideoGrid.tsx</files>
  <action>
Create video grid component that displays remote streams in a grid layout (SkyOffice style).

```typescript
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
          muted={true}  // Audio routed through Web Audio API
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
```

Export from components/game/index.ts.
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>VideoGrid component displays local + remote videos in grid layout</done>
</task>

<task type="auto">
  <name>Task 3: Integrate VideoGrid and ChatInput into GamePage</name>
  <files>GameBuddiesHub/client/src/pages/GamePage.tsx</files>
  <action>
Add VideoGrid and ChatInput to the GamePage sidebar.

Import components:
```typescript
import { VideoGrid, ChatInput } from '../components/game';
```

In the GamePage JSX, find the sidebar section and add:
```typescript
{/* Video Grid */}
<div className="mb-4">
  <h3 className="text-white text-sm font-medium mb-2">Video Chat</h3>
  <VideoGrid maxVideos={4} />
</div>

{/* Chat */}
<div className="mt-auto">
  <h3 className="text-white text-sm font-medium mb-2">Chat</h3>
  <ChatInput />
</div>
```

Make sure the sidebar has proper flex layout to accommodate both:
```typescript
<div className="w-64 bg-gray-800 flex flex-col h-full p-4">
  {/* Video at top */}
  {/* Chat at bottom with mt-auto */}
</div>
```

Ensure useConversationVideo hook is called to activate conversation-based video:
```typescript
import { useConversationVideo } from '../hooks';

// In GamePage component
useConversationVideo();
```
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>GamePage has VideoGrid and ChatInput in sidebar</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Full social features: proximity detection, conversation locking, video chat, audio isolation, text chat with speech bubbles, visual indicators, video grid</what-built>
  <how-to-verify>
    1. Start server: `cd GameBuddieGamesServer && npm run dev`
    2. Start client: `cd GameBuddiesHub/client && npm run dev`
    3. Open two browser tabs to http://localhost:5200/hub/
    4. Create/join same room in both tabs
    5. Test proximity:
       - Walk avatars near each other (WASD)
       - Should see green circle appear around both avatars
       - Video feeds should connect automatically
    6. Test conversation:
       - While in conversation, should hear each other (if unmuted)
       - Walk apart - video should disconnect after 750ms
       - Circle should disappear
    7. Test chat:
       - Type message and send
       - Should see speech bubble above avatar
       - Should see message in chat panel
    8. Test lock (if implemented):
       - Third player approaches locked conversation
       - Should see red circle
       - Should see "Press E to join" prompt
  </how-to-verify>
  <resume-signal>Type "approved" if all features work, or describe specific issues to fix</resume-signal>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddiesHub/client && npx tsc --noEmit` passes
- [ ] Conversation circles appear around players in conversations
- [ ] Lock indicator (red) shown for locked conversations
- [ ] Video grid displays local and remote video feeds
- [ ] All social features work end-to-end (human verification)
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- Human verification approved
- Phase 2 social features complete
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-06-SUMMARY.md`:

# Phase 2 Plan 06: Visual UI Summary

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
Phase 2 complete. Ready for Phase 3 (Game Integration)
</output>
