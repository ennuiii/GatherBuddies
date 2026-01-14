/**
 * Dynamic Asset Manifest Service
 *
 * Reads LPC sheet_definitions JSON files to dynamically build
 * available options for avatar customization.
 *
 * This uses the same data format as the LPC Universal Character Generator.
 */

export type BodyType = 'male' | 'female' | 'muscular' | 'child' | 'teen' | 'pregnant';

export interface SheetDefinition {
  name: string;
  type_name: string;
  layer_1: {
    zPos: number;
    male?: string;
    female?: string;
    muscular?: string;
    child?: string;
    teen?: string;
    pregnant?: string;
  };
  layer_2?: {
    zPos: number;
    male?: string;
    female?: string;
    muscular?: string;
    child?: string;
    teen?: string;
    pregnant?: string;
  };
  variants: string[];
  credits?: unknown[];
}

export interface AssetOption {
  id: string;
  displayName: string;
  category: string;
  supportedBodyTypes: BodyType[];
  paths: Record<BodyType, string>;
  variants: string[];
  zPos: number;
}

export interface AssetManifest {
  hair: AssetOption[];
  tops: AssetOption[];
  bottoms: AssetOption[];
  shoes: AssetOption[];
  accessories: AssetOption[];
  beards: AssetOption[];
}

class DynamicAssetManifestService {
  private manifest: AssetManifest | null = null;
  private definitions: Map<string, SheetDefinition> = new Map();
  private loading: Promise<void> | null = null;
  private baseUrl: string = '/hub/';

  /**
   * Initialize the manifest by loading all sheet definitions
   */
  async initialize(baseUrl: string = '/hub/'): Promise<void> {
    this.baseUrl = baseUrl;

    if (this.manifest) return;
    if (this.loading) return this.loading;

    this.loading = this.loadDefinitions();
    await this.loading;
  }

  private async loadDefinitions(): Promise<void> {
    try {
      // Fetch the index of available definitions
      // For now, we'll load specific categories we care about
      const categories = [
        // Hair
        'hair_afro', 'hair_balding', 'hair_bangs', 'hair_bangslong', 'hair_bedhead',
        'hair_bob', 'hair_braid', 'hair_buzzcut', 'hair_cornrows', 'hair_cowlick',
        'hair_curly_long', 'hair_curly_short', 'hair_dreadlocks_long', 'hair_dreadlocks_short',
        'hair_flat_top_fade', 'hair_half_up', 'hair_high_ponytail', 'hair_idol',
        'hair_long', 'hair_long_messy', 'hair_long_straight', 'hair_messy1',
        'hair_natural', 'hair_page', 'hair_parted', 'hair_pigtails', 'hair_pixie',
        'hair_ponytail', 'hair_ponytail2', 'hair_princess', 'hair_shorthawk',
        'hair_shoulderl', 'hair_shoulderr', 'hair_spiked', 'hair_swoop',
        'hair_wavy', 'hair_xlong',
        // Tops
        'torso_clothes_shortsleeve', 'torso_clothes_sleeveless', 'torso_clothes_longsleeve',
        'torso_clothes_sleeveless_tanktop', 'torso_clothes_longsleeve_formal',
        // Bottoms
        'legs_pants', 'legs_shorts', 'legs_skirts_plain', 'legs_leggings',
        // Shoes
        'feet_shoes', 'feet_boots', 'feet_sandals', 'feet_slippers',
        // Beards
        'beards_beard', 'beards_mustache', 'beards_trimmed',
        // Glasses
        'facial_glasses', 'facial_glasses_round', 'facial_glasses_nerd', 'facial_glasses_sunglasses',
      ];

      const loadPromises = categories.map(async (name) => {
        try {
          const url = `${this.baseUrl}assets/avatars/lpc/sheet_definitions/${name}.json`;
          const response = await fetch(url);
          if (response.ok) {
            const def = await response.json() as SheetDefinition;
            this.definitions.set(name, def);
          }
        } catch {
          // Silently skip missing definitions
        }
      });

      await Promise.all(loadPromises);
      this.buildManifest();
      console.log('[DynamicAssetManifest] Loaded', this.definitions.size, 'definitions');
    } catch (error) {
      console.error('[DynamicAssetManifest] Failed to load definitions:', error);
    }
  }

  private buildManifest(): void {
    const hair: AssetOption[] = [];
    const tops: AssetOption[] = [];
    const bottoms: AssetOption[] = [];
    const shoes: AssetOption[] = [];
    const accessories: AssetOption[] = [];
    const beards: AssetOption[] = [];

    for (const [filename, def] of this.definitions) {
      const option = this.definitionToOption(filename, def);
      if (!option) continue;

      // Categorize by type_name
      switch (def.type_name) {
        case 'hair':
          hair.push(option);
          break;
        case 'clothes':
          if (filename.includes('torso')) {
            tops.push(option);
          } else if (filename.includes('legs')) {
            bottoms.push(option);
          }
          break;
        case 'legs':
        case 'pants':
        case 'shorts':
        case 'skirts':
          bottoms.push(option);
          break;
        case 'shoes':
        case 'boots':
        case 'feet':
          shoes.push(option);
          break;
        case 'beards':
          beards.push(option);
          break;
        case 'glasses':
          accessories.push(option);
          break;
      }
    }

    this.manifest = { hair, tops, bottoms, shoes, accessories, beards };
  }

  private definitionToOption(filename: string, def: SheetDefinition): AssetOption | null {
    const layer = def.layer_1;
    if (!layer) return null;

    const supportedBodyTypes: BodyType[] = [];
    const paths: Record<string, string> = {};

    // Check which body types are supported
    const bodyTypes: BodyType[] = ['male', 'female', 'muscular', 'child', 'teen', 'pregnant'];
    for (const bt of bodyTypes) {
      if (layer[bt]) {
        supportedBodyTypes.push(bt);
        paths[bt] = layer[bt];
      }
    }

    if (supportedBodyTypes.length === 0) return null;

    // Extract ID from filename (e.g., "hair_pixie" -> "pixie")
    const parts = filename.split('_');
    const id = parts.length > 1 ? parts.slice(1).join('_') : filename;

    return {
      id,
      displayName: def.name,
      category: def.type_name,
      supportedBodyTypes,
      paths: paths as Record<BodyType, string>,
      variants: def.variants || [],
      zPos: layer.zPos || 0,
    };
  }

  /**
   * Get all available options for a category, filtered by body type
   */
  getOptionsForBodyType(category: keyof AssetManifest, bodyType: BodyType): AssetOption[] {
    if (!this.manifest) return [];

    const options = this.manifest[category] || [];
    return options.filter(opt => opt.supportedBodyTypes.includes(bodyType));
  }

  /**
   * Get the full path for an asset
   */
  getAssetPath(option: AssetOption, bodyType: BodyType, variant: string): string | null {
    const basePath = option.paths[bodyType];
    if (!basePath) return null;

    // Normalize variant name (spaces to underscores, lowercase)
    const normalizedVariant = variant.toLowerCase().replace(/ /g, '_');

    return `${this.baseUrl}assets/avatars/lpc/${basePath}${normalizedVariant}.png`;
  }

  /**
   * Check if a specific option is available for a body type
   */
  isAvailableForBodyType(optionId: string, category: keyof AssetManifest, bodyType: BodyType): boolean {
    if (!this.manifest) return false;

    const options = this.manifest[category] || [];
    const option = options.find(o => o.id === optionId);
    return option?.supportedBodyTypes.includes(bodyType) ?? false;
  }

  /**
   * Get all variants (colors) for an option
   */
  getVariants(optionId: string, category: keyof AssetManifest): string[] {
    if (!this.manifest) return [];

    const options = this.manifest[category] || [];
    const option = options.find(o => o.id === optionId);
    return option?.variants || [];
  }

  /**
   * Get the full manifest
   */
  getManifest(): AssetManifest | null {
    return this.manifest;
  }

  /**
   * Debug: print manifest summary
   */
  printSummary(): void {
    if (!this.manifest) {
      console.log('[DynamicAssetManifest] Not loaded');
      return;
    }

    console.log('[DynamicAssetManifest] Summary:');
    console.log('  Hair:', this.manifest.hair.length, 'options');
    console.log('  Tops:', this.manifest.tops.length, 'options');
    console.log('  Bottoms:', this.manifest.bottoms.length, 'options');
    console.log('  Shoes:', this.manifest.shoes.length, 'options');
    console.log('  Accessories:', this.manifest.accessories.length, 'options');
    console.log('  Beards:', this.manifest.beards.length, 'options');
  }
}

export const dynamicAssetManifest = new DynamicAssetManifestService();
export default dynamicAssetManifest;
