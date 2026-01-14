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

// Asset loading timeout (ms)
const ASSET_LOAD_TIMEOUT = 10000; // 10 seconds per asset

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
  // Shoes: female/teen/pregnant use 'thin' folder, muscular uses male
  shoes: {
    male: 'male',
    female: 'thin',
    muscular: 'male',
    teen: 'thin',
    child: 'male',
    pregnant: 'thin',
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

/**
 * Multi-word LPC color names (contain underscores).
 * Used for proper parsing of asset keys like 'hair_pixie_dark_brown'.
 */
const MULTI_WORD_LPC_COLORS = new Set([
  'dark_brown', 'light_brown', 'dark_gray',
]);

class AvatarAssetLoaderService {
  private scene: Phaser.Scene | null = null;
  private loadedAssets: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private failedAssets: Set<string> = new Set(); // Track assets that failed to load

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

    // Skip if already loaded
    if (this.loadedAssets.has(cacheKey)) {
      return textureKey;
    }

    // Skip if previously failed (avoid retrying broken assets)
    if (this.failedAssets.has(cacheKey)) {
      throw new Error(`Asset previously failed to load: ${textureKey}`);
    }

    const existing = this.loadingPromises.get(cacheKey);
    if (existing) {
      return existing.then(() => textureKey);
    }

    const promise = new Promise<void>((resolve, reject) => {
      const assetPath = this.getAssetPath(key, bodyType);
      console.log(`[AvatarAssetLoader] Loading: ${textureKey} from ${assetPath}`);

      // Timeout handler
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.scene?.load.off('filecomplete', onComplete);
        this.scene?.load.off('loaderror', onError);
      };

      const onComplete = (loadedKey: string) => {
        if (loadedKey === textureKey && !isResolved) {
          isResolved = true;
          cleanup();
          this.loadedAssets.add(cacheKey);
          this.loadingPromises.delete(cacheKey);
          console.log(`[AvatarAssetLoader] Loaded: ${textureKey}`);
          resolve();
        }
      };

      const onError = (file: Phaser.Loader.File) => {
        if (file.key === textureKey && !isResolved) {
          isResolved = true;
          cleanup();
          this.loadingPromises.delete(cacheKey);
          this.failedAssets.add(cacheKey); // Mark as failed to avoid retrying
          console.error(`[AvatarAssetLoader] Failed to load: ${textureKey} from ${assetPath}`);
          reject(new Error(`Failed to load asset: ${textureKey}`));
        }
      };

      const onTimeout = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          this.loadingPromises.delete(cacheKey);
          this.failedAssets.add(cacheKey); // Mark as failed to avoid retrying
          console.error(`[AvatarAssetLoader] Timeout loading: ${textureKey}`);
          reject(new Error(`Timeout loading asset: ${textureKey}`));
        }
      };

      // Set up timeout
      timeoutId = setTimeout(onTimeout, ASSET_LOAD_TIMEOUT);

      this.scene!.load.spritesheet(textureKey, assetPath, {
        frameWidth: LPC_FRAME_WIDTH,
        frameHeight: LPC_FRAME_HEIGHT,
      });

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
    
    // Handle two-part category prefixes (wings_bg, wings_fg)
    let category = parts[0];
    if (parts[0] === 'wings' && (parts[1] === 'bg' || parts[1] === 'fg')) {
      category = `${parts[0]}_${parts[1]}`;
    }

    // These categories have body-type-specific paths, so need unique keys
    const bodyTypeSpecificCategories = [
      'body', 'face', 'head', 'hair', 'top', 'bottom', 'shoes',
      'ears', 'horns', 'tail', 'wings_bg', 'wings_fg', 'hat'
    ];

    if (bodyTypeSpecificCategories.includes(category)) {
      return `${key}_${bodyType}`;
    }

    // Other assets (eyes, glasses, hats, accessories) don't vary by body type
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

    // Head (creature/species head or human face)
    if (config.head?.type && config.head.type !== 'human') {
      keys.push(`head_${config.head.type}`);
    } else {
      keys.push(`face_${skinTone}`);
    }

    // Ears (decorative ears)
    if (config.ears?.type && config.ears.type !== 'none') {
      keys.push(`ears_${config.ears.type}`);
    }

    // Horns
    if (config.horns?.type && config.horns.type !== 'none') {
      keys.push(`horns_${config.horns.type}`);
    }

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

    // Tail
    if (config.tail?.type && config.tail.type !== 'none') {
      keys.push(`tail_${config.tail.type}`);
    }

    // Wings - need both bg and fg layers
    if (config.wings?.type && config.wings.type !== 'none') {
      keys.push(`wings_bg_${config.wings.type}`);
      keys.push(`wings_fg_${config.wings.type}`);
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

    // Hat/helmet
    if (config.hat?.type && config.hat.type !== 'none') {
      keys.push(`hat_${config.hat.type}_${DEFAULT_COLOR}`);
    }

    // Glasses
    if (config.glasses?.type && config.glasses.type !== 'none') {
      keys.push(`glasses_${config.glasses.type}`);
    }

    // Legacy accessories
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
    
    // Handle two-part category prefixes (wings_bg, wings_fg)
    let category = parts[0];
    if (parts[0] === 'wings' && (parts[1] === 'bg' || parts[1] === 'fg')) {
      category = `${parts[0]}_${parts[1]}`;
    }

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

      case 'head': {
        // head_goblin -> head/heads/{species}/{bodyType}/default.png
        const species = parts[1];
        return this.getHeadPath(baseUrl, species, bodyType);
      }

      case 'ears': {
        // ears_elven_ears -> head/ears/elven/{bodyType}/default.png
        const earType = parts.slice(1).join('_');
        return this.getEarsPath(baseUrl, earType, bodyType);
      }

      case 'horns': {
        // horns_backwards -> head/horns/backwards/{bodyType}/default.png
        const hornType = parts.slice(1).join('_');
        return this.getHornsPath(baseUrl, hornType, bodyType);
      }

      case 'hair': {
        // hair_pixie_black -> hair/pixie/{gender}/black.png
        // hair_flat_top_fade_black -> hair/flat_top_fade/{gender}/black.png
        // hair_pixie_dark_brown -> hair/pixie/{gender}/dark_brown.png (multi-word color!)
        // hair_bob_black -> hair/bob/adult/black.png (some styles use 'adult' folder)
        // Style can have underscores, color can be single or multi-word (e.g., dark_brown)

        // Check if last two parts form a multi-word color (e.g., 'dark_brown')
        let color: string;
        let style: string;

        if (parts.length >= 3) {
          const potentialMultiWordColor = `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;
          if (MULTI_WORD_LPC_COLORS.has(potentialMultiWordColor)) {
            // Multi-word color like 'dark_brown' - take last two parts
            color = potentialMultiWordColor;
            style = parts.slice(1, -2).join('_'); // Everything between 'hair_' and '_dark_brown'
          } else {
            // Single-word color - take only last part
            color = parts[parts.length - 1] || DEFAULT_HAIR_COLOR;
            style = parts.slice(1, -1).join('_'); // Everything between 'hair_' and '_color'
          }
        } else {
          color = parts[parts.length - 1] || DEFAULT_HAIR_COLOR;
          style = parts.slice(1, -1).join('_');
        }

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

        if (style.startsWith('goatee')) {
          const goateeType = style.replace('goatee_', '') || 'basic';
          return `${baseUrl}assets/avatars/lpc/beards/goatee/${goateeType}/${color}.png`;
        }

        // Remove 'beard_' prefix if present
        const beardStyle = style.replace('beard_', '');
        return `${baseUrl}assets/avatars/lpc/beards/beard/${beardStyle}/${color}.png`;
      }

      case 'tail': {
        // tail_cat_tail -> body/tail/cat/{bodyType}/default.png
        const tailType = parts.slice(1).join('_');
        return this.getTailPath(baseUrl, tailType, bodyType);
      }

      case 'wings_bg': {
        // wings_bg_bat_wings -> body/wings/bat/adult/bg/{color}.png
        const wingTypeBg = parts.slice(2).join('_');
        return this.getWingsPath(baseUrl, wingTypeBg, bodyType, 'bg');
      }

      case 'wings_fg': {
        // wings_fg_bat_wings -> body/wings/bat/adult/fg/{color}.png
        const wingTypeFg = parts.slice(2).join('_');
        return this.getWingsPath(baseUrl, wingTypeFg, bodyType, 'fg');
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

      case 'hat': {
        // hat_crown_white -> hat type "crown", color "white"
        // hat_helmet_cloth_white -> hat type "helmet_cloth", color "white"
        // Color is always the last part, hat type is everything in between
        const color = parts[parts.length - 1] || DEFAULT_COLOR;
        const hatType = parts.slice(1, -1).join('_'); // Everything between 'hat_' and '_color'
        return this.getHatPath(baseUrl, hatType, bodyType, color);
      }

      case 'glasses': {
        // glasses_glasses -> facial/glasses/glasses/adult.png
        const glassesType = parts.slice(1).join('_');
        return this.getGlassesPath(baseUrl, glassesType);
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
      'shortsleeve_polo': `torso/clothes/shortsleeve/shortsleeve_polo/${mappedBodyType}`,
      'tanktop': `torso/clothes/sleeveless/sleeveless/${mappedBodyType}`,
      'sleeveless': `torso/clothes/sleeveless/sleeveless/${mappedBodyType}`,
      'sleeveless2': `torso/clothes/sleeveless/sleeveless2/${mappedBodyType}`,
      'longsleeve': `torso/clothes/longsleeve/longsleeve/${mappedBodyType}`,
      'longsleeve2': `torso/clothes/longsleeve/longsleeve2/${mappedBodyType}`,
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
      'pants_fur': `legs/fur/${mappedBodyType}`,
      'pants_legion': `legs/legion/${mappedBodyType}`,
      'jeans': `legs/pants/${mappedBodyType}`,
      'shorts': `legs/shorts/shorts/${mappedBodyType}`,
      'shorts_cargo': `legs/shorts/cargo/${mappedBodyType}`,
      'shorts_legion': `legs/shorts/legion/${mappedBodyType}`,
      'skirt': `legs/skirts/plain/female`,
      'leggings': `legs/leggings/${mappedBodyType}`,
      'pantaloons': `legs/pantaloons/${mappedBodyType}`,
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
      'boots_armor': `feet/armor/${mappedBodyType}`,
      'boots_fur': `feet/fur/${mappedBodyType}`,
      'boots_legion': `feet/legion/${mappedBodyType}`,
      'sandals': `feet/sandals/${mappedBodyType}`,
      'sandals2': `feet/sandals2/${mappedBodyType}`,
      'slippers': `feet/slippers/${mappedBodyType}`,
      'slippers2': `feet/slippers2/${mappedBodyType}`,
      'socks': `feet/socks/${mappedBodyType}`,
      'dress_shoes': `feet/shoes2/${mappedBodyType}`,
    };

    const basePath = shoesMappings[shoesType] || `feet/shoes/${mappedBodyType}`;
    return `${baseUrl}assets/avatars/lpc/${basePath}/${color}.png`;
  }

  /**
   * Get LPC path for accessories (legacy)
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
   * Get LPC path for creature/species heads
   * 
   * LPC head structure varies:
   * - male/female folders: human, lizard, minotaur, orc, wolf
   * - adult folder: all others (goblin, troll, skeleton, vampire, zombie, alien, etc.)
   */
  private getHeadPath(baseUrl: string, species: string, bodyType: BodyType): string {
    const mappedBodyType = BODY_TYPE_MAPPINGS.face[bodyType] || 'male';
    const DEFAULT_FUR_COLOR = 'fur_brown';
    const DEFAULT_SKIN_COLOR = 'light';

    // Heads that use male/female folder structure
    const maleFemaleFolderHeads = ['human', 'lizard', 'minotaur', 'orc', 'wolf'];
    
    // Build path based on folder structure
    const getHeadFolder = (sp: string): string => {
      if (maleFemaleFolderHeads.includes(sp)) {
        return mappedBodyType; // 'male' or 'female'
      }
      return 'adult'; // All others use 'adult' folder
    };

    // Map species to actual folder and color
    const headMappings: Record<string, string> = {
      // === male/female folder heads ===
      'wolf': `head/heads/wolf/${mappedBodyType}/${DEFAULT_FUR_COLOR}.png`,
      'lizard': `head/heads/lizard/${mappedBodyType}/${DEFAULT_SKIN_COLOR}.png`,
      'reptile': `head/heads/lizard/${mappedBodyType}/${DEFAULT_SKIN_COLOR}.png`,
      'orc': `head/heads/orc/${mappedBodyType}/${DEFAULT_SKIN_COLOR}.png`,
      'minotaur': `head/heads/minotaur/${mappedBodyType}/${DEFAULT_FUR_COLOR}.png`,
      
      // === adult folder heads ===
      'goblin': `head/heads/goblin/adult/${DEFAULT_SKIN_COLOR}.png`,
      'troll': `head/heads/troll/adult/${DEFAULT_SKIN_COLOR}.png`,
      'skeleton': `head/heads/skeleton/adult/skeleton.png`, // Special: only has skeleton.png
      'vampire': `head/heads/vampire/adult/${DEFAULT_SKIN_COLOR}.png`,
      'zombie': `head/heads/zombie/adult/${DEFAULT_SKIN_COLOR}.png`,
      'alien': `head/heads/alien/adult/${DEFAULT_SKIN_COLOR}.png`,
      
      // === Mapped types (use existing assets) ===
      'cat': `head/heads/mouse/adult/${DEFAULT_FUR_COLOR}.png`, // No cat head, use mouse
      'demon': `head/heads/orc/${mappedBodyType}/${DEFAULT_SKIN_COLOR}.png`, // Use orc
      'cyclops': `head/heads/orc/${mappedBodyType}/${DEFAULT_SKIN_COLOR}.png`, // Use orc
    };

    const path = headMappings[species];
    if (path) {
      return `${baseUrl}assets/avatars/lpc/${path}`;
    }

    // Fallback: try adult folder first (most common)
    return `${baseUrl}assets/avatars/lpc/head/heads/${species}/adult/${DEFAULT_SKIN_COLOR}.png`;
  }

  /**
   * Get LPC path for decorative ears
   */
  private getEarsPath(baseUrl: string, earType: string, bodyType: BodyType): string {
    // LPC ears have different structures:
    // - Some have adult/{color}.png (elven, dragon, etc.)
    // - Some have adult_front.png single file (cat, wolf)
    const DEFAULT_EAR_COLOR = 'black';

    const earMappings: Record<string, string> = {
      // Ears with adult/ folder structure
      'elven_ears': `head/ears/elven/adult/${DEFAULT_EAR_COLOR}.png`,
      'elven_ears_thin': `head/ears/long/adult/${DEFAULT_EAR_COLOR}.png`,
      'dog_ears': `head/ears/big/adult/${DEFAULT_EAR_COLOR}.png`,
      'feathered_ears': `head/ears/avyon/adult/${DEFAULT_EAR_COLOR}.png`,
      'dragon_ears': `head/ears/dragon/adult/${DEFAULT_EAR_COLOR}.png`,
      // Ears with adult_front/ folder structure (cat, wolf)
      'cat_ears': `head/ears/cat/adult_front/${DEFAULT_EAR_COLOR}.png`,
      'wolf_ears': `head/ears/wolf/adult_front/${DEFAULT_EAR_COLOR}.png`,
      // Earrings
      'ear_studs': `facial/earrings/studs/adult.png`,
      'ear_rings': `facial/earrings/rings/adult.png`,
    };

    const path = earMappings[earType] || `head/ears/${earType.replace('_ears', '')}/adult/${DEFAULT_EAR_COLOR}.png`;
    return `${baseUrl}assets/avatars/lpc/${path}`;
  }

  /**
   * Get LPC path for horns
   */
  private getHornsPath(baseUrl: string, hornType: string, bodyType: BodyType): string {
    // LPC horns use adult/bg folder with color variants
    // Structure: head/horns/{type}/adult/bg/{color}.png
    const DEFAULT_HORN_COLOR = 'black';

    // Remove 'horns_' prefix if present
    const hornStyle = hornType.replace('horns_', '');

    // Available horn types: backwards, curled
    const hornMappings: Record<string, string> = {
      'backwards': `head/horns/backwards/adult/bg/${DEFAULT_HORN_COLOR}.png`,
      'curled': `head/horns/curled/adult/bg/${DEFAULT_HORN_COLOR}.png`,
      'small': `head/horns/curled/adult/bg/${DEFAULT_HORN_COLOR}.png`, // Use curled
      'demon': `head/horns/backwards/adult/bg/${DEFAULT_HORN_COLOR}.png`, // Use backwards
    };

    const path = hornMappings[hornStyle] || `head/horns/${hornStyle}/adult/bg/${DEFAULT_HORN_COLOR}.png`;
    return `${baseUrl}assets/avatars/lpc/${path}`;
  }

  /**
   * Get LPC path for tails
   */
  private getTailPath(baseUrl: string, tailType: string, bodyType: BodyType): string {
    // LPC tails use adult/bg folder with color variants
    // Structure: body/tail/{type}/adult/bg/{color}.png
    const DEFAULT_TAIL_COLOR = 'black';

    // Remove '_tail' suffix if present
    const tailStyle = tailType.replace('_tail', '');

    // Available tail types: cat, fluffy, lizard, wolf
    const tailMappings: Record<string, string> = {
      'cat': `body/tail/cat/adult/bg/${DEFAULT_TAIL_COLOR}.png`,
      'wolf': `body/tail/wolf/adult/bg/${DEFAULT_TAIL_COLOR}.png`,
      'fox': `body/tail/fluffy/adult/bg/${DEFAULT_TAIL_COLOR}.png`, // Use fluffy for fox
      'lizard': `body/tail/lizard/adult/bg/${DEFAULT_TAIL_COLOR}.png`,
      'dragon': `body/tail/lizard/adult/bg/${DEFAULT_TAIL_COLOR}.png`, // Use lizard for dragon
      'demon': `body/tail/cat/adult/bg/${DEFAULT_TAIL_COLOR}.png`, // Use cat for demon
    };

    const path = tailMappings[tailStyle] || `body/tail/${tailStyle}/adult/bg/${DEFAULT_TAIL_COLOR}.png`;
    return `${baseUrl}assets/avatars/lpc/${path}`;
  }

  /**
   * Get LPC path for wings (supports bg and fg layers)
   */
  private getWingsPath(baseUrl: string, wingType: string, bodyType: BodyType, layer: 'bg' | 'fg' = 'bg'): string {
    const DEFAULT_WING_COLOR = 'black';

    // Remove '_wings' suffix if present
    const wingStyle = wingType.replace('_wings', '');

    // Wing folder structures vary by type and layer:
    // - bat, feathered, lizard: adult/{layer}/{color}.png
    // - monarch: base/{layer}/{color}.png (only has bg, use base for fg too)
    // - pixie: solid/{color}.png (no fg layer, use solid for both)
    // Wing folder structures:
    // - bat, feathered, lizard: adult/{bg|fg}/{color}.png
    // - monarch: base/{bg|fg}/{color}.png
    // - pixie, dragonfly: solid/{bg|fg}/{color}.png
    // - lunar: {bg|fg}/{color}.png (no subfolder)
    const getWingPath = (style: string, lyr: string): string => {
      switch (style) {
        case 'bat':
        case 'demon':
          return `body/wings/bat/adult/${lyr}/${DEFAULT_WING_COLOR}.png`;
        case 'angel':
        case 'feathered':
          return `body/wings/feathered/adult/${lyr}/${DEFAULT_WING_COLOR}.png`;
        case 'butterfly':
          return `body/wings/monarch/base/${lyr}/${DEFAULT_WING_COLOR}.png`;
        case 'fairy':
        case 'pixie':
          return `body/wings/pixie/solid/${lyr}/${DEFAULT_WING_COLOR}.png`;
        case 'dragonfly':
          return `body/wings/dragonfly/solid/${lyr}/${DEFAULT_WING_COLOR}.png`;
        case 'lunar':
          // lunar has bg/fg directly at root (no subfolder)
          return `body/wings/lunar/${lyr}/${DEFAULT_WING_COLOR}.png`;
        case 'dragon':
        case 'lizard':
          return `body/wings/lizard/adult/${lyr}/${DEFAULT_WING_COLOR}.png`;
        default:
          return `body/wings/${style}/adult/${lyr}/${DEFAULT_WING_COLOR}.png`;
      }
    };

    const path = getWingPath(wingStyle, layer);
    return `${baseUrl}assets/avatars/lpc/${path}`;
  }

  /**
   * Get LPC path for hats and helmets
   *
   * LPC hat folder structure:
   * - hat/cloth/{style}/adult/{color}.png (bandana, hood, etc.)
   * - hat/formal/{style}/adult/{color}.png (crown, tiara, bowler, tophat)
   * - hat/helmet/{style}/adult/{color}.png OR {style}/{male|female}/{color}.png
   *   Some helmets use male/female folders: barbuta, close, flattop, greathelm
   *   Others use adult folder: armet, barbarian_viking, kettle, legion, mail, nasal, etc.
   *   Colors for helmets: base, brass, bronze, ceramic, copper, gold, iron, silver, steel
   */
  private getHatPath(baseUrl: string, hatType: string, bodyType: BodyType, color: string): string {
    // Default helmet metal color (helmets use metal colors, not cloth colors)
    const DEFAULT_HELMET_COLOR = 'steel';
    // Map body type for helmets that use male/female folders
    const mappedBodyType = BODY_TYPE_MAPPINGS.face[bodyType] || 'male';

    const hatMappings: Record<string, string> = {
      // === Formal hats (hat/formal/) ===
      'crown': `hat/formal/crown/adult/gold.png`,
      'tiara': `hat/formal/tiara/adult/gold.png`,
      'tophat': `hat/formal/tophat/adult/black.png`,
      'bowler': `hat/formal/bowler/adult/black.png`,
      'fedora': `hat/formal/bowler/adult/black.png`, // Use bowler as fallback
      'tricorn': `hat/formal/bowler/adult/black.png`, // Use bowler as fallback
      'circlet': `hat/formal/tiara/adult/silver.png`,
      'diadem': `hat/formal/tiara/adult/gold.png`,

      // === Cloth hats (hat/cloth/) ===
      'bandana': `hat/cloth/bandana/adult/red.png`,
      'hood': `hat/cloth/hood/adult/gray.png`,
      'beanie': `hat/cloth/hood_sack/adult/gray.png`, // Use hood_sack as beanie
      'cap': `hat/cloth/feather_cap/adult/gray.png`, // Use feather_cap as cap
      'beret': `hat/cloth/feather_cap/alt/adult/gray.png`, // Use alt feather cap
      'headband': `hat/cloth/bandana/adult/white.png`, // Use bandana as headband
      'turban': `hat/cloth/hijab/male/white.png`, // Use hijab as turban
      'veil': `hat/cloth/hijab/thin/white.png`, // Use hijab thin as veil

      // === Helmets with male/female folders (hat/helmet/{style}/{male|female}/) ===
      'helmet_barbute': `hat/helmet/barbuta/${mappedBodyType}/${DEFAULT_HELMET_COLOR}.png`,
      'helmet_plate': `hat/helmet/flattop/${mappedBodyType}/${DEFAULT_HELMET_COLOR}.png`,
      'mask': `hat/helmet/close/${mappedBodyType}/${DEFAULT_HELMET_COLOR}.png`,

      // === Helmets with adult folder (hat/helmet/{style}/adult/) ===
      'helmet_chain': `hat/helmet/mail/adult/${DEFAULT_HELMET_COLOR}.png`,
      'helmet_cloth': `hat/helmet/kettle/adult/${DEFAULT_HELMET_COLOR}.png`, // Kettle helm
      'helmet_jousting': `hat/helmet/armet/adult/${DEFAULT_HELMET_COLOR}.png`, // Armet jousting helm
      'helmet_legion': `hat/helmet/legion/adult/${DEFAULT_HELMET_COLOR}.png`,
      'helmet_metal': `hat/helmet/nasal/adult/${DEFAULT_HELMET_COLOR}.png`, // Simple nasal helm
      'helmet_viking': `hat/helmet/barbarian_viking/adult/${DEFAULT_HELMET_COLOR}.png`,

      // === Hoods with chain/cloth (hat/cloth/) ===
      'hood_chain': `hat/cloth/hood/adult/gray.png`, // Use regular hood
      'hood_cloth': `hat/cloth/hood/adult/brown.png`,
      'cowl': `hat/cloth/hood_sack/adult/brown.png`, // Use hood_sack as cowl
    };

    const path = hatMappings[hatType];
    if (path) {
      return `${baseUrl}assets/avatars/lpc/${path}`;
    }

    // Fallback: try cloth category
    return `${baseUrl}assets/avatars/lpc/hat/cloth/${hatType}/adult/white.png`;
  }

  /**
   * Get LPC path for glasses and eyewear
   */
  private getGlassesPath(baseUrl: string, glassesType: string): string {
    const glassesMappings: Record<string, string> = {
      'glasses': 'facial/glasses/glasses/adult.png',
      'glasses_round': 'facial/glasses/round/adult.png',
      'glasses_nerd': 'facial/glasses/nerd/adult.png',
      'sunglasses': 'facial/glasses/sunglasses/adult.png',
      'shades': 'facial/glasses/shades/adult.png',
      'shades_aviator': 'facial/glasses/aviator/adult.png',
      'eyepatch': 'facial/eyepatch/eyepatch/adult.png',
      'monocle': 'facial/glasses/monocle/adult.png',
      'goggles': 'facial/glasses/goggles/adult.png',
    };

    const path = glassesMappings[glassesType] || `facial/glasses/${glassesType}/adult.png`;
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
   * Returns null if texture doesn't exist or is the "__MISSING" placeholder
   */
  getTexture(key: string): Phaser.Textures.Texture | null {
    if (!this.scene) {
      return null;
    }
    // Check if texture actually exists before getting it
    // Phaser's textures.get() returns "__MISSING" texture instead of null
    if (!this.scene.textures.exists(key)) {
      return null;
    }
    try {
      const texture = this.scene.textures.get(key);
      // Double-check it's not the missing texture placeholder
      if (texture.key === '__MISSING') {
        return null;
      }
      return texture;
    } catch {
      return null;
    }
  }

  /**
   * Reset failed assets cache to allow retrying
   */
  resetFailedAssets(): void {
    this.failedAssets.clear();
    console.log('[AvatarAssetLoader] Failed assets cache cleared - ready for retry');
  }

  /**
   * Get count of currently loading assets
   */
  getLoadingCount(): number {
    return this.loadingPromises.size;
  }

  /**
   * Get count of loaded assets
   */
  getLoadedCount(): number {
    return this.loadedAssets.size;
  }

  /**
   * Get count of failed assets
   */
  getFailedCount(): number {
    return this.failedAssets.size;
  }

  /**
   * Clean up (call when leaving scene)
   */
  dispose(): void {
    this.loadedAssets.clear();
    this.loadingPromises.clear();
    this.failedAssets.clear();
    this.scene = null;
  }
}

// Export singleton instance
export const avatarAssetLoader = new AvatarAssetLoaderService();
export default avatarAssetLoader;
