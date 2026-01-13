# Phase 2: Social Features - Research

**Researched:** 2026-01-13
**Domain:** WebRTC proximity video/voice chat with conversation locking
**Confidence:** HIGH

<research_summary>
## Summary

Researched proximity-based video chat for 2D virtual worlds, focusing on conversation locking mechanics, ambient vs private audio isolation, and WebRTC integration patterns.

**Two viable approaches exist:**
1. **PeerJS (SkyOffice approach)** - Simpler API, proven for this exact use case, but lacks mobile fixes
2. **Native WebRTC (GameBuddiesTemplate approach)** - More complex, but has TURN servers, iOS fixes, device selection, virtual backgrounds

**Key finding:** SkyOffice proves PeerJS works for proximity video in Phaser. However, it has NO TURN configuration (mobile cellular will fail) and NO H.264 codec preference (iOS issues). The GameBuddiesTemplate has all these fixes but with 5x more code.

**Recommended approach: Hybrid**
- Use SkyOffice's **proximity detection pattern** (Phaser physics overlap, 750ms debounce)
- Use SkyOffice's **video display approach** (grid layout, not filmstrip)
- Keep GameBuddiesTemplate's **WebRTC infrastructure** (TURN servers, iOS fixes, device selection)
- Add new **conversation management layer** (locking, audio isolation)

The main new work is conversation-layer logic, which is the same effort regardless of WebRTC library choice.

</research_summary>

<library_comparison>
## PeerJS vs Native WebRTC: Honest Comparison

### Code Complexity

| Aspect | SkyOffice (PeerJS) | GameBuddiesTemplate (Native) |
|--------|-------------------|------------------------------|
| **Lines of WebRTC code** | 166 lines | 819 lines (5x more) |
| **Connection API** | `myPeer.call(peerId, stream)` | createOffer → setLocalDescription → emit → handleAnswer... |
| **Signaling** | Built-in PeerServer | Custom Socket.IO handlers |
| **Learning curve** | Lower | Higher |

### Feature Comparison

| Feature | PeerJS (SkyOffice) | Native (Template) | Impact |
|---------|-------------------|-------------------|--------|
| **TURN servers** | None configured | Metered.ca configured | **Mobile cellular FAILS without TURN** |
| **H.264 codec preference** | None | Yes | **iOS Safari may fail without this** |
| **Device selection** | None | Full support | Can't switch camera/mic mid-call |
| **Virtual backgrounds** | None | MediaPipe integrated | No blur/image backgrounds |
| **Mobile constraints** | `video: true` | 480x360 @ 15fps | May request too high resolution |
| **Connection diagnostics** | Basic | Full ICE/connection logging | Harder to debug issues |
| **Two-stage privacy flow** | None | Preview before joining | No preview modal |

### SkyOffice PeerJS Implementation (166 lines)
```typescript
// Simple - entire connection in one line
this.myPeer = new Peer(sanitizedId)  // NO ICE server config!
const call = this.myPeer.call(sanitizedId, this.myStream)
```

### GameBuddiesTemplate Native Implementation (819 lines)
```typescript
// Complex but configurable
const pc = new RTCPeerConnection({
  iceServers: getICEServers(),  // Google STUN + Metered.ca TURN
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle'
});
setH264CodecPreference(pc, peerId);  // iOS fix
addEnhancedDiagnostics(pc, peerId);  // Debug logging
// ... 20+ more lines for offer/answer/ICE handling
```

### The Critical Mobile Issue

SkyOffice's PeerJS has **zero TURN configuration**:
```typescript
// SkyOffice - relies on PeerJS defaults (STUN only)
this.myPeer = new Peer(sanitizedId)
```

Without TURN, connections behind symmetric NAT (most cellular networks) **will fail**.

### When to Choose Each

| Choose PeerJS if... | Choose Native WebRTC if... |
|---------------------|---------------------------|
| Prototyping/MVP | Production with mobile users |
| Desktop-only app | Cross-platform (mobile + desktop) |
| Simplicity is priority | Features matter (device selection, virtual bg) |
| You'll add ICE servers yourself | You want it already configured |

### If You Want PeerJS with Mobile Support

You CAN add ICE servers to PeerJS:
```typescript
this.myPeer = new Peer(sanitizedId, {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:a.relay.metered.ca:80', username, credential },
      { urls: 'turns:a.relay.metered.ca:443?transport=tcp', username, credential }
    ]
  }
})
```

But you'd still need to:
- Port H.264 codec preference (tricky with PeerJS)
- Reimplement device selection
- Give up virtual backgrounds
- Set up PeerServer or use their cloud

### Recommendation

**Keep Native WebRTC** because:
1. Mobile reliability matters for a social platform
2. The infrastructure is already built and tested
3. Socket.IO is already running (no need for PeerServer)
4. Features (device selection, virtual backgrounds) are valuable

**Take from SkyOffice:**
1. Proximity detection pattern (Phaser physics overlap)
2. Video display approach (grid layout)
3. Connection lifecycle pattern (connected flag, 750ms buffer)

</library_comparison>

<standard_stack>
## Standard Stack

### Core (Already Available)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native RTCPeerConnection | Browser API | WebRTC peer connections | Has TURN/iOS fixes, already built |
| Socket.IO | 4.x | Signaling server | Already used for room management on port 3001 |
| Colyseus | 0.15.x | 2D world state sync | Already integrated on port 3002 |
| Phaser 3 | 3.70.x | Game engine + physics | Already integrated in Hub client |
| Web Audio API | Browser API | Spatial audio, gain control | Native API for audio routing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MediaPipe Selfie Segmenter | Latest | Virtual backgrounds | Already in virtualBackgroundService.ts |
| zustand | 4.x | State management | Already used in template |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native WebRTC | PeerJS | PeerJS is 5x simpler but needs ICE config added for mobile; lose device selection, virtual bg |
| Socket.IO signaling | PeerJS Server | Adds another server to run; Socket.IO already handles this |
| SFU (LiveKit) | P2P | SFU better for 10+ simultaneous; P2P fine for small conversation groups (2-6) |

### Already Have (Don't Rebuild)
- **STUN/TURN configuration:** webrtcMobileFixes.ts (Google STUN + Metered.ca TURN)
- **H.264 codec preference:** setH264CodecPreference() for iOS
- **Device selection:** WebRTCContext methods
- **Virtual backgrounds:** virtualBackgroundService.ts (MediaPipe)

**No new packages required** - leverage existing infrastructure.

</standard_stack>

<video_display>
## Video Display in Phaser

**Important:** Neither SkyOffice nor GameBuddiesTemplate renders video INSIDE the Phaser WebGL canvas. Both use HTML `<video>` elements positioned near/over the game. This is standard - you cannot render a MediaStream directly in WebGL.

### SkyOffice Approach (Recommended per CONTEXT.md)
```typescript
// Videos in a DOM element, positioned over/beside the game
private videoGrid = document.querySelector('.video-grid')
this.videoGrid.append(video)
```

### Display Options (All Work with Either WebRTC Approach)

| Option | Description | When to Use |
|--------|-------------|-------------|
| **Grid panel** | Videos in side panel (SkyOffice style) | Default, clean layout |
| **Avatar-positioned** | HTML overlay positioned via Phaser coordinates | Immersive, but complex |
| **Speech bubble** | Video appears above avatar head | When in conversation |
| **Picture-in-picture** | Small videos in corner | Minimal UI |

The display approach is **independent of WebRTC library choice**.

</video_display>

<architecture_patterns>
## Architecture Patterns

### Recommended Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                     Architecture                                 │
├─────────────────────────────────────────────────────────────────┤
│  Proximity Detection    │  WebRTC Connections   │  Video Display │
│  (from SkyOffice)       │  (from Template)      │  (SkyOffice)   │
├─────────────────────────┼───────────────────────┼────────────────┤
│  Phaser physics overlap │  Native RTCPeerConn   │  .video-grid   │
│  750ms debounce         │  STUN + TURN config   │  positioned    │
│  playerId comparison    │  H.264 for iOS        │  over game     │
│  connected flag         │  Device selection     │                │
│                         │  Virtual backgrounds  │                │
└─────────────────────────┴───────────────────────┴────────────────┘

Audio Routing (Web Audio API)
├── MediaStream → AudioSourceNode → GainNode → destination
├── Gain = 0 for isolated conversations (muted ambient)
├── Gain = 1 for ambient audio (not in conversation)
└── Spatial panning for distance-based volume
```

### Pattern 1: Proximity Detection (from SkyOffice)
**What:** Use Phaser physics overlap to detect when players are near each other
**When to use:** Every frame update to check player distances
**Example:**
```typescript
// Source: SkyOffice/client/src/scenes/Game.ts
this.physics.add.overlap(
  this.myPlayer,
  this.otherPlayers,
  this.handlePlayersOverlap,
  undefined,
  this
)

// In OtherPlayer - connection buffer prevents jitter
private connectionBufferTime = 750 // ms debounce

makeCall(myPlayer: MyPlayer, webRTC: WebRTC) {
  if (
    !this.connected &&
    this.connectionBufferTime >= 750 &&
    myPlayer.readyToConnect &&
    this.readyToConnect &&
    myPlayerId > this.playerId  // Only one direction initiates
  ) {
    webRTC.connectToNewUser(this.playerId)
    this.connected = true
  }
}
```

### Pattern 2: Conversation Locking State
**What:** Track which players are in which conversations, handle join requests
**When to use:** When extending simple 1:1 proximity to group conversations
**Example:**
```typescript
// Conversation state schema (extend HubState)
interface Conversation {
  id: string
  participants: Set<string>  // Player IDs
  locked: boolean            // Accepting new members?
}

// Server maintains conversation state
// When player approaches locked conversation:
// - Show "Press E to request join" UI
// - Broadcast request to conversation participants
// - Participants vote or host approves
```

### Pattern 3: Audio Isolation via Web Audio API
**What:** Route audio through gain nodes to mute/unmute based on conversation state
**When to use:** To isolate private conversations from ambient audio
**Example:**
```typescript
// Source: LiveKit spatial audio tutorial
const audioContext = new AudioContext()

function routeAudioStream(stream: MediaStream, isInMyConversation: boolean) {
  const source = audioContext.createMediaStreamSource(stream)
  const gainNode = audioContext.createGain()

  // In same conversation = full volume, otherwise muted
  gainNode.gain.value = isInMyConversation ? 1.0 : 0.0

  source.connect(gainNode)
  gainNode.connect(audioContext.destination)

  return { source, gainNode }
}

// Update when conversation state changes
function updateAudioRouting(playerId: string, isNowInMyConversation: boolean) {
  const node = audioNodes.get(playerId)
  if (node) {
    node.gainNode.gain.setTargetAtTime(
      isNowInMyConversation ? 1.0 : 0.0,
      audioContext.currentTime,
      0.1  // Smooth transition
    )
  }
}
```

### Pattern 4: Visual Conversation Indicators
**What:** Draw circles/lines around players in same conversation with lock icon
**When to use:** Phaser scene update loop
**Example:**
```typescript
// In Game.ts update() or dedicated system
function drawConversationIndicators() {
  conversations.forEach(conv => {
    if (conv.participants.size < 2) return

    // Draw connecting line between participants
    const positions = [...conv.participants].map(id => players.get(id).position)
    graphics.lineStyle(2, 0x4CAF50, 0.5)  // Green, semi-transparent
    // Draw polygon or circle encompassing participants

    // Draw lock icon if conversation is locked
    if (conv.locked) {
      lockIcon.setPosition(centerX, centerY - 20)
      lockIcon.setVisible(true)
    }
  })
}
```

### Anti-Patterns to Avoid
- **Creating new AudioContext per stream:** Use single shared context
- **Polling for proximity:** Use physics overlap events instead
- **Trusting client for conversation state:** Server should be authoritative
- **Using PeerJS without ICE config:** Mobile will fail - add TURN servers if using PeerJS

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebRTC peer connections | Custom signaling from scratch | Existing WebRTCContext | Already handles ICE, STUN/TURN, codec preferences |
| STUN/TURN configuration | Manual ICE server setup | webrtcMobileFixes.ts | Already has Google STUN + Metered.ca TURN |
| Proximity detection | Custom distance loops | Phaser physics.add.overlap | Engine handles it efficiently |
| Audio spatial positioning | Manual gain calculations | Web Audio API PannerNode/GainNode | Native API handles math correctly |
| H.264 codec preference | Custom SDP munging | setH264CodecPreference() | Already in codebase for iOS |
| Device selection UI | Custom device enumeration | WebRTCContext methods | Already has device switching |
| Virtual backgrounds | TensorFlow.js segmentation | virtualBackgroundService.ts | Already using MediaPipe |

**Key insight:** The new work is conversation-layer logic (grouping, locking, audio routing). The WebRTC plumbing is already solved - either by the template (native) or by PeerJS (with added ICE config).

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Connection Jitter
**What goes wrong:** Players rapidly connect/disconnect when walking near boundary
**Why it happens:** No debounce on proximity detection
**How to avoid:** Use connection buffer time (750ms like SkyOffice) before connecting/disconnecting
**Warning signs:** Flickering video, rapid connect/disconnect logs

### Pitfall 2: Duplicate Connections
**What goes wrong:** Both players try to initiate connection simultaneously
**Why it happens:** No coordination on who initiates
**How to avoid:** Use player ID comparison - only smaller ID initiates (existing pattern in both SkyOffice and template)
**Warning signs:** Two video streams for same player, echo

### Pitfall 3: Mobile Connectivity Issues
**What goes wrong:** Connections fail on cellular networks
**Why it happens:** Symmetric NAT requires TURN relay
**How to avoid:** Ensure TURN server configured (Metered.ca in template, add manually if using PeerJS)
**Warning signs:** Works on WiFi, fails on 4G/5G

### Pitfall 4: iOS Video Issues
**What goes wrong:** Video doesn't work on iPhone/iPad Safari
**Why it happens:** iOS only supports H.264 codec, not VP8/VP9
**How to avoid:** Use setH264CodecPreference() from template (harder with PeerJS)
**Warning signs:** Works on Android/desktop, fails on iOS

### Pitfall 5: Audio Feedback/Echo
**What goes wrong:** Players hear themselves echoed back
**Why it happens:** Local stream not muted, or gain routing wrong
**How to avoid:** Always mute local audio element, use Web Audio for remote streams only
**Warning signs:** Echo when speaking, audio feedback loop

### Pitfall 6: Conversation State Desync
**What goes wrong:** Players see different conversation membership
**Why it happens:** Client-side conversation state without server authority
**How to avoid:** Server (Colyseus HubRoom) is authoritative for conversation state
**Warning signs:** Player A sees B in conversation, B doesn't see themselves

### Pitfall 7: Memory Leaks from Audio Nodes
**What goes wrong:** Performance degrades over time
**Why it happens:** AudioNodes not disconnected when players leave
**How to avoid:** Explicitly disconnect() and remove references when player disconnects
**Warning signs:** Growing memory usage, audio crackling

</common_pitfalls>

<code_examples>
## Code Examples

### Proximity Detection Setup (from SkyOffice)
```typescript
// Source: SkyOffice Game.ts
// Add in Phaser scene create()
this.physics.add.overlap(
  this.myPlayer,
  this.otherPlayerGroup,
  this.handlePlayersOverlap,
  undefined,
  this
)

private handlePlayersOverlap(
  myPlayer: Phaser.Physics.Arcade.Sprite,
  otherPlayer: OtherPlayer
) {
  // Check if we should start a connection
  otherPlayer.checkProximityConnection(this.myPlayer, this.network)
}
```

### Web Audio Routing for Conversation Isolation
```typescript
// Source: Adapted from LiveKit spatial audio tutorial
class ConversationAudioRouter {
  private audioContext = new AudioContext()
  private audioNodes = new Map<string, { source: MediaStreamAudioSourceNode, gain: GainNode }>()

  attachStream(playerId: string, stream: MediaStream, isInMyConversation: boolean) {
    const source = this.audioContext.createMediaStreamSource(stream)
    const gain = this.audioContext.createGain()

    gain.gain.value = isInMyConversation ? 1.0 : 0.0

    source.connect(gain)
    gain.connect(this.audioContext.destination)

    this.audioNodes.set(playerId, { source, gain })
  }

  updateConversationMembership(playerId: string, isNowInMyConversation: boolean) {
    const nodes = this.audioNodes.get(playerId)
    if (nodes) {
      // Smooth transition to avoid clicks
      nodes.gain.gain.setTargetAtTime(
        isNowInMyConversation ? 1.0 : 0.0,
        this.audioContext.currentTime,
        0.1
      )
    }
  }

  removeStream(playerId: string) {
    const nodes = this.audioNodes.get(playerId)
    if (nodes) {
      nodes.source.disconnect()
      nodes.gain.disconnect()
      this.audioNodes.delete(playerId)
    }
  }
}
```

### Conversation State Schema (Colyseus)
```typescript
// Extend existing HubState.ts
import { Schema, type, MapSchema, SetSchema } from '@colyseus/schema'

class Conversation extends Schema {
  @type('string') id: string
  @type({ set: 'string' }) participants = new SetSchema<string>()
  @type('boolean') locked: boolean = false
  @type('string') hostId: string  // Who can accept join requests
}

class HubState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
  @type({ map: Conversation }) conversations = new MapSchema<Conversation>()
}
```

### Join Request Flow
```typescript
// Client sends
socket.emit('conversation:request-join', { conversationId })

// Server broadcasts to conversation participants
this.broadcast('conversation:join-requested', {
  requesterId,
  requesterName,
  conversationId
}, { except: requester })

// Host/participant approves
socket.emit('conversation:approve-join', { conversationId, requesterId })

// Server adds to conversation, broadcasts update
conversation.participants.add(requesterId)
this.broadcast('conversation:member-added', { conversationId, playerId: requesterId })
```

### PeerJS with ICE Servers (if you choose PeerJS)
```typescript
// Source: PeerJS docs + template ICE config
import Peer from 'peerjs'

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:a.relay.metered.ca:80', username: TURN_USERNAME, credential: TURN_PASSWORD },
  { urls: 'turn:a.relay.metered.ca:443', username: TURN_USERNAME, credential: TURN_PASSWORD },
  { urls: 'turns:a.relay.metered.ca:443?transport=tcp', username: TURN_USERNAME, credential: TURN_PASSWORD }
]

this.myPeer = new Peer(sanitizedId, {
  config: { iceServers }
})
```

</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PeerJS for everything | Either works, but add TURN | Always | Mobile cellular requires TURN regardless of library |
| Google STUN only | STUN + TURN required | Always | Symmetric NAT breaks STUN-only |
| Synchronous audio routing | Web Audio API nodes | 2024+ | Better isolation, spatial audio possible |
| Client-authoritative conversation | Server-authoritative | Best practice | Prevents desync and cheating |

**Both approaches are valid:**
- **PeerJS:** Simpler, but manually add ICE servers for mobile
- **Native WebRTC:** More code, but template has it built already

**New tools/patterns to consider:**
- **Insertable Streams API:** For custom audio processing (not needed here)
- **Web Audio Worklet:** For low-latency processing (overkill for this use case)
- **Spatial audio with PannerNode:** Could enhance ambient audio with distance-based volume

**Deprecated/outdated:**
- **SimpleWebRTC:** Unmaintained, don't use
- **Client-side conversation state:** Server should be authoritative
- **STUN-only configuration:** Always include TURN for production

</sota_updates>

<open_questions>
## Open Questions

1. **Conversation size limits?**
   - What we know: P2P mesh works for 2-4 peers, beyond needs SFU
   - What's unclear: How many players can be in one conversation?
   - Recommendation: Limit to 4-6 players per conversation for P2P mesh reliability

2. **Ambient audio behavior?**
   - What we know: Players NOT in conversation should hear "ambient" room
   - What's unclear: Should ambient be all other conversations (cacophony) or just proximity-based volume?
   - Recommendation: Distance-based gain for non-conversation players (closer = louder)

3. **Join request UX?**
   - What we know: Press E to request joining locked conversation
   - What's unclear: Does host approve? All participants vote? Auto-approve?
   - Recommendation: Single host approval (first person who started conversation)

</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- SkyOffice codebase - Working Phaser proximity + PeerJS (166 lines, simple but no mobile fixes)
- GameBuddiesTemplate codebase - Production WebRTCContext (819 lines, STUN/TURN, iOS fixes, device selection)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics) - Spatialization basics
- [LiveKit Spatial Audio Tutorial](https://blog.livekit.io/tutorial-using-webrtc-react-webaudio-to-create-spatial-audio/) - PannerNode + WebRTC integration

### Secondary (MEDIUM confidence)
- [WebRTC Best Practices: STUN/TURN/ICE](https://medium.com/@ecosmobtechnologies/webrtc-best-practices-understanding-stun-turn-and-ice-servers-4836109904ec) - ICE configuration patterns
- [WebRTC.ventures Self-Hosted TURN](https://webrtc.ventures/2025/01/how-to-set-up-self-hosted-stun-turn-servers-for-webrtc-applications/) - TURN server setup
- [npm trends: PeerJS vs simple-peer](https://npmtrends.com/easyrtc-vs-peerjs-vs-simple-peer-vs-simplewebrtc) - Library comparison
- [BlogGeek WebRTC Gaming](https://bloggeek.me/webrtc-gaming/) - WebRTC in games overview
- [PeerJS Documentation](https://peerjs.com/) - Official PeerJS docs

### Tertiary (LOW confidence - needs validation)
- SFU scalability claims (validated for 10+ participants, but we're doing small groups)

</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: WebRTC (PeerJS vs Native comparison), Web Audio API
- Ecosystem: Existing GameBuddiesTemplate infrastructure, SkyOffice patterns
- Patterns: Proximity detection, conversation locking, audio isolation
- Pitfalls: Connection jitter, duplicates, mobile, iOS, echo, state desync

**Confidence breakdown:**
- Library comparison: HIGH - Both codebases analyzed in detail
- Standard stack: HIGH - Using existing tested infrastructure
- Architecture: HIGH - SkyOffice provides working reference, Web Audio well documented
- Pitfalls: HIGH - Common issues documented in multiple sources
- Code examples: HIGH - Derived from working codebase + official docs

**Research date:** 2026-01-13
**Valid until:** 2026-02-13 (30 days - WebRTC stable, patterns well established)

</metadata>

---

*Phase: 2-social-features*
*Research completed: 2026-01-13*
*Ready for planning: yes*
