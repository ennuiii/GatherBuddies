/**
 * Avatar Asset Loader
 *
 * Manages loading of LPC sprite layer assets.
 * Path resolution follows LPC Universal Spritesheet Character Generator conventions.
 * Repository: https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
 *
 * Key concept: Each asset type has body-type-specific paths.
 * Body types: male, female, muscular, child, teen, pregnant
 * Some body types share paths (muscular→male for some assets, pregnant→female)
 */

import Phaser from 'phaser';
import type { AvatarConfig, BodyType } from '../types/avatar';
import { getLpcHairColor } from './AvatarManifest';

// Get base URL for assets (handles /hub/ prefix in production)
const getBaseUrl = () => import.meta.env.BASE_URL || '/';

// LPC sprite sheet dimensions
export const LPC_FRAME_WIDTH = 64;
export const LPC_FRAME_HEIGHT = 64;
export const LPC_COLS = 13; // Columns in LPC Universal sheet
export const LPC_ROWS = 46; // Rows in LPC Extended sheet (includes idle, run, sit, jump)

// Default color for assets
const DEFAULT_COLOR = 'white';
const DEFAULT_HAIR_COLOR = 'black';

// Preload these assets during boot for faster initial load
// Keys format: category_variant (bodyType is passed separately)
const PRELOAD_ASSETS = [
  { key: 'body_light', bodyType: 'male' as BodyType },
  { key: 'face_light', bodyType: 'male' as BodyType },
  { key: 'hair_pixie_black', bodyType: 'male' as BodyType },
  { key: 'top_tshirt_white', bodyType: 'male' as BodyType },
  { key: 'bottom_pants_white', bodyType: 'male' as BodyType },
  { key: 'shoes_shoes_white', bodyType: 'male' as BodyType },
];

/**
 * Body type path mappings for different asset categories
 * Based on LPC sheet_definitions/*.json
 */
const BODY_TYPE_MAPPINGS = {
  // Hair: muscular/teen use male, pregnant uses female
  hair: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'male',
    child: 'male', // child uses male paths for hair
    pregnant: 'female',
  },
  // Shoes: teen/pregnant use female, muscular uses male
  shoes: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'female',
    child: 'male',
    pregnant: 'female',
  },
  // Tops: each body type has its own or maps to similar
  tops: {
    male: 'male',
    female: 'female',
    muscular: 'male', // muscular often has own, fallback to male
    teen: 'teen',
    child: 'male',
    pregnant: 'pregnant',
  },
  // Bottoms: similar to tops
  bottoms: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'male',
    child: 'male',
    pregnant: 'female',
  },
  // Face/head: male, female, child available
  face: {
    male: 'male',
    female: 'female',
    muscular: 'male',
    teen: 'male',
    child: 'child',
    pregnant: 'female',
  },
};

/**
 * Hair styles that use 'adult/' folder instead of 'male/female/' folders.
 * These styles have gender-neutral assets.
 */
const ADULT_ONLY_HAIR_STYLES = new Set([
  'bob', 'bob_side_part', 'balding', 'bangs_bun', 'buzzcut', 'cornrows', 'cowlick',
  'curly_short', 'curly_short2', 'dreadlocks_short', 'idol', 'jewfro',
  'natural', 'page2', 'parted3', 'parted_side_bangs', 'parted_side_bangs2',
  'shoulderl', 'shoulderr', 'twists_fade', 'twists_straight',
]);

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
   */
  async preloadEssentials(): Promise<void> {
    if (!this.scene) {
      console.warn('[AvatarAssetLoader] Cannot preload - not initialized');
      return;
    }

    console.log('[AvatarAssetLoader] Preloading essential assets...');

    const promises = PRELOAD_ASSETS.map(({ key, bodyType }) =>
      this.loadAssetWithBodyType(key, bodyType)
    );

    try {
      await Promise.all(promises);
      console.log('[AvatarAssetLoader] Essential assets loaded successfully');
    } catch (error) {
      console.error('[AvatarAssetLoader] Failed to preload some assets:', error);
    }
  }

  /**
   * Load a specific asset with body type context
   * Returns the actual texture key used in Phaser (includes bodyType for body-specific assets)
   */
  async loadAssetWithBodyType(key: string, bodyType: BodyType): Promise<string> {
    if (!this.scene) {
      throw new Error('[AvatarAssetLoader] Not initialized');
    }

    // Texture key includes bodyType for body-type-specific assets
    const textureKey = this.getTextureKey(key, bodyType);
    const cacheKey = textureKey;

    if (this.loadedAssets.has(cacheKey)) {
      return textureKey;
    }

    const existing = this.loadingPromises.get(cacheKey);
    if (existing) {
      return existing.then(() => textureKey);
    }

    const promise = new Promise<void>((resolve, reject) => {
      const assetPath = this.getAssetPath(key, bodyType);
      console.log(`[AvatarAssetLoader] Loading: ${textureKey} from ${assetPath}`);

      this.scene!.load.spritesheet(textureKey, assetPath, {
        frameWidth: LPC_FRAME_WIDTH,
        frameHeight: LPC_FRAME_HEIGHT,
      });

      const onComplete = (loadedKey: string) => {
        if (loadedKey === textureKey) {
          this.scene!.load.off('filecomplete', onComplete);
          this.scene!.load.off('loaderror', onError);
          this.loadedAssets.add(cacheKey);
          this.loadingPromises.delete(cacheKey);
          console.log(`[AvatarAssetLoader] Loaded: ${textureKey}`);
          resolve();
        }
      };

      const onError = (file: Phaser.Loader.File) => {
        if (file.key === textureKey) {
          this.scene!.load.off('filecomplete', onComplete);
          this.scene!.load.off('loaderror', onError);
          this.loadingPromises.delete(cacheKey);
          console.error(`[AvatarAssetLoader] Failed to load: ${textureKey} from ${assetPath}`);
          reject(new Error(`Failed to load asset: ${textureKey}`));
        }
      };

      this.scene!.load.on('filecomplete', onComplete);
      this.scene!.load.on('loaderror', onError);
      this.scene!.load.start();
    });

    this.loadingPromises.set(cacheKey, promise);
    await promise;
    return textureKey;
  }

  /**
   * Get the texture key that will be used in Phaser
   * For body-type-specific assets, includes bodyType in the key
   */
  getTextureKey(key: string, bodyType: BodyType): string {
    const parts = key.split('_');
    const category = parts[0];

    // These categories have body-type-specific paths, so need unique keys
    const bodyTypeSpecificCategories = ['body', 'face', 'hair', 'top', 'bottom', 'shoes'];

    if (bodyTypeSpecificCategories.includes(category)) {
      return `${key}_${bodyType}`;
    }

    // Other assets (eyes, accessories) don't vary by body type
    return key;
  }

  /**
   * Legacy method for compatibility
   */
  async loadAsset(key: string): Promise<string> {
    return this.loadAssetWithBodyType(key, 'male');
  }

  /**
   * Load all assets required for an avatar configuration
   */
  async loadForConfig(config: AvatarConfig): Promise<string[]> {
    const keys = this.getRequiredAssetKeys(config);
    const bodyType = config.body.type;

    console.log(`[AvatarAssetLoader] Loading ${keys.length} assets for config:`, keys);

    const results = await Promise.allSettled(
      keys.map(key => this.loadAssetWithBodyType(key, bodyType))
    );

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
    const skinTone = config.body.skinTone;

    // Body base
    keys.push(`body_${skinTone}`);

    // Face (head)
    keys.push(`face_${skinTone}`);

    // Eyes
    if (config.eyes?.color) {
      keys.push(`eyes_${config.eyes.color}`);
    }

    // Hair (if not bald) - use actual color from LPC sprites
    if (config.hair.style !== 'bald') {
      const hairColor = getLpcHairColor(config.hair.color);
      keys.push(`hair_${config.hair.style}_${hairColor}`);
    }

    // Beard
    if (config.beard?.style && config.beard.style !== 'none') {
      keys.push(`beard_${config.beard.style}_${DEFAULT_HAIR_COLOR}`);
    }

    // Clothing (skip 'none' options)
    if (config.clothing.top && config.clothing.top !== 'none') {
      keys.push(`top_${config.clothing.top}_${DEFAULT_COLOR}`);
    }
    if (config.clothing.bottom && config.clothing.bottom !== 'none') {
      keys.push(`bottom_${config.clothing.bottom}_${DEFAULT_COLOR}`);
    }
    if (config.clothing.shoes && config.clothing.shoes !== 'none') {
      keys.push(`shoes_${config.clothing.shoes}_${DEFAULT_COLOR}`);
    }

    // Accessories
    for (const acc of config.accessories) {
      keys.push(`accessory_${acc.type}`);
    }

    return keys;
  }

  /**
   * Get the file path for an asset key with body type context
   *
   * LPC Path Structure:
   * - body: body/bodies/{bodyType}/{skin}.png
   * - face: head/heads/human/{faceType}/{skin}.png
   * - hair: hair/{style}/{gender}/{color}.png
   * - eyes: eyes/human/adult/{color}.png
   * - beard: beards/beard/{style}/{color}.png
   * - top: torso/clothes/{category}/{type}/{bodyType}/{color}.png
   * - bottom: legs/{type}/{bodyType}/{color}.png
   * - shoes: feet/{type}/{bodyType}/{color}.png
   * - accessory: facial/glasses/{type}/adult.png or hat/{category}/{type}/adult/{color}.png
   */
  private getAssetPath(key: string, bodyType: BodyType): string {
    const baseUrl = getBaseUrl();
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
        // hair_flat_top_fade_black -> hair/flat_top_fade/{gender}/black.png
        // hair_bob_black -> hair/bob/adult/black.png (some styles use 'adult' folder)
        // Style can have underscores, color is always the last segment (single word)
        const color = parts[parts.length - 1] || DEFAULT_HAIR_COLOR;
        const style = parts.slice(1, -1).join('_'); // Everything between 'hair_' and '_color'

        // Some hair styles use 'adult/' folder instead of 'male/female/'
        const folder = ADULT_ONLY_HAIR_STYLES.has(style)
          ? 'adult'
          : (BODY_TYPE_MAPPINGS.hair[bodyType] || 'male');

        console.log(`[AvatarAssetLoader] Hair path: style="${style}", color="${color}", folder="${folder}"`);
        return `${baseUrl}assets/avatars/lpc/hair/${style}/${folder}/${color}.png`;
      }

      case 'eyes': {
        // eyes_blue -> eyes/human/adult/blue.png
        const color = parts[1];
        return `${baseUrl}assets/avatars/lpc/eyes/human/adult/${color}.png`;
      }

      case 'beard': {
        // beard_basic_black -> beards/beard/basic/black.png
        // beard_mustache_basic_black -> beards/mustache/basic/black.png
        const style = parts[1];
        const color = parts[2] || DEFAULT_HAIR_COLOR;

        if (style.startsWith('mustache')) {
          const mustacheType = style.replace('mustache_', '');
          return `${baseUrl}assets/avatars/lpc/beards/mustache/${mustacheType}/${color}.png`;
        }

        // Remove 'beard_' prefix if present
        const beardStyle = style.replace('beard_', '');
        return `${baseUrl}assets/avatars/lpc/beards/beard/${beardStyle}/${color}.png`;
      }

      case 'top': {
        // top_shortsleeve_white -> torso/clothes/shortsleeve/shortsleeve/{bodyType}/white.png
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

      case 'accessory': {
        // accessory_glasses -> facial/glasses/glasses/adult.png
        // accessory_hat_bandana -> hat/cloth/bandana/adult/white.png
        const accType = parts.slice(1).join('_');
        return this.getAccessoryPath(baseUrl, accType);
      }

      default:
        console.warn(`[AvatarAssetLoader] Unknown asset category: ${category}`);
        return `${baseUrl}assets/avatars/lpc/${key}.png`;
    }
  }

  /**
   * Get LPC path for top clothing
   * Note: Some tops only exist for certain body types, we handle fallbacks
   */
  private getTopPath(baseUrl: string, topType: string, bodyType: BodyType, color: string): string {
    const mappedBodyType = BODY_TYPE_MAPPINGS.tops[bodyType] || 'male';

    // tshirt only has female/teen, male uses shortsleeve
    const tshirtPath = (mappedBodyType === 'female' || mappedBodyType === 'teen')
      ? `torso/clothes/shortsleeve/tshirt/${mappedBodyType}`
      : `torso/clothes/shortsleeve/shortsleeve/${mappedBodyType}`;

    // Map our simplified names to LPC folder structure
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
   * Get LPC path for accessories
   */
  private getAccessoryPath(baseUrl: string, accType: string): string {
    const accPaths: Record<string, string> = {
      'glasses': 'facial/glasses/glasses/adult.png',
      'glasses_round': 'facial/glasses/round/adult.png',
      'glasses_nerd': 'facial/glasses/nerd/adult.png',
      'sunglasses': 'facial/glasses/sunglasses/adult.png',
      'shades': 'facial/glasses/shades/adult.png',
      'hat_bandana': 'hat/cloth/bandana/adult/white.png',
      'hat_hood': 'hat/cloth/hood/adult/white.png',
      'hat_tophat': 'hat/formal/tophat/adult/black.png',
      'hat_bowler': 'hat/formal/bowler/adult/black.png',
    };

    const path = accPaths[accType] || `facial/glasses/${accType}/adult.png`;
    return `${baseUrl}assets/avatars/lpc/${path}`;
  }

  /**
   * Check if an asset is loaded
   * Uses the same texture key format as loadAssetWithBodyType
   */
  isLoaded(key: string, bodyType: BodyType = 'male'): boolean {
    const textureKey = this.getTextureKey(key, bodyType);
    return this.loadedAssets.has(textureKey);
  }

  /**
   * Check if all assets for a config are loaded
   */
  areAllLoaded(config: AvatarConfig): boolean {
    const keys = this.getRequiredAssetKeys(config);
    const bodyType = config.body.type;
    return keys.every(key => this.loadedAssets.has(`${key}_${bodyType}`));
  }

  /**
   * Get the Phaser texture for an asset key
   */
  getTexture(key: string): Phaser.Textures.Texture | null {
    if (!this.scene) {
      return null;
    }
    // Try to get texture regardless of loaded status (Phaser may have it)
    try {
      return this.scene.textures.get(key);
    } catch {
      return null;
    }
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
