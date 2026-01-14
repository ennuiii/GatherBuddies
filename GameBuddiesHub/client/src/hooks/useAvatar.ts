/**
 * Avatar Hook
 *
 * Manages avatar configuration state and editor modal.
 * Integrates with Phaser via registry and events.
 */

import { useState, useCallback, useEffect } from 'react';
import type { AvatarConfig } from '../types/avatar';
import { avatarStorage } from '../services/AvatarStorage';
import { phaserEvents } from '../game/events/EventCenter';

interface UseAvatarReturn {
  avatarConfig: AvatarConfig;
  isEditorOpen: boolean;
  openEditor: () => void;
  closeEditor: () => void;
  saveAvatar: (config: AvatarConfig) => void;
  hasCustomAvatar: boolean;
}

export function useAvatar(): UseAvatarReturn {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => avatarStorage.load());
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Open editor
  const openEditor = useCallback(() => {
    setIsEditorOpen(true);
  }, []);

  // Close editor
  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
  }, []);

  // Save avatar configuration (called when editor saves)
  const saveAvatar = useCallback((config: AvatarConfig) => {
    setAvatarConfig(config);
    avatarStorage.save(config);
    setIsEditorOpen(false);

    // Emit selection complete event for Phaser to spawn player
    phaserEvents.emit('avatar:selectionComplete', config);
  }, []);

  // Listen for Phaser requesting editor to open
  useEffect(() => {
    const handleOpenEditor = () => {
      setIsEditorOpen(true);
    };

    phaserEvents.on('avatar:openEditor', handleOpenEditor);

    return () => {
      phaserEvents.off('avatar:openEditor', handleOpenEditor);
    };
  }, []);

  return {
    avatarConfig,
    isEditorOpen,
    openEditor,
    closeEditor,
    saveAvatar,
    hasCustomAvatar: avatarStorage.hasSavedAvatar(),
  };
}

export default useAvatar;
