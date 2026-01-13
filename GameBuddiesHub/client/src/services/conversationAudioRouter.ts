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
      console.warn('[AudioRouter] Not initialized');
      return;
    }

    // Remove existing if re-attaching
    this.removeStream(playerId);

    const source = this.audioContext.createMediaStreamSource(stream);
    const gain = this.audioContext.createGain();

    // Set initial gain based on conversation membership
    const isInMyConversation =
      this.myConversationId !== '' &&
      playerConversationId === this.myConversationId;

    gain.gain.value = isInMyConversation ? 1.0 : 0.0;

    source.connect(gain);
    gain.connect(this.audioContext.destination);

    this.audioNodes.set(playerId, { source, gain });

    console.log(`[AudioRouter] Attached stream for ${playerId}, gain=${gain.gain.value}`);
  }

  // Update when conversation membership changes
  updateConversationMembership(
    playerId: string,
    playerConversationId: string
  ): void {
    const nodes = this.audioNodes.get(playerId);
    if (!nodes || !this.audioContext) return;

    const isInMyConversation =
      this.myConversationId !== '' &&
      playerConversationId === this.myConversationId;

    const targetGain = isInMyConversation ? 1.0 : 0.0;

    // Smooth transition to avoid clicks
    nodes.gain.gain.setTargetAtTime(
      targetGain,
      this.audioContext.currentTime,
      0.1 // 100ms time constant
    );

    console.log(`[AudioRouter] Updated ${playerId} gain to ${targetGain}`);
  }

  // Update my conversation ID (call when local player joins/leaves conversation)
  setMyConversation(conversationId: string): void {
    this.myConversationId = conversationId;

    // Update all streams based on new conversation state
    // (Caller should provide updated player conversation IDs)
    console.log(`[AudioRouter] My conversation set to: ${conversationId || 'none'}`);
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
    this.audioNodes.forEach((nodes, playerId) => {
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
