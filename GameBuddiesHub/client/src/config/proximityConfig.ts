/**
 * Proximity Configuration for GatherBuddies Hub
 *
 * Defines distance thresholds for video/audio connections.
 * Used by useProximityVideo hook for auto-connect logic.
 */

// Tile size in pixels (should match Phaser tilemap)
export const TILE_SIZE = 32;

/**
 * Proximity ranges in tiles.
 * These define when video/audio connections are made/dropped.
 */
export const PROXIMITY = {
  /** Start a private conversation when within this range (requires 750ms) */
  CONVERSATION_START: 2,

  /** Full video/audio (100% volume) */
  VIDEO_FULL: 5,

  /** Fading video/audio (gradual volume decrease) */
  VIDEO_FADE: 12,

  /** No video connection beyond this distance */
  VIDEO_OFF: 20,

  /** Show chat bubbles within this range */
  CHAT_BUBBLE: 15,

  /** Show name tags within this range */
  NAME_TAG: 25,
} as const;

/**
 * Calculate Euclidean distance between two players in tiles.
 * @param x1 Player 1 X position (pixels)
 * @param y1 Player 1 Y position (pixels)
 * @param x2 Player 2 X position (pixels)
 * @param y2 Player 2 Y position (pixels)
 * @returns Distance in tiles
 */
export function calculateDistanceInTiles(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = (x1 - x2) / TILE_SIZE;
  const dy = (y1 - y2) / TILE_SIZE;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate volume based on distance.
 * Returns 1.0 at VIDEO_FULL range, fades to 0.0 at VIDEO_OFF range.
 * @param distanceInTiles Distance between players in tiles
 * @returns Volume level between 0.0 and 1.0
 */
export function calculateVolumeByDistance(distanceInTiles: number): number {
  if (distanceInTiles <= PROXIMITY.VIDEO_FULL) {
    return 1.0;
  }
  if (distanceInTiles >= PROXIMITY.VIDEO_OFF) {
    return 0.0;
  }
  // Linear fade between VIDEO_FULL and VIDEO_OFF
  const fadeRange = PROXIMITY.VIDEO_OFF - PROXIMITY.VIDEO_FULL;
  const distanceIntoFade = distanceInTiles - PROXIMITY.VIDEO_FULL;
  return 1.0 - distanceIntoFade / fadeRange;
}

/**
 * Determine if two players should have a video connection.
 * @param distanceInTiles Distance between players in tiles
 * @returns true if within VIDEO_OFF range
 */
export function shouldConnect(distanceInTiles: number): boolean {
  return distanceInTiles < PROXIMITY.VIDEO_OFF;
}
