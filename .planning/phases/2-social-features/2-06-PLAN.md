---
phase: 2-social-features
plan: 06
type: execute
---

<objective>
Add avatar selection screen in Phaser before entering the hub world.

Purpose: Let players choose their character (adam, ash, lucy, nancy) with a polished visual card UI instead of everyone defaulting to 'adam'.
Output: CharacterSelect Phaser scene with character cards, scene flow wired to use selection in Game scene.
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
@.planning/phases/2-06-avatar-selection/2-06-CONTEXT.md
@.planning/phases/2-social-features/2-05-SUMMARY.md

**Key files:**
@GameBuddiesHub/client/src/game/scenes/Bootstrap.ts
@GameBuddiesHub/client/src/game/scenes/Game.ts
@GameBuddiesHub/client/src/game/characters/MyPlayer.ts
@GameBuddiesHub/client/src/game/anims/CharacterAnims.ts

**Tech stack available:**
- Phaser 3 scenes, graphics, text, sprites
- All 4 character spritesheets already loaded in Bootstrap.ts

**From CONTEXT.md:**
- Phaser overlay (NOT React modal) - part of game experience
- Full character cards with sprite, name, fun personality description
- Quick selection flow - get players into game fast
- Characters: adam, ash, lucy, nancy (all have full animation sets)

**Constraining decisions:**
- Currently hardcoded to 'adam' at Game.ts:188 and Game.ts:297
- Scene flow: Bootstrap → Game (need to insert CharacterSelect)
- Registry used to pass playerName, can also pass selectedCharacter
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CharacterSelect scene</name>
  <files>GameBuddiesHub/client/src/game/scenes/CharacterSelect.ts</files>
  <action>
Create a new Phaser scene for character selection with polished card UI.

```typescript
import Phaser from 'phaser';

interface CharacterInfo {
  key: string;
  name: string;
  description: string;
}

const CHARACTERS: CharacterInfo[] = [
  { key: 'adam', name: 'Adam', description: 'The friendly explorer. Always ready for adventure!' },
  { key: 'ash', name: 'Ash', description: 'Cool and collected. Natural born leader.' },
  { key: 'lucy', name: 'Lucy', description: 'Creative spirit. Brings joy wherever she goes!' },
  { key: 'nancy', name: 'Nancy', description: 'Strategic thinker. Always has a plan.' },
];

export default class CharacterSelect extends Phaser.Scene {
  private selectedIndex: number = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private confirmText!: Phaser.GameObjects.Text;

  constructor() {
    super('characterSelect');
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e, 0.95);

    // Title
    this.add.text(width / 2, 50, 'Choose Your Character', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create character cards
    const cardWidth = 160;
    const cardHeight = 220;
    const spacing = 20;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * spacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    CHARACTERS.forEach((char, index) => {
      const x = startX + index * (cardWidth + spacing);
      const y = height / 2 - 20;
      const card = this.createCharacterCard(x, y, cardWidth, cardHeight, char, index);
      this.cards.push(card);
    });

    // Highlight first card by default
    this.highlightCard(0);

    // Instructions
    this.add.text(width / 2, height - 100, 'Click a character to select', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    // Confirm button
    const confirmBtn = this.add.container(width / 2, height - 50);
    const btnBg = this.add.rectangle(0, 0, 200, 50, 0x4caf50, 1).setStrokeStyle(2, 0x66bb6a);
    this.confirmText = this.add.text(0, 0, 'Start Game', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    confirmBtn.add([btnBg, this.confirmText]);
    confirmBtn.setSize(200, 50);
    confirmBtn.setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerdown', () => this.confirmSelection());
    confirmBtn.on('pointerover', () => btnBg.setFillStyle(0x66bb6a));
    confirmBtn.on('pointerout', () => btnBg.setFillStyle(0x4caf50));

    // Keyboard navigation
    this.input.keyboard!.on('keydown-LEFT', () => this.selectPrevious());
    this.input.keyboard!.on('keydown-RIGHT', () => this.selectNext());
    this.input.keyboard!.on('keydown-ENTER', () => this.confirmSelection());
    this.input.keyboard!.on('keydown-SPACE', () => this.confirmSelection());
  }

  private createCharacterCard(
    x: number,
    y: number,
    w: number,
    h: number,
    char: CharacterInfo,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, w, h, 0x2d2d44, 1)
      .setStrokeStyle(3, 0x3d3d5c);

    // Character sprite (idle animation frame)
    const sprite = this.add.sprite(0, -40, char.key, 0);
    sprite.setScale(2);
    sprite.play(`${char.key}_idle_down`);

    // Character name
    const nameText = this.add.text(0, 40, char.name, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description (word wrap)
    const descText = this.add.text(0, 75, char.description, {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      wordWrap: { width: w - 20 },
      align: 'center',
    }).setOrigin(0.5, 0);

    container.add([bg, sprite, nameText, descText]);
    container.setSize(w, h);
    container.setData('bg', bg);
    container.setData('index', index);

    // Make card interactive
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => {
      this.highlightCard(index);
    });
    container.on('pointerover', () => {
      if (this.selectedIndex !== index) {
        bg.setStrokeStyle(3, 0x5d5d7c);
      }
    });
    container.on('pointerout', () => {
      if (this.selectedIndex !== index) {
        bg.setStrokeStyle(3, 0x3d3d5c);
      }
    });

    return container;
  }

  private highlightCard(index: number) {
    // Unhighlight previous
    if (this.cards[this.selectedIndex]) {
      const prevBg = this.cards[this.selectedIndex].getData('bg') as Phaser.GameObjects.Rectangle;
      prevBg.setStrokeStyle(3, 0x3d3d5c);
      prevBg.setFillStyle(0x2d2d44);
    }

    // Highlight new
    this.selectedIndex = index;
    const bg = this.cards[index].getData('bg') as Phaser.GameObjects.Rectangle;
    bg.setStrokeStyle(3, 0x4caf50);
    bg.setFillStyle(0x3d3d5c);
  }

  private selectPrevious() {
    const newIndex = (this.selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
    this.highlightCard(newIndex);
  }

  private selectNext() {
    const newIndex = (this.selectedIndex + 1) % CHARACTERS.length;
    this.highlightCard(newIndex);
  }

  private confirmSelection() {
    const selected = CHARACTERS[this.selectedIndex];
    console.log('[CharacterSelect] Selected:', selected.key);

    // Store in registry for Game scene
    this.registry.set('selectedCharacter', selected.key);

    // Transition to Game scene
    this.scene.start('game');
  }
}
```

Export from scenes index if one exists, otherwise just ensure it's imported in PhaserGame.tsx.
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>CharacterSelect scene created with 4 character cards, keyboard/mouse navigation, and confirm button</done>
</task>

<task type="auto">
  <name>Task 2: Wire scene flow and update Game to use selection</name>
  <files>GameBuddiesHub/client/src/components/game/PhaserGame.tsx, GameBuddiesHub/client/src/game/scenes/Game.ts</files>
  <action>
1. **Register CharacterSelect scene in PhaserGame.tsx:**

Import the new scene:
```typescript
import CharacterSelect from '../../game/scenes/CharacterSelect';
```

Add to scene array in Phaser config:
```typescript
scene: [Bootstrap, CharacterSelect, Game],
```

2. **Modify Bootstrap.ts to go to CharacterSelect instead of Game:**

In Bootstrap.ts create() method, change:
```typescript
this.scene.start('game');
```
to:
```typescript
this.scene.start('characterSelect');
```

3. **Update Game.ts to use selected character:**

In init() method, get the selected character:
```typescript
init() {
  this.playerName = this.registry.get('playerName') || 'Player';
  this.selectedCharacter = this.registry.get('selectedCharacter') || 'adam';
}
```

Add property to the class:
```typescript
private selectedCharacter: string = 'adam';
```

Update line ~188 where myPlayer is created:
```typescript
this.myPlayer = this.add.myPlayer(spawnX, spawnY, this.selectedCharacter, sessionId);
```

Update line ~297 where otherPlayer is created - NOTE: other players should use THEIR selected character from state, not ours. For now, default to 'adam' until server tracks character selection. Add a TODO comment:
```typescript
// TODO: Get character from player state when server tracks selection
const otherCharacter = 'adam';
const otherPlayer = this.add.otherPlayer(
  newPlayer.x || 705,
  newPlayer.y || 500,
  otherCharacter,
  id,
  newPlayer.name || 'Player'
);
```
  </action>
  <verify>`cd GameBuddiesHub/client && npx tsc --noEmit` passes</verify>
  <done>Scene flow: Bootstrap → CharacterSelect → Game. Local player uses selected character.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Avatar selection screen with 4 character cards, keyboard/mouse navigation, selection stored and used in game</what-built>
  <how-to-verify>
    1. Start server: `cd GameBuddieGamesServer && npm run dev`
    2. Start client: `cd GameBuddiesHub/client && npm run dev`
    3. Open browser to http://localhost:5200/hub/
    4. Create/join a room (enter name, click Start)
    5. **Character selection screen should appear:**
       - 4 cards visible (Adam, Ash, Lucy, Nancy)
       - Each card shows animated sprite, name, description
       - Clicking a card highlights it (green border)
       - Arrow keys cycle selection
    6. Click "Start Game" button
    7. **Verify avatar:**
       - Your avatar matches selected character
       - Walk around with WASD to confirm animations work
    8. Test different character:
       - Refresh, select different character
       - Confirm it's the one you chose
  </how-to-verify>
  <resume-signal>Type "approved" if avatar selection works, or describe specific issues to fix</resume-signal>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] `cd GameBuddiesHub/client && npx tsc --noEmit` passes
- [ ] CharacterSelect scene shows 4 character cards
- [ ] Cards show animated sprites, names, descriptions
- [ ] Click and keyboard selection works
- [ ] Selected character is used in Game scene
- [ ] Human verification approved
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- Human verification approved
- Players can choose from 4 preset avatars before entering world
- Phase 2 social features complete
</success_criteria>

<output>
After completion, create `.planning/phases/2-social-features/2-06-SUMMARY.md`:

# Phase 2 Plan 06: Avatar Selection Summary

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
