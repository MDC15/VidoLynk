# Palette's UX Journal

## 2026-04-13 - [Hardware Permission Loading State]
**Learning:** In WebRTC applications, the time between clicking "Join" and actually entering a room can be significant due to the browser prompting for camera/microphone permissions. Without immediate visual feedback (like a loading button state), users may double-click or think the app is frozen.
**Action:** Always implement an immediate "Loading" or "Connecting" state on action buttons that trigger hardware permission requests or heavy async initialization.

## 2026-04-17 - Room List Keyboard Accessibility
**Learning:** Interactive elements implemented as list items (`li`) without `tabindex` or `role` are invisible to keyboard-only users and screen readers. Adding `tabindex="0"`, `role="button"`, and handling `keydown` events (Enter/Space) is a baseline requirement for accessibility.
**Action:** Always ensure any non-semantic interactive elements have appropriate ARIA roles and keyboard listeners.
