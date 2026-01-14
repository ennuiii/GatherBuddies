/**
 * ConversationAudioRouter
 *
 * Routes remote audio streams through gain nodes for conversation isolation.
 * Players in the same conversation hear each other at full volume.
 * Players outside conversations hear ambient audio (or muted based on config).
 */

interface AudioNodes {
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
}

class ConversationAudioRouter {
  private audioContext: AudioContext | null = null;
  private audioNodes = new Map<string, AudioNodes>();
  private myConversationId: string = '';

  // Initialize AudioContext (call on user gesture)
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext();

    // Resume if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('[AudioRouter] Initialized');
  }

  // Attach a remote stream for audio routing
  attachStream(
    playerId: string,
    stream: MediaStream,
    playerConversationId: string
  ): void {
    if (!this.audioContext) {
      console.warn('[AudioRouter] Not initialized, attempting to initialize...');
      // Try to initialize - will fail if no user gesture yet
      this.initialize().then(() => {
        this.attachStream(playerId, stream, playerConversationId);
      }).catch(err => {
        console.error('[AudioRouter] Failed to initialize:', err);
      });
      return;
    }

    // Remove existing if re-attaching
    this.removeStream(playerId);

    // Debug: Check stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    console.log(`[AudioRouter] Stream for ${playerId.slice(0, 8)} has ${audioTracks.length} audio tracks:`,
      audioTracks.map(t => ({ id: t.id.slice(0, 8), enabled: t.enabled, muted: t.muted, readyState: t.readyState })));

    if (audioTracks.length === 0) {
      console.warn(`[AudioRouter] No audio tracks in stream for ${playerId.slice(0, 8)}!`);
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    const gain = this.audioContext.createGain();

    // Set initial gain:
    // Always start at 1.0 (audible) - this prevents timing issues where:
    // - We're in a conversation but peer's conversationId hasn't synced yet
    // - updateConversationMembership() will correct the gain once state syncs
    // This is safer than starting muted and potentially never hearing someone
    let initialGain = 1.0;

    // Only mute if we're certain the peer is NOT in our conversation
    if (this.myConversationId !== '' && playerConversationId !== '' && playerConversationId !== this.myConversationId) {
      // I'm in a conversation AND peer is in a DIFFERENT conversation - mute them
      initialGain = 0.0;
      console.log(`[AudioRouter] Peer ${playerId.slice(0, 8)} is in different conversation (${playerConversationId.slice(0, 8)}), muting`);
    }

    gain.gain.value = initialGain;

    source.connect(gain);
    gain.connect(this.audioContext.destination);

    this.audioNodes.set(playerId, { source, gain });

    console.log(`[AudioRouter] ✅ Attached stream for ${playerId.slice(0, 8)}, gain=${initialGain}, audioContext.state=${this.audioContext.state}, myConversation=${this.myConversationId || 'none'}`);
  }

  // Update when conversation membership changes
  updateConversationMembership(
    playerId: string,
    playerConversationId: string
  ): void {
    const nodes = this.audioNodes.get(playerId);
    if (!nodes || !this.audioContext) return;

    let targetGain: number;

    if (this.myConversationId === '') {
      // I'm NOT in a conversation - proximity mode
      // Let everyone be audible (proximity volume will adjust based on distance)
      targetGain = 1.0;
    } else if (playerConversationId === this.myConversationId) {
      // I'm in a conversation AND peer is in SAME conversation - full volume
      targetGain = 1.0;
    } else {
      // I'm in a conversation AND peer is NOT in my conversation - mute
      targetGain = 0.0;
    }

    // Smooth transition to avoid clicks
    nodes.gain.gain.setTargetAtTime(
      targetGain,
      this.audioContext.currentTime,
      0.1 // 100ms time constant
    );

    console.log(`[AudioRouter] Updated ${playerId.slice(0, 8)} gain to ${targetGain} (myConv: ${this.myConversationId.slice(0, 8) || 'none'}, peerConv: ${playerConversationId.slice(0, 8) || 'none'})`);
  }

  // Update my conversation ID (call when local player joins/leaves conversation)
  setMyConversation(conversationId: string): void {
    this.myConversationId = conversationId;

    // Update all streams based on new conversation state
    // (Caller should provide updated player conversation IDs)
    console.log(`[AudioRouter] My conversation set to: ${conversationId || 'none'}`);
  }

  /**
   * Set volume for a player based on proximity distance.
   * Used when NOT in a conversation for proximity-based audio.
   * @param playerId The player's session ID
   * @param volume Volume between 0.0 and 1.0
   */
  setProximityVolume(playerId: string, volume: number): void {
    const nodes = this.audioNodes.get(playerId);
    if (!nodes || !this.audioContext) {
      // Only log occasionally to avoid spam
      return;
    }

    // Only apply proximity volume if NOT in a conversation
    if (this.myConversationId !== '') {
      // In conversation mode - ignore proximity volume
      return;
    }

    // Clamp volume to [0, 1]
    const clampedVolume = Math.max(0, Math.min(1, volume));

    // Get current gain value for debug comparison
    const currentGain = nodes.gain.gain.value;

    // Smooth transition to avoid clicks
    nodes.gain.gain.setTargetAtTime(
      clampedVolume,
      this.audioContext.currentTime,
      0.05 // 50ms time constant for smoother proximity changes
    );

    // Debug: Log significant volume changes
    if (Math.abs(currentGain - clampedVolume) > 0.1) {
      console.log(`[AudioRouter] 🔊 Volume for ${playerId.slice(0, 8)}: ${currentGain.toFixed(2)} → ${clampedVolume.toFixed(2)}`);
    }
  }

  /**
   * Debug method to check current audio state
   */
  debugState(): void {
    console.log('[AudioRouter] Debug State:', {
      audioContextState: this.audioContext?.state || 'not initialized',
      myConversation: this.myConversationId || 'none',
      connectedPeers: [...this.audioNodes.keys()].map(k => k.slice(0, 8)),
      peerCount: this.audioNodes.size
    });
  }

  /**
   * Check if we're currently in a conversation.
   * Proximity volume should be ignored when in conversation.
   */
  isInConversation(): boolean {
    return this.myConversationId !== '';
  }

  // Remove stream when player disconnects
  removeStream(playerId: string): void {
    const nodes = this.audioNodes.get(playerId);
    if (nodes) {
      nodes.source.disconnect();
      nodes.gain.disconnect();
      this.audioNodes.delete(playerId);
      console.log(`[AudioRouter] Removed stream for ${playerId}`);
    }
  }

  // Cleanup all
  dispose(): void {
    this.audioNodes.forEach((nodes) => {
      nodes.source.disconnect();
      nodes.gain.disconnect();
    });
    this.audioNodes.clear();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('[AudioRouter] Disposed');
  }
}

// Singleton instance
export const conversationAudioRouter = new ConversationAudioRouter();
