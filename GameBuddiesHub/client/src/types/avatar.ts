/**
 * Avatar Configuration Types
 *
 * Defines the structure for customizable avatars using LPC sprite layers.
 * Supports body types, skin tones, hair styles/colors, clothing, accessories,
 * beards, and eye colors.
 *
 * Note: Option arrays are centralized in AvatarManifest.ts
 * This file re-exports them for backward compatibility.
 */

// Re-export from manifest for backward compatibility
export {
  SKIN_TONES,
  HAIR_STYLES,
  TOPS as CLOTHING_TOPS,
  BOTTOMS as CLOTHING_BOTTOMS,
  SHOES as SHOES_OPTIONS,
  ACCESSORIES,
  BEARDS,
  EYE_COLORS,
  HAIR_COLORS,
  CLOTHING_COLORS,
} from '../services/AvatarManifest';

// Body configuration options
export type BodyType = 'male' | 'female' | 'muscular' | 'child' | 'teen';
export type SkinTone = 'light' | 'olive' | 'bronze' | 'brown' | 'amber' | 'taupe' | 'black';

// Hair options (matching lpc/hair/* folder names)
export type HairStyle =
  // Short styles
  | 'pixie' | 'bedhead' | 'bob' | 'cowlick' | 'spiked' | 'shorthawk' | 'buzzcut' | 'flat_top_fade'
  // Medium styles
  | 'bangs' | 'bangslong' | 'parted' | 'swoop' | 'curly_short' | 'ponytail' | 'ponytail2'
  | 'braid' | 'idol' | 'shoulderl' | 'shoulderr' | 'messy1' | 'page'
  // Long styles
  | 'long' | 'long_straight' | 'long_messy' | 'curly_long' | 'wavy' | 'princess'
  | 'high_ponytail' | 'pigtails' | 'xlong' | 'half_up'
  // Textured styles
  | 'afro' | 'dreadlocks_long' | 'dreadlocks_short' | 'cornrows' | 'natural'
  // Special
  | 'balding';

// Clothing options
// Extended animations items have proper idle/sit/run/walk animations (46 rows)
// Basic items use walk animation as fallback for other animations (21 rows)
export type ClothingTop =
  | 'none'              // No top
  // Extended animations (46 rows - proper idle/sit/run/walk)
  | 'tshirt'            // female, teen
  | 'shortsleeve_polo'  // male, female, teen - ONLY top with male + extended animations
  | 'longsleeve2'       // female, teen
  | 'sleeveless2'       // female, teen
  // Basic animations (21 rows - walk fallback for other animations)
  | 'longsleeve'        // male, female, teen
  | 'shortsleeve'       // male, female, teen
  | 'sleeveless';       // male, female
export type ClothingBottom = 'pants' | 'shorts' | 'leggings' | 'pantaloons';
export type Shoes = 'none' | 'shoes2' | 'boots2'; // 'none' = barefoot

// Accessory options (glasses and hats)
export type AccessoryType =
  | 'glasses' | 'glasses_round' | 'glasses_nerd' | 'sunglasses' | 'shades'
  | 'hat_bandana' | 'hat_hood' | 'hat_tophat' | 'hat_bowler';

// Beard options
export type BeardStyle = 'none' | 'beard_basic' | 'beard_medium' | 'beard_trimmed' | 'beard_full' | 'mustache_basic';

// Eye color options
export type EyeColor = 'blue' | 'brown' | 'green' | 'gray';

/**
 * Full avatar configuration
 */
export interface AvatarConfig {
  id: string;

  body: {
    type: BodyType;
    skinTone: SkinTone;
  };

  hair: {
    style: HairStyle;
    color: string; // Hex color
  };

  clothing: {
    top: ClothingTop;
    topColor: string;
    bottom: ClothingBottom;
    bottomColor: string;
    shoes: Shoes;
    shoesColor: string;
  };

  accessories: {
    type: AccessoryType;
    color?: string;
  }[];

  // New features
  beard?: {
    style: BeardStyle;
    color: string;
  };

  eyes?: {
    color: EyeColor;
  };

  // Metadata
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Default avatar configuration for new users
 */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  id: '',
  body: {
    type: 'male',
    skinTone: 'light',
  },
  hair: {
    style: 'pixie',
    color: '#4A3728',
  },
  clothing: {
    top: 'none', // Male body type doesn't have tshirt with extended animations
    topColor: '#3B82F6',
    bottom: 'pants',
    bottomColor: '#1E3A5F',
    shoes: 'shoes2',
    shoesColor: '#FFFFFF',
  },
  accessories: [],
  beard: {
    style: 'none',
    color: '#4A3728',
  },
  eyes: {
    color: 'brown',
  },
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Generate a random avatar configuration
 */
export function generateRandomAvatar(): AvatarConfig {
  const randomFrom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Import at runtime to avoid circular dependency
  const {
    SKIN_TONES,
    HAIR_STYLES,
    TOPS,
    BOTTOMS,
    SHOES,
    HAIR_COLORS,
    CLOTHING_COLORS,
    BEARDS,
    EYE_COLORS,
  } = require('../services/AvatarManifest');

  const bodyTypes: BodyType[] = ['male', 'female', 'muscular', 'teen'];

  return {
    id: `avatar_${Date.now()}`,
    body: {
      type: randomFrom(bodyTypes),
      skinTone: randomFrom(SKIN_TONES).id,
    },
    hair: {
      style: randomFrom(HAIR_STYLES).id,
      color: randomFrom(HAIR_COLORS),
    },
    clothing: {
      top: randomFrom(TOPS).id,
      topColor: randomFrom(CLOTHING_COLORS),
      bottom: randomFrom(BOTTOMS).id,
      bottomColor: randomFrom(CLOTHING_COLORS),
      shoes: randomFrom(SHOES).id,
      shoesColor: randomFrom(CLOTHING_COLORS),
    },
    accessories: [],
    beard: {
      style: randomFrom(BEARDS).id,
      color: randomFrom(HAIR_COLORS),
    },
    eyes: {
      color: randomFrom(EYE_COLORS).id,
    },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
