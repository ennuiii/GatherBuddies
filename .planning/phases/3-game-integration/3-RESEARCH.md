# Phase 3: Game Integration - Research

**Researched:** 2026-01-13
**Domain:** Phaser 3 interactive objects + gamebuddies.io room creation API
**Confidence:** HIGH

<research_summary>
## Summary

Researched how to implement arcade cabinet interactions in the Phaser 3 hub world that create rooms on gamebuddies.io and navigate players to games. The integration is straightforward because all the pieces already exist:

1. **Room Creation API** - gamebuddies.io has `POST /api/rooms` and `POST /api/rooms/:code/select-game` endpoints
2. **Phaser-React Bridge** - The hub already uses `phaserEvents` EventEmitter pattern for proximity detection
3. **Interactive Objects** - Phaser's arcade physics overlap detection with keyboard input (`this.input.keyboard.addKey`)

**Primary recommendation:** Use existing patterns - arcade cabinets are static physics bodies with overlap detection, E key triggers room creation via API, React handles confirmation dialogs and navigation.
</research_summary>

<standard_stack>
## Standard Stack

### Core (Already In Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | 3.70+ | Game engine | Already used for hub world |
| React | 18.x | UI framework | Already handles dialogs/modals |
| phaserEvents | N/A | Phaser-React bridge | Already implemented for proximity |

### Supporting (Already In Place)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Colyseus | 0.15.x | Real-time state | Not needed for cabinets (local client interaction) |
| window.location | Native | Navigation | Redirect to game URLs |
| fetch | Native | API calls | Create rooms on gamebuddies.io |

### No New Dependencies Required
This phase uses 100% existing infrastructure. No npm installs needed.

**Installation:**
```bash
# No new dependencies required
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Arcade Cabinet Structure
```
src/game/
├── items/
│   └── ArcadeCabinet.ts     # Cabinet class with overlap detection
├── scenes/
│   └── Game.ts              # Add cabinet group, overlap check
└── events/
    └── EventCenter.ts       # Add cabinet:interact event

src/components/
└── game/
    └── GameLaunchDialog.tsx # Confirmation modal for group join
```

### Pattern 1: Interactive Zone with E Key
**What:** Static physics body that detects player overlap and E key press
**When to use:** Any "press E to interact" mechanic
**Example:**
```typescript
// Source: Existing proximity pattern in Game.ts + Phaser docs
class ArcadeCabinet extends Phaser.GameObjects.Sprite {
  gameType: string;
  gameName: string;

  constructor(scene: Phaser.Scene, x: number, y: number, gameType: string) {
    super(scene, x, y, 'arcade-cabinet');
    this.gameType = gameType;
    this.gameName = GAMES[gameType].name;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }
}

// In Game.ts update()
if (this.keyE.isDown && this.nearestCabinet) {
  phaserEvents.emit('cabinet:interact', {
    gameType: this.nearestCabinet.gameType,
    gameName: this.nearestCabinet.gameName
  });
}
```

### Pattern 2: React Confirmation Dialog
**What:** Modal triggered by Phaser event, handles API call and navigation
**When to use:** Actions requiring user confirmation before side effects
**Example:**
```typescript
// Source: Existing video chat modal pattern in WebRTCContext
// React component listens to phaserEvents
useEffect(() => {
  const handleInteract = ({ gameType, gameName }) => {
    setSelectedGame({ gameType, gameName });
    setShowLaunchDialog(true);
  };

  phaserEvents.on('cabinet:interact', handleInteract);
  return () => phaserEvents.off('cabinet:interact', handleInteract);
}, []);
```

### Pattern 3: Room Creation + Game Selection
**What:** Two API calls to create room and select game, then redirect
**When to use:** Launching a game from the hub
**Example:**
```typescript
// Source: Gamebuddies.Io/server/index.js API endpoints
async function launchGame(gameType: string, playerName: string) {
  // 1. Create room
  const createRes = await fetch('https://gamebuddies.io/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatorName: playerName })
  });
  const room = await createRes.json();

  // 2. Select game
  await fetch(`https://gamebuddies.io/api/rooms/${room.roomCode}/select-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameType })
  });

  // 3. Navigate to game
  window.location.href = `https://gamebuddies.io/${GAMES[gameType].path}?room=${room.roomCode}`;
}
```

### Pattern 4: Nearby Player Group Join
**What:** Players in conversation get prompted to join
**When to use:** Social game launching
**Example:**
```typescript
// Source: Existing conversation state pattern
// Get players in same conversation
const conversationPeers = Array.from(otherPlayerMap.values())
  .filter(p => p.conversationId === myPlayer.conversationId && p.conversationId !== '');

// Emit event with peer list
phaserEvents.emit('cabinet:interact', {
  gameType,
  gameName,
  nearbyPlayers: conversationPeers.map(p => ({
    sessionId: p.playerId,
    name: p.playerName
  }))
});
```

### Anti-Patterns to Avoid
- **Creating rooms on game servers directly:** Use gamebuddies.io API - it handles room codes, game routing, and expiry
- **Custom navigation logic:** Use simple `window.location.href` redirect - games handle their own joining
- **Server-side cabinet interaction:** Keep it client-only - cabinets don't need server sync
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Room code generation | Custom random codes | gamebuddies.io `/api/rooms` | Already handles uniqueness, expiry, validation |
| Game routing | Custom URL building | gamebuddies.io game paths | Proxies to correct game servers |
| Phaser-React communication | Custom state bridge | Existing `phaserEvents` EventEmitter | Already works for proximity detection |
| Confirmation dialogs | Phaser UI elements | React modal component | Better accessibility, easier styling |
| Player list for group join | Custom tracking | Existing `conversationId` state | Already tracks who's chatting together |

**Key insight:** This phase is primarily integration work. Every component already exists - the room API, the event bridge, the conversation tracking, the navigation pattern. The work is connecting them together, not building new systems.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: E Key Fires Continuously
**What goes wrong:** E key press detected every frame while held down
**Why it happens:** Using `isDown` in update loop without debounce
**How to avoid:** Use `Phaser.Input.Keyboard.JustDown()` or track key state manually
**Warning signs:** Multiple room creations, repeated dialog opens

### Pitfall 2: Multiple Players Create Duplicate Rooms
**What goes wrong:** Two nearby players both press E, both create rooms
**Why it happens:** No single "initiator" designation
**How to avoid:** Only the player who presses E creates the room; others get invited
**Warning signs:** Two room codes created, players end up in different games

### Pitfall 3: Dialog Doesn't Pause Game Input
**What goes wrong:** Player continues moving while dialog is open
**Why it happens:** React modal doesn't disable Phaser input
**How to avoid:** Set a flag in Phaser registry when dialog opens, check in update()
**Warning signs:** Avatar walks away while choosing to launch game

### Pitfall 4: API Call Fails Silently
**What goes wrong:** Room creation fails but player doesn't know
**Why it happens:** No error handling in fetch calls
**How to avoid:** Wrap in try/catch, show error toast to user
**Warning signs:** Nothing happens when pressing E, no navigation

### Pitfall 5: Group Join Prompt Sent After Player Leaves
**What goes wrong:** Player walks away, still gets join prompt
**Why it happens:** Using stale conversationId data
**How to avoid:** Only include players currently in conversation at moment of interaction
**Warning signs:** Getting prompts for games with strangers
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from codebase:

### Room Creation API Call
```typescript
// Source: Gamebuddies.Io/server/index.js lines 67-97
// POST /api/rooms
const response = await fetch('https://gamebuddies.io/api/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorName: playerName,
    isPrivate: false  // optional
  })
});
const room = await response.json();
// room = { roomCode, creatorName, gameType: null, status: 'selecting_game', ... }
```

### Game Selection API Call
```typescript
// Source: Gamebuddies.Io/server/index.js lines 100-122
// POST /api/rooms/:code/select-game
await fetch(`https://gamebuddies.io/api/rooms/${room.roomCode}/select-game`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ gameType: 'ddf' })  // or 'schoolquiz'
});
// Status changes to 'waiting_for_players'
```

### Available Games
```typescript
// Source: Gamebuddies.Io/server/index.js lines 25-42
const GAMES = {
  'schoolquiz': {
    name: 'School Quiz Game',
    path: '/schooled',
    icon: '🎓'
  },
  'ddf': {
    name: 'Der dümmste fliegt',
    path: '/ddf',
    icon: '🎮'
  }
};
```

### phaserEvents Pattern
```typescript
// Source: GameBuddiesHub/client/src/game/events/EventCenter.ts
import Phaser from 'phaser';
export const phaserEvents = new Phaser.Events.EventEmitter();

// Emit from Phaser scene
phaserEvents.emit('cabinet:interact', { gameType: 'ddf', gameName: 'DDF' });

// Listen in React component
useEffect(() => {
  const handler = (data) => setShowDialog(true);
  phaserEvents.on('cabinet:interact', handler);
  return () => phaserEvents.off('cabinet:interact', handler);
}, []);
```

### Keyboard Key Setup
```typescript
// Source: GameBuddiesHub/client/src/game/scenes/Game.ts line 73
private keyE!: Phaser.Input.Keyboard.Key;

// In create()
this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

// In update() - use JustDown to prevent repeat
if (Phaser.Input.Keyboard.JustDown(this.keyE) && this.nearestCabinet) {
  // trigger interaction
}
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phaser native dialogs | React modals via event bridge | Established pattern | Better UX, easier styling |
| Custom room management | gamebuddies.io centralized API | Project decision | Single source of truth for rooms |

**Current tools/patterns:**
- **Official Phaser React template** (2024): EventBus pattern for React-Phaser communication
- **phaserEvents in this project**: Same pattern, already implemented

**Deprecated/outdated:**
- None relevant - the patterns in use are current best practices
</sota_updates>

<open_questions>
## Open Questions

1. **Arcade cabinet sprite assets**
   - What we know: Need arcade cabinet sprites for the tilemap
   - What's unclear: Use existing assets or create new ones
   - Recommendation: Start with simple placeholder sprites, can polish later

2. **Group join notification mechanism**
   - What we know: Need to notify nearby players when someone initiates a game
   - What's unclear: Should this go through Colyseus or be client-only?
   - Recommendation: Use Colyseus to broadcast "game invitation" to conversation members

3. **Hub return flow**
   - What we know: Games have "return to lobby" functionality
   - What's unclear: Should returning go back to hub world or gamebuddies.io homepage?
   - Recommendation: Leave for future phase - current redirect goes to gamebuddies.io homepage
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `Gamebuddies.Io/server/index.js` lines 25-42, 67-122 - Room API endpoints
- `GameBuddiesHub/client/src/game/events/EventCenter.ts` - phaserEvents pattern
- `GameBuddiesHub/client/src/game/scenes/Game.ts` - Existing proximity overlap pattern
- `GameBuddiesHub/client/src/hooks/useProximityVideo.ts` - React-Phaser event listening pattern

### Secondary (MEDIUM confidence)
- [Phaser 3 Input Keyboard docs](https://docs.phaser.io/api-documentation/class/input-keyboard) - JustDown pattern
- [Phaser React TypeScript template](https://github.com/phaserjs/template-react-ts) - EventBus reference implementation
- [Phaser Arcade Physics overlap](https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics) - Overlap detection

### Tertiary (LOW confidence - needs validation)
- None - all findings verified against codebase
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Phaser 3 interactive objects, gamebuddies.io API
- Ecosystem: Existing hub architecture, phaserEvents bridge
- Patterns: Interactive zones, React-Phaser communication, API integration
- Pitfalls: Input debouncing, race conditions, dialog state

**Confidence breakdown:**
- Standard stack: HIGH - 100% existing dependencies
- Architecture: HIGH - follows established patterns in codebase
- Pitfalls: HIGH - identified from similar systems in codebase
- Code examples: HIGH - extracted from actual source files

**Research date:** 2026-01-13
**Valid until:** 2026-02-13 (30 days - stable ecosystem, no external dependencies)
</metadata>

---

*Phase: 3-game-integration*
*Research completed: 2026-01-13*
*Ready for planning: yes*
