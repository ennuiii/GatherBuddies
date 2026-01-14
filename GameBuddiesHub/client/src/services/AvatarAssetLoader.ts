/**
 * Avatar Asset Loader
 *
 * Manages loading of LPC sprite layer assets from local files.
 * Assets are downloaded at build time by scripts/download-lpc-assets.js
 */

import Phaser from 'phaser';
import type { AvatarConfig } from '../types/avatar';
import { HAIR_STYLES } from './AvatarManifest';

// Get base URL for assets (handles /hub/ prefix in production)
const getBaseUrl = () => import.meta.env.BASE_URL || '/';

// LPC sprite sheet dimensions
export const LPC_FRAME_WIDTH = 64;
export const LPC_FRAME_HEIGHT = 64;
export const LPC_COLS = 13; // Columns in LPC Universal sheet
export const LPC_ROWS = 21; // Rows in LPC Universal sheet

// Preload these assets during boot for faster initial load
// NOTE: skin tone must be one that exists for all body types (light, olive, tan, dark)
const PRELOAD_ASSETS = [
  'body_neutral_light',
  'hair_short',
  'top_tshirt',
  'bottom_jeans',
  'shoes_sneakers',
];

class AvatarAssetLoaderService {
  private scene: Phaser.Scene | null = null;
  private loadedAssets: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  /**
   * Initialize with a Phaser scene
   */
  initialize(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.scene !== null;
  }

  /**
   * Preload essential assets during boot
   * Returns a promise that resolves when all essential assets are loaded
   */
  async preloadEssentials(): Promise<void> {
    if (!this.scene) {
      console.warn('[AvatarAssetLoader] Cannot preload - not initialized');
      return;
    }

    console.log('[AvatarAssetLoader] Preloading essential assets...');

    // Load all essential assets in parallel
    const promises = PRELOAD_ASSETS.map(key => this.loadAsset(key));

    try {
      await Promise.all(promises);
      console.log('[AvatarAssetLoader] Essential assets loaded successfully');
    } catch (error) {
      console.error('[AvatarAssetLoader] Failed to preload some assets:', error);
      // Don't throw - allow game to continue with legacy characters
    }
  }

  /**
   * Load a specific asset and return promise
   */
  async loadAsset(key: string): Promise<void> {
    if (!this.scene) {
      throw new Error('[AvatarAssetLoader] Not initialized');
    }

    // Already loaded
    if (this.loadedAssets.has(key)) {
      return;
    }

    // Already loading
    const existing = this.loadingPromises.get(key);
    if (existing) {
      return existing;
    }

    // Start loading
    const promise = new Promise<void>((resolve, reject) => {
      const assetPath = this.getAssetPath(key);
      console.log(`[AvatarAssetLoader] Loading: ${key} from ${assetPath}`);

      // Queue the asset
      this.scene!.load.spritesheet(key, assetPath, {
        frameWidth: LPC_FRAME_WIDTH,
        frameHeight: LPC_FRAME_HEIGHT,
      });

      // Listen for this specific file completion
      const onComplete = (loadedKey: string) => {
        if (loadedKey === key) {
          this.scene!.load.off('filecomplete', onComplete);
          this.scene!.load.off('loaderror', onError);
          this.loadedAssets.add(key);
          this.loadingPromises.delete(key);
          console.log(`[AvatarAssetLoader] Loaded: ${key}`);
          resolve();
        }
      };

      const onError = (file: Phaser.Loader.File) => {
        if (file.key === key) {
          this.scene!.load.off('filecomplete', onComplete);
          this.scene!.load.off('loaderror', onError);
          this.loadingPromises.delete(key);
          console.error(`[AvatarAssetLoader] Failed to load: ${key}`);
          reject(new Error(`Failed to load asset: ${key}`));
        }
      };

      this.scene!.load.on('filecomplete', onComplete);
      this.scene!.load.on('loaderror', onError);

      // Start the loader
      this.scene!.load.start();
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * Load all assets required for an avatar configuration
   */
  async loadForConfig(config: AvatarConfig): Promise<string[]> {
    const keys = this.getRequiredAssetKeys(config);
    console.log(`[AvatarAssetLoader] Loading ${keys.length} assets for config:`, keys);

    // Load all required assets
    const results = await Promise.allSettled(keys.map(key => this.loadAsset(key)));

    // Check for failures
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`[AvatarAssetLoader] ${failed.length} assets failed to load`);
    }

    return keys;
  }

  /**
   * Get list of asset keys required for a config
   */
  getRequiredAssetKeys(config: AvatarConfig): string[] {
    const keys: string[] = [];

    // Body
    keys.push(`body_${config.body.type}_${config.body.skinTone}`);

    // Hair (if not bald)
    if (config.hair.style !== 'bald') {
      keys.push(`hair_${config.hair.style}`);

      // Check if hair style has back layer
      const hairInfo = HAIR_STYLES.find(h => h.id === config.hair.style);
      if (hairInfo?.hasBackLayer) {
        keys.push(`hair_${config.hair.style}_back`);
      }
    }

    // Clothing
    keys.push(`top_${config.clothing.top}`);
    keys.push(`bottom_${config.clothing.bottom}`);
    keys.push(`shoes_${config.clothing.shoes}`);

    // Accessories
    for (const acc of config.accessories) {
      keys.push(`accessory_${acc.type}`);
    }

    return keys;
  }

  /**
   * Convert asset key to local file path
   * Asset keys follow format: category_type_variant
   * Maps to: /assets/avatars/category/type/variant.png
   */
  private getAssetPath(key: string): string {
    const baseUrl = getBaseUrl();
    const parts = key.split('_');
    const category = parts[0];

    switch (category) {
      case 'body': {
        // body_neutral_fair -> /assets/avatars/bodies/neutral/fair.png
        const bodyType = parts[1];
        const skinTone = parts[2];
        return `${baseUrl}assets/avatars/bodies/${bodyType}/${skinTone}.png`;
      }

      case 'hair': {
        // hair_short -> /assets/avatars/hair/short.png
        // hair_long_back -> /assets/avatars/hair/long_back.png
        const rest = parts.slice(1).join('_');
        return `${baseUrl}assets/avatars/hair/${rest}.png`;
      }

      case 'top': {
        // top_tshirt -> /assets/avatars/tops/tshirt.png
        const topType = parts.slice(1).join('_');
        return `${baseUrl}assets/avatars/tops/${topType}.png`;
      }

      case 'bottom': {
        // bottom_jeans -> /assets/avatars/bottoms/jeans.png
        const bottomType = parts.slice(1).join('_');
        return `${baseUrl}assets/avatars/bottoms/${bottomType}.png`;
      }

      case 'shoes': {
        // shoes_sneakers -> /assets/avatars/shoes/sneakers.png
        const shoesType = parts.slice(1).join('_');
        return `${baseUrl}assets/avatars/shoes/${shoesType}.png`;
      }

      case 'accessory': {
        // accessory_glasses -> /assets/avatars/accessories/glasses.png
        const accType = parts.slice(1).join('_');
        return `${baseUrl}assets/avatars/accessories/${accType}.png`;
      }

      default:
        console.warn(`[AvatarAssetLoader] Unknown asset category: ${category}`);
        return `${baseUrl}assets/avatars/${key}.png`;
    }
  }

  /**
   * Check if an asset is loaded
   */
  isLoaded(key: string): boolean {
    return this.loadedAssets.has(key);
  }

  /**
   * Check if all assets for a config are loaded
   */
  areAllLoaded(config: AvatarConfig): boolean {
    const keys = this.getRequiredAssetKeys(config);
    return keys.every(key => this.loadedAssets.has(key));
  }

  /**
   * Get the Phaser texture for an asset key
   */
  getTexture(key: string): Phaser.Textures.Texture | null {
    if (!this.scene || !this.loadedAssets.has(key)) {
      return null;
    }
    return this.scene.textures.get(key);
  }

  /**
   * Clean up (call when leaving scene)
   */
  dispose(): void {
    this.loadedAssets.clear();
    this.loadingPromises.clear();
    this.scene = null;
  }
}

// Export singleton instance
export const avatarAssetLoader = new AvatarAssetLoaderService();
export default avatarAssetLoader;
