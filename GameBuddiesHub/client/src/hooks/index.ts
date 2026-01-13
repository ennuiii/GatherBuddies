/**
 * Hooks Index
 *
 * Central export for all custom hooks.
 */

// Main game client hook
export { useGameBuddiesClient } from './useGameBuddiesClient';
export type {
  UseGameBuddiesClientOptions,
  UseGameBuddiesClientResult,
  RegisterGameEventsHelpers,
} from './useGameBuddiesClient';

// Device detection hooks
export { useIsMobile, useDeviceType, useOrientation, useHasTouch } from './useIsMobile';

// Mobile navigation hook
export { useMobileNavigation } from './useMobileNavigation';
export type { DrawerContent } from './useMobileNavigation';

// Video hooks
export { useVideoKeyboardShortcuts } from './useVideoKeyboardShortcuts';
export {
  useVideoPreferences,
  getPopupLayoutPreference,
  savePopupLayoutPreference,
} from './useVideoPreferences';

// Mobile keyboard hook
export { useKeyboardHeight } from './useKeyboardHeight';

// Audio hooks
export { useTypewriterSound } from './useTypewriterSound';

// Proximity video hook
export { useProximityVideo } from './useProximityVideo';

// Conversation video hook
export { useConversationVideo } from './useConversationVideo';

// Desktop scaling hook
export {
  useDesktopScale,
  getScaleWrapperStyle,
  DESIGN_WIDTH,
  MIN_SCALE,
  MAX_SCALE,
  DESKTOP_BREAKPOINT,
} from './useDesktopScale';
export type { ScaleInfo } from './useDesktopScale';
