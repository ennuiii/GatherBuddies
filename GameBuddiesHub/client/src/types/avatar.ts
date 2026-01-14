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

// ============================================================================
// Head Types (Creature/Species Heads)
// ============================================================================
// All have male+female support and full animations (walk, idle, sit, run)
export type HeadType =
  | 'human'  // Default - uses body's skin tone
  // Fantasy races
  | 'goblin' | 'orc' | 'troll'
  // Animal/beast heads
  | 'wolf' | 'cat' | 'lizard' | 'reptile'
  // Mythical creatures
  | 'minotaur' | 'demon' | 'skeleton'
  // Undead/horror
  | 'vampire' | 'zombie'
  // Alien/other
  | 'alien' | 'cyclops';

// ============================================================================
// Ears (decorative ear types)
// ============================================================================
export type EarType =
  | 'none'
  // Elven ears
  | 'elven_ears' | 'elven_ears_thin'
  // Animal ears
  | 'cat_ears' | 'wolf_ears' | 'dog_ears'
  // Fantasy ears
  | 'feathered_ears' | 'dragon_ears'
  // Piercings/jewelry (from ear_ files)
  | 'ear_studs' | 'ear_rings';

// ============================================================================
// Tails
// ============================================================================
export type TailType =
  | 'none'
  // Animal tails
  | 'cat_tail' | 'wolf_tail' | 'fox_tail'
  // Fantasy tails
  | 'lizard_tail' | 'dragon_tail' | 'demon_tail';

// ============================================================================
// Wings
// ============================================================================
export type WingType =
  | 'none'
  // Bat-like wings
  | 'bat_wings' | 'demon_wings'
  // Feathered wings
  | 'angel_wings' | 'feathered_wings'
  // Insect wings
  | 'butterfly_wings' | 'fairy_wings' | 'pixie_wings'
  // Dragon/reptile
  | 'dragon_wings' | 'lizard_wings';

// ============================================================================
// Horns
// ============================================================================
export type HornType =
  | 'none'
  // Horn styles
  | 'horns_backwards' | 'horns_curled' | 'horns_small' | 'horns_demon';

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
  // Additional styles from LPC audit
  | 'loose' | 'emo' | 'lob' | 'sara' | 'shortknot' | 'mohawk' | 'jewfro'
  | 'messy2' | 'tied' | 'page2' | 'curtains' | 'bob_side_part'
  | 'parted2' | 'parted3' | 'parted_side_bangs' | 'parted_side_bangs2'
  | 'ponytail_simple' | 'twintail' | 'odango' | 'single_braid' | 'braids'
  | 'spacebuns' | 'bunches'
  | 'curly_short2' | 'curly_long2'
  | 'twists_fade' | 'twists_straight'
  | 'bangs_bun'
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

// Expanded bottom options from LPC audit
export type ClothingBottom =
  | 'pants' | 'shorts' | 'leggings' | 'pantaloons'
  // Additional bottoms with full animation support
  | 'pants_formal' | 'pants_fur' | 'pants_legion'
  | 'shorts_cargo' | 'shorts_legion';

// Expanded shoe options from LPC audit
export type Shoes =
  | 'none'  // barefoot
  | 'shoes2' | 'boots2'
  // Additional shoes with full animation support
  | 'socks' | 'sandals2' | 'slippers2'
  | 'boots_armor' | 'boots_fur' | 'boots_legion';

// ============================================================================
// Hats & Helmets (expanded from accessories)
// ============================================================================
export type HatType =
  | 'none'
  // Casual hats
  | 'bandana' | 'hood' | 'beanie' | 'cap' | 'beret'
  // Formal hats
  | 'tophat' | 'bowler' | 'fedora' | 'tricorn'
  // Crowns & Tiaras
  | 'crown' | 'tiara' | 'circlet' | 'diadem'
  // Medieval helmets
  | 'helmet_barbute' | 'helmet_chain' | 'helmet_cloth' | 'helmet_jousting'
  | 'helmet_legion' | 'helmet_metal' | 'helmet_plate' | 'helmet_viking'
  // Hoods & cowls
  | 'hood_chain' | 'hood_cloth' | 'cowl'
  // Other headwear
  | 'turban' | 'headband' | 'veil' | 'mask';

// Glasses & Eyewear (separate from hats)
export type GlassesType =
  | 'none'
  | 'glasses' | 'glasses_round' | 'glasses_nerd'
  | 'sunglasses' | 'shades' | 'shades_aviator'
  | 'eyepatch' | 'monocle' | 'goggles';

// Legacy accessory type for backward compatibility
export type AccessoryType =
  | 'glasses' | 'glasses_round' | 'glasses_nerd' | 'sunglasses' | 'shades'
  | 'hat_bandana' | 'hat_hood' | 'hat_tophat' | 'hat_bowler';

// Beard options (expanded with mustaches)
export type BeardStyle =
  | 'none'
  // Beards
  | 'beard_basic' | 'beard_medium' | 'beard_trimmed' | 'beard_full'
  | 'beard_winter' | 'beard_5oclock'
  // Mustaches
  | 'mustache_basic' | 'mustache_handlebar' | 'mustache_thin'
  // Goatees
  | 'goatee' | 'goatee_thin';

// Eye color options
export type EyeColor = 'blue' | 'brown' | 'green' | 'gray';

// ============================================================================
// Eyebrows (facial feature)
// ============================================================================
export type EyebrowType = 'default' | 'thick' | 'thin' | 'arched';

// ============================================================================
// Nose (facial feature)
// ============================================================================
export type NoseType = 'default' | 'big' | 'button' | 'large' | 'straight';

/**
 * Full avatar configuration
 */
export interface AvatarConfig {
  id: string;

  body: {
    type: BodyType;
    skinTone: SkinTone;
  };

  // Head/face customization
  head?: {
    type: HeadType;  // human, goblin, orc, wolf, etc.
  };

  ears?: {
    type: EarType;
    color?: string;  // For colored ears like elven
  };

  horns?: {
    type: HornType;
    color?: string;
  };

  hair: {
    style: HairStyle;
    color: string; // Hex color
  };

  // Facial features
  eyes?: {
    color: EyeColor;
  };

  eyebrows?: {
    type: EyebrowType;
    color?: string;  // Usually matches hair color
  };

  nose?: {
    type: NoseType;
  };

  beard?: {
    style: BeardStyle;
    color: string;
  };

  // Wings and tails (fantasy options)
  wings?: {
    type: WingType;
    color?: string;
  };

  tail?: {
    type: TailType;
    color?: string;
  };

  clothing: {
    top: ClothingTop;
    topColor: string;
    bottom: ClothingBottom;
    bottomColor: string;
    shoes: Shoes;
    shoesColor: string;
  };

  // Headwear (hats, helmets, crowns)
  hat?: {
    type: HatType;
    color?: string;
  };

  // Eyewear (glasses, goggles, eyepatch)
  glasses?: {
    type: GlassesType;
    color?: string;
  };

  // Legacy accessories array for backward compatibility
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
    type: 'male',
    skinTone: 'light',
  },
  head: {
    type: 'human',
  },
  ears: {
    type: 'none',
  },
  horns: {
    type: 'none',
  },
  hair: {
    style: 'pixie',
    color: '#4A3728',
  },
  eyes: {
    color: 'brown',
  },
  eyebrows: {
    type: 'default',
  },
  nose: {
    type: 'default',
  },
  beard: {
    style: 'none',
    color: '#4A3728',
  },
  wings: {
    type: 'none',
  },
  tail: {
    type: 'none',
  },
  clothing: {
    top: 'none', // Male body type doesn't have tshirt with extended animations
    topColor: '#3B82F6',
    bottom: 'pants',
    bottomColor: '#1E3A5F',
    shoes: 'shoes2',
    shoesColor: '#FFFFFF',
  },
  hat: {
    type: 'none',
  },
  glasses: {
    type: 'none',
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
  const randomFrom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const maybeRandom = <T>(arr: readonly T[], chance: number = 0.3): T | undefined =>
    Math.random() < chance ? randomFrom(arr) : undefined;

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
    HEAD_TYPES,
    EARS,
    TAILS,
    WINGS,
    HORNS,
    HATS,
    GLASSES,
  } = require('../services/AvatarManifest');

  const bodyTypes: BodyType[] = ['male', 'female'];

  // Randomly decide on fantasy features (low chance)
  const headType = maybeRandom(HEAD_TYPES, 0.15);
  const earType = maybeRandom(EARS, 0.2);
  const tailType = maybeRandom(TAILS, 0.1);
  const wingType = maybeRandom(WINGS, 0.08);
  const hornType = maybeRandom(HORNS, 0.1);
  const hatType = maybeRandom(HATS, 0.25);
  const glassesType = maybeRandom(GLASSES, 0.2);

  return {
    id: `avatar_${Date.now()}`,
    body: {
      type: randomFrom(bodyTypes),
      skinTone: randomFrom(SKIN_TONES).id,
    },
    head: headType ? { type: headType.id } : { type: 'human' },
    ears: earType ? { type: earType.id } : { type: 'none' },
    horns: hornType ? { type: hornType.id } : { type: 'none' },
    hair: {
      style: randomFrom(HAIR_STYLES).id,
      color: randomFrom(HAIR_COLORS),
    },
    eyes: {
      color: randomFrom(EYE_COLORS).id,
    },
    eyebrows: { type: 'default' },
    nose: { type: 'default' },
    beard: {
      style: randomFrom(BEARDS).id,
      color: randomFrom(HAIR_COLORS),
    },
    wings: wingType ? { type: wingType.id } : { type: 'none' },
    tail: tailType ? { type: tailType.id } : { type: 'none' },
    clothing: {
      top: randomFrom(TOPS).id,
      topColor: randomFrom(CLOTHING_COLORS),
      bottom: randomFrom(BOTTOMS).id,
      bottomColor: randomFrom(CLOTHING_COLORS),
      shoes: randomFrom(SHOES).id,
      shoesColor: randomFrom(CLOTHING_COLORS),
    },
    hat: hatType ? { type: hatType.id } : { type: 'none' },
    glasses: glassesType ? { type: glassesType.id } : { type: 'none' },
    accessories: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
