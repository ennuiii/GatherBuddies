---
phase: 2-social-features
plan: 01
type: execute
---

<objective>
Add proximity detection system to Phaser Game scene using physics overlap.

Purpose: Detect when players walk near each other to trigger social interactions (video chat, conversations).
Output: Proximity detection system with debounced connect/disconnect events emitted to React.
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
@.planning/phases/1.5-integration/1.5-03-SUMMARY.md

**Key files:**
@GameBuddiesHub/client/src/game/scenes/Game.ts
@GameBuddiesHub/client/src/game/characters/OtherPlayer.ts
@GameBuddiesHub/client/src/game/events/EventCenter.ts

**Tech stack available:**
- Phaser 3.70.x with physics engine
- Colyseus 0.15.x for state sync
- EventCenter for Phaser-React communication

**Pattern from research (SkyOffice):**
```typescript
// Proximity detection via physics overlap
this.physics.add.overlap(this.myPlayer, this.otherPlayers, this.handlePlayersOverlap)

// 750ms debounce prevents jitter at boundaries
private connectionBufferTime = 750
```

**Constraining decisions:**
- Use Phaser physics overlap (not custom distance loops)
- 750ms debounce for connect/disconnect
- Only smaller playerId initiates (prevents duplicate connections)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add proximity state to OtherPlayer</name>
  <files>GameBuddiesHub/client/src/game/characters/OtherPlayer.ts</files>
  <action>
Add proximity tracking state to OtherPlayer class:
- `connected: boolean` - Whether in proximity to MyPlayer
- `connectionBufferTime: number` - Debounce timer (750ms threshold)
- `readyToConnect: boolean` - Whether buffer time has elapsed

Add method `updateProximityBuffer(dt: number)` called from preUpdate:
- Increments connectionBufferTime by dt
- Sets readyToConnect = true when connectionBufferTime >= 750

Add method `resetProximityBuffer()`:
- Sets connected = false
- Resets connectionBufferTime to 0
- Sets readyToConnect = false
  </action>
  <verify>TypeScript compiles without errors: `cd GameBuddiesHub/client && npx tsc --noEmit`</verify>
  <done>OtherPlayer has connected, connectionBufferTime, readyToConnect properties and proximity buffer methods</done>
</task>

<task type="auto">
  <name>Task 2: Add proximity detection to Game scene</name>
  <files>GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
Import EventCenter from '../events/EventCenter'.

In create(), after creating otherPlayers group, add physics overlap:
```typescript
this.physics.add.overlap(
  this.myPlayer,
  this.otherPlayers,
  this.handlePlayersOverlap,
  undefined,
  this
)
```

Add handlePlayersOverlap method:
```typescript
private handlePlayersOverlap(
  _myPlayer: Phaser.Physics.Arcade.Sprite,
  otherPlayer: OtherPlayer
) {
  otherPlayer.checkProximityConnection(this.myPlayer, this.room.sessionId)
}
```

Add to OtherPlayer class (in OtherPlayer.ts) the checkProximityConnection method:
```typescript
checkProximityConnection(myPlayer: MyPlayer, mySessionId: string) {
  if (
    !this.connected &&
    this.readyToConnect &&
    mySessionId > this.playerId  // Only one side initiates
  ) {
    this.connected = true
    EventCenter.emit('proximity:connect', { playerId: this.playerId })
  }
}
```

In Game.update(), check for disconnection when players move apart. Track proximity state and emit 'proximity:disconnect' when overlap ends and buffer expires.

Use EventCenter to emit events that React components can listen to:
- 'proximity:connect' { playerId: string }
- 'proximity:disconnect' { playerId: string }
  </action>
  <verify>
1. `cd GameBuddiesHub/client && npx tsc --noEmit` passes
2. Console shows proximity events when two players approach/separate (test with two browser tabs)
  </verify>
  <done>Proximity detection triggers connect/disconnect events with 750ms debounce, only one side initiates based on sessionId comparison</done>
</task>

<task type="auto">
  <name>Task 3: Add proximity tracking in Game update loop</name>
  <files>GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
Track which players are currently overlapping vs not overlapping.

Add private property `overlappingPlayers: Set<string> = new Set()` to track current frame overlaps.

In update():
1. Clear a temporary set for this frame's overlaps
2. The physics.overlap callback already handles connect detection
3. After overlap checks, compare previous frame overlaps with current:
   - Players who were overlapping but aren't now: start disconnect timer
   - Players whose disconnect timer expires (750ms): emit 'proximity:disconnect'

Add to OtherPlayer:
- `disconnectBufferTime: number` - Timer since last overlap
- Method to check if should disconnect

The debounce prevents rapid connect/disconnect when walking near boundaries.

Important: Only emit disconnect after player has been out of range for 750ms (prevents jitter).
  </action>
  <verify>
1. TypeScript compiles: `cd GameBuddiesHub/client && npx tsc --noEmit`
2. Manual test: Walk two players together, see proximity:connect in console
3. Manual test: Walk apart, wait 750ms, see proximity:disconnect
4. Manual test: Walk apart then back quickly (under 750ms), should NOT disconnect
  </verify>
  <done>Full proximity detection system with debounced connect/disconnect, events emitted via EventCenter</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddiesHub/client && npx tsc --noEmit` passes
- [ ] proximity:connect fires when two players walk near each other
- [ ] proximity:disconnect fires 750ms after players separate
- [ ] Rapid in/out of range doesn't cause jitter (debounce working)
- [ ] Only one player (higher sessionId) initiates connection
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No TypeScript errors
- Proximity events emitted to EventCenter for React to consume
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-01-SUMMARY.md`:

# Phase 2 Plan 01: Proximity Detection Summary

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
Ready for 2-02-PLAN.md (Conversation State)
</output>
