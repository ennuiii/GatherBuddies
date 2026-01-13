# Phase 2-06: Avatar Selection - Context

**Gathered:** 2026-01-13
**Status:** Ready for planning

<vision>
## How This Should Work

When a player clicks "Start" in the lobby, a Phaser overlay appears showing character selection. The overlay displays full character cards — each of the 4 available avatars (adam, ash, lucy, nancy) as a card with the character sprite, name, and a fun description.

The player clicks on a card to select their avatar, then confirms. Once selected, they enter the hub world as that character. This happens in Phaser, not as a React modal — it's part of the game experience.

</vision>

<essential>
## What Must Be Nailed

- **Visual appeal** — The character cards should look polished and inviting, not placeholder-y
- **Quick selection** — Get players into the game fast, minimal friction
- **Character personality** — Each avatar should feel distinct with fun descriptions that give them character

</essential>

<boundaries>
## What's Out of Scope

- Custom colors/outfits — No customization, just pick one of the 4 preset characters
- Unlockable avatars — All 4 characters available immediately, no progression system
- Avatar persistence — Don't save choice between sessions, pick fresh each time
- React UI — This is a Phaser overlay, not a React modal

</boundaries>

<specifics>
## Specific Ideas

- Full character cards (not just sprites in a row)
- Each card shows: avatar sprite, character name, fun personality description
- Overlay appears after clicking Start but before entering the world
- Built in Phaser (game layer), not React

</specifics>

<notes>
## Additional Context

The 4 characters already exist in the game with full animation sets (idle, run, sit). This phase is about giving players a choice rather than everyone being "adam" by default.

Characters available: adam, ash, lucy, nancy

</notes>

---

*Phase: 2-06-avatar-selection*
*Context gathered: 2026-01-13*
