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
const PANEL_WIDTH = 720;
const PANEL_HEIGHT = 540;
const TAB_HEIGHT = 40;
const PREVIEW_SIZE = 128; // 2x scale for 64px display
const OPTION_BUTTON_HEIGHT = 32;
const COLOR_SWATCH_SIZE = 28;
const PADDING = 16;

// Scrollable area constants
const OPTIONS_AREA_WIDTH = 450;
const OPTIONS_AREA_HEIGHT = 340; // Height of visible scrollable area
const SCROLL_SPEED = 30;

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
  onQuickStart?: (config: AvatarConfig) => void;
  isFirstTime?: boolean; // True when shown on game start (shows Quick Start)
}

export default class AvatarEditorScene extends Phaser.Scene {
  // UI containers
  private mainContainer!: Phaser.GameObjects.Container;
  private tabContainer!: Phaser.GameObjects.Container;
  private optionsContainer!: Phaser.GameObjects.Container;
  private optionsViewport!: Phaser.GameObjects.Container;
  private previewContainer!: Phaser.GameObjects.Container;

  // Scrolling state
  private scrollY: number = 0;
  private contentHeight: number = 0;
  private scrollMask!: Phaser.GameObjects.Graphics;
  private scrollIndicator!: Phaser.GameObjects.Graphics;
  private optionsAreaBounds!: { x: number; y: number; width: number; height: number };

  // State
  private currentConfig!: AvatarConfig;
  private originalConfig!: AvatarConfig;
  private activeTab: CategoryId = 'body';
  private manifest!: AvatarManifest;
  private onSaveCallback?: (config: AvatarConfig) => void;
  private onQuickStartCallback?: (config: AvatarConfig) => void;

  // Preview sprite
  private previewSprite!: Phaser.GameObjects.Sprite;
  private previewTextureKey: string = '';
  private isComposing: boolean = false;
  private pendingConfig: AvatarConfig | null = null;
  private debounceTimer?: Phaser.Time.TimerEvent;
  private readonly DEBOUNCE_MS = 250; // Delay before composing preview

  // Tab buttons for highlighting
  private tabButtons: Map<CategoryId, Phaser.GameObjects.Rectangle> = new Map();

  // Direction cycling for preview
  private previewDirection: number = 0;
  private readonly DIRECTIONS = ['down', 'left', 'right', 'up'];
  private directionTimer?: Phaser.Time.TimerEvent;

  // First time mode (shows Quick Start button)
  private isFirstTime: boolean = false;

  constructor() {
    super('avatarEditor');
  }

  init(data: AvatarEditorSceneData) {
    // Clone config to avoid mutating original
    this.originalConfig = data.config ? JSON.parse(JSON.stringify(data.config)) : JSON.parse(JSON.stringify(DEFAULT_AVATAR_CONFIG));
    this.currentConfig = JSON.parse(JSON.stringify(this.originalConfig));
    this.onSaveCallback = data.onSave;
    this.onQuickStartCallback = data.onQuickStart;
    this.manifest = getAvailableOptions();
    this.activeTab = 'body';
    this.isComposing = false;
    this.pendingConfig = null;
    this.isFirstTime = data.isFirstTime ?? false;
    this.previewTextureKey = '';
    // Reset scroll state
    this.scrollY = 0;
    this.contentHeight = 0;
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

    // Create scrollable options area (left side)
    this.createScrollableOptionsArea();

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

    // Mouse wheel scrolling
    this.input.on('wheel', this.handleWheel, this);

    console.log('[AvatarEditor] Scene created');
  }

  /**
   * Create the scrollable options area with viewport, mask, and scroll indicator
   */
  private createScrollableOptionsArea() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate viewport position (global coordinates for mask)
    const viewportX = centerX - PANEL_WIDTH / 2 + PADDING;
    const viewportY = centerY - PANEL_HEIGHT / 2 + 85;

    // Store bounds for hit testing
    this.optionsAreaBounds = {
      x: viewportX,
      y: viewportY,
      width: OPTIONS_AREA_WIDTH,
      height: OPTIONS_AREA_HEIGHT,
    };

    // Options viewport container (positioned in main panel)
    this.optionsViewport = this.add.container(-PANEL_WIDTH / 2 + PADDING, -PANEL_HEIGHT / 2 + 85);
    this.mainContainer.add(this.optionsViewport);

    // Background for options area
    const optionsBg = this.add.rectangle(
      OPTIONS_AREA_WIDTH / 2,
      OPTIONS_AREA_HEIGHT / 2,
      OPTIONS_AREA_WIDTH,
      OPTIONS_AREA_HEIGHT,
      0x252535,
      1
    );
    optionsBg.setStrokeStyle(1, 0x3d3d5c);
    this.optionsViewport.add(optionsBg);

    // Scrollable content container (moves vertically)
    this.optionsContainer = this.add.container(PADDING, PADDING);
    this.optionsViewport.add(this.optionsContainer);

    // Create mask for clipping content to viewport
    this.scrollMask = this.make.graphics({ add: false });
    this.scrollMask.fillStyle(0xffffff);
    this.scrollMask.fillRect(viewportX, viewportY, OPTIONS_AREA_WIDTH, OPTIONS_AREA_HEIGHT);
    const mask = this.scrollMask.createGeometryMask();
    this.optionsContainer.setMask(mask);

    // Scroll indicator (right side of options area)
    this.scrollIndicator = this.add.graphics();
    this.optionsViewport.add(this.scrollIndicator);
  }

  /**
   * Handle mouse wheel scrolling
   */
  private handleWheel(pointer: Phaser.Input.Pointer, _gameObjects: any[], _dx: number, dy: number) {
    // Check if pointer is over the options area
    if (!this.isPointerOverOptionsArea(pointer)) return;

    const maxScroll = Math.max(0, this.contentHeight - OPTIONS_AREA_HEIGHT + PADDING * 2);

    // Update scroll position
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, maxScroll);

    // Update content position
    this.optionsContainer.y = PADDING - this.scrollY;

    // Update scroll indicator
    this.updateScrollIndicator();
  }

  /**
   * Check if pointer is over the options area
   */
  private isPointerOverOptionsArea(pointer: Phaser.Input.Pointer): boolean {
    return (
      pointer.x >= this.optionsAreaBounds.x &&
      pointer.x <= this.optionsAreaBounds.x + this.optionsAreaBounds.width &&
      pointer.y >= this.optionsAreaBounds.y &&
      pointer.y <= this.optionsAreaBounds.y + this.optionsAreaBounds.height
    );
  }

  /**
   * Update the scroll indicator position and visibility
   */
  private updateScrollIndicator() {
    this.scrollIndicator.clear();

    // Only show if content is taller than viewport
    if (this.contentHeight <= OPTIONS_AREA_HEIGHT) return;

    const scrollBarWidth = 6;
    const scrollBarX = OPTIONS_AREA_WIDTH - scrollBarWidth - 4;
    const scrollBarHeight = OPTIONS_AREA_HEIGHT - 8;

    // Calculate thumb size and position
    const thumbRatio = OPTIONS_AREA_HEIGHT / this.contentHeight;
    const thumbHeight = Math.max(30, scrollBarHeight * thumbRatio);
    const maxScroll = this.contentHeight - OPTIONS_AREA_HEIGHT + PADDING * 2;
    const scrollRatio = maxScroll > 0 ? this.scrollY / maxScroll : 0;
    const thumbY = 4 + scrollRatio * (scrollBarHeight - thumbHeight);

    // Draw scroll track (subtle)
    this.scrollIndicator.fillStyle(0x3d3d5c, 0.3);
    this.scrollIndicator.fillRoundedRect(scrollBarX, 4, scrollBarWidth, scrollBarHeight, 3);

    // Draw scroll thumb
    this.scrollIndicator.fillStyle(0x666680, 0.8);
    this.scrollIndicator.fillRoundedRect(scrollBarX, thumbY, scrollBarWidth, thumbHeight, 3);
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

    // Reset scroll position
    this.scrollY = 0;
    this.optionsContainer.y = PADDING;
    this.contentHeight = 0;

    switch (tabId) {
      case 'body':
        this.contentHeight = this.renderBodyOptions();
        break;
      case 'hair':
        this.contentHeight = this.renderHairOptions();
        break;
      case 'clothing':
        this.contentHeight = this.renderClothingOptions();
        break;
      case 'accessories':
        this.contentHeight = this.renderAccessoriesOptions();
        break;
    }

    // Update scroll indicator after content is rendered
    this.updateScrollIndicator();
  }

  private renderBodyOptions(): number {
    let y = 0;

    // Body Type section
    const bodyTypeLabel = this.add.text(0, y, 'Body Type', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(bodyTypeLabel);
    y += 24;

    // Show body types in 2 columns
    const cols = 2;
    const btnWidth = 180;
    this.manifest.bodyTypes.forEach((bodyType, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 8), y + row * (OPTION_BUTTON_HEIGHT + 4),
        bodyType.displayName,
        this.currentConfig.body.type === bodyType.id,
        () => {
          this.currentConfig.body.type = bodyType.id;
          // Auto-update clothing selections if they're not valid for new body type
          this.validateClothingForBodyType(bodyType.id);
          this.showTabContent('body'); // Refresh to update selection
          this.updatePreview();
        },
        btnWidth
      );
      this.optionsContainer.add(btn);
    });

    const bodyRows = Math.ceil(this.manifest.bodyTypes.length / cols);
    y += bodyRows * (OPTION_BUTTON_HEIGHT + 4) + PADDING;

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
      },
      10 // swatches per row
    );
    this.optionsContainer.add(swatchContainer);

    const skinRows = Math.ceil(this.manifest.skinTones.length / 10);
    y += skinRows * (COLOR_SWATCH_SIZE + 4) + PADDING;

    return y;
  }

  private renderHairOptions(): number {
    let y = 0;

    // Hair Style section
    const hairStyleLabel = this.add.text(0, y, 'Hair Style', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(hairStyleLabel);
    y += 24;

    // Hair styles in 3 columns for better layout
    const cols = 3;
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
      },
      10 // swatches per row
    );
    this.optionsContainer.add(hairColorSwatches);

    const colorRows = Math.ceil(this.manifest.hairColors.length / 10);
    y += colorRows * (COLOR_SWATCH_SIZE + 4) + PADDING;

    return y;
  }

  private renderClothingOptions(): number {
    let y = 0;
    const cols = 3;
    const btnWidth = 120;

    // Top section - filter by current body type
    const currentBodyType = this.currentConfig.body.type;
    const availableTops = this.manifest.tops.filter(
      top => top.supportedBodyTypes?.includes(currentBodyType) ?? true
    );

    const topLabel = this.add.text(0, y, 'Top', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(topLabel);
    y += 24;

    availableTops.forEach((top, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 8), y + row * (OPTION_BUTTON_HEIGHT + 4),
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
    y += Math.ceil(availableTops.length / cols) * (OPTION_BUTTON_HEIGHT + 4) + 8;

    // Top color
    const topColorLabel = this.add.text(0, y, 'Top Color', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
    });
    this.optionsContainer.add(topColorLabel);
    y += 20;

    const topColorSwatches = this.createColorSwatches(
      0, y,
      this.manifest.clothingColors.map(c => ({ id: c, color: c })),
      this.currentConfig.clothing.topColor,
      (color) => {
        this.currentConfig.clothing.topColor = color;
        this.showTabContent('clothing');
        this.updatePreview();
      },
      10 // swatches per row
    );
    this.optionsContainer.add(topColorSwatches);
    y += Math.ceil(this.manifest.clothingColors.length / 10) * (COLOR_SWATCH_SIZE + 4) + PADDING;

    // Bottom section - filter by current body type
    const availableBottoms = this.manifest.bottoms.filter(
      bottom => bottom.supportedBodyTypes?.includes(currentBodyType) ?? true
    );

    const bottomLabel = this.add.text(0, y, 'Bottom', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(bottomLabel);
    y += 24;

    availableBottoms.forEach((bottom, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 8), y + row * (OPTION_BUTTON_HEIGHT + 4),
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
    y += Math.ceil(availableBottoms.length / cols) * (OPTION_BUTTON_HEIGHT + 4) + 8;

    // Bottom color
    const bottomColorLabel = this.add.text(0, y, 'Bottom Color', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
    });
    this.optionsContainer.add(bottomColorLabel);
    y += 20;

    const bottomColorSwatches = this.createColorSwatches(
      0, y,
      this.manifest.clothingColors.map(c => ({ id: c, color: c })),
      this.currentConfig.clothing.bottomColor,
      (color) => {
        this.currentConfig.clothing.bottomColor = color;
        this.showTabContent('clothing');
        this.updatePreview();
      },
      10
    );
    this.optionsContainer.add(bottomColorSwatches);
    y += Math.ceil(this.manifest.clothingColors.length / 10) * (COLOR_SWATCH_SIZE + 4) + PADDING;

    // Shoes section - filter by current body type
    const availableShoes = this.manifest.shoes.filter(
      shoe => shoe.supportedBodyTypes?.includes(currentBodyType) ?? true
    );

    const shoesLabel = this.add.text(0, y, 'Shoes', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(shoesLabel);
    y += 24;

    availableShoes.forEach((shoe, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const btn = this.createOptionButton(
        col * (btnWidth + 8), y + row * (OPTION_BUTTON_HEIGHT + 4),
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
    y += Math.ceil(availableShoes.length / cols) * (OPTION_BUTTON_HEIGHT + 4) + 8;

    // Shoes color
    const shoesColorLabel = this.add.text(0, y, 'Shoes Color', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
    });
    this.optionsContainer.add(shoesColorLabel);
    y += 20;

    const shoesColorSwatches = this.createColorSwatches(
      0, y,
      this.manifest.clothingColors.map(c => ({ id: c, color: c })),
      this.currentConfig.clothing.shoesColor,
      (color) => {
        this.currentConfig.clothing.shoesColor = color;
        this.showTabContent('clothing');
        this.updatePreview();
      },
      10
    );
    this.optionsContainer.add(shoesColorSwatches);
    y += Math.ceil(this.manifest.clothingColors.length / 10) * (COLOR_SWATCH_SIZE + 4) + PADDING;

    return y;
  }

  private renderAccessoriesOptions(): number {
    let y = 0;

    const accessoriesLabel = this.add.text(0, y, 'Accessories (toggle on/off)', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    });
    this.optionsContainer.add(accessoriesLabel);
    y += 24;

    // Show message if no accessories available
    if (this.manifest.accessories.length === 0) {
      const comingSoon = this.add.text(0, y + 40, 'Coming Soon!', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#666666',
      });
      const description = this.add.text(0, y + 70, 'Accessories will be added\nin a future update.', {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#555555',
        align: 'left',
      });
      this.optionsContainer.add([comingSoon, description]);
      return y + 150;
    }

    const cols = 3;
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

    const accRows = Math.ceil(this.manifest.accessories.length / cols);
    y += accRows * (OPTION_BUTTON_HEIGHT + 4) + PADDING;

    return y;
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

    // Create an empty sprite (texture will be set after composition)
    // Using a generated 1x1 transparent texture as placeholder
    const placeholderKey = '__avatar_placeholder__';
    if (!this.textures.exists(placeholderKey)) {
      const graphics = this.make.graphics({ add: false });
      graphics.fillStyle(0x000000, 0);
      graphics.fillRect(0, 0, 64, 64);
      graphics.generateTexture(placeholderKey, 64, 64);
      graphics.destroy();
    }
    this.previewSprite = this.add.sprite(0, -10, placeholderKey);
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

    // Manual rotation only - use "Rotate" button to cycle directions
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

    if (this.isFirstTime) {
      // First time mode: Quick Start + Play buttons (no Cancel)

      // Quick Start button (uses default avatar)
      const quickStartBg = this.add.rectangle(-100, btnY, 140, 40, 0x2196f3, 1);
      quickStartBg.setStrokeStyle(2, 0x42a5f5);
      quickStartBg.setInteractive({ useHandCursor: true });
      quickStartBg.on('pointerdown', () => this.handleQuickStart());
      quickStartBg.on('pointerover', () => quickStartBg.setFillStyle(0x42a5f5));
      quickStartBg.on('pointerout', () => quickStartBg.setFillStyle(0x2196f3));

      const quickStartText = this.add.text(-100, btnY, 'Quick Start', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      // Play button (uses customized avatar)
      const playBg = this.add.rectangle(100, btnY, 140, 40, 0x4caf50, 1);
      playBg.setStrokeStyle(2, 0x66bb6a);
      playBg.setInteractive({ useHandCursor: true });
      playBg.on('pointerdown', () => this.handleSave());
      playBg.on('pointerover', () => playBg.setFillStyle(0x66bb6a));
      playBg.on('pointerout', () => playBg.setFillStyle(0x4caf50));

      const playText = this.add.text(100, btnY, 'Play', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.mainContainer.add([quickStartBg, quickStartText, playBg, playText]);
    } else {
      // Edit mode: Cancel + Save buttons

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
  }

  /**
   * Quick Start - use default avatar without customization
   */
  private handleQuickStart() {
    console.log('[AvatarEditor] Quick Start - using default avatar');

    // Use the default config as-is
    const defaultConfig = JSON.parse(JSON.stringify(DEFAULT_AVATAR_CONFIG));
    defaultConfig.id = `avatar_${Date.now()}`;
    defaultConfig.updatedAt = new Date().toISOString();

    // Call quick start callback if available, otherwise fall back to save callback
    if (this.onQuickStartCallback) {
      this.onQuickStartCallback(defaultConfig);
    } else if (this.onSaveCallback) {
      this.onSaveCallback(defaultConfig);
    }

    // Clean up and close
    this.cleanup();
    this.scene.stop('avatarEditor');
  }

  /**
   * Update preview sprite with composed avatar texture.
   * Debounces rapid changes to avoid spamming composition.
   */
  private updatePreview() {
    // Cancel any pending debounce
    if (this.debounceTimer) {
      this.debounceTimer.destroy();
      this.debounceTimer = undefined;
    }

    // If already composing, queue this config for later (will be picked up after current completes)
    if (this.isComposing) {
      this.pendingConfig = JSON.parse(JSON.stringify(this.currentConfig));
      return;
    }

    // Show loading indicator immediately
    const loadingText = this.previewContainer.getByName('loadingText') as Phaser.GameObjects.Text;
    if (loadingText) {
      loadingText.setText('Loading...');
      loadingText.setColor('#666666');
      loadingText.setVisible(true);
    }

    // Debounce: wait before actually composing
    this.debounceTimer = this.time.delayedCall(this.DEBOUNCE_MS, () => {
      this.debounceTimer = undefined;
      this.doCompose();
    });
  }

  /**
   * Actually perform the avatar composition (called after debounce)
   */
  private async doCompose() {
    if (this.isComposing) {
      // Another compose started, queue this
      this.pendingConfig = JSON.parse(JSON.stringify(this.currentConfig));
      return;
    }

    this.isComposing = true;
    const loadingText = this.previewContainer.getByName('loadingText') as Phaser.GameObjects.Text;

    try {
      console.log('[AvatarEditor] Composing avatar with config:', this.currentConfig);
      const textureKey = await avatarCompositor.composeAvatar(this.currentConfig);
      avatarCompositor.createAnimations(textureKey);

      // Update preview sprite
      this.previewSprite.setTexture(textureKey);
      this.previewTextureKey = textureKey;

      // Play idle animation in current direction
      this.playPreviewAnimation();

      // Hide loading state on success
      if (loadingText) loadingText.setVisible(false);

      console.log('[AvatarEditor] Preview updated:', textureKey);
    } catch (error) {
      console.error('[AvatarEditor] Failed to compose preview:', error);
      // Show error message
      if (loadingText) {
        loadingText.setText('Error loading\nTry different options');
        loadingText.setColor('#ff6666');
        loadingText.setVisible(true);
      }
      // Stop any animation on the preview sprite to avoid showing broken frames
      if (this.previewSprite.anims.isPlaying) {
        this.previewSprite.anims.stop();
      }
    } finally {
      // Always clear isComposing flag, even on error
      this.isComposing = false;
    }

    // If there's a pending config, process it now
    if (this.pendingConfig) {
      const pending = this.pendingConfig;
      this.pendingConfig = null;
      this.currentConfig = pending;
      // Short delay before processing pending to allow UI to breathe
      this.time.delayedCall(50, () => this.doCompose());
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

  /**
   * Validate and auto-update clothing selections when body type changes.
   * If current selection is not valid for the new body type, select the first valid option.
   */
  private validateClothingForBodyType(newBodyType: BodyType) {
    // Check and update top
    const validTops = this.manifest.tops.filter(
      t => t.supportedBodyTypes?.includes(newBodyType) ?? true
    );
    const currentTopValid = validTops.some(t => t.id === this.currentConfig.clothing.top);
    if (!currentTopValid && validTops.length > 0) {
      this.currentConfig.clothing.top = validTops[0].id;
      console.log(`[AvatarEditor] Auto-selected top: ${validTops[0].id} for body type ${newBodyType}`);
    }

    // Check and update bottom
    const validBottoms = this.manifest.bottoms.filter(
      b => b.supportedBodyTypes?.includes(newBodyType) ?? true
    );
    const currentBottomValid = validBottoms.some(b => b.id === this.currentConfig.clothing.bottom);
    if (!currentBottomValid && validBottoms.length > 0) {
      this.currentConfig.clothing.bottom = validBottoms[0].id;
      console.log(`[AvatarEditor] Auto-selected bottom: ${validBottoms[0].id} for body type ${newBodyType}`);
    }

    // Check and update shoes
    const validShoes = this.manifest.shoes.filter(
      s => s.supportedBodyTypes?.includes(newBodyType) ?? true
    );
    const currentShoesValid = validShoes.some(s => s.id === this.currentConfig.clothing.shoes);
    if (!currentShoesValid && validShoes.length > 0) {
      this.currentConfig.clothing.shoes = validShoes[0].id;
      console.log(`[AvatarEditor] Auto-selected shoes: ${validShoes[0].id} for body type ${newBodyType}`);
    }
  }

  private cleanup() {
    // Remove keyboard listener
    this.input.keyboard!.off('keydown-ESC', this.handleCancel, this);

    // Remove wheel listener
    this.input.off('wheel', this.handleWheel, this);

    // Stop direction cycling timer
    if (this.directionTimer) {
      this.directionTimer.destroy();
      this.directionTimer = undefined;
    }

    // Stop debounce timer
    if (this.debounceTimer) {
      this.debounceTimer.destroy();
      this.debounceTimer = undefined;
    }

    // Clear mask
    if (this.scrollMask) {
      this.scrollMask.destroy();
    }

    // Clear pending composition
    this.pendingConfig = null;
    this.isComposing = false;
  }

  shutdown() {
    this.cleanup();
  }
}
