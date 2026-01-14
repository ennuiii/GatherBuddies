/**
 * Avatar Compositor
 *
 * Composes avatar sprite sheets at runtime from LPC layers.
 * Uses OffscreenCanvas for efficient composition.
 * Caches composed textures to avoid re-rendering.
 */

import Phaser from 'phaser';
import type { AvatarConfig, SkinTone } from '../types/avatar';
import { HAIR_STYLES, SKIN_TONES } from './AvatarManifest';
import { avatarAssetLoader, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT, LPC_COLS, LPC_ROWS } from './AvatarAssetLoader';

// Layer rendering order (bottom to top)
const LAYER_ORDER = [
  'body',
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
   */
  private buildLayers(config: AvatarConfig): Map<LayerName, LayerConfig> {
    const layers = new Map<LayerName, LayerConfig>();

    // Body
    layers.set('body', {
      textureKey: `body_${config.body.type}_${config.body.skinTone}`,
      // Note: Body sprites are pre-colored per skin tone, no tint needed
    });

    // Bottom (pants/skirt)
    layers.set('bottom', {
      textureKey: `bottom_${config.clothing.bottom}`,
      tint: this.hexToInt(config.clothing.bottomColor),
    });

    // Shoes
    layers.set('shoes', {
      textureKey: `shoes_${config.clothing.shoes}`,
      tint: this.hexToInt(config.clothing.shoesColor),
    });

    // Top (shirt/jacket)
    layers.set('top', {
      textureKey: `top_${config.clothing.top}`,
      tint: this.hexToInt(config.clothing.topColor),
    });

    // Hair
    if (config.hair.style !== 'bald') {
      const hairInfo = HAIR_STYLES.find(h => h.id === config.hair.style);

      // Back layer for some hair styles
      if (hairInfo?.hasBackLayer) {
        layers.set('hair_back', {
          textureKey: `hair_${config.hair.style}_back`,
          tint: this.hexToInt(config.hair.color),
        });
      }

      // Front layer (main hair)
      layers.set('hair_front', {
        textureKey: `hair_${config.hair.style}`,
        tint: this.hexToInt(config.hair.color),
      });
    }

    // Accessories (simplified - just use first one for now)
    if (config.accessories.length > 0) {
      const acc = config.accessories[0];
      layers.set('accessories', {
        textureKey: `accessory_${acc.type}`,
        tint: acc.color ? this.hexToInt(acc.color) : undefined,
      });
    }

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
   * Compose a single frame from multiple layers
   */
  private composeFrame(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    layers: Map<LayerName, LayerConfig>,
    col: number,
    row: number
  ): void {
    const srcX = col * LPC_FRAME_WIDTH;
    const srcY = row * LPC_FRAME_HEIGHT;

    let missingTextures: string[] = [];

    for (const layerName of LAYER_ORDER) {
      const layer = layers.get(layerName);
      if (!layer) continue;

      const texture = avatarAssetLoader.getTexture(layer.textureKey);
      if (!texture) {
        console.error(`[AvatarCompositor] Missing texture: ${layer.textureKey}`);
        missingTextures.push(layer.textureKey);
        continue;
      }

      const source = texture.getSourceImage() as HTMLImageElement;
      if (!source || !source.complete) {
        console.error(`[AvatarCompositor] Texture not ready: ${layer.textureKey}`);
        missingTextures.push(layer.textureKey);
        continue;
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
    if (!this.scene) {
      throw new Error('[AvatarCompositor] Not initialized');
    }

    const cacheKey = this.generateCacheKey(config);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.timestamp = Date.now();
      return cached.textureKey;
    }

    // Ensure all assets are loaded
    const requiredKeys = await avatarAssetLoader.loadForConfig(config);

    // Verify all required assets are actually loaded
    const missingAssets = requiredKeys.filter(key => !avatarAssetLoader.isLoaded(key));
    if (missingAssets.length > 0) {
      console.error('[AvatarCompositor] Missing required assets:', missingAssets);
      throw new Error(`Failed to load avatar assets: ${missingAssets.join(', ')}`);
    }

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

    // Convert to blob and create Phaser texture
    const blob = await displayCanvas.convertToBlob({ type: 'image/png' });
    const url = URL.createObjectURL(blob);

    // Load into Phaser
    await new Promise<void>((resolve, reject) => {
      this.scene!.load.spritesheet(textureKey, url, {
        frameWidth: DISPLAY_FRAME_WIDTH,
        frameHeight: DISPLAY_FRAME_HEIGHT,
      });

      this.scene!.load.once(`filecomplete-spritesheet-${textureKey}`, () => {
        URL.revokeObjectURL(url);
        resolve();
      });

      this.scene!.load.once('loaderror', (file: Phaser.Loader.File) => {
        if (file.key === textureKey) {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to create texture: ${textureKey}`));
        }
      });

      this.scene!.load.start();
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
   */
  createAnimations(textureKey: string): void {
    if (!this.scene) return;

    // Animation frame mappings for LPC Universal format
    // Row 8-11 are walking animations (down, left, right, up)
    const directions = ['down', 'left', 'right', 'up'];
    const walkStartRows = [10, 9, 11, 8]; // LPC row order: up, left, down, right

    directions.forEach((dir, index) => {
      const row = walkStartRows[index];

      // Walk animation (9 frames)
      const walkKey = `${textureKey}_run_${dir}`;
      if (!this.scene!.anims.exists(walkKey)) {
        this.scene!.anims.create({
          key: walkKey,
          frames: this.scene!.anims.generateFrameNumbers(textureKey, {
            start: row * LPC_COLS,
            end: row * LPC_COLS + 8,
          }),
          frameRate: 15,
          repeat: -1,
        });
      }

      // Idle animation (use first frame of walk)
      const idleKey = `${textureKey}_idle_${dir}`;
      if (!this.scene!.anims.exists(idleKey)) {
        this.scene!.anims.create({
          key: idleKey,
          frames: this.scene!.anims.generateFrameNumbers(textureKey, {
            start: row * LPC_COLS,
            end: row * LPC_COLS,
          }),
          frameRate: 1,
          repeat: -1,
        });
      }
    });

    // Sitting animations (if available in sheet - simplified for now)
    // Uses first frame of down walk as sitting placeholder
    const sitKey = `${textureKey}_sit_down`;
    if (!this.scene.anims.exists(sitKey)) {
      this.scene.anims.create({
        key: sitKey,
        frames: this.scene.anims.generateFrameNumbers(textureKey, {
          start: 10 * LPC_COLS,
          end: 10 * LPC_COLS,
        }),
        frameRate: 1,
        repeat: 0,
      });
    }

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
