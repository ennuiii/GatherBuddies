/**
 * Avatar Manifest
 *
 * Central manifest of all available avatar customization options.
 * Based on assets available from LPC Universal Spritesheet Character Generator.
 * Repository: https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
 *
 * This is a static manifest - no runtime asset scanning needed.
 * Update this file when adding new assets to the game.
 */

import type {
  BodyType,
  SkinTone,
  HairStyle,
  ClothingTop,
  ClothingBottom,
  Shoes,
  AccessoryType,
  BeardStyle,
  EyeColor,
} from '../types/avatar';

// ============================================================================
// Body Types
// ============================================================================

export interface BodyTypeOption {
  id: BodyType;
  displayName: string;
}

export const BODY_TYPES: BodyTypeOption[] = [
  { id: 'male', displayName: 'Male' },
  { id: 'female', displayName: 'Female' },
  { id: 'muscular', displayName: 'Muscular' },
  { id: 'child', displayName: 'Child' },
  { id: 'teen', displayName: 'Teen' },
];

// ============================================================================
// Skin Tones
// ============================================================================

export interface SkinToneOption {
  id: SkinTone;
  displayName: string;
  hex: string;
}

// NOTE: Skin tone IDs must match filenames in lpc/body/bodies/{bodyType}/*.png
export const SKIN_TONES: SkinToneOption[] = [
  { id: 'light', displayName: 'Light', hex: '#FFE4C4' },
  { id: 'olive', displayName: 'Olive', hex: '#D4A574' },
  { id: 'bronze', displayName: 'Bronze', hex: '#CD853F' },
  { id: 'brown', displayName: 'Brown', hex: '#8B4513' },
  { id: 'amber', displayName: 'Amber', hex: '#FFBF00' },
  { id: 'taupe', displayName: 'Taupe', hex: '#87776F' },
  { id: 'black', displayName: 'Dark', hex: '#3D2B1F' },
];

// ============================================================================
// Hair Styles (from lpc/hair/*)
// ============================================================================

export interface HairStyleOption {
  id: HairStyle;
  displayName: string;
  hasBackLayer: boolean;
}

// NOTE: Hair style IDs must match folder names in lpc/hair/
export const HAIR_STYLES: HairStyleOption[] = [
  // Short styles
  { id: 'pixie', displayName: 'Pixie', hasBackLayer: false },
  { id: 'bedhead', displayName: 'Bedhead', hasBackLayer: false },
  { id: 'bob', displayName: 'Bob', hasBackLayer: false },
  { id: 'cowlick', displayName: 'Cowlick', hasBackLayer: false },
  { id: 'spiked', displayName: 'Spiked', hasBackLayer: false },
  { id: 'shorthawk', displayName: 'Mohawk', hasBackLayer: false },
  { id: 'buzzcut', displayName: 'Buzzcut', hasBackLayer: false },
  { id: 'flat_top_fade', displayName: 'Flat Top', hasBackLayer: false },

  // Medium styles
  { id: 'bangs', displayName: 'Bangs', hasBackLayer: false },
  { id: 'bangslong', displayName: 'Long Bangs', hasBackLayer: false },
  { id: 'parted', displayName: 'Parted', hasBackLayer: false },
  { id: 'swoop', displayName: 'Swoop', hasBackLayer: false },
  { id: 'curly_short', displayName: 'Curly', hasBackLayer: false },
  { id: 'ponytail', displayName: 'Ponytail', hasBackLayer: false },
  { id: 'ponytail2', displayName: 'Ponytail Alt', hasBackLayer: false },
  { id: 'braid', displayName: 'Braid', hasBackLayer: false },
  { id: 'idol', displayName: 'Idol', hasBackLayer: false },
  { id: 'shoulderl', displayName: 'Shoulder Left', hasBackLayer: false },
  { id: 'shoulderr', displayName: 'Shoulder Right', hasBackLayer: false },
  { id: 'messy', displayName: 'Messy', hasBackLayer: false },
  { id: 'page', displayName: 'Page', hasBackLayer: false },

  // Long styles
  { id: 'long', displayName: 'Long', hasBackLayer: false },
  { id: 'long_straight', displayName: 'Long Straight', hasBackLayer: false },
  { id: 'long_messy', displayName: 'Long Messy', hasBackLayer: false },
  { id: 'curly_long', displayName: 'Long Curly', hasBackLayer: false },
  { id: 'wavy', displayName: 'Wavy', hasBackLayer: false },
  { id: 'princess', displayName: 'Princess', hasBackLayer: false },
  { id: 'high_ponytail', displayName: 'High Ponytail', hasBackLayer: false },
  { id: 'pigtails', displayName: 'Pigtails', hasBackLayer: false },
  { id: 'xlong', displayName: 'Extra Long', hasBackLayer: false },
  { id: 'half_up', displayName: 'Half Up', hasBackLayer: false },

  // Textured
  { id: 'afro', displayName: 'Afro', hasBackLayer: false },
  { id: 'dreadlocks_long', displayName: 'Dreadlocks', hasBackLayer: false },
  { id: 'dreadlocks_short', displayName: 'Short Dreads', hasBackLayer: false },
  { id: 'cornrows', displayName: 'Cornrows', hasBackLayer: false },
  { id: 'natural', displayName: 'Natural', hasBackLayer: false },

  // Special
  { id: 'bald', displayName: 'Bald', hasBackLayer: false },
  { id: 'balding', displayName: 'Balding', hasBackLayer: false },
];

// ============================================================================
// Clothing - Tops (from lpc/torso/*)
// ============================================================================

export interface ClothingTopOption {
  id: ClothingTop;
  displayName: string;
}

export const TOPS: ClothingTopOption[] = [
  { id: 'tshirt', displayName: 'T-Shirt' },
  { id: 'tanktop', displayName: 'Tank Top' },
  { id: 'sleeveless', displayName: 'Sleeveless' },
  { id: 'longsleeve', displayName: 'Long Sleeve' },
  { id: 'hoodie', displayName: 'Hoodie' },
  { id: 'jacket', displayName: 'Jacket' },
  { id: 'dress', displayName: 'Dress' },
  { id: 'suit', displayName: 'Suit' },
];

// ============================================================================
// Clothing - Bottoms (from lpc/legs/*)
// ============================================================================

export interface ClothingBottomOption {
  id: ClothingBottom;
  displayName: string;
}

export const BOTTOMS: ClothingBottomOption[] = [
  { id: 'pants', displayName: 'Pants' },
  { id: 'pants_formal', displayName: 'Formal Pants' },
  { id: 'jeans', displayName: 'Jeans' },
  { id: 'shorts', displayName: 'Shorts' },
  { id: 'skirt', displayName: 'Skirt' },
  { id: 'leggings', displayName: 'Leggings' },
  { id: 'pantaloons', displayName: 'Pantaloons' },
  { id: 'sweatpants', displayName: 'Sweatpants' },
];

// ============================================================================
// Shoes (from lpc/feet/*)
// ============================================================================

export interface ShoesOption {
  id: Shoes;
  displayName: string;
}

export const SHOES: ShoesOption[] = [
  { id: 'shoes', displayName: 'Shoes' },
  { id: 'shoes2', displayName: 'Shoes Alt' },
  { id: 'sneakers', displayName: 'Sneakers' },
  { id: 'boots', displayName: 'Boots' },
  { id: 'boots2', displayName: 'Boots Alt' },
  { id: 'sandals', displayName: 'Sandals' },
  { id: 'slippers', displayName: 'Slippers' },
  { id: 'dress_shoes', displayName: 'Dress Shoes' },
];

// ============================================================================
// Accessories (Glasses & Hats)
// ============================================================================

export interface AccessoryOption {
  id: AccessoryType;
  displayName: string;
  category: 'glasses' | 'hat';
}

export const ACCESSORIES: AccessoryOption[] = [
  // Glasses (from lpc/facial/glasses/*)
  { id: 'glasses', displayName: 'Glasses', category: 'glasses' },
  { id: 'glasses_round', displayName: 'Round Glasses', category: 'glasses' },
  { id: 'glasses_nerd', displayName: 'Nerd Glasses', category: 'glasses' },
  { id: 'sunglasses', displayName: 'Sunglasses', category: 'glasses' },
  { id: 'shades', displayName: 'Shades', category: 'glasses' },
  // Hats (from lpc/hat/*)
  { id: 'hat_bandana', displayName: 'Bandana', category: 'hat' },
  { id: 'hat_hood', displayName: 'Hood', category: 'hat' },
  { id: 'hat_tophat', displayName: 'Top Hat', category: 'hat' },
  { id: 'hat_bowler', displayName: 'Bowler Hat', category: 'hat' },
];

// ============================================================================
// Beards (from lpc/beards/*)
// ============================================================================

export interface BeardOption {
  id: BeardStyle;
  displayName: string;
}

export const BEARDS: BeardOption[] = [
  { id: 'none', displayName: 'None' },
  { id: 'beard_basic', displayName: 'Basic Beard' },
  { id: 'beard_medium', displayName: 'Medium Beard' },
  { id: 'beard_trimmed', displayName: 'Trimmed Beard' },
  { id: 'beard_full', displayName: 'Full Beard' },
  { id: 'mustache_basic', displayName: 'Mustache' },
];

// ============================================================================
// Eyes (from lpc/eyes/*)
// ============================================================================

export interface EyeColorOption {
  id: EyeColor;
  displayName: string;
  hex: string;
}

export const EYE_COLORS: EyeColorOption[] = [
  { id: 'blue', displayName: 'Blue', hex: '#4169E1' },
  { id: 'brown', displayName: 'Brown', hex: '#8B4513' },
  { id: 'green', displayName: 'Green', hex: '#228B22' },
  { id: 'gray', displayName: 'Gray', hex: '#708090' },
];

// ============================================================================
// Color Palettes
// ============================================================================

export const HAIR_COLORS: string[] = [
  '#000000', // Black
  '#4A3728', // Dark Brown
  '#8B4513', // Brown
  '#D2691E', // Light Brown
  '#FFD700', // Blonde
  '#FF6347', // Red
  '#FF69B4', // Pink
  '#9370DB', // Purple
  '#87CEEB', // Blue
  '#FFFFFF', // White/Gray
];

export const CLOTHING_COLORS: string[] = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#FFFFFF', // White
  '#000000', // Black
  '#1E3A5F', // Navy
  '#4B5563', // Gray
];

// ============================================================================
// Manifest API
// ============================================================================

export interface AvatarManifest {
  bodyTypes: BodyTypeOption[];
  skinTones: SkinToneOption[];
  hairStyles: HairStyleOption[];
  tops: ClothingTopOption[];
  bottoms: ClothingBottomOption[];
  shoes: ShoesOption[];
  accessories: AccessoryOption[];
  beards: BeardOption[];
  eyeColors: EyeColorOption[];
  hairColors: string[];
  clothingColors: string[];
}

/**
 * Get all available avatar customization options.
 * Used by the avatar editor UI to populate selection options.
 */
export function getAvailableOptions(): AvatarManifest {
  return {
    bodyTypes: BODY_TYPES,
    skinTones: SKIN_TONES,
    hairStyles: HAIR_STYLES,
    tops: TOPS,
    bottoms: BOTTOMS,
    shoes: SHOES,
    accessories: ACCESSORIES,
    beards: BEARDS,
    eyeColors: EYE_COLORS,
    hairColors: HAIR_COLORS,
    clothingColors: CLOTHING_COLORS,
  };
}

/**
 * Get hair style info by ID
 */
export function getHairStyleById(id: HairStyle): HairStyleOption | undefined {
  return HAIR_STYLES.find(h => h.id === id);
}

/**
 * Get skin tone info by ID
 */
export function getSkinToneById(id: SkinTone): SkinToneOption | undefined {
  return SKIN_TONES.find(s => s.id === id);
}

// Export default for convenient importing
export default {
  BODY_TYPES,
  SKIN_TONES,
  HAIR_STYLES,
  TOPS,
  BOTTOMS,
  SHOES,
  ACCESSORIES,
  BEARDS,
  EYE_COLORS,
  HAIR_COLORS,
  CLOTHING_COLORS,
  getAvailableOptions,
  getHairStyleById,
  getSkinToneById,
};
