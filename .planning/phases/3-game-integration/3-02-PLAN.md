---
phase: 3-game-integration
plan: 02
type: execute
domain: react
---

<objective>
Implement game launch dialog that creates rooms on gamebuddies.io and navigates players to games.

Purpose: Complete the interaction flow from pressing E to actually launching a game with optional group join.
Output: GameLaunchDialog React component, room creation via API, game navigation.
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
@.planning/phases/3-game-integration/3-01-SUMMARY.md
@GameBuddiesHub/client/src/game/events/EventCenter.ts
@GameBuddiesHub/client/src/components/game/PhaserGame.tsx
@Gamebuddies.Io/server/index.js (lines 67-122 - room API endpoints)

**Tech stack available:** React 18, phaserEvents, fetch API
**Established patterns:** phaserEvents listening (useProximityVideo.ts pattern)
**API endpoints:**
- POST /api/rooms → creates room, returns { roomCode }
- POST /api/rooms/:code/select-game → sets gameType
- Games: 'ddf' → /ddf, 'schoolquiz' → /schooled

**From 3-01:** cabinet:interact event emits { gameType, gameName, nearbyPlayers }
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create GameLaunchDialog component</name>
  <files>GameBuddiesHub/client/src/components/game/GameLaunchDialog.tsx</files>
  <action>
Create React component that handles game launching:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { phaserEvents } from '../../game/events/EventCenter';

interface NearbyPlayer {
  sessionId: string;
  name: string;
}

interface CabinetInteractEvent {
  gameType: string;
  gameName: string;
  nearbyPlayers: NearbyPlayer[];
}

// Game routing config (matches gamebuddies.io AVAILABLE_GAMES)
const GAME_PATHS: Record<string, string> = {
  ddf: '/ddf',
  schoolquiz: '/schooled',
};

export default function GameLaunchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [gameData, setGameData] = useState<CabinetInteractEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get player name from localStorage (set during lobby join)
  const playerName = localStorage.getItem('playerName') || 'Player';

  useEffect(() => {
    const handleInteract = (data: CabinetInteractEvent) => {
      setGameData(data);
      setIsOpen(true);
      setError(null);
    };

    phaserEvents.on('cabinet:interact', handleInteract);
    return () => {
      phaserEvents.off('cabinet:interact', handleInteract);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setGameData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleLaunch = useCallback(async () => {
    if (!gameData) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Create room on gamebuddies.io
      const createRes = await fetch('https://gamebuddies.io/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorName: playerName }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create room');
      }

      const room = await createRes.json();

      // 2. Select game for the room
      const selectRes = await fetch(
        `https://gamebuddies.io/api/rooms/${room.roomCode}/select-game`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameType: gameData.gameType }),
        }
      );

      if (!selectRes.ok) {
        throw new Error('Failed to select game');
      }

      // 3. TODO: Notify nearby players (future: through Colyseus)
      // For now, just log that we would invite them
      if (gameData.nearbyPlayers.length > 0) {
        console.log('[GameLaunchDialog] Would invite:', gameData.nearbyPlayers);
      }

      // 4. Navigate to game
      const gamePath = GAME_PATHS[gameData.gameType] || '/';
      window.location.href = `https://gamebuddies.io${gamePath}?room=${room.roomCode}&name=${encodeURIComponent(playerName)}`;

    } catch (err) {
      console.error('[GameLaunchDialog] Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  }, [gameData, playerName]);

  if (!isOpen || !gameData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 text-white">
        <h2 className="text-xl font-bold mb-4">Launch Game</h2>

        <div className="mb-4">
          <p className="text-lg">{gameData.gameName}</p>
          {gameData.nearbyPlayers.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {gameData.nearbyPlayers.length} nearby player(s) will be invited to join
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded disabled:opacity-50"
          >
            {isLoading ? 'Launching...' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Style uses Tailwind classes (already in project).
  </action>
  <verify>TypeScript compiles: npm run type-check in GameBuddiesHub/client</verify>
  <done>GameLaunchDialog.tsx exists with cabinet:interact listener and room creation logic</done>
</task>

<task type="auto">
  <name>Task 2: Integrate dialog into game page and pause game input</name>
  <files>GameBuddiesHub/client/src/components/game/PhaserGame.tsx, GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
1. In PhaserGame.tsx, add GameLaunchDialog:
   - Import: import GameLaunchDialog from './GameLaunchDialog'
   - Add component in the return JSX, after the Phaser container div:
     ```tsx
     <GameLaunchDialog />
     ```

2. In Game.ts, add dialog state to pause game input while dialog is open:
   - Add property: private dialogOpen: boolean = false
   - Add listener in create() for dialog state:
     ```
     phaserEvents.on('dialog:opened', () => { this.dialogOpen = true; });
     phaserEvents.on('dialog:closed', () => { this.dialogOpen = false; });
     ```
   - In update(), wrap myPlayer.update in check:
     ```
     if (this.myPlayer && this.cursors && !this.dialogOpen) {
       this.myPlayer.update(this.cursors, this.keyE, this.playerSelector);
     }
     ```
   - Also wrap the cabinet E key check in !this.dialogOpen

3. In GameLaunchDialog.tsx, emit dialog events:
   - When dialog opens: phaserEvents.emit('dialog:opened')
   - In handleClose and before navigation: phaserEvents.emit('dialog:closed')

This prevents player walking around while the dialog is visible.
  </action>
  <verify>Run dev server, walk to cabinet, press E - dialog appears and player stops moving. Press cancel - player can move again.</verify>
  <done>Dialog renders in game page, game input pauses when dialog open</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete game launch flow: walk to cabinet, press E, see dialog, click Play to create room and navigate to game</what-built>
  <how-to-verify>
    1. Run: npm run dev in GameBuddiesHub/client
    2. Join the hub and spawn your character
    3. Walk to a cabinet (positioned around x=300-500, y=400)
    4. Verify "Press E to play [game name]" prompt appears
    5. Press E - verify launch dialog opens
    6. Verify player cannot walk while dialog is open
    7. Click Cancel - verify dialog closes, player can walk
    8. Press E again, click Play
    9. Verify browser navigates to gamebuddies.io/[game]?room=[code]
    10. (Optional) Check gamebuddies.io room was created
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] npm run type-check passes
- [ ] GameLaunchDialog component exists and renders
- [ ] Dialog opens on cabinet:interact event
- [ ] Play button creates room via API and navigates to game
- [ ] Cancel closes dialog without navigation
- [ ] Player movement pauses during dialog
</verification>

<success_criteria>

- All tasks completed
- Game launch flow works end-to-end
- No errors during room creation
- Navigation to gamebuddies.io/[game] works
- Phase 3 complete
</success_criteria>

<output>
After completion, create `.planning/phases/3-game-integration/3-02-SUMMARY.md`

Include:
- Accomplishments: Cabinet interaction, room creation API integration, game navigation
- Files created: GameLaunchDialog.tsx
- Files modified: PhaserGame.tsx, Game.ts
- Note: Group join notification deferred (logged to console, needs Colyseus broadcast)
</output>
