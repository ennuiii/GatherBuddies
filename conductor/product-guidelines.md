# Product Guidelines - ClueScale

## Visual Identity
- **Sketchbook & Party Theme:** The UI should embrace a playful, "hand-drawn" sketchbook aesthetic. This includes doodle-style icons, slightly irregular borders, and informal typography.
- **Party Dark Mode:** Utilize a high-contrast dark theme with vibrant, energetic accent colors (e.g., neon purples, oranges, and greens) to create a lively party atmosphere.
- **Micro-interactions:** Use subtle, bouncy animations (Framer Motion) to enhance the playful feel when interacting with buttons, roles, and scoring updates.

## Voice and Tone
- **Encouraging & Friendly:** Instructions should be welcoming and positive. Use phrases that foster a supportive social environment.
- **Witty & Humorous:** Incorporate lighthearted puns and playful language in the UI text and loading states to maintain a fun, energetic mood.

## User Experience (UX)
- **Desktop Consistency:** Maintain the existing fixed header and sidebar layout for desktop users to ensure familiarity and quick access to game controls.
- **Mobile-Specific Adaptation:**
    - **Focused & Layered:** On mobile, hide secondary information behind accordions or panels to prevent clutter.
    - **Contextual & Adaptive:** Dynamically highlight controls relevant to the player's current role (Clue Giver vs. Guesser).
    - **Responsive Scrolling:** Ensure all containers (especially the settings accordion) respect the mobile viewport height and provide internal scrolling to prevent content cut-off.
    - **Multi-Step Configuration:** For complex sections like Game Settings on mobile, break them down into smaller, sequential steps or grouped sections to reduce vertical scrolling requirements.

## Technical Design Principles
- **Real-time Feedback:** Every player action (joining, guessing, submitted clues) must be reflected instantly via Socket.IO.
- **Graceful Error Handling:** Provide clear, friendly feedback when things go wrong.
- **PWA Optimized:** Ensure the game feels native on mobile devices, with appropriate touch targets and safe-area insets.
