# Phase 3: Game Integration - Context

**Gathered:** 2026-01-13
**Status:** Ready for planning

<vision>
## How This Should Work

The hub world has arcade cabinets scattered around - physical objects that represent different games. When a player walks up to a cabinet, they see a "Press E to play [Game Name]" prompt.

When they press E:
1. A room is automatically created on gamebuddies.io with that specific game pre-selected
2. The player is taken to the lobby for that room
3. Any nearby players (in conversation proximity) get a confirmation prompt: "Join [Player]'s game?"
4. Players who confirm are automatically joined to the same room

This creates a natural social flow - you're chatting with someone in the hub, walk over to an arcade cabinet together, one person initiates, and the group seamlessly moves into the game lobby together.

</vision>

<essential>
## What Must Be Nailed

- **Games actually launch** - The core mechanic works: walk up, press E, room gets created, player lands in game lobby
- **Automatic room creation** - Pressing E creates a real room on gamebuddies.io with the game auto-selected
- **Group join with confirmation** - Nearby players get a prompt to join, not forced in without consent

</essential>

<boundaries>
## What's Out of Scope

- Custom cabinet artwork per game - generic cabinet sprites are fine
- Game state sync back to hub - no tracking who's playing what
- Complex group management - just simple "confirm to join" flow
- Multiple cabinet types/styles - keep visuals simple for now

</boundaries>

<specifics>
## Specific Ideas

- Arcade cabinet aesthetic - feels like a retro social arcade
- "Press E to play [Game Name]" prompt when near cabinet
- Confirmation dialog for nearby players: "Join [Player]'s game?" with Yes/No
- Uses existing gamebuddies.io room creation flow (just automated)
- Nearby = players currently in conversation proximity with the initiator

</specifics>

<notes>
## Additional Context

The existing gamebuddies.io platform already has:
- Room creation on homepage
- Game selection
- Copy link functionality for invites
- Lobby system

This phase automates that flow from within the hub world, making it seamless to go from chatting to playing together.

</notes>

---

*Phase: 3-game-integration*
*Context gathered: 2026-01-13*
