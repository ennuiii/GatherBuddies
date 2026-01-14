/**
 * Avatar Compositor
 *
 * Composes avatar sprite sheets at runtime from LPC layers.
 * Uses OffscreenCanvas for efficient composition.
 * Caches composed textures to avoid re-rendering.
 */

import Phaser from 'phaser';
import type { AvatarConfig, SkinTone } from '../types/avatar';
import { HAIR_STYLES, SKIN_TONES, getLpcHairColor } from './AvatarManifest';
import { avatarAssetLoader, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT, LPC_COLS, LPC_ROWS } from './AvatarAssetLoader';

// Layer rendering order (bottom to top)
const LAYER_ORDER = [
  'body',
  'face',
  'bottom',
  'shoes',
  'top',
  'hair_back',
  'hair_front',
  'accessories',
] as const;

type LayerName = typeof LAYER_ORDER[number];

interface LayerConfig {
  textureKey: string;
  tint?: number; // RGB color to apply
}

interface CacheEntry {
  textureKey: string;
  timestamp: number;
}

// Display size (current game uses 32x48)
const DISPLAY_FRAME_WIDTH = 32;
const DISPLAY_FRAME_HEIGHT = 48;

class AvatarCompositorService {
  private scene: Phaser.Scene | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize = 20;

  /**
   * Initialize with Phaser scene
   */
  initialize(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Generate a unique cache key from avatar config
   */
  private generateCacheKey(config: AvatarConfig): string {
    // Create a deterministic string from config
    return JSON.stringify({
      body: config.body,
      hair: config.hair,
      clothing: config.clothing,
      accessories: config.accessories.map(a => ({ type: a.type, color: a.color })),
    });
  }

  /**
   * Convert hex color string to integer
   */
  private hexToInt(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  /**
   * Get skin tone tint value
   */
  private getSkinTint(tone: SkinTone): number {
    const skinInfo = SKIN_TONES.find(s => s.id === tone);
    return skinInfo ? this.hexToInt(skinInfo.hex) : 0xF0C8A0;
  }

  /**
   * Build layer configuration from avatar config
   * Keys must match format used in AvatarAssetLoader (with bodyType suffix for body-specific assets)
   */
  private buildLayers(config: AvatarConfig): Map<LayerName, LayerConfig> {
    console.log('[AvatarCompositor] Building layers for body type:', config.body.type);
    const layers = new Map<LayerName, LayerConfig>();
    const DEFAULT_COLOR = 'white';
    const DEFAULT_HAIR_COLOR = 'black';
    const bodyType = config.body.type;

    // Body - key format: body_{skinTone}_{bodyType}
    layers.set('body', {
      textureKey: `body_${config.body.skinTone}_${bodyType}`,
      // Note: Body sprites are pre-colored per skin tone, no tint needed
    });

    // Face - key format: face_{skinTone}_{bodyType}
    layers.set('face', {
      textureKey: `face_${config.body.skinTone}_${bodyType}`,
    });

    // Bottom (pants/skirt) - key format: bottom_{type}_{color}_{bodyType}
    layers.set('bottom', {
      textureKey: `bottom_${config.clothing.bottom}_${DEFAULT_COLOR}_${bodyType}`,
      tint: this.hexToInt(config.clothing.bottomColor),
    });

    // Shoes - key format: shoes_{type}_{color}_{bodyType}
    layers.set('shoes', {
      textureKey: `shoes_${config.clothing.shoes}_${DEFAULT_COLOR}_${bodyType}`,
      tint: this.hexToInt(config.clothing.shoesColor),
    });

    // Top (shirt/jacket) - key format: top_{type}_{color}_{bodyType}
    layers.set('top', {
      textureKey: `top_${config.clothing.top}_${DEFAULT_COLOR}_${bodyType}`,
      tint: this.hexToInt(config.clothing.topColor),
    });

    // Hair - key format: hair_{style}_{color}_{bodyType}
    // LPC has pre-colored sprites, so we load the matching color file (no tinting needed)
    if (config.hair.style !== 'bald') {
      const hairInfo = HAIR_STYLES.find(h => h.id === config.hair.style);
      const hairColor = getLpcHairColor(config.hair.color);

      // Back layer for some hair styles
      if (hairInfo?.hasBackLayer) {
        layers.set('hair_back', {
          textureKey: `hair_${config.hair.style}_back_${hairColor}_${bodyType}`,
          // No tint - LPC sprites are pre-colored
        });
      }

      // Front layer (main hair)
      layers.set('hair_front', {
        textureKey: `hair_${config.hair.style}_${hairColor}_${bodyType}`,
        // No tint - LPC sprites are pre-colored
      });
    }

    // Accessories (not body-type-specific)
    if (config.accessories.length > 0) {
      const acc = config.accessories[0];
      layers.set('accessories', {
        textureKey: `accessory_${acc.type}`,
        tint: acc.color ? this.hexToInt(acc.color) : undefined,
      });
    }

    // Log all layers for debugging
    console.log('[AvatarCompositor] Built layers:');
    layers.forEach((layer, name) => {
      console.log(`  - ${name}: ${layer.textureKey}${layer.tint ? ` (tint: 0x${layer.tint.toString(16)})` : ''}`);
    });

    return layers;
  }

  /**
   * Apply color tint to a frame using canvas operations
   */
  private applyTint(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
    tint: number,
    width: number,
    height: number
  ): void {
    // Create temporary canvas for tinting
    const tempCanvas = new OffscreenCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d')!;

    // Draw source
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Apply multiply blend for tinting
    tempCtx.globalCompositeOperation = 'multiply';
    const r = (tint >> 16) & 0xFF;
    const g = (tint >> 8) & 0xFF;
    const b = tint & 0xFF;
    tempCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    tempCtx.fillRect(0, 0, width, height);

    // Restore alpha from original
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Draw result to main context
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Map extended LPC rows to standard LPC rows for sprites that don't have extended animations.
   * Standard LPC has 21 rows (walk at rows 8-11).
   * Extended LPC has 46 rows (adds idle at 22-25, sit at 30-33, run at 34-37).
   *
   * For sprites with only 21 rows, we map extended rows back to walk rows.
   *
   * @param row - The requested animation row
   * @param maxRows - The number of rows in this sprite
   * @param forceFallback - If true, always use fallback even if sprite has the row
   */
  private getFallbackRow(row: number, maxRows: number, forceFallback: boolean = false): number {
    // If forceFallback is true, always compute fallback (used for sit animation to keep all layers aligned)
    if (!forceFallback && row < maxRows) return row;

    // Map extended animation rows to walk animation rows
    // Idle rows 22-25 -> Walk rows 8-11
    if (row >= 22 && row <= 25) return row - 14; // 22->8, 23->9, 24->10, 25->11
    // Sit rows 30-33 -> Walk rows 8-11
    if (row >= 30 && row <= 33) return row - 22; // 30->8, 31->9, 32->10, 33->11
    // Run rows 34-37 -> Walk rows 8-11
    if (row >= 34 && row <= 37) return row - 26; // 34->8, 35->9, 36->10, 37->11

    // For any other row beyond sprite's height, use walk down (row 10)
    return Math.min(row % maxRows, 10);
  }

  /**
   * Check if a row is a sit animation row (30-33)
   */
  private isSitRow(row: number): boolean {
    return row >= 30 && row <= 33;
  }

  /**
   * Compose a single frame from multiple layers
   */
  private composeFrame(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    layers: Map<LayerName, LayerConfig>,
    col: number,
    row: number
  ): void {
    const srcX = col * LPC_FRAME_WIDTH;

    for (const layerName of LAYER_ORDER) {
      const layer = layers.get(layerName);
      if (!layer) continue;

      const texture = avatarAssetLoader.getTexture(layer.textureKey);
      if (!texture) {
        console.error(`[AvatarCompositor] Missing texture: ${layer.textureKey}`);
        continue;
      }

      const source = texture.getSourceImage() as HTMLImageElement;
      if (!source || !source.complete) {
        console.error(`[AvatarCompositor] Texture not ready: ${layer.textureKey}`);
        continue;
      }

      // Check if this sprite has the requested row, if not use fallback
      const spriteRows = Math.floor(source.height / LPC_FRAME_HEIGHT);

      // For sit animation rows (30-33), force ALL layers to use fallback
      // This ensures body and clothing use the same walk-pose frames
      // (clothing doesn't have sit rows, so body using sit + clothing using walk = misalignment)
      const forceFallback = this.isSitRow(row);
      const actualRow = this.getFallbackRow(row, spriteRows, forceFallback);
      const srcY = actualRow * LPC_FRAME_HEIGHT;

      // Debug: Log when using fallback for sit/idle/run animations
      if (row !== actualRow) {
        console.log(`[AvatarCompositor] Layer ${layerName}: row ${row} -> fallback ${actualRow} (sprite has ${spriteRows} rows, forceFallback=${forceFallback})`);
      }

      if (layer.tint) {
        // Create temp canvas for this frame
        const frameCanvas = new OffscreenCanvas(LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);
        const frameCtx = frameCanvas.getContext('2d')!;

        // Draw frame from source
        frameCtx.drawImage(
          source,
          srcX, srcY, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT,
          0, 0, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT
        );

        // Apply tint and draw to main canvas
        this.applyTint(ctx, frameCanvas, layer.tint, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);
      } else {
        // Draw directly without tint
        ctx.drawImage(
          source,
          srcX, srcY, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT,
          0, 0, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT
        );
      }
    }
  }

  /**
   * Compose full sprite sheet for an avatar
   * Returns the texture key to use
   */
  async composeAvatar(config: AvatarConfig): Promise<string> {
    console.log('[AvatarCompositor] Starting composition with config:', JSON.stringify(config, null, 2));

    if (!this.scene) {
      console.error('[AvatarCompositor] Not initialized - scene is null');
      throw new Error('[AvatarCompositor] Not initialized');
    }

    const cacheKey = this.generateCacheKey(config);
    console.log('[AvatarCompositor] Cache key:', cacheKey);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('[AvatarCompositor] Using cached texture:', cached.textureKey);
      cached.timestamp = Date.now();
      return cached.textureKey;
    }

    // Ensure all assets are loaded
    console.log('[AvatarCompositor] Loading assets for config...');
    let requiredKeys: string[];
    try {
      requiredKeys = await avatarAssetLoader.loadForConfig(config);
      console.log('[AvatarCompositor] Required asset keys:', requiredKeys);
    } catch (loadError) {
      console.error('[AvatarCompositor] Failed to load assets:', loadError);
      throw loadError;
    }

    // Verify all required assets are actually loaded
    const bodyType = config.body.type;
    const missingAssets = requiredKeys.filter(key => !avatarAssetLoader.isLoaded(key, bodyType));
    if (missingAssets.length > 0) {
      console.error('[AvatarCompositor] Missing required assets after loading:', missingAssets);
      console.error('[AvatarCompositor] Body type:', bodyType);
      // Log which assets ARE loaded for debugging
      const loadedAssets = requiredKeys.filter(key => avatarAssetLoader.isLoaded(key, bodyType));
      console.log('[AvatarCompositor] Successfully loaded assets:', loadedAssets);
      throw new Error(`Failed to load avatar assets: ${missingAssets.join(', ')}`);
    }

    console.log('[AvatarCompositor] All assets loaded successfully');

    // Build layer configuration
    const layers = this.buildLayers(config);

    // Create sprite sheet canvas (LPC dimensions)
    const sheetWidth = LPC_COLS * LPC_FRAME_WIDTH;
    const sheetHeight = LPC_ROWS * LPC_FRAME_HEIGHT;
    const sheetCanvas = new OffscreenCanvas(sheetWidth, sheetHeight);
    const sheetCtx = sheetCanvas.getContext('2d')!;

    // Frame composition canvas
    const frameCanvas = new OffscreenCanvas(LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);
    const frameCtx = frameCanvas.getContext('2d')!;

    // Compose each frame
    for (let row = 0; row < LPC_ROWS; row++) {
      for (let col = 0; col < LPC_COLS; col++) {
        // Clear frame canvas
        frameCtx.clearRect(0, 0, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);

        // Compose this frame
        this.composeFrame(frameCtx, layers, col, row);

        // Draw to sheet
        sheetCtx.drawImage(
          frameCanvas,
          col * LPC_FRAME_WIDTH,
          row * LPC_FRAME_HEIGHT
        );
      }
    }

    // Scale down to display size (32x48)
    const displayWidth = LPC_COLS * DISPLAY_FRAME_WIDTH;
    const displayHeight = LPC_ROWS * DISPLAY_FRAME_HEIGHT;
    const displayCanvas = new OffscreenCanvas(displayWidth, displayHeight);
    const displayCtx = displayCanvas.getContext('2d')!;

    // Use high quality scaling
    displayCtx.imageSmoothingEnabled = true;
    displayCtx.imageSmoothingQuality = 'high';
    displayCtx.drawImage(
      sheetCanvas,
      0, 0, sheetWidth, sheetHeight,
      0, 0, displayWidth, displayHeight
    );

    // Generate unique texture key
    const textureKey = `avatar_${config.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Convert OffscreenCanvas to HTMLCanvasElement (required for Phaser)
    // Using HTMLCanvasElement + toDataURL + Image avoids CSP blob: restriction
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = displayWidth;
    tempCanvas.height = displayHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(displayCanvas, 0, 0);

    // Convert to data URL and load as Image
    const dataUrl = tempCanvas.toDataURL('image/png');
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load composed avatar image`));
      img.src = dataUrl;
    });

    // Add spritesheet texture directly (bypasses XHR loader and CSP restrictions)
    this.scene!.textures.addSpriteSheet(textureKey, img, {
      frameWidth: DISPLAY_FRAME_WIDTH,
      frameHeight: DISPLAY_FRAME_HEIGHT,
    });

    // Add to cache
    this.addToCache(cacheKey, textureKey);

    console.log(`[AvatarCompositor] Composed avatar: ${textureKey}`);
    return textureKey;
  }

  /**
   * Add to cache with LRU eviction
   */
  private addToCache(cacheKey: string, textureKey: string): void {
    // Evict oldest if full
    if (this.cache.size >= this.maxCacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const old = this.cache.get(oldestKey);
        if (old && this.scene) {
          this.scene.textures.remove(old.textureKey);
        }
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(cacheKey, {
      textureKey,
      timestamp: Date.now(),
    });
  }

  /**
   * Create animations for a composed avatar texture
   *
   * LPC Extended Format Row Layout:
   * - Walk: rows 8-11 (up, left, down, right) - 9 frames
   * - Idle: rows 22-25 (up, left, down, right) - 2 frames (0-1)
   * - Run: rows 34-37 (up, left, down, right) - 8 frames
   * - Sit: rows 30-33 (up, left, down, right) - 3 frames (0-2)
   */
  createAnimations(textureKey: string): void {
    if (!this.scene) return;

    // Direction mappings (LPC order: up, left, down, right within each animation group)
    const directions = ['down', 'left', 'right', 'up'] as const;

    // Row mappings per direction (index matches directions array)
    const walkRows = [10, 9, 11, 8]; // walk-down=10, walk-left=9, walk-right=11, walk-up=8
    const idleRows = [24, 23, 25, 22]; // idle-down=24, idle-left=23, idle-right=25, idle-up=22
    const runRows = [36, 35, 37, 34]; // run-down=36, run-left=35, run-right=37, run-up=34
    const sitRows = [32, 31, 33, 30]; // sit-down=32, sit-left=31, sit-right=33, sit-up=30

    directions.forEach((dir, index) => {
      const walkRow = walkRows[index];
      const idleRow = idleRows[index];
      const runRow = runRows[index];
      const sitRow = sitRows[index];

      // Walk animation (9 frames, used for slower movement)
      const walkKey = `${textureKey}_walk_${dir}`;
      if (!this.scene!.anims.exists(walkKey)) {
        this.scene!.anims.create({
          key: walkKey,
          frames: this.scene!.anims.generateFrameNumbers(textureKey, {
            start: walkRow * LPC_COLS,
            end: walkRow * LPC_COLS + 8,
          }),
          frameRate: 12,
          repeat: -1,
        });
      }

      // Run animation (8 frames, used for faster movement)
      const runKey = `${textureKey}_run_${dir}`;
      if (!this.scene!.anims.exists(runKey)) {
        this.scene!.anims.create({
          key: runKey,
          frames: this.scene!.anims.generateFrameNumbers(textureKey, {
            start: runRow * LPC_COLS,
            end: runRow * LPC_COLS + 7,
          }),
          frameRate: 15,
          repeat: -1,
        });
      }

      // Idle animation (2 frames from dedicated idle rows)
      const idleKey = `${textureKey}_idle_${dir}`;
      if (!this.scene!.anims.exists(idleKey)) {
        this.scene!.anims.create({
          key: idleKey,
          frames: this.scene!.anims.generateFrameNumbers(textureKey, {
            start: idleRow * LPC_COLS,
            end: idleRow * LPC_COLS + 1,
          }),
          frameRate: 2, // Slow idle animation
          repeat: -1,
        });
      }

      // Sit animation (3 frames)
      const sitKey = `${textureKey}_sit_${dir}`;
      if (!this.scene!.anims.exists(sitKey)) {
        this.scene!.anims.create({
          key: sitKey,
          frames: this.scene!.anims.generateFrameNumbers(textureKey, {
            start: sitRow * LPC_COLS,
            end: sitRow * LPC_COLS + 2,
          }),
          frameRate: 4,
          repeat: 0,
        });
      }
    });

    console.log(`[AvatarCompositor] Created animations for: ${textureKey}`);
  }

  /**
   * Get cached texture key for config if exists
   */
  getCachedTextureKey(config: AvatarConfig): string | null {
    const cacheKey = this.generateCacheKey(config);
    const cached = this.cache.get(cacheKey);
    return cached?.textureKey || null;
  }

  /**
   * Clean up all cached textures
   */
  dispose(): void {
    if (this.scene) {
      for (const entry of this.cache.values()) {
        this.scene.textures.remove(entry.textureKey);
      }
    }
    this.cache.clear();
    this.scene = null;
  }
}

// Export singleton instance
export const avatarCompositor = new AvatarCompositorService();
export default avatarCompositor;
