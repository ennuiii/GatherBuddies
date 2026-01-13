---
phase: 2-social-features
plan: 02
type: execute
---

<objective>
Add server-authoritative conversation state to Colyseus HubRoom.

Purpose: Track which players are in which conversations, handle locking/join requests.
Output: Colyseus schema for conversations, server logic for conversation lifecycle.
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
@.planning/phases/1.5-integration/1.5-01-SUMMARY.md

**Key files:**
@GameBuddieGamesServer/games/hub/schema/HubState.ts
@GameBuddieGamesServer/games/hub/HubRoom.ts
@GameBuddieGamesServer/games/hub/Message.ts

**Tech stack available:**
- Colyseus 0.15.x with @colyseus/schema
- Server-authoritative state sync

**Pattern from research:**
```typescript
// Conversation schema
class Conversation extends Schema {
  id: string
  participants: SetSchema<string>
  locked: boolean
  hostId: string
}
```

**Constraining decisions:**
- Server is authoritative for conversation state (prevents desync)
- Limit conversations to 4-6 players (P2P mesh reliability)
- Single host approval for join requests
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Conversation schema to HubState</name>
  <files>GameBuddieGamesServer/games/hub/schema/HubState.ts</files>
  <action>
Add Conversation schema class after ChatMessage:
```typescript
export class Conversation extends Schema {
  id: string;
  hostId: string;
  locked: boolean;

  constructor() {
    super();
    this.id = '';
    this.hostId = '';
    this.locked = false;
  }
}

defineTypes(Conversation, {
  id: 'string',
  hostId: 'string',
  locked: 'boolean',
});
```

Note: We can't use SetSchema<string> directly for participants because Colyseus doesn't support native Set sync well. Instead, use a different approach:

Add `conversationId: string` field to Player schema:
- Empty string = not in conversation
- Non-empty = ID of conversation they're in

This allows client to determine who's in what conversation by filtering players.

Add to HubState:
```typescript
conversations: MapSchema<Conversation>;
```

Initialize in constructor:
```typescript
this.conversations = new MapSchema<Conversation>();
```

Add defineTypes for conversations in HubState.
  </action>
  <verify>`cd GameBuddieGamesServer && npx tsc --noEmit` passes</verify>
  <done>Conversation schema defined, Player has conversationId field, HubState has conversations map</done>
</task>

<task type="auto">
  <name>Task 2: Add conversation message types</name>
  <files>GameBuddieGamesServer/games/hub/Message.ts</files>
  <action>
Add new message types to the Message enum:
```typescript
export enum Message {
  UPDATE_PLAYER = 0,
  UPDATE_PLAYER_NAME = 1,
  ADD_CHAT_MESSAGE = 2,
  SEND_ROOM_DATA = 3,
  // Conversation messages
  START_CONVERSATION = 4,      // Client: start conversation with another player
  LEAVE_CONVERSATION = 5,      // Client: leave current conversation
  REQUEST_JOIN = 6,            // Client: request to join existing conversation
  APPROVE_JOIN = 7,            // Client (host): approve join request
  DENY_JOIN = 8,               // Client (host): deny join request
  LOCK_CONVERSATION = 9,       // Client (host): toggle conversation lock
  // Server notifications
  CONVERSATION_UPDATED = 10,   // Server->Client: conversation state changed
  JOIN_REQUESTED = 11,         // Server->Participants: someone wants to join
}
```
  </action>
  <verify>`cd GameBuddieGamesServer && npx tsc --noEmit` passes</verify>
  <done>Message enum has all conversation-related message types</done>
</task>

<task type="auto">
  <name>Task 3: Implement conversation handlers in HubRoom</name>
  <files>GameBuddieGamesServer/games/hub/HubRoom.ts</files>
  <action>
Import Conversation from schema. Add private helper methods and message handlers.

Add helper method to generate conversation ID:
```typescript
private generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

Add helper to get participants of a conversation:
```typescript
private getConversationParticipants(conversationId: string): string[] {
  const participants: string[] = [];
  this.state.players.forEach((player, sessionId) => {
    if (player.conversationId === conversationId) {
      participants.push(sessionId);
    }
  });
  return participants;
}
```

Add message handlers in onCreate():

**START_CONVERSATION** - When player A initiates with player B:
- Check both players exist and aren't in conversations
- Create Conversation with hostId = initiator
- Set both players' conversationId
- Broadcast CONVERSATION_UPDATED to both

**LEAVE_CONVERSATION** - When player leaves:
- Get player's conversationId
- Clear player's conversationId
- If only 1 participant left, delete conversation
- If host left, transfer host to next participant
- Broadcast CONVERSATION_UPDATED

**REQUEST_JOIN** - When player requests to join:
- Check conversation exists and player isn't already in one
- If conversation NOT locked, auto-approve (add player)
- If locked, send JOIN_REQUESTED to host only

**APPROVE_JOIN** - When host approves:
- Verify sender is host
- Add requester to conversation
- Broadcast CONVERSATION_UPDATED

**DENY_JOIN** - When host denies:
- Verify sender is host
- Send denial notification to requester (via direct message)

**LOCK_CONVERSATION** - Toggle lock:
- Verify sender is host
- Toggle locked state
- Broadcast update

Enforce MAX_CONVERSATION_SIZE = 6 (P2P mesh limit).
  </action>
  <verify>
1. `cd GameBuddieGamesServer && npx tsc --noEmit` passes
2. Server starts without errors: `cd GameBuddieGamesServer && npm run dev` (check logs)
  </verify>
  <done>HubRoom handles all conversation lifecycle: start, leave, join request/approve/deny, lock toggle. Server-authoritative state.</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddieGamesServer && npx tsc --noEmit` passes
- [ ] Server starts and logs "Hub room ready"
- [ ] Conversation schema syncs to client (can inspect in Colyseus monitor at /colyseus-monitor)
- [ ] Player.conversationId field exists in schema
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No TypeScript errors
- Conversation state is server-authoritative
- Max 6 players per conversation enforced
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-02-SUMMARY.md`:

# Phase 2 Plan 02: Conversation State Summary

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
Ready for 2-03-PLAN.md (Video Connections)
</output>
