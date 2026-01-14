/**
 * AudioVolumeManager
 *
 * Simple volume state manager for remote audio streams.
 * Stores volume values that are read by RemoteAudioPlayer components.
 *
 * Handles:
 * - Proximity-based volume (fades with distance)
 * - Conversation isolation (mute peers in different conversations)
 */

class AudioVolumeManager {
  // Volume for each peer (0.0 to 1.0)
  private peerVolumes = new Map<string, number>();

  // My current conversation ID (empty string = not in conversation)
  private myConversationId: string = '';

  // Peer conversation IDs
  private peerConversations = new Map<string, string>();

  /**
   * Set volume for a peer based on proximity.
   * Will be overridden to 0 if peer is in a different conversation.
   */
  setProximityVolume(peerId: string, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    // If I'm in a conversation, check if this peer should be muted
    if (this.myConversationId !== '') {
      const peerConversation = this.peerConversations.get(peerId) || '';

      if (peerConversation !== this.myConversationId) {
        // Peer is not in my conversation - mute them
        this.peerVolumes.set(peerId, 0);
        return;
      }
      // Peer is in my conversation - use full volume
      this.peerVolumes.set(peerId, 1.0);
      return;
    }

    // Not in conversation - use proximity-based volume
    this.peerVolumes.set(peerId, clampedVolume);
  }

  /**
   * Get the current volume for a peer.
   * Returns 1.0 if no volume has been set (default audible).
   */
  getVolume(peerId: string): number {
    return this.peerVolumes.get(peerId) ?? 1.0;
  }

  /**
   * Set my conversation ID.
   * When in a conversation, only peers in the same conversation are audible.
   */
  setMyConversation(conversationId: string): void {
    this.myConversationId = conversationId;
    console.log(`[AudioVolumeManager] My conversation: ${conversationId || 'none'}`);

    // Recalculate all peer volumes based on new conversation state
    this.recalculateAllVolumes();
  }

  /**
   * Update a peer's conversation ID.
   */
  setPeerConversation(peerId: string, conversationId: string): void {
    this.peerConversations.set(peerId, conversationId);

    // Recalculate this peer's volume
    const currentVolume = this.peerVolumes.get(peerId) ?? 1.0;
    this.setProximityVolume(peerId, currentVolume);
  }

  /**
   * Recalculate volumes for all peers based on current conversation state.
   */
  private recalculateAllVolumes(): void {
    for (const [peerId, volume] of this.peerVolumes.entries()) {
      this.setProximityVolume(peerId, volume);
    }
  }

  /**
   * Remove a peer when they disconnect.
   */
  removePeer(peerId: string): void {
    this.peerVolumes.delete(peerId);
    this.peerConversations.delete(peerId);
    console.log(`[AudioVolumeManager] Removed peer ${peerId.slice(0, 8)}`);
  }

  /**
   * Check if we're currently in a conversation.
   */
  isInConversation(): boolean {
    return this.myConversationId !== '';
  }

  /**
   * Debug: Log current state
   */
  debugState(): void {
    console.log('[AudioVolumeManager] Debug State:', {
      myConversation: this.myConversationId || 'none',
      peerVolumes: Object.fromEntries(
        [...this.peerVolumes.entries()].map(([k, v]) => [k.slice(0, 8), v.toFixed(2)])
      ),
      peerConversations: Object.fromEntries(
        [...this.peerConversations.entries()].map(([k, v]) => [k.slice(0, 8), v.slice(0, 8) || 'none'])
      ),
    });
  }
}

// Singleton instance
export const audioVolumeManager = new AudioVolumeManager();
