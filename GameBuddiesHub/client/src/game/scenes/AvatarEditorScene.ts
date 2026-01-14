/**
 * Avatar Editor Scene
 *
 * Phaser-native UI for customizing player avatars.
 * Shows live preview with real-time composition from LPC layers.
 *
 * Features:
 * - Category tabs: Body, Hair, Clothing, Accessories
 * - Option selection with visual feedback
 * - Color swatches for hair and clothing colors
 * - Live preview sprite with idle animation
 * - Save/Cancel buttons with callback support
 */

import Phaser from 'phaser';
import type { AvatarConfig, BodyType, SkinTone, HairStyle, ClothingTop, ClothingBottom, Shoes, AccessoryType } from '../../types/avatar';
import { DEFAULT_AVATAR_CONFIG } from '../../types/avatar';
import { getAvailableOptions, type AvatarManifest } from '../../services/AvatarManifest';
import { avatarCompositor } from '../../services/AvatarCompositor';
import { avatarAssetLoader } from '../../services/AvatarAssetLoader';

// UI Constants
const PANEL_WIDTH = 700;
const PANEL_HEIGHT = 520;
const TAB_HEIGHT = 40;
const PREVIEW_SIZE = 128; // 2x scale for 64px display
const OPTION_BUTTON_HEIGHT = 32;
const COLOR_SWATCH_SIZE = 28;
const PADDING = 16;

// Category definitions
type CategoryId = 'body' | 'hair' | 'clothing' | 'accessories';

interface Category {
  id: CategoryId;
  label: string;
}

const CATEGORIES: Category[] = [
  { id: 'body', label: 'Body' },
  { id: 'hair', label: 'Hair' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'accessories', label: 'Accessories' },
];

// Scene data passed when launching
interface AvatarEditorSceneData {
  config: AvatarConfig;
  onSave?: (config: AvatarConfig) => void;
}

export default class AvatarEditorScene extends Phaser.Scene {
  // UI containers
  private mainContainer!: Phaser.GameObjects.Container;
  private tabContainer!: Phaser.GameObjects.Container;
  private optionsContainer!: Phaser.GameObjects.Container;
  private previewContainer!: Phaser.GameObjects.Container;

  // State
  private currentConfig!: AvatarConfig;
  private originalConfig!: AvatarConfig;
  private activeTab: CategoryId = 'body';
  private manifest!: AvatarManifest;
  private onSaveCallback?: (config: AvatarConfig) => void;

  // Preview sprite
  private previewSprite!: Phaser.GameObjects.Sprite;
  private previewTextureKey: string = '';
  private isComposing: boolean = false;
  private pendingConfig: AvatarConfig | null = null;

  // Tab buttons for highlighting
  private tabButtons: Map<CategoryId, Phaser.GameObjects.Rectangle> = new Map();

  // Direction cycling for preview
  private previewDirection: number = 0;
  private readonly DIRECTIONS = ['down', 'left', 'right', 'up'];
  private directionTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('avatarEditor');
  }

  init(data: AvatarEditorSceneData) {
    // Clone config to avoid mutating original
    this.originalConfig = data.config ? JSON.parse(JSON.stringify(data.config)) : JSON.parse(JSON.stringify(DEFAULT_AVATAR_CONFIG));
    this.currentConfig = JSON.parse(JSON.stringify(this.originalConfig));
    this.onSaveCallback = data.onSave;
    this.manifest = getAvailableOptions();
    this.activeTab = 'body';
    this.isComposing = false;
    this.pendingConfig = null;
  }

  create() {
    // Re-initialize avatar services with this scene
    // (Bootstrap scene that originally initialized them is no longer active)
    avatarAssetLoader.initialize(this);
    avatarCompositor.initialize(this);

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Semi-transparent background overlay
    const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7);
    overlay.setInteractive(); // Block clicks to game behind

    // Main panel container
    this.mainContainer = this.add.container(centerX, centerY);

    // Panel background
    const panelBg = this.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, 0x1e1e2e, 1);
    panelBg.setStrokeStyle(2, 0x3d3d5c);
    this.mainContainer.add(panelBg);

    // Title
    const title = this.add.text(0, -PANEL_HEIGHT / 2 + 25, 'Customize Your Avatar', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.mainContainer.add(title);

    // Create tab buttons
    this.createTabs();

    // Create options container (left side)
    this.optionsContainer = this.add.container(-PANEL_WIDTH / 2 + PADDING, -PANEL_HEIGHT / 2 + 80);
    this.mainContainer.add(this.optionsContainer);

    // Create preview container (right side)
    this.previewContainer = this.add.container(PANEL_WIDTH / 2 - 120, -40);
    this.mainContainer.add(this.previewContainer);
    this.createPreviewPanel();

    // Create action buttons (Save/Cancel)
    this.createActionButtons();

    // Show initial tab content
    this.showTabContent(this.activeTab);

    // Initial preview composition
    this.updatePreview();

    // Keyboard shortcut to close (Escape)
    this.input.keyboard!.on('keydown-ESC', this.handleCancel, this);

    console.log('[AvatarEditor] Scene created');
  }

  private createTabs() {
    this.tabContainer = this.add.container(0, -PANEL_HEIGHT / 2 + 60);
    this.mainContainer.add(this.tabContainer);

    const tabWidth = 100;
    const tabSpacing = 8;
    const totalWidth = CATEGORIES.length * tabWidth + (CATEGORIES.length - 1) * tabSpacing;
    const startX = -totalWidth / 2 + tabWidth / 2;

    CATEGORIES.forEach((cat, index) => {
      const x = startX + index * (tabWidth + tabSpacing);
      const isActive = cat.id === this.activeTab;

      // Tab background
      const tabBg = this.add.rectangle(x, 0, tabWidth, TAB_HEIGHT, isActive ? 0x4caf50 : 0x2d2d44, 1);
      tabBg.setStrokeStyle(2, isActive ? 0x66bb6a : 0x3d3d5c);
      tabBg.setInteractive({ useHandCursor: true });
      tabBg.on('pointerdown', () => this.selectTab(cat.id));
      tabBg.on('pointerover', () => {
        if (cat.id !== this.activeTab) {
          tabBg.setFillStyle(0x3d3d5c);
        }
      });
      tabBg.on('pointerout', () => {
        if (cat.id !== this.activeTab) {
          tabBg.setFillStyle(0x2d2d44);
        }
      });

      // Tab label
      const tabLabel = this.add.text(x, 0, cat.label, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.tabContainer.add([tabBg, tabLabel]);
      this.tabButtons.set(cat.id, tabBg);
    });
  }

  private selectTab(tabId: CategoryId) {
    if (tabId === this.activeTab) return;

    // Update visual state of tabs
    const prevTab = this.tabButtons.get(this.activeTab);
    if (prevTab) {
      prevTab.setFillStyle(0x2d2d44);
      prevTab.setStrokeStyle(2, 0x3d3d5c);
    }

    const newTab = this.tabButtons.get(tabId);
    if (newTab) {
      newTab.setFillStyle(0x4caf50);
      newTab.setStrokeStyle(2, 0x66bb6a);
    }

    this.activeTab = tabId;
    this.showTabContent(tabId);
  }

  private showTabContent(tabId: CategoryId) {
    // Clear existing content
    this.optionsContainer.removeAll(true);

    switch (tabId) {
      case 'body':
        this.renderBodyOptions();
        break;
      case 'hair':
        this.renderHairOptions();
        break;
      case 'clothing':
        this.renderClothingOptions();
        break;
      case 'accessories':
        this.renderAccessoriesOptions();
        break;
    }
  }

  private renderBodyOptions() {
    let y = 0;

    // Body Type section
    const bodyTypeLabel = this.add.text(0, y, 'Body Type', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(bodyTypeLabel);
    y += 24;

    this.manifest.bodyTypes.forEach((bodyType, index) => {
      const btn = this.createOptionButton(
        0, y + index * (OPTION_BUTTON_HEIGHT + 4),
        bodyType.displayName,
        this.currentConfig.body.type === bodyType.id,
        () => {
          this.currentConfig.body.type = bodyType.id;
          this.showTabContent('body'); // Refresh to update selection
          this.updatePreview();
        }
      );
      this.optionsContainer.add(btn);
    });

    y += this.manifest.bodyTypes.length * (OPTION_BUTTON_HEIGHT + 4) + PADDING;

    // Skin Tone section
    const skinToneLabel = this.add.text(0, y, 'Skin Tone', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(skinToneLabel);
    y += 24;

    // Render skin tone swatches
    const swatchContainer = this.createColorSwatches(
      0, y,
      this.manifest.skinTones.map(st => ({ id: st.id, color: st.hex })),
      this.currentConfig.body.skinTone,
      (id) => {
        this.currentConfig.body.skinTone = id as SkinTone;
        this.showTabContent('body');
        this.updatePreview();
      }
    );
    this.optionsContainer.add(swatchContainer);
  }

  private renderHairOptions() {
    let y = 0;

    // Hair Style section
    const hairStyleLabel = this.add.text(0, y, 'Hair Style', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(hairStyleLabel);
    y += 24;

    // Create a scrollable area for hair styles (2 columns)
    const cols = 2;
    const btnWidth = 120;
    this.manifest.hairStyles.forEach((hairStyle, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 8), y + row * (OPTION_BUTTON_HEIGHT + 4),
        hairStyle.displayName,
        this.currentConfig.hair.style === hairStyle.id,
        () => {
          this.currentConfig.hair.style = hairStyle.id;
          this.showTabContent('hair');
          this.updatePreview();
        },
        btnWidth
      );
      this.optionsContainer.add(btn);
    });

    const hairRows = Math.ceil(this.manifest.hairStyles.length / cols);
    y += hairRows * (OPTION_BUTTON_HEIGHT + 4) + PADDING;

    // Hair Color section
    const hairColorLabel = this.add.text(0, y, 'Hair Color', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(hairColorLabel);
    y += 24;

    const hairColorSwatches = this.createColorSwatches(
      0, y,
      this.manifest.hairColors.map((color, i) => ({ id: color, color })),
      this.currentConfig.hair.color,
      (color) => {
        this.currentConfig.hair.color = color;
        this.showTabContent('hair');
        this.updatePreview();
      }
    );
    this.optionsContainer.add(hairColorSwatches);
  }

  private renderClothingOptions() {
    let y = 0;

    // Top section
    const topLabel = this.add.text(0, y, 'Top', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(topLabel);
    y += 24;

    const cols = 3;
    const btnWidth = 90;
    this.manifest.tops.forEach((top, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 4), y + row * (OPTION_BUTTON_HEIGHT + 4),
        top.displayName,
        this.currentConfig.clothing.top === top.id,
        () => {
          this.currentConfig.clothing.top = top.id;
          this.showTabContent('clothing');
          this.updatePreview();
        },
        btnWidth
      );
      this.optionsContainer.add(btn);
    });
    y += Math.ceil(this.manifest.tops.length / cols) * (OPTION_BUTTON_HEIGHT + 4) + 8;

    // Top color
    const topColorSwatches = this.createColorSwatches(
      0, y,
      this.manifest.clothingColors.map(c => ({ id: c, color: c })),
      this.currentConfig.clothing.topColor,
      (color) => {
        this.currentConfig.clothing.topColor = color;
        this.showTabContent('clothing');
        this.updatePreview();
      },
      6 // Max per row
    );
    this.optionsContainer.add(topColorSwatches);
    y += Math.ceil(this.manifest.clothingColors.length / 6) * (COLOR_SWATCH_SIZE + 4) + PADDING;

    // Bottom section
    const bottomLabel = this.add.text(0, y, 'Bottom', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(bottomLabel);
    y += 24;

    this.manifest.bottoms.forEach((bottom, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 4), y + row * (OPTION_BUTTON_HEIGHT + 4),
        bottom.displayName,
        this.currentConfig.clothing.bottom === bottom.id,
        () => {
          this.currentConfig.clothing.bottom = bottom.id;
          this.showTabContent('clothing');
          this.updatePreview();
        },
        btnWidth
      );
      this.optionsContainer.add(btn);
    });
    y += Math.ceil(this.manifest.bottoms.length / cols) * (OPTION_BUTTON_HEIGHT + 4) + 8;

    // Bottom color
    const bottomColorSwatches = this.createColorSwatches(
      0, y,
      this.manifest.clothingColors.map(c => ({ id: c, color: c })),
      this.currentConfig.clothing.bottomColor,
      (color) => {
        this.currentConfig.clothing.bottomColor = color;
        this.showTabContent('clothing');
        this.updatePreview();
      },
      6
    );
    this.optionsContainer.add(bottomColorSwatches);
    y += Math.ceil(this.manifest.clothingColors.length / 6) * (COLOR_SWATCH_SIZE + 4) + PADDING;

    // Shoes section
    const shoesLabel = this.add.text(0, y, 'Shoes', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(shoesLabel);
    y += 24;

    this.manifest.shoes.forEach((shoe, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 4), y + row * (OPTION_BUTTON_HEIGHT + 4),
        shoe.displayName,
        this.currentConfig.clothing.shoes === shoe.id,
        () => {
          this.currentConfig.clothing.shoes = shoe.id;
          this.showTabContent('clothing');
          this.updatePreview();
        },
        btnWidth
      );
      this.optionsContainer.add(btn);
    });
  }

  private renderAccessoriesOptions() {
    let y = 0;

    const accessoriesLabel = this.add.text(0, y, 'Accessories (toggle on/off)', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(accessoriesLabel);
    y += 24;

    const cols = 2;
    const btnWidth = 120;
    this.manifest.accessories.forEach((acc, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      // Check if this accessory is currently equipped
      const isEquipped = this.currentConfig.accessories.some(a => a.type === acc.id);

      const btn = this.createOptionButton(
        col * (btnWidth + 8), y + row * (OPTION_BUTTON_HEIGHT + 4),
        acc.displayName,
        isEquipped,
        () => {
          // Toggle accessory
          if (isEquipped) {
            this.currentConfig.accessories = this.currentConfig.accessories.filter(a => a.type !== acc.id);
          } else {
            this.currentConfig.accessories.push({ type: acc.id });
          }
          this.showTabContent('accessories');
          this.updatePreview();
        },
        btnWidth
      );
      this.optionsContainer.add(btn);
    });
  }

  private createOptionButton(
    x: number,
    y: number,
    label: string,
    selected: boolean,
    onClick: () => void,
    width: number = 150
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(width / 2, OPTION_BUTTON_HEIGHT / 2, width, OPTION_BUTTON_HEIGHT, selected ? 0x4caf50 : 0x2d2d44, 1);
    bg.setStrokeStyle(2, selected ? 0x66bb6a : 0x3d3d5c);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      if (!selected) bg.setFillStyle(0x3d3d5c);
    });
    bg.on('pointerout', () => {
      if (!selected) bg.setFillStyle(0x2d2d44);
    });

    const text = this.add.text(width / 2, OPTION_BUTTON_HEIGHT / 2, label, {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, text]);
    return container;
  }

  private createColorSwatches(
    x: number,
    y: number,
    colors: { id: string; color: string }[],
    selectedId: string,
    onSelect: (id: string) => void,
    maxPerRow: number = 10
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    colors.forEach((item, index) => {
      const col = index % maxPerRow;
      const row = Math.floor(index / maxPerRow);
      const sx = col * (COLOR_SWATCH_SIZE + 4);
      const sy = row * (COLOR_SWATCH_SIZE + 4);

      const isSelected = item.id === selectedId;

      // Swatch background
      const swatch = this.add.rectangle(
        sx + COLOR_SWATCH_SIZE / 2,
        sy + COLOR_SWATCH_SIZE / 2,
        COLOR_SWATCH_SIZE,
        COLOR_SWATCH_SIZE,
        parseInt(item.color.replace('#', '0x')),
        1
      );
      swatch.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0x555555);
      swatch.setInteractive({ useHandCursor: true });
      swatch.on('pointerdown', () => onSelect(item.id));
      swatch.on('pointerover', () => swatch.setStrokeStyle(2, 0xaaaaaa));
      swatch.on('pointerout', () => swatch.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xffffff : 0x555555));

      container.add(swatch);
    });

    return container;
  }

  private createPreviewPanel() {
    // Preview background
    const previewBg = this.add.rectangle(0, 0, 180, 250, 0x252535, 1);
    previewBg.setStrokeStyle(2, 0x3d3d5c);
    this.previewContainer.add(previewBg);

    // Preview label
    const previewLabel = this.add.text(0, -115, 'Preview', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);
    this.previewContainer.add(previewLabel);

    // Placeholder sprite (will be replaced after composition)
    this.previewSprite = this.add.sprite(0, -10, 'adam', 18);
    this.previewSprite.setScale(3); // 3x scale for visibility
    this.previewContainer.add(this.previewSprite);

    // Rotate button to cycle through directions
    const rotateBtnBg = this.add.rectangle(0, 75, 100, 30, 0x3d3d5c, 1);
    rotateBtnBg.setStrokeStyle(1, 0x5d5d7c);
    rotateBtnBg.setInteractive({ useHandCursor: true });
    rotateBtnBg.on('pointerdown', () => this.cycleDirection());
    rotateBtnBg.on('pointerover', () => rotateBtnBg.setFillStyle(0x4d4d6c));
    rotateBtnBg.on('pointerout', () => rotateBtnBg.setFillStyle(0x3d3d5c));

    const rotateBtnText = this.add.text(0, 75, 'Rotate', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.previewContainer.add([rotateBtnBg, rotateBtnText]);

    // Loading indicator (hidden by default)
    const loadingText = this.add.text(0, 105, 'Loading...', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
    }).setOrigin(0.5).setVisible(false);
    loadingText.setName('loadingText');
    this.previewContainer.add(loadingText);

    // Start direction cycling timer (cycles every 2 seconds)
    this.startDirectionCycling();
  }

  private startDirectionCycling() {
    // Stop existing timer if any
    if (this.directionTimer) {
      this.directionTimer.destroy();
    }

    // Cycle through directions every 2 seconds
    this.directionTimer = this.time.addEvent({
      delay: 2000,
      callback: () => this.cycleDirection(),
      loop: true,
    });
  }

  private cycleDirection() {
    this.previewDirection = (this.previewDirection + 1) % this.DIRECTIONS.length;
    this.playPreviewAnimation();
  }

  private playPreviewAnimation() {
    if (!this.previewTextureKey) return;

    const dir = this.DIRECTIONS[this.previewDirection];
    const idleAnim = `${this.previewTextureKey}_idle_${dir}`;

    if (this.anims.exists(idleAnim)) {
      this.previewSprite.play(idleAnim);
    }
  }

  private createActionButtons() {
    const btnY = PANEL_HEIGHT / 2 - 40;

    // Cancel button
    const cancelBg = this.add.rectangle(-80, btnY, 120, 40, 0x555555, 1);
    cancelBg.setStrokeStyle(2, 0x666666);
    cancelBg.setInteractive({ useHandCursor: true });
    cancelBg.on('pointerdown', () => this.handleCancel());
    cancelBg.on('pointerover', () => cancelBg.setFillStyle(0x666666));
    cancelBg.on('pointerout', () => cancelBg.setFillStyle(0x555555));

    const cancelText = this.add.text(-80, btnY, 'Cancel', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Save button
    const saveBg = this.add.rectangle(80, btnY, 120, 40, 0x4caf50, 1);
    saveBg.setStrokeStyle(2, 0x66bb6a);
    saveBg.setInteractive({ useHandCursor: true });
    saveBg.on('pointerdown', () => this.handleSave());
    saveBg.on('pointerover', () => saveBg.setFillStyle(0x66bb6a));
    saveBg.on('pointerout', () => saveBg.setFillStyle(0x4caf50));

    const saveText = this.add.text(80, btnY, 'Save', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.mainContainer.add([cancelBg, cancelText, saveBg, saveText]);
  }

  /**
   * Update preview sprite with composed avatar texture.
   * Debounces rapid changes to avoid spamming composition.
   */
  private async updatePreview() {
    // If already composing, queue this config for later
    if (this.isComposing) {
      this.pendingConfig = JSON.parse(JSON.stringify(this.currentConfig));
      return;
    }

    this.isComposing = true;

    // Show loading state
    const loadingText = this.previewContainer.getByName('loadingText') as Phaser.GameObjects.Text;
    if (loadingText) loadingText.setVisible(true);

    try {
      const textureKey = await avatarCompositor.composeAvatar(this.currentConfig);
      avatarCompositor.createAnimations(textureKey);

      // Update preview sprite
      this.previewSprite.setTexture(textureKey);
      this.previewTextureKey = textureKey;

      // Play idle animation in current direction
      this.playPreviewAnimation();

      console.log('[AvatarEditor] Preview updated:', textureKey);
    } catch (error) {
      console.error('[AvatarEditor] Failed to compose preview:', error);
      // Keep current texture on error
    }

    // Hide loading state
    if (loadingText) loadingText.setVisible(false);

    this.isComposing = false;

    // If there's a pending config, process it now
    if (this.pendingConfig) {
      const pending = this.pendingConfig;
      this.pendingConfig = null;
      this.currentConfig = pending;
      this.updatePreview();
    }
  }

  private handleSave() {
    console.log('[AvatarEditor] Saving config:', this.currentConfig);

    // Update timestamp
    this.currentConfig.updatedAt = new Date().toISOString();

    // Call save callback if provided
    if (this.onSaveCallback) {
      this.onSaveCallback(this.currentConfig);
    }

    // Clean up and close
    this.cleanup();
    this.scene.stop('avatarEditor');
  }

  private handleCancel() {
    console.log('[AvatarEditor] Cancelled');

    // Clean up and close without saving
    this.cleanup();
    this.scene.stop('avatarEditor');
  }

  private cleanup() {
    // Remove keyboard listener
    this.input.keyboard!.off('keydown-ESC', this.handleCancel, this);

    // Stop direction cycling timer
    if (this.directionTimer) {
      this.directionTimer.destroy();
      this.directionTimer = undefined;
    }

    // Clear pending composition
    this.pendingConfig = null;
    this.isComposing = false;
  }

  shutdown() {
    this.cleanup();
  }
}
