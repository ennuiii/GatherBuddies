/**
 * Avatar Configuration Types
 *
 * Defines the structure for customizable avatars using LPC sprite layers.
 * Supports body types, skin tones, hair styles/colors, clothing, and accessories.
 *
 * Note: Option arrays are now centralized in AvatarManifest.ts
 * This file re-exports them for backward compatibility.
 */

// Import from manifest for use in this file
import {
  SKIN_TONES as _SKIN_TONES,
  HAIR_STYLES as _HAIR_STYLES,
  TOPS as _CLOTHING_TOPS,
  BOTTOMS as _CLOTHING_BOTTOMS,
  SHOES as _SHOES_OPTIONS,
  ACCESSORIES as _ACCESSORIES,
  HAIR_COLORS as _HAIR_COLORS,
  CLOTHING_COLORS as _CLOTHING_COLORS,
} from '../services/AvatarManifest';

// Re-export from manifest for backward compatibility
export {
  SKIN_TONES,
  HAIR_STYLES,
  TOPS as CLOTHING_TOPS,
  BOTTOMS as CLOTHING_BOTTOMS,
  SHOES as SHOES_OPTIONS,
  ACCESSORIES,
  HAIR_COLORS,
  CLOTHING_COLORS,
} from '../services/AvatarManifest';

// Body configuration options
export type BodyType = 'masculine' | 'feminine' | 'neutral';
export type SkinTone = 'light' | 'olive' | 'tan' | 'dark';

// Hair options
export type HairStyle = 'short' | 'long' | 'curly' | 'ponytail' | 'mohawk' | 'bald' | 'afro' | 'bob';

// Clothing options
export type ClothingTop = 'tshirt' | 'hoodie' | 'jacket' | 'dress' | 'tanktop' | 'suit';
export type ClothingBottom = 'jeans' | 'shorts' | 'skirt' | 'pants' | 'sweatpants';
export type Shoes = 'sneakers' | 'boots' | 'sandals' | 'dress_shoes';

// Accessory options
export type AccessoryType = 'glasses' | 'hat_cap' | 'hat_beanie' | 'earrings' | 'necklace' | 'mask';

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
    type: 'neutral',
    skinTone: 'light',
  },
  hair: {
    style: 'short',
    color: '#4A3728',
  },
  clothing: {
    top: 'tshirt',
    topColor: '#3B82F6',
    bottom: 'jeans',
    bottomColor: '#1E3A5F',
    shoes: 'sneakers',
    shoesColor: '#FFFFFF',
  },
  accessories: [],
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Generate a random avatar configuration
 */
export function generateRandomAvatar(): AvatarConfig {
  const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const bodyTypes: BodyType[] = ['masculine', 'feminine', 'neutral'];

  return {
    id: `avatar_${Date.now()}`,
    body: {
      type: randomFrom(bodyTypes),
      skinTone: randomFrom(_SKIN_TONES).id,
    },
    hair: {
      style: randomFrom(_HAIR_STYLES).id,
      color: randomFrom(_HAIR_COLORS),
    },
    clothing: {
      top: randomFrom(_CLOTHING_TOPS).id,
      topColor: randomFrom(_CLOTHING_COLORS),
      bottom: randomFrom(_CLOTHING_BOTTOMS).id,
      bottomColor: randomFrom(_CLOTHING_COLORS),
      shoes: randomFrom(_SHOES_OPTIONS).id,
      shoesColor: randomFrom(_CLOTHING_COLORS),
    },
    accessories: Math.random() > 0.5 ? [{ type: randomFrom(_ACCESSORIES).id }] : [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Legacy character names for backward compatibility
 */
export type LegacyCharacter = 'adam' | 'ash' | 'lucy' | 'nancy';

/**
 * Check if a value is a legacy character key
 */
export function isLegacyCharacter(value: string): value is LegacyCharacter {
  return ['adam', 'ash', 'lucy', 'nancy'].includes(value);
}
