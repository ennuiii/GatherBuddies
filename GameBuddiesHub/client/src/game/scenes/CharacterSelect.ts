/**
 * CharacterSelect Scene
 *
 * Polished avatar selection screen shown before entering the hub world.
 * Players choose from 4 characters (adam, ash, lucy, nancy) with visual card UI.
 */

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
