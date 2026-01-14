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
  HeadType,
  EarType,
  TailType,
  WingType,
  HornType,
  HatType,
  GlassesType,
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
// Head Types (Creature/Species Heads)
// ============================================================================
// All discovered from LPC-Reference with male+female support and full animations

export interface HeadTypeOption {
  id: HeadType;
  displayName: string;
  category: 'human' | 'fantasy' | 'beast' | 'undead' | 'other';
}

export const HEAD_TYPES: HeadTypeOption[] = [
  // Human (default)
  { id: 'human', displayName: 'Human', category: 'human' },
  // Fantasy races
  { id: 'goblin', displayName: 'Goblin', category: 'fantasy' },
  { id: 'orc', displayName: 'Orc', category: 'fantasy' },
  { id: 'troll', displayName: 'Troll', category: 'fantasy' },
  // Animal/beast heads
  { id: 'wolf', displayName: 'Wolf', category: 'beast' },
  { id: 'cat', displayName: 'Cat', category: 'beast' },
  { id: 'lizard', displayName: 'Lizard', category: 'beast' },
  { id: 'reptile', displayName: 'Reptile', category: 'beast' },
  // Mythical creatures
  { id: 'minotaur', displayName: 'Minotaur', category: 'fantasy' },
  { id: 'demon', displayName: 'Demon', category: 'fantasy' },
  { id: 'skeleton', displayName: 'Skeleton', category: 'undead' },
  // Undead/horror
  { id: 'vampire', displayName: 'Vampire', category: 'undead' },
  { id: 'zombie', displayName: 'Zombie', category: 'undead' },
  // Alien/other
  { id: 'alien', displayName: 'Alien', category: 'other' },
  { id: 'cyclops', displayName: 'Cyclops', category: 'other' },
];

// ============================================================================
// Ears (decorative ear options)
// ============================================================================

export interface EarOption {
  id: EarType;
  displayName: string;
  category: 'none' | 'elven' | 'animal' | 'fantasy' | 'jewelry';
}

export const EARS: EarOption[] = [
  { id: 'none', displayName: 'None', category: 'none' },
  // Elven ears
  { id: 'elven_ears', displayName: 'Elven Ears', category: 'elven' },
  { id: 'elven_ears_thin', displayName: 'Thin Elven Ears', category: 'elven' },
  // Animal ears
  { id: 'cat_ears', displayName: 'Cat Ears', category: 'animal' },
  { id: 'wolf_ears', displayName: 'Wolf Ears', category: 'animal' },
  { id: 'dog_ears', displayName: 'Dog Ears', category: 'animal' },
  // Fantasy ears
  { id: 'feathered_ears', displayName: 'Feathered Ears', category: 'fantasy' },
  { id: 'dragon_ears', displayName: 'Dragon Ears', category: 'fantasy' },
  // Jewelry/piercings
  { id: 'ear_studs', displayName: 'Ear Studs', category: 'jewelry' },
  { id: 'ear_rings', displayName: 'Ear Rings', category: 'jewelry' },
];

// ============================================================================
// Tails
// ============================================================================

export interface TailOption {
  id: TailType;
  displayName: string;
  category: 'none' | 'animal' | 'fantasy';
}

export const TAILS: TailOption[] = [
  { id: 'none', displayName: 'None', category: 'none' },
  // Animal tails
  { id: 'cat_tail', displayName: 'Cat Tail', category: 'animal' },
  { id: 'wolf_tail', displayName: 'Wolf Tail', category: 'animal' },
  { id: 'fox_tail', displayName: 'Fox Tail', category: 'animal' },
  // Fantasy tails
  { id: 'lizard_tail', displayName: 'Lizard Tail', category: 'fantasy' },
  { id: 'dragon_tail', displayName: 'Dragon Tail', category: 'fantasy' },
  { id: 'demon_tail', displayName: 'Demon Tail', category: 'fantasy' },
];

// ============================================================================
// Wings
// ============================================================================

export interface WingOption {
  id: WingType;
  displayName: string;
  category: 'none' | 'bat' | 'feathered' | 'insect' | 'dragon';
}

export const WINGS: WingOption[] = [
  { id: 'none', displayName: 'None', category: 'none' },
  // Bat-like wings
  { id: 'bat_wings', displayName: 'Bat Wings', category: 'bat' },
  { id: 'demon_wings', displayName: 'Demon Wings', category: 'bat' },
  // Feathered wings
  { id: 'angel_wings', displayName: 'Angel Wings', category: 'feathered' },
  { id: 'feathered_wings', displayName: 'Feathered Wings', category: 'feathered' },
  // Insect wings
  { id: 'butterfly_wings', displayName: 'Butterfly Wings', category: 'insect' },
  { id: 'fairy_wings', displayName: 'Fairy Wings', category: 'insect' },
  { id: 'pixie_wings', displayName: 'Pixie Wings', category: 'insect' },
  // Dragon/reptile wings
  { id: 'dragon_wings', displayName: 'Dragon Wings', category: 'dragon' },
  { id: 'lizard_wings', displayName: 'Lizard Wings', category: 'dragon' },
];

// ============================================================================
// Horns
// ============================================================================

export interface HornOption {
  id: HornType;
  displayName: string;
}

export const HORNS: HornOption[] = [
  { id: 'none', displayName: 'None' },
  { id: 'horns_backwards', displayName: 'Backwards Horns' },
  { id: 'horns_curled', displayName: 'Curled Horns' },
  { id: 'horns_small', displayName: 'Small Horns' },
  { id: 'horns_demon', displayName: 'Demon Horns' },
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
  { id: 'bob_side_part', displayName: 'Bob Side Part', hasBackLayer: false },
  { id: 'cowlick', displayName: 'Cowlick', hasBackLayer: false },
  { id: 'spiked', displayName: 'Spiked', hasBackLayer: false },
  { id: 'shorthawk', displayName: 'Short Mohawk', hasBackLayer: false },
  { id: 'mohawk', displayName: 'Mohawk', hasBackLayer: false },
  { id: 'buzzcut', displayName: 'Buzzcut', hasBackLayer: false },
  { id: 'flat_top_fade', displayName: 'Flat Top', hasBackLayer: false },
  { id: 'emo', displayName: 'Emo', hasBackLayer: false },
  { id: 'jewfro', displayName: 'Jewfro', hasBackLayer: false },

  // Medium styles
  { id: 'bangs', displayName: 'Bangs', hasBackLayer: false },
  { id: 'bangslong', displayName: 'Long Bangs', hasBackLayer: false },
  { id: 'bangs_bun', displayName: 'Bangs Bun', hasBackLayer: false },
  { id: 'parted', displayName: 'Parted', hasBackLayer: false },
  { id: 'parted2', displayName: 'Parted Alt', hasBackLayer: false },
  { id: 'parted3', displayName: 'Parted V3', hasBackLayer: false },
  { id: 'parted_side_bangs', displayName: 'Side Bangs', hasBackLayer: false },
  { id: 'parted_side_bangs2', displayName: 'Side Bangs Alt', hasBackLayer: false },
  { id: 'swoop', displayName: 'Swoop', hasBackLayer: false },
  { id: 'curtains', displayName: 'Curtains', hasBackLayer: false },
  { id: 'curly_short', displayName: 'Curly Short', hasBackLayer: false },
  { id: 'curly_short2', displayName: 'Curly Short Alt', hasBackLayer: false },
  { id: 'ponytail', displayName: 'Ponytail', hasBackLayer: false },
  { id: 'ponytail2', displayName: 'Ponytail Alt', hasBackLayer: false },
  { id: 'ponytail_simple', displayName: 'Simple Ponytail', hasBackLayer: false },
  { id: 'braid', displayName: 'Braid', hasBackLayer: false },
  { id: 'single_braid', displayName: 'Single Braid', hasBackLayer: false },
  { id: 'braids', displayName: 'Braids', hasBackLayer: false },
  { id: 'idol', displayName: 'Idol', hasBackLayer: false },
  { id: 'shoulderl', displayName: 'Shoulder Left', hasBackLayer: false },
  { id: 'shoulderr', displayName: 'Shoulder Right', hasBackLayer: false },
  { id: 'messy1', displayName: 'Messy', hasBackLayer: false },
  { id: 'messy2', displayName: 'Messy Alt', hasBackLayer: false },
  { id: 'page', displayName: 'Page', hasBackLayer: false },
  { id: 'page2', displayName: 'Page Alt', hasBackLayer: false },
  { id: 'lob', displayName: 'Lob', hasBackLayer: false },
  { id: 'sara', displayName: 'Sara', hasBackLayer: false },
  { id: 'shortknot', displayName: 'Short Knot', hasBackLayer: false },
  { id: 'tied', displayName: 'Tied', hasBackLayer: false },

  // Long styles
  { id: 'long', displayName: 'Long', hasBackLayer: false },
  { id: 'long_straight', displayName: 'Long Straight', hasBackLayer: false },
  { id: 'long_messy', displayName: 'Long Messy', hasBackLayer: false },
  { id: 'loose', displayName: 'Loose', hasBackLayer: false },
  { id: 'curly_long', displayName: 'Long Curly', hasBackLayer: false },
  { id: 'curly_long2', displayName: 'Long Curly Alt', hasBackLayer: false },
  { id: 'wavy', displayName: 'Wavy', hasBackLayer: false },
  { id: 'princess', displayName: 'Princess', hasBackLayer: false },
  { id: 'high_ponytail', displayName: 'High Ponytail', hasBackLayer: false },
  { id: 'pigtails', displayName: 'Pigtails', hasBackLayer: false },
  { id: 'twintail', displayName: 'Twintail', hasBackLayer: false },
  { id: 'odango', displayName: 'Odango', hasBackLayer: false },
  { id: 'spacebuns', displayName: 'Space Buns', hasBackLayer: false },
  { id: 'bunches', displayName: 'Bunches', hasBackLayer: false },
  { id: 'xlong', displayName: 'Extra Long', hasBackLayer: false },
  { id: 'half_up', displayName: 'Half Up', hasBackLayer: false },

  // Textured
  { id: 'afro', displayName: 'Afro', hasBackLayer: false },
  { id: 'dreadlocks_long', displayName: 'Dreadlocks', hasBackLayer: false },
  { id: 'dreadlocks_short', displayName: 'Short Dreads', hasBackLayer: false },
  { id: 'cornrows', displayName: 'Cornrows', hasBackLayer: false },
  { id: 'natural', displayName: 'Natural', hasBackLayer: false },
  { id: 'twists_fade', displayName: 'Twists Fade', hasBackLayer: false },
  { id: 'twists_straight', displayName: 'Twists Straight', hasBackLayer: false },

  // Special
  { id: 'balding', displayName: 'Balding', hasBackLayer: false },
];

// ============================================================================
// Clothing - Tops (from lpc/torso/*)
// ============================================================================

export interface ClothingTopOption {
  id: ClothingTop;
  displayName: string;
  supportedBodyTypes: BodyType[];
}

// NOTE: Two categories of tops based on LPC sprite sheet rows:
// - Extended animations (46 rows): Have proper idle/sit/run/walk animations
// - Basic animations (21 rows): Only have walk animation (used as fallback for other animations)
//
// Body type support determined by presence in LPC-Reference sheet_definitions layer_1 keys.
// 'pregnant' is not in BODY_TYPES so omitted from supportedBodyTypes.
// 'none' is a special option for no top (no torso layer rendered)
export const TOPS: ClothingTopOption[] = [
  { id: 'none' as ClothingTop, displayName: 'None', supportedBodyTypes: ['male', 'female'] },
  // Extended animations (46 rows - proper idle/sit/run/walk)
  { id: 'shortsleeve_polo', displayName: 'Polo Shirt', supportedBodyTypes: ['female'] },
  { id: 'tshirt', displayName: 'T-Shirt', supportedBodyTypes: ['female'] },
  { id: 'longsleeve2', displayName: 'Long Sleeve', supportedBodyTypes: ['female'] },
  { id: 'sleeveless2', displayName: 'Tank Top', supportedBodyTypes: ['female'] },
  // Basic animations (21 rows - use walk fallback for idle/sit/run)
  { id: 'longsleeve', displayName: 'Long Sleeve (Basic)', supportedBodyTypes: ['male', 'female'] },
  { id: 'shortsleeve', displayName: 'Short Sleeve (Basic)', supportedBodyTypes: ['male', 'female'] },
  { id: 'sleeveless', displayName: 'Sleeveless (Basic)', supportedBodyTypes: ['male', 'female'] },
];

// ============================================================================
// Clothing - Bottoms (from lpc/legs/*)
// ============================================================================

export interface ClothingBottomOption {
  id: ClothingBottom;
  displayName: string;
  supportedBodyTypes: BodyType[];
}

// NOTE: Only includes bottoms with extended animations (46 rows: walk, idle, sit, run)
// Items with only 21 rows (skirt) are excluded
// Leggings only have female assets in LPC
export const BOTTOMS: ClothingBottomOption[] = [
  // Basic styles (male + female)
  { id: 'pants', displayName: 'Pants', supportedBodyTypes: ['male', 'female'] },
  { id: 'shorts', displayName: 'Shorts', supportedBodyTypes: ['male', 'female'] },
  { id: 'pantaloons', displayName: 'Pantaloons', supportedBodyTypes: ['male', 'female'] },
  // Extended styles
  { id: 'pants_formal', displayName: 'Formal Pants', supportedBodyTypes: ['male', 'female'] },
  { id: 'pants_fur', displayName: 'Fur Pants', supportedBodyTypes: ['male', 'female'] },
  { id: 'pants_legion', displayName: 'Legion Pants', supportedBodyTypes: ['male', 'female'] },
  { id: 'shorts_cargo', displayName: 'Cargo Shorts', supportedBodyTypes: ['male', 'female'] },
  { id: 'shorts_legion', displayName: 'Legion Shorts', supportedBodyTypes: ['male', 'female'] },
  // Female only
  { id: 'leggings', displayName: 'Leggings', supportedBodyTypes: ['female'] },
];

// ============================================================================
// Shoes (from lpc/feet/*)
// ============================================================================

export interface ShoesOption {
  id: Shoes;
  displayName: string;
  supportedBodyTypes: BodyType[];
}

// NOTE: Only includes shoes with extended animations (46 rows: walk, idle, sit, run)
// Items with only 21 rows (shoes, boots, sandals, slippers, sneakers, dress_shoes) are excluded
// shoes2/boots2 have male folder and thin/ subfolder for female/teen (handled by AvatarAssetLoader)
// 'none' is a special option for barefoot (no shoe layer rendered)
export const SHOES: ShoesOption[] = [
  { id: 'none' as Shoes, displayName: 'Barefoot', supportedBodyTypes: ['male', 'female'] },
  // Basic shoes (extended animations)
  { id: 'shoes2', displayName: 'Shoes', supportedBodyTypes: ['male', 'female'] },
  { id: 'boots2', displayName: 'Boots', supportedBodyTypes: ['male', 'female'] },
  // Extended options
  { id: 'socks', displayName: 'Socks', supportedBodyTypes: ['male', 'female'] },
  { id: 'sandals2', displayName: 'Sandals', supportedBodyTypes: ['male', 'female'] },
  { id: 'slippers2', displayName: 'Slippers', supportedBodyTypes: ['male', 'female'] },
  // Armor/special boots
  { id: 'boots_armor', displayName: 'Armor Boots', supportedBodyTypes: ['male', 'female'] },
  { id: 'boots_fur', displayName: 'Fur Boots', supportedBodyTypes: ['male', 'female'] },
  { id: 'boots_legion', displayName: 'Legion Boots', supportedBodyTypes: ['male', 'female'] },
];

// ============================================================================
// Hats & Helmets (expanded headwear options)
// ============================================================================

export interface HatOption {
  id: HatType;
  displayName: string;
  category: 'none' | 'casual' | 'formal' | 'crown' | 'helmet' | 'hood' | 'other';
}

export const HATS: HatOption[] = [
  { id: 'none', displayName: 'None', category: 'none' },
  // Casual hats
  { id: 'bandana', displayName: 'Bandana', category: 'casual' },
  { id: 'hood', displayName: 'Hood', category: 'casual' },
  { id: 'beanie', displayName: 'Beanie', category: 'casual' },
  { id: 'cap', displayName: 'Cap', category: 'casual' },
  { id: 'beret', displayName: 'Beret', category: 'casual' },
  { id: 'headband', displayName: 'Headband', category: 'casual' },
  // Formal hats
  { id: 'tophat', displayName: 'Top Hat', category: 'formal' },
  { id: 'bowler', displayName: 'Bowler Hat', category: 'formal' },
  { id: 'fedora', displayName: 'Fedora', category: 'formal' },
  { id: 'tricorn', displayName: 'Tricorn', category: 'formal' },
  // Crowns & tiaras
  { id: 'crown', displayName: 'Crown', category: 'crown' },
  { id: 'tiara', displayName: 'Tiara', category: 'crown' },
  { id: 'circlet', displayName: 'Circlet', category: 'crown' },
  { id: 'diadem', displayName: 'Diadem', category: 'crown' },
  // Medieval helmets
  { id: 'helmet_barbute', displayName: 'Barbute Helmet', category: 'helmet' },
  { id: 'helmet_chain', displayName: 'Chain Helmet', category: 'helmet' },
  { id: 'helmet_cloth', displayName: 'Cloth Helmet', category: 'helmet' },
  { id: 'helmet_jousting', displayName: 'Jousting Helmet', category: 'helmet' },
  { id: 'helmet_legion', displayName: 'Legion Helmet', category: 'helmet' },
  { id: 'helmet_metal', displayName: 'Metal Helmet', category: 'helmet' },
  { id: 'helmet_plate', displayName: 'Plate Helmet', category: 'helmet' },
  { id: 'helmet_viking', displayName: 'Viking Helmet', category: 'helmet' },
  // Hoods & cowls
  { id: 'hood_chain', displayName: 'Chain Hood', category: 'hood' },
  { id: 'hood_cloth', displayName: 'Cloth Hood', category: 'hood' },
  { id: 'cowl', displayName: 'Cowl', category: 'hood' },
  // Other headwear
  { id: 'turban', displayName: 'Turban', category: 'other' },
  { id: 'veil', displayName: 'Veil', category: 'other' },
  { id: 'mask', displayName: 'Mask', category: 'other' },
];

// ============================================================================
// Glasses & Eyewear
// ============================================================================

export interface GlassesOption {
  id: GlassesType;
  displayName: string;
  category: 'none' | 'glasses' | 'sunglasses' | 'special';
}

export const GLASSES: GlassesOption[] = [
  { id: 'none', displayName: 'None', category: 'none' },
  // Regular glasses
  { id: 'glasses', displayName: 'Glasses', category: 'glasses' },
  { id: 'glasses_round', displayName: 'Round Glasses', category: 'glasses' },
  { id: 'glasses_nerd', displayName: 'Nerd Glasses', category: 'glasses' },
  { id: 'monocle', displayName: 'Monocle', category: 'glasses' },
  // Sunglasses
  { id: 'sunglasses', displayName: 'Sunglasses', category: 'sunglasses' },
  { id: 'shades', displayName: 'Shades', category: 'sunglasses' },
  { id: 'shades_aviator', displayName: 'Aviator Shades', category: 'sunglasses' },
  // Special eyewear
  { id: 'eyepatch', displayName: 'Eyepatch', category: 'special' },
  { id: 'goggles', displayName: 'Goggles', category: 'special' },
];

// Legacy ACCESSORIES for backward compatibility
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
  // Beards
  { id: 'beard_basic', displayName: 'Basic Beard' },
  { id: 'beard_medium', displayName: 'Medium Beard' },
  { id: 'beard_trimmed', displayName: 'Trimmed Beard' },
  { id: 'beard_full', displayName: 'Full Beard' },
  { id: 'beard_winter', displayName: 'Winter Beard' },
  { id: 'beard_5oclock', displayName: '5 O\'clock Shadow' },
  // Mustaches
  { id: 'mustache_basic', displayName: 'Mustache' },
  { id: 'mustache_handlebar', displayName: 'Handlebar Mustache' },
  { id: 'mustache_thin', displayName: 'Thin Mustache' },
  // Goatees
  { id: 'goatee', displayName: 'Goatee' },
  { id: 'goatee_thin', displayName: 'Thin Goatee' },
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

/**
 * Hair color options with hex values and LPC sprite file names.
 * LPC has pre-colored sprites for each color - we load the matching file.
 */
export interface HairColorOption {
  hex: string;
  lpcName: string; // Filename in LPC assets (without .png)
  displayName: string;
}

export const HAIR_COLOR_OPTIONS: HairColorOption[] = [
  { hex: '#000000', lpcName: 'black', displayName: 'Black' },
  { hex: '#1a1a2e', lpcName: 'raven', displayName: 'Raven' },
  { hex: '#4A3728', lpcName: 'dark_brown', displayName: 'Dark Brown' },
  { hex: '#8B4513', lpcName: 'chestnut', displayName: 'Chestnut' },
  { hex: '#A0522D', lpcName: 'light_brown', displayName: 'Light Brown' },
  { hex: '#D2691E', lpcName: 'ginger', displayName: 'Ginger' },
  { hex: '#F4A460', lpcName: 'sandy', displayName: 'Sandy' },
  { hex: '#FFD700', lpcName: 'blonde', displayName: 'Blonde' },
  { hex: '#FFFACD', lpcName: 'platinum', displayName: 'Platinum' },
  { hex: '#FF6347', lpcName: 'red', displayName: 'Red' },
  { hex: '#FFA500', lpcName: 'orange', displayName: 'Orange' },
  { hex: '#FF4500', lpcName: 'carrot', displayName: 'Carrot' },
  { hex: '#FF69B4', lpcName: 'pink', displayName: 'Pink' },
  { hex: '#FFB6C1', lpcName: 'rose', displayName: 'Rose' },
  { hex: '#9370DB', lpcName: 'purple', displayName: 'Purple' },
  { hex: '#8A2BE2', lpcName: 'violet', displayName: 'Violet' },
  { hex: '#4169E1', lpcName: 'blue', displayName: 'Blue' },
  { hex: '#000080', lpcName: 'navy', displayName: 'Navy' },
  { hex: '#228B22', lpcName: 'green', displayName: 'Green' },
  { hex: '#FFD700', lpcName: 'gold', displayName: 'Gold' },
  { hex: '#808080', lpcName: 'gray', displayName: 'Gray' },
  { hex: '#A9A9A9', lpcName: 'dark_gray', displayName: 'Dark Gray' },
  { hex: '#FFFFFF', lpcName: 'white', displayName: 'White' },
];

// Legacy array for backward compatibility
export const HAIR_COLORS: string[] = HAIR_COLOR_OPTIONS.map(c => c.hex);

/**
 * Get LPC color name from hex color.
 * Returns closest match if exact match not found.
 */
export function getLpcHairColor(hex: string): string {
  const option = HAIR_COLOR_OPTIONS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  if (option) return option.lpcName;

  // Fallback: find closest color by comparing RGB values
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  let closest = HAIR_COLOR_OPTIONS[0];
  let minDist = Infinity;

  for (const opt of HAIR_COLOR_OPTIONS) {
    const or = parseInt(opt.hex.slice(1, 3), 16);
    const og = parseInt(opt.hex.slice(3, 5), 16);
    const ob = parseInt(opt.hex.slice(5, 7), 16);
    const dist = Math.sqrt((r - or) ** 2 + (g - og) ** 2 + (b - ob) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closest = opt;
    }
  }

  return closest.lpcName;
}

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
  // Fantasy customization
  headTypes: HeadTypeOption[];
  ears: EarOption[];
  tails: TailOption[];
  wings: WingOption[];
  horns: HornOption[];
  // Hair & facial
  hairStyles: HairStyleOption[];
  beards: BeardOption[];
  eyeColors: EyeColorOption[];
  // Clothing
  tops: ClothingTopOption[];
  bottoms: ClothingBottomOption[];
  shoes: ShoesOption[];
  // Accessories
  hats: HatOption[];
  glasses: GlassesOption[];
  accessories: AccessoryOption[]; // Legacy
  // Colors
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
    // Fantasy customization
    headTypes: HEAD_TYPES,
    ears: EARS,
    tails: TAILS,
    wings: WINGS,
    horns: HORNS,
    // Hair & facial
    hairStyles: HAIR_STYLES,
    beards: BEARDS,
    eyeColors: EYE_COLORS,
    // Clothing
    tops: TOPS,
    bottoms: BOTTOMS,
    shoes: SHOES,
    // Accessories
    hats: HATS,
    glasses: GLASSES,
    accessories: ACCESSORIES,
    // Colors
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

/**
 * Get head type info by ID
 */
export function getHeadTypeById(id: HeadType): HeadTypeOption | undefined {
  return HEAD_TYPES.find(h => h.id === id);
}

// Export default for convenient importing
export default {
  BODY_TYPES,
  SKIN_TONES,
  HEAD_TYPES,
  EARS,
  TAILS,
  WINGS,
  HORNS,
  HAIR_STYLES,
  TOPS,
  BOTTOMS,
  SHOES,
  HATS,
  GLASSES,
  ACCESSORIES,
  BEARDS,
  EYE_COLORS,
  HAIR_COLORS,
  CLOTHING_COLORS,
  getAvailableOptions,
  getHairStyleById,
  getSkinToneById,
  getHeadTypeById,
};
