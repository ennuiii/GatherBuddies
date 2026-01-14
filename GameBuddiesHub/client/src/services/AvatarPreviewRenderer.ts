/**
 * Avatar Preview Renderer
 *
 * Standalone canvas-based avatar compositor for React components.
 * Does NOT depend on Phaser - uses raw Canvas API.
 * Used for real-time preview in the avatar editor modal.
 *
 * Path resolution follows LPC Universal Spritesheet Character Generator conventions.
 */

import type { AvatarConfig, BodyType } from '../types/avatar';
import { HAIR_STYLES } from '../types/avatar';

// LPC sprite sheet dimensions
const LPC_FRAME_WIDTH = 64;
const LPC_FRAME_HEIGHT = 64;
const LPC_COLS = 13;

// Animation rows in LPC Universal format
const WALK_ROWS = {
  up: 8,
  left: 9,
  down: 10,
  right: 11,
};

// Default colors for assets (white for clothing to allow tinting)
const DEFAULT_COLOR = 'white';
const DEFAULT_HAIR_COLOR = 'black';

// Layer rendering order (bottom to top)
const LAYER_ORDER = [
  'body',
  'face',
  'bottom',
  'shoes',
  'top',
  'hair',
] as const;

type LayerName = typeof LAYER_ORDER[number];

interface LayerConfig {
  assetKey: string;
  tint?: string; // Hex color string
}

/**
 * Body type path mappings for different asset categories
 * Based on LPC sheet_definitions/*.json
 */
const BODY_TYPE_MAPPINGS = {
  hair: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'male',
    child: 'male',
    pregnant: 'female',
  } as Record<string, string>,
  shoes: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'female',
    child: 'male',
    pregnant: 'female',
  } as Record<string, string>,
  tops: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'teen',
    child: 'male',
    pregnant: 'pregnant',
  } as Record<string, string>,
  bottoms: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'male',
    child: 'male',
    pregnant: 'female',
  } as Record<string, string>,
  face: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'male',
    child: 'child',
    pregnant: 'female',
  } as Record<string, string>,
};

class AvatarPreviewRendererService {
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Get base URL for assets
   */
  private getBaseUrl(): string {
    return (import.meta as any).env?.BASE_URL || '/';
  }

  /**
   * Get LPC path for an asset key with body type context
   */
  private getAssetPath(key: string, bodyType: BodyType): string {
    const baseUrl = this.getBaseUrl();
    const parts = key.split('_');
    const category = parts[0];

    switch (category) {
      case 'body': {
        // body_light -> body/bodies/{bodyType}/light.png
        const skinTone = parts[1];
        return `${baseUrl}assets/avatars/lpc/body/bodies/${bodyType}/${skinTone}.png`;
      }

      case 'face': {
        // face_light -> head/heads/human/{faceType}/light.png
        const skinTone = parts[1];
        const faceType = BODY_TYPE_MAPPINGS.face[bodyType] || 'male';
        return `${baseUrl}assets/avatars/lpc/head/heads/human/${faceType}/${skinTone}.png`;
      }

      case 'hair': {
        // hair_pixie_black -> hair/pixie/{gender}/black.png
        const style = parts[1];
        const color = parts[2] || DEFAULT_HAIR_COLOR;
        const gender = BODY_TYPE_MAPPINGS.hair[bodyType] || 'male';
        return `${baseUrl}assets/avatars/lpc/hair/${style}/${gender}/${color}.png`;
      }

      case 'top': {
        // top_tshirt_white -> torso/clothes/shortsleeve/...
        const topType = parts[1];
        const color = parts[2] || DEFAULT_COLOR;
        return this.getTopPath(baseUrl, topType, bodyType, color);
      }

      case 'bottom': {
        // bottom_pants_white -> legs/pants/{bodyType}/white.png
        const bottomType = parts[1];
        const color = parts[2] || DEFAULT_COLOR;
        return this.getBottomPath(baseUrl, bottomType, bodyType, color);
      }

      case 'shoes': {
        // shoes_shoes_white -> feet/shoes/{bodyType}/white.png
        const shoesType = parts[1];
        const color = parts[2] || DEFAULT_COLOR;
        return this.getShoesPath(baseUrl, shoesType, bodyType, color);
      }

      default:
        console.warn(`[AvatarPreviewRenderer] Unknown asset category: ${category}`);
        return `${baseUrl}assets/avatars/lpc/${key}.png`;
    }
  }

  /**
   * Get LPC path for top clothing
   */
  private getTopPath(baseUrl: string, topType: string, bodyType: BodyType, color: string): string {
    const mappedBodyType = BODY_TYPE_MAPPINGS.tops[bodyType] || 'male';

    // tshirt only has female/teen, male uses shortsleeve
    const tshirtPath = (mappedBodyType === 'female' || mappedBodyType === 'teen')
      ? `torso/clothes/shortsleeve/tshirt/${mappedBodyType}`
      : `torso/clothes/shortsleeve/shortsleeve/${mappedBodyType}`;

    const topMappings: Record<string, string> = {
      'tshirt': tshirtPath,
      'shortsleeve': `torso/clothes/shortsleeve/shortsleeve/${mappedBodyType}`,
      'tanktop': `torso/clothes/sleeveless/sleeveless/${mappedBodyType}`,
      'sleeveless': `torso/clothes/sleeveless/sleeveless/${mappedBodyType}`,
      'longsleeve': `torso/clothes/longsleeve/longsleeve/${mappedBodyType}`,
      'hoodie': `torso/clothes/longsleeve/longsleeve/${mappedBodyType}`,
      'jacket': `torso/jacket/collared/${mappedBodyType}`,
      'dress': `dress/slit/female`,
      'suit': `torso/clothes/longsleeve/formal/${mappedBodyType}`,
    };

    const basePath = topMappings[topType] || `torso/clothes/shortsleeve/shortsleeve/${mappedBodyType}`;
    return `${baseUrl}assets/avatars/lpc/${basePath}/${color}.png`;
  }

  /**
   * Get LPC path for bottom clothing
   */
  private getBottomPath(baseUrl: string, bottomType: string, bodyType: BodyType, color: string): string {
    const mappedBodyType = BODY_TYPE_MAPPINGS.bottoms[bodyType] || 'male';

    const bottomMappings: Record<string, string> = {
      'pants': `legs/pants/${mappedBodyType}`,
      'pants_formal': `legs/formal/${mappedBodyType}`,
      'jeans': `legs/pants/${mappedBodyType}`,
      'shorts': `legs/shorts/shorts/${mappedBodyType}`,
      'skirt': `legs/skirts/plain/female`,
      'leggings': `legs/leggings/leggings/female`,
      'pantaloons': `legs/pantaloons/pantaloons/${mappedBodyType}`,
      'sweatpants': `legs/pants/${mappedBodyType}`,
    };

    const basePath = bottomMappings[bottomType] || `legs/pants/${mappedBodyType}`;
    return `${baseUrl}assets/avatars/lpc/${basePath}/${color}.png`;
  }

  /**
   * Get LPC path for shoes
   */
  private getShoesPath(baseUrl: string, shoesType: string, bodyType: BodyType, color: string): string {
    const mappedBodyType = BODY_TYPE_MAPPINGS.shoes[bodyType] || 'male';

    const shoesMappings: Record<string, string> = {
      'shoes': `feet/shoes/${mappedBodyType}`,
      'shoes2': `feet/shoes2/${mappedBodyType}`,
      'sneakers': `feet/shoes/${mappedBodyType}`,
      'boots': `feet/boots/${mappedBodyType}`,
      'boots2': `feet/boots2/${mappedBodyType}`,
      'sandals': `feet/sandals/${mappedBodyType}`,
      'slippers': `feet/slippers/${mappedBodyType}`,
      'dress_shoes': `feet/shoes2/${mappedBodyType}`,
    };

    const basePath = shoesMappings[shoesType] || `feet/shoes/${mappedBodyType}`;
    return `${baseUrl}assets/avatars/lpc/${basePath}/${color}.png`;
  }

  /**
   * Load an image and cache it (with body type for unique cache key)
   */
  async loadImage(key: string, bodyType: BodyType): Promise<HTMLImageElement> {
    const cacheKey = `${key}_${bodyType}`;

    // Check cache
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const loading = this.loadingPromises.get(cacheKey);
    if (loading) {
      return loading;
    }

    // Start loading
    const path = this.getAssetPath(key, bodyType);
    console.log(`[AvatarPreviewRenderer] Loading: ${key} from ${path}`);

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        console.log(`[AvatarPreviewRenderer] Loaded: ${key}`);
        this.imageCache.set(cacheKey, img);
        this.loadingPromises.delete(cacheKey);
        resolve(img);
      };

      img.onerror = (err) => {
        console.error(`[AvatarPreviewRenderer] Failed to load: ${key} from ${path}`, err);
        this.loadingPromises.delete(cacheKey);
        reject(new Error(`Failed to load image: ${key}`));
      };

      img.src = path;
    });

    this.loadingPromises.set(cacheKey, promise);
    return promise;
  }

  /**
   * Get required asset keys for a config
   */
  private getRequiredAssetKeys(config: AvatarConfig): string[] {
    const keys: string[] = [];

    // Body
    keys.push(`body_${config.body.skinTone}`);

    // Face
    keys.push(`face_${config.body.skinTone}`);

    // Bottom
    keys.push(`bottom_${config.clothing.bottom}_${DEFAULT_COLOR}`);

    // Shoes
    keys.push(`shoes_${config.clothing.shoes}_${DEFAULT_COLOR}`);

    // Top
    keys.push(`top_${config.clothing.top}_${DEFAULT_COLOR}`);

    // Hair (if not bald)
    if (config.hair.style !== 'bald') {
      keys.push(`hair_${config.hair.style}_${DEFAULT_HAIR_COLOR}`);
    }

    return keys;
  }

  /**
   * Build layer configuration from avatar config
   */
  private buildLayers(config: AvatarConfig): Map<LayerName, LayerConfig> {
    const layers = new Map<LayerName, LayerConfig>();

    // Body (no tint - pre-colored by skin tone)
    layers.set('body', {
      assetKey: `body_${config.body.skinTone}`,
    });

    // Face (no tint - pre-colored by skin tone)
    layers.set('face', {
      assetKey: `face_${config.body.skinTone}`,
    });

    // Bottom
    layers.set('bottom', {
      assetKey: `bottom_${config.clothing.bottom}_${DEFAULT_COLOR}`,
      tint: config.clothing.bottomColor,
    });

    // Shoes
    layers.set('shoes', {
      assetKey: `shoes_${config.clothing.shoes}_${DEFAULT_COLOR}`,
      tint: config.clothing.shoesColor,
    });

    // Top
    layers.set('top', {
      assetKey: `top_${config.clothing.top}_${DEFAULT_COLOR}`,
      tint: config.clothing.topColor,
    });

    // Hair
    if (config.hair.style !== 'bald') {
      layers.set('hair', {
        assetKey: `hair_${config.hair.style}_${DEFAULT_HAIR_COLOR}`,
        tint: config.hair.color,
      });
    }

    return layers;
  }

  /**
   * Apply color tint to a canvas
   */
  private applyTint(
    sourceCanvas: OffscreenCanvas,
    tint: string,
    width: number,
    height: number
  ): OffscreenCanvas {
    const resultCanvas = new OffscreenCanvas(width, height);
    const ctx = resultCanvas.getContext('2d')!;

    // Draw source
    ctx.drawImage(sourceCanvas, 0, 0);

    // Apply multiply blend for tinting
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, width, height);

    // Restore alpha from original
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(sourceCanvas, 0, 0);

    return resultCanvas;
  }

  /**
   * Extract a single frame from a spritesheet
   */
  private extractFrame(
    img: HTMLImageElement,
    col: number,
    row: number
  ): OffscreenCanvas {
    const frameCanvas = new OffscreenCanvas(LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);
    const ctx = frameCanvas.getContext('2d')!;

    const srcX = col * LPC_FRAME_WIDTH;
    const srcY = row * LPC_FRAME_HEIGHT;

    ctx.drawImage(
      img,
      srcX, srcY, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT,
      0, 0, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT
    );

    return frameCanvas;
  }

  /**
   * Render a single frame of the avatar
   */
  async renderFrame(
    config: AvatarConfig,
    frameCol: number,
    frameRow: number
  ): Promise<OffscreenCanvas> {
    const bodyType = config.body.type;

    // Load all required images
    const keys = this.getRequiredAssetKeys(config);
    console.log(`[AvatarPreviewRenderer] Rendering frame with keys:`, keys);

    const images = await Promise.all(
      keys.map(async (key) => {
        try {
          return { key, img: await this.loadImage(key, bodyType) };
        } catch (err) {
          console.error(`[AvatarPreviewRenderer] Failed to load ${key}:`, err);
          return { key, img: null };
        }
      })
    );

    // Create image map
    const imageMap = new Map<string, HTMLImageElement>();
    for (const { key, img } of images) {
      if (img) {
        imageMap.set(key, img);
      }
    }

    // Build layers
    const layers = this.buildLayers(config);

    // Create result canvas
    const resultCanvas = new OffscreenCanvas(LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);
    const ctx = resultCanvas.getContext('2d')!;

    // Render each layer
    for (const layerName of LAYER_ORDER) {
      const layer = layers.get(layerName);
      if (!layer) continue;

      const img = imageMap.get(layer.assetKey);
      if (!img) {
        console.warn(`[AvatarPreviewRenderer] Missing image for layer: ${layerName} (${layer.assetKey})`);
        continue;
      }

      // Extract frame from spritesheet
      let frameCanvas = this.extractFrame(img, frameCol, frameRow);

      // Apply tint if needed
      if (layer.tint) {
        frameCanvas = this.applyTint(frameCanvas, layer.tint, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT);
      }

      // Draw to result
      ctx.drawImage(frameCanvas, 0, 0);
    }

    return resultCanvas;
  }

  /**
   * Render avatar to a canvas element (static)
   */
  async renderToCanvas(
    canvas: HTMLCanvasElement,
    config: AvatarConfig,
    direction: 'down' | 'left' | 'right' | 'up' = 'down'
  ): Promise<void> {
    const row = WALK_ROWS[direction];
    const frame = await this.renderFrame(config, 0, row);

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale to fit canvas while maintaining aspect ratio
    const scale = Math.min(
      canvas.width / LPC_FRAME_WIDTH,
      canvas.height / LPC_FRAME_HEIGHT
    );

    const drawWidth = LPC_FRAME_WIDTH * scale;
    const drawHeight = LPC_FRAME_HEIGHT * scale;
    const drawX = (canvas.width - drawWidth) / 2;
    const drawY = (canvas.height - drawHeight) / 2;

    // Use pixelated rendering for crisp sprites
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      frame,
      0, 0, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT,
      drawX, drawY, drawWidth, drawHeight
    );
  }

  /**
   * Start animated preview (walk cycle)
   * Returns a stop function
   */
  startAnimation(
    canvas: HTMLCanvasElement,
    config: AvatarConfig,
    direction: 'down' | 'left' | 'right' | 'up' = 'down'
  ): () => void {
    let frameIndex = 0;
    let animationId: number | null = null;
    let lastFrameTime = 0;
    const frameDelay = 100; // ms between frames
    const row = WALK_ROWS[direction];
    const numFrames = 9; // Walk cycle has 9 frames

    // Preload all frames
    const framePromises: Promise<OffscreenCanvas>[] = [];
    for (let i = 0; i < numFrames; i++) {
      framePromises.push(this.renderFrame(config, i, row));
    }

    let frames: OffscreenCanvas[] = [];
    let isRunning = true;

    // Load frames then start animation
    Promise.all(framePromises).then((loadedFrames) => {
      frames = loadedFrames;
      if (isRunning) {
        lastFrameTime = performance.now();
        animate(performance.now());
      }
    }).catch((err) => {
      console.error('[AvatarPreviewRenderer] Animation load failed:', err);
    });

    const animate = (currentTime: number) => {
      if (!isRunning) return;

      // Check if enough time has passed for next frame
      if (currentTime - lastFrameTime >= frameDelay) {
        frameIndex = (frameIndex + 1) % numFrames;
        lastFrameTime = currentTime;

        // Draw current frame
        if (frames[frameIndex]) {
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const scale = Math.min(
            canvas.width / LPC_FRAME_WIDTH,
            canvas.height / LPC_FRAME_HEIGHT
          );

          const drawWidth = LPC_FRAME_WIDTH * scale;
          const drawHeight = LPC_FRAME_HEIGHT * scale;
          const drawX = (canvas.width - drawWidth) / 2;
          const drawY = (canvas.height - drawHeight) / 2;

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            frames[frameIndex],
            0, 0, LPC_FRAME_WIDTH, LPC_FRAME_HEIGHT,
            drawX, drawY, drawWidth, drawHeight
          );
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Return stop function
    return () => {
      isRunning = false;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Clear the image cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingPromises.clear();
  }
}

// Export singleton instance
export const avatarPreviewRenderer = new AvatarPreviewRendererService();
export default avatarPreviewRenderer;
