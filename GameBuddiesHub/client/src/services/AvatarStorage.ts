/**
 * Avatar Storage Service
 *
 * Handles saving and loading avatar configurations.
 * Uses localStorage for immediate persistence.
 * Future: Supabase integration for cloud sync.
 */

import type { AvatarConfig, SkinTone } from '../types/avatar';
import { DEFAULT_AVATAR_CONFIG } from '../types/avatar';
import { SKIN_TONES, ACCESSORIES } from './AvatarManifest';

const LOCAL_STORAGE_KEY = 'gatherbuddies_avatar';

// Valid skin tone IDs from manifest
const VALID_SKIN_TONES = new Set(SKIN_TONES.map(s => s.id));
const VALID_ACCESSORIES = new Set(ACCESSORIES.map(a => a.id));

class AvatarStorageService {
  private userId: string | null = null;

  /**
   * Set the current user ID (for future Supabase integration)
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Sanitize config to fix invalid values from older saves
   */
  private sanitizeConfig(config: AvatarConfig): AvatarConfig {
    let modified = false;

    // Fix invalid skin tone
    if (!VALID_SKIN_TONES.has(config.body.skinTone)) {
      console.warn(`[AvatarStorage] Invalid skin tone '${config.body.skinTone}', defaulting to 'light'`);
      config.body.skinTone = 'light' as SkinTone;
      modified = true;
    }

    // Fix old body types (neutral -> male, masculine -> male, feminine -> female)
    const bodyType = config.body.type as string;
    if (bodyType === 'neutral' || bodyType === 'masculine') {
      console.warn(`[AvatarStorage] Migrating body type '${bodyType}' to 'male'`);
      config.body.type = 'male';
      modified = true;
    } else if (bodyType === 'feminine') {
      console.warn(`[AvatarStorage] Migrating body type '${bodyType}' to 'female'`);
      config.body.type = 'female';
      modified = true;
    }

    // Fix old skin tones (tan -> bronze, dark -> brown, fair -> light)
    const skinTone = config.body.skinTone as string;
    if (skinTone === 'tan') {
      config.body.skinTone = 'bronze';
      modified = true;
    } else if (skinTone === 'dark') {
      config.body.skinTone = 'brown';
      modified = true;
    } else if (skinTone === 'fair') {
      config.body.skinTone = 'light';
      modified = true;
    }

    // Fix old hair styles that no longer exist
    const hairStyle = config.hair.style as string;
    if (hairStyle === 'short' || hairStyle === 'curly' || hairStyle === 'bangs_long') {
      console.warn(`[AvatarStorage] Migrating hair style '${hairStyle}' to 'pixie'`);
      config.hair.style = 'pixie';
      modified = true;
    }

    // Remove invalid accessories
    if (config.accessories && config.accessories.length > 0) {
      const validAccessories = config.accessories.filter(a => VALID_ACCESSORIES.has(a.type));
      if (validAccessories.length !== config.accessories.length) {
        console.warn(`[AvatarStorage] Removed ${config.accessories.length - validAccessories.length} invalid accessories`);
        config.accessories = validAccessories;
        modified = true;
      }
    }

    // Save sanitized config back to localStorage
    if (modified) {
      this.saveToLocal(config);
    }

    return config;
  }

  /**
   * Load avatar from localStorage
   */
  loadFromLocal(): AvatarConfig | null {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return null;

      const config = JSON.parse(stored) as AvatarConfig;

      // Validate basic structure
      if (!config.body || !config.hair || !config.clothing) {
        console.warn('[AvatarStorage] Invalid avatar config in localStorage, ignoring');
        return null;
      }

      // Sanitize to fix any invalid values
      return this.sanitizeConfig(config);
    } catch (error) {
      console.error('[AvatarStorage] Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Save avatar to localStorage
   */
  saveToLocal(config: AvatarConfig): void {
    try {
      const updatedConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedConfig));
      console.log('[AvatarStorage] Saved avatar to localStorage');
    } catch (error) {
      console.error('[AvatarStorage] Failed to save to localStorage:', error);
    }
  }

  /**
   * Load avatar configuration
   * Tries localStorage first, returns default if not found
   */
  load(): AvatarConfig {
    const stored = this.loadFromLocal();
    if (stored) {
      console.log('[AvatarStorage] Loaded avatar from localStorage');
      return stored;
    }

    console.log('[AvatarStorage] No stored avatar, using default');
    return {
      ...DEFAULT_AVATAR_CONFIG,
      id: `avatar_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save avatar configuration
   */
  save(config: AvatarConfig): void {
    this.saveToLocal(config);
  }

  /**
   * Clear stored avatar (reset to default)
   */
  clear(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      console.log('[AvatarStorage] Cleared stored avatar');
    } catch (error) {
      console.error('[AvatarStorage] Failed to clear localStorage:', error);
    }
  }

  /**
   * Check if user has a saved avatar
   */
  hasSavedAvatar(): boolean {
    return this.loadFromLocal() !== null;
  }
}

// Export singleton instance
export const avatarStorage = new AvatarStorageService();
export default avatarStorage;
