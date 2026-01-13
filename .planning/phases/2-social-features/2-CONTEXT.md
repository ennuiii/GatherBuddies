# Phase 2: Social Features - Context

**Gathered:** 2026-01-13
**Status:** Ready for planning

<vision>
## How This Should Work

When players walk near each other in the Hub world, video and voice automatically connect. They become "locked" in a private conversation - isolated from ambient room audio. It should feel natural, like walking up to someone at a party.

**Conversation Locking:**
- Two players near each other automatically enter a private conversation
- They can hear and see each other, but NOT ambient room audio
- A visual circle/line is drawn around the avatars with a lock icon
- Other players can see the conversation is happening

**Joining Conversations:**
- Players outside a conversation can press E to request joining
- Players NOT in a conversation can hear ambient room audio
- Walking away breaks the conversation lock

**Video Display:**
- Use SkyOffice's video display approach (NOT the filmstrip)
- Video appears contextually based on conversation state

**Text Chat:**
- Speech bubbles pop up above avatars when they send messages
- Chat panel on the side shows history
- Both work together

**Reference:** Use SkyOffice logic for voice and video implementation.

</vision>

<essential>
## What Must Be Nailed

All three aspects are equally essential - can't ship without all working well:

- **Conversation locking** - Private conversation mechanic with join-to-request
- **Video/voice quality** - Smooth, low-latency audio/video that just works
- **Natural proximity feel** - Walking near someone should feel natural, not jarring

</essential>

<boundaries>
## What's Out of Scope

- **Game launching** - Portal zones and launching games (Phase 3)
- **Advanced avatar customization** - Keep to preset avatars only
- **Screen sharing** - No screen share in conversations for now
- **Filmstrip video display** - Use SkyOffice approach instead

</boundaries>

<specifics>
## Specific Ideas

- Visual indicator: Circle drawn around avatars in conversation with lock icon
- Use SkyOffice's video/voice logic as reference implementation
- Press E to request joining an existing conversation
- Ambient audio audible to players not in conversations
- Conversation participants isolated from ambient audio

</specifics>

<notes>
## Additional Context

The existing GameBuddiesTemplate has WebRTCContext that can be adapted. SkyOffice (in project directory) has working proximity video implementation to reference.

Key architectural note: Socket.IO handles room management (port 3001), Colyseus handles 2D world state (port 3002). Proximity detection likely happens in Phaser/Colyseus, triggers WebRTC connections via Socket.IO signaling.

</notes>

---

*Phase: 2-social-features*
*Context gathered: 2026-01-13*
