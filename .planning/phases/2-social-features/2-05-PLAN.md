---
phase: 2-social-features
plan: 05
type: execute
---

<objective>
Implement text chat with speech bubbles above avatars.

Purpose: Allow players to communicate via text with visual speech bubbles and a chat panel.
Output: Speech bubbles in Phaser, chat panel in React, messages synced via Colyseus.
</objective>

<execution_context>
~/.claude/get-shit-done/workflows/execute-phase.md
~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/2-social-features/2-CONTEXT.md
@.planning/phases/1.5-integration/1.5-03-SUMMARY.md

**Key files:**
@GameBuddiesHub/client/src/game/characters/Player.ts
@GameBuddiesHub/client/src/game/scenes/Game.ts
@GameBuddieGamesServer/games/hub/schema/HubState.ts
@GameBuddieGamesServer/games/hub/HubRoom.ts

**Tech stack available:**
- Phaser 3 text/graphics for speech bubbles
- Colyseus ChatMessage schema (already exists)
- EventCenter for Phaser-React communication

**From Phase 1 (Player.ts has dialog bubble support):**
The Player class already has methods for dialog bubbles that can be extended.

**Constraining decisions:**
- Speech bubbles appear above avatar for 5-6 seconds
- Chat panel shows full history
- Messages sync via Colyseus (already implemented in HubRoom)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement speech bubble display in Player class</name>
  <files>GameBuddiesHub/client/src/game/characters/Player.ts</files>
  <action>
Extend the Player class to show speech bubbles when chat messages arrive.

Add properties:
```typescript
private dialogBubble?: Phaser.GameObjects.Container;
private dialogText?: Phaser.GameObjects.Text;
private bubbleTimer?: Phaser.Time.TimerEvent;
```

Add method to show speech bubble:
```typescript
showSpeechBubble(message: string, duration: number = 5000): void {
  // Clear existing bubble
  this.hideSpeechBubble();

  const bubble = this.scene.add.graphics();
  const padding = 8;
  const maxWidth = 200;

  // Create text first to measure
  this.dialogText = this.scene.add.text(0, 0, message, {
    fontSize: '12px',
    color: '#000000',
    wordWrap: { width: maxWidth - padding * 2 },
    align: 'center'
  });

  const textBounds = this.dialogText.getBounds();
  const bubbleWidth = Math.max(textBounds.width + padding * 2, 60);
  const bubbleHeight = textBounds.height + padding * 2;

  // Draw bubble background
  bubble.fillStyle(0xffffff, 0.95);
  bubble.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);

  // Draw pointer/tail
  bubble.fillTriangle(
    -5, 0,
    5, 0,
    0, 8
  );

  // Stroke
  bubble.lineStyle(2, 0x333333, 1);
  bubble.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);

  // Center text
  this.dialogText.setOrigin(0.5, 1);
  this.dialogText.setY(-padding);

  // Create container
  this.dialogBubble = this.scene.add.container(this.x, this.y - 50, [bubble, this.dialogText]);
  this.dialogBubble.setDepth(1000);

  // Auto-hide after duration
  this.bubbleTimer = this.scene.time.delayedCall(duration, () => {
    this.hideSpeechBubble();
  });
}

hideSpeechBubble(): void {
  if (this.bubbleTimer) {
    this.bubbleTimer.destroy();
    this.bubbleTimer = undefined;
  }
  if (this.dialogBubble) {
    this.dialogBubble.destroy();
    this.dialogBubble = undefined;
    this.dialogText = undefined;
  }
}
```

Update preUpdate to move bubble with player:
```typescript
// In preUpdate, after position update
if (this.dialogBubble) {
  this.dialogBubble.setPosition(this.x, this.y - 50);
}
```

Clean up in destroy:
```typescript
// In destroy method
this.hideSpeechBubble();
```
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>Player class can display speech bubbles that follow the avatar and auto-hide</done>
</task>

<task type="auto">
  <name>Task 2: Wire chat messages to speech bubbles in Game scene</name>
  <files>GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
Listen to Colyseus chatMessages and show speech bubbles on the appropriate player.

In setupColyseusListeners(), add chat message handler:
```typescript
// Listen for new chat messages
state.chatMessages.onAdd((message: any, index: number) => {
  console.log('[Game] New chat message:', message.author, message.content);

  // Find the player who sent this message
  let senderPlayer: Player | undefined;

  // Check if it's from local player
  const myPlayer = state.players.get(this.room.sessionId);
  if (myPlayer && myPlayer.name === message.author) {
    senderPlayer = this.myPlayer;
  } else {
    // Find in other players
    state.players.forEach((player: any, sessionId: string) => {
      if (player.name === message.author && this.otherPlayerMap.has(sessionId)) {
        senderPlayer = this.otherPlayerMap.get(sessionId);
      }
    });
  }

  if (senderPlayer) {
    senderPlayer.showSpeechBubble(message.content, 5000);
  }

  // Emit to React for chat panel
  EventCenter.emit('chat:message', {
    author: message.author,
    content: message.content,
    createdAt: message.createdAt
  });
});
```

Import EventCenter at top if not already imported.
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>Chat messages trigger speech bubbles on the sending player's avatar</done>
</task>

<task type="auto">
  <name>Task 3: Create chat input component for GamePage</name>
  <files>GameBuddiesHub/client/src/components/game/ChatInput.tsx</files>
  <action>
Create a chat input component that sends messages via Colyseus.

```typescript
import React, { useState, useCallback } from 'react';
import { sendChatMessage } from '../../services/colyseusService';

interface ChatInputProps {
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    sendChatMessage(trimmed);
    setMessage('');
  }, [message, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Prevent game controls while typing
    e.stopPropagation();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-2 bg-gray-800/90 rounded-lg">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        maxLength={200}
        disabled={disabled}
        className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
};
```

Export from components/game/index.ts.

Verify colyseusService has sendChatMessage function (it should from 1.5-02).
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>ChatInput component that sends messages via Colyseus sendChatMessage</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddiesHub/client && npx tsc --noEmit` passes
- [ ] Speech bubbles appear above avatars when messages sent
- [ ] Bubbles auto-hide after 5 seconds
- [ ] Bubbles follow player movement
- [ ] Chat input sends messages to server
- [ ] Messages appear for other players (multiplayer test)
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No TypeScript errors
- Speech bubbles work in Phaser
- Chat messages sync via Colyseus
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-05-SUMMARY.md`:

# Phase 2 Plan 05: Text Chat Summary

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
Ready for 2-06-PLAN.md (Visual UI)
</output>
