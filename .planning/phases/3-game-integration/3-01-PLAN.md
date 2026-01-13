---
phase: 3-game-integration
plan: 01
type: execute
domain: phaser
---

<objective>
Create arcade cabinet game objects that players can interact with via E key.

Purpose: Provide physical game portals in the hub world that players walk up to and interact with.
Output: ArcadeCabinet class, cabinets placed on tilemap, E key interaction triggering events.
</objective>

<execution_context>
~/.claude/get-shit-done/workflows/execute-phase.md
./summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/3-game-integration/3-CONTEXT.md
@.planning/phases/3-game-integration/3-RESEARCH.md
@GameBuddiesHub/client/src/game/scenes/Game.ts
@GameBuddiesHub/client/src/game/items/Chair.ts
@GameBuddiesHub/client/src/game/events/EventCenter.ts

**Tech stack available:** Phaser 3, phaserEvents, physics overlap detection
**Established patterns:** Interactive items (Chair.ts), E key handling (Game.ts line 109-111)
**Key files to reference:** Chair.ts for item pattern, Game.ts for interaction handling
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ArcadeCabinet item class</name>
  <files>GameBuddiesHub/client/src/game/items/ArcadeCabinet.ts</files>
  <action>
Create ArcadeCabinet class following Chair.ts pattern:
- Extends Phaser.Physics.Arcade.Sprite
- Properties: gameType (string), gameName (string), gameIcon (string)
- Constructor takes (scene, x, y, gameType) and looks up game info from AVAILABLE_GAMES config
- Static physics body (like chairs)
- setDepth based on y position for proper layering
- showInteractPrompt() method: displays "Press E to play [gameName]" text above cabinet
- hideInteractPrompt() method: removes the prompt text
- destroy() cleans up prompt text

Use same sprite key pattern as other items - 'arcade_cabinet' texture.
Store prompt text as private property, positioned 48px above sprite center.
  </action>
  <verify>TypeScript compiles: npm run type-check in GameBuddiesHub/client</verify>
  <done>ArcadeCabinet.ts exists with gameType, showInteractPrompt, hideInteractPrompt methods</done>
</task>

<task type="auto">
  <name>Task 2: Add cabinet sprite and tilemap objects</name>
  <files>GameBuddiesHub/client/public/assets/tilemaps/map.json, GameBuddiesHub/client/src/game/scenes/Bootstrap.ts</files>
  <action>
1. In Bootstrap.ts, add cabinet sprite loading if not present:
   - this.load.image('arcade_cabinet', 'assets/items/arcade_cabinet.png')
   - If no arcade_cabinet.png exists, use placeholder: this.load.image('arcade_cabinet', 'assets/items/computer.png')

2. In map.json, add object layer "ArcadeCabinets" with 2 cabinet objects:
   - Cabinet 1: x=300, y=400, gameType="ddf", custom property "gameType"="ddf"
   - Cabinet 2: x=500, y=400, gameType="schoolquiz", custom property "gameType"="schoolquiz"
   - Both using arcade_cabinet gid (match existing item pattern)

NOTE: If map.json is complex or binary, skip tilemap modification and create cabinets programmatically in Task 3.
  </action>
  <verify>Bootstrap loads arcade_cabinet asset without errors</verify>
  <done>Cabinet asset loads, cabinet positions defined (either in tilemap or code)</done>
</task>

<task type="auto">
  <name>Task 3: Add cabinet group and E key interaction to Game scene</name>
  <files>GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
Add arcade cabinet handling to Game.ts following Chair pattern:

1. Add imports and properties:
   - import ArcadeCabinet from '../items/ArcadeCabinet'
   - private cabinetGroup!: Phaser.Physics.Arcade.StaticGroup
   - private nearestCabinet: ArcadeCabinet | null = null

2. In create():
   - Create cabinet group: this.cabinetGroup = this.physics.add.staticGroup({ classType: ArcadeCabinet })
   - Try addCabinetsFromTiled('ArcadeCabinets') OR create programmatically:
     ```
     const ddfCabinet = new ArcadeCabinet(this, 300, 400, 'ddf');
     this.cabinetGroup.add(ddfCabinet);
     const schoolCabinet = new ArcadeCabinet(this, 500, 400, 'schoolquiz');
     this.cabinetGroup.add(schoolCabinet);
     ```

3. Add cabinet overlap detection (after myPlayer spawn in spawnLocalPlayer):
   - this.physics.add.overlap(this.playerSelector, this.cabinetGroup, this.handleCabinetOverlap, undefined, this)

4. Add handleCabinetOverlap method (mirror handleChairOverlap pattern):
   - Set nearestCabinet when overlapping
   - Call cabinet.showInteractPrompt()
   - Clear previous cabinet's prompt if different

5. In update() after myPlayer update, check E key for cabinet interaction:
   ```
   if (Phaser.Input.Keyboard.JustDown(this.keyE) && this.nearestCabinet) {
     // Get conversation peers for group invite
     const state = this.room.state as any;
     const myPlayer = state.players?.get(this.room.sessionId);
     const nearbyPlayers: Array<{sessionId: string, name: string}> = [];

     if (myPlayer?.conversationId) {
       state.players.forEach((p: any, sid: string) => {
         if (sid !== this.room.sessionId && p.conversationId === myPlayer.conversationId) {
           nearbyPlayers.push({ sessionId: sid, name: p.name });
         }
       });
     }

     phaserEvents.emit('cabinet:interact', {
       gameType: this.nearestCabinet.gameType,
       gameName: this.nearestCabinet.gameName,
       nearbyPlayers
     });
   }
   ```

6. Handle clearing nearestCabinet when player walks away (no overlap this frame):
   - Track in update: if nearestCabinet exists but no overlap, clear it and hide prompt
   - Use similar pattern to chair selection clearing

IMPORTANT: Use Phaser.Input.Keyboard.JustDown() not isDown to prevent repeated triggers.
  </action>
  <verify>Run dev server, walk to cabinet position, see "Press E to play" prompt appear</verify>
  <done>Cabinets visible in game, E key press emits cabinet:interact event with gameType and nearbyPlayers</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] npm run type-check passes in GameBuddiesHub/client
- [ ] Cabinet sprites render in game world
- [ ] Walking near cabinet shows interaction prompt
- [ ] Pressing E near cabinet logs cabinet:interact event (check console)
- [ ] Event includes gameType and nearbyPlayers array
</verification>

<success_criteria>

- ArcadeCabinet class exists with interaction methods
- At least 2 cabinets placed in hub world
- E key interaction emits event via phaserEvents
- No TypeScript errors
</success_criteria>

<output>
After completion, create `.planning/phases/3-game-integration/3-01-SUMMARY.md`
</output>
