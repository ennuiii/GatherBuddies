/**
 * Avatar Manifest
 *
 * Central manifest of all available avatar customization options.
 * Based on assets available in public/assets/avatars/
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
} from '../types/avatar';

// ============================================================================
// Body Types
// ============================================================================

export interface BodyTypeOption {
  id: BodyType;
  displayName: string;
}

export const BODY_TYPES: BodyTypeOption[] = [
  { id: 'masculine', displayName: 'Masculine' },
  { id: 'feminine', displayName: 'Feminine' },
  { id: 'neutral', displayName: 'Neutral' },
];

// ============================================================================
// Skin Tones
// ============================================================================

export interface SkinToneOption {
  id: SkinTone;
  displayName: string;
  hex: string;
}

// NOTE: Skin tone IDs must match filenames in public/assets/avatars/bodies/{bodyType}/*.png
export const SKIN_TONES: SkinToneOption[] = [
  { id: 'light', displayName: 'Light', hex: '#FFE4C4' },
  { id: 'olive', displayName: 'Olive', hex: '#D4A574' },
  { id: 'tan', displayName: 'Tan', hex: '#8D5524' },
  { id: 'dark', displayName: 'Dark', hex: '#4A2C17' },
];

// ============================================================================
// Hair Styles
// ============================================================================

export interface HairStyleOption {
  id: HairStyle;
  displayName: string;
  hasBackLayer: boolean;
}

export const HAIR_STYLES: HairStyleOption[] = [
  { id: 'short', displayName: 'Short', hasBackLayer: false },
  { id: 'long', displayName: 'Long', hasBackLayer: true },
  { id: 'curly', displayName: 'Curly', hasBackLayer: false },
  { id: 'ponytail', displayName: 'Ponytail', hasBackLayer: true },
  { id: 'mohawk', displayName: 'Mohawk', hasBackLayer: false },
  { id: 'bald', displayName: 'Bald', hasBackLayer: false },
  { id: 'afro', displayName: 'Afro', hasBackLayer: false },
  { id: 'bob', displayName: 'Bob', hasBackLayer: false },
];

// ============================================================================
// Clothing - Tops
// ============================================================================

export interface ClothingTopOption {
  id: ClothingTop;
  displayName: string;
}

export const TOPS: ClothingTopOption[] = [
  { id: 'tshirt', displayName: 'T-Shirt' },
  { id: 'hoodie', displayName: 'Hoodie' },
  { id: 'jacket', displayName: 'Jacket' },
  { id: 'dress', displayName: 'Dress' },
  { id: 'tanktop', displayName: 'Tank Top' },
  { id: 'suit', displayName: 'Suit' },
];

// ============================================================================
// Clothing - Bottoms
// ============================================================================

export interface ClothingBottomOption {
  id: ClothingBottom;
  displayName: string;
}

export const BOTTOMS: ClothingBottomOption[] = [
  { id: 'jeans', displayName: 'Jeans' },
  { id: 'shorts', displayName: 'Shorts' },
  { id: 'skirt', displayName: 'Skirt' },
  { id: 'pants', displayName: 'Pants' },
  { id: 'sweatpants', displayName: 'Sweatpants' },
];

// ============================================================================
// Shoes
// ============================================================================

export interface ShoesOption {
  id: Shoes;
  displayName: string;
}

export const SHOES: ShoesOption[] = [
  { id: 'sneakers', displayName: 'Sneakers' },
  { id: 'boots', displayName: 'Boots' },
  { id: 'sandals', displayName: 'Sandals' },
  { id: 'dress_shoes', displayName: 'Dress Shoes' },
];

// ============================================================================
// Accessories
// ============================================================================

export interface AccessoryOption {
  id: AccessoryType;
  displayName: string;
}

export const ACCESSORIES: AccessoryOption[] = [
  { id: 'glasses', displayName: 'Glasses' },
  { id: 'hat_cap', displayName: 'Cap' },
  { id: 'hat_beanie', displayName: 'Beanie' },
  { id: 'earrings', displayName: 'Earrings' },
  { id: 'necklace', displayName: 'Necklace' },
  { id: 'mask', displayName: 'Mask' },
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
  HAIR_COLORS,
  CLOTHING_COLORS,
  getAvailableOptions,
  getHairStyleById,
  getSkinToneById,
};
