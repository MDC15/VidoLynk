## 2026-04-13 - [Hardware Permission Loading State]
**Learning:** In WebRTC applications, the time between clicking "Join" and actually entering a room can be significant due to the browser prompting for camera/microphone permissions. Without immediate visual feedback (like a loading button state), users may double-click or think the app is frozen.
**Action:** Always implement an immediate "Loading" or "Connecting" state on action buttons that trigger hardware permission requests or heavy async initialization.
