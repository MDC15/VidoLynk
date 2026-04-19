# Palette's UX Journal

## 2025-04-11 - [Accessibility and Interaction Polish]
**Learning:** Real-time applications often miss basic accessibility features like ARIA live regions for dynamic updates (room lists, error messages) and keyboard navigation for custom interactive elements (list items as buttons).
**Action:** Always wrap interactive inputs in a `<form>` to support native "Enter" key submission. Use `aria-live="polite"` for dynamic content and ensure custom interactive elements have a proper `tabindex`, `role="button"`, and keyboard event handlers. Provide immediate visual feedback (loading states) for asynchronous operations like camera access.

## 2025-05-14 - Keyboard Accessibility and Screen Reader Improvements for Room Lists
**Learning:** Interactive list items (like the room list) need explicit keyboard support (`tabindex`, `role="button"`, and `keydown` listeners) and visual focus states to be accessible to keyboard-only users. Additionally, dynamic status changes and error messages require ARIA live regions (`aria-live="polite"`) to be announced by screen readers.
**Action:** Always ensure any custom interactive elements are keyboard-navigable and have corresponding ARIA roles and live region attributes for status updates.

## 2025-05-15 - [Improving Room List Accessibility]
**Learning:** Custom interactive elements like `li` room items often lack keyboard support and ARIA roles by default, making them inaccessible to screen readers and keyboard-only users.
**Action:** Always add `role="button"`, `tabindex="0"`, and `aria-label` to interactive list items, and implement a `keydown` listener for 'Enter' and 'Space' keys. Ensure `:focus-visible` styles are provided for clear visual feedback.

## 2026-04-13 - [Hardware Permission Loading State]
**Learning:** In WebRTC applications, the time between clicking "Join" and actually entering a room can be significant due to the browser prompting for camera/microphone permissions. Without immediate visual feedback (like a loading button state), users may double-click or think the app is frozen.
**Action:** Always implement an immediate "Loading" or "Connecting" state on action buttons that trigger hardware permission requests or heavy async initialization.

## 2026-04-14 - [Accessibility and Interaction Feedback in WebRTC]
**Learning:** In WebRTC-based applications, providing immediate visual feedback (like "Connecting...") when hardware permissions (camera/mic) are requested is crucial to prevent user confusion and double-clicking. Additionally, custom interactive elements like room lists in <li> tags must be explicitly made keyboard-accessible using role="button", tabindex="0", and appropriate ARIA labels to ensure a smooth experience for screen reader and keyboard-only users.
**Action:** Always include ARIA live regions for error messages and ensure all custom interactive components support keyboard navigation (Enter/Space) and have visible focus states.

## 2026-04-17 - Room List Keyboard Accessibility
**Learning:** Interactive elements implemented as list items (`li`) without `tabindex` or `role` are invisible to keyboard-only users and screen readers. Adding `tabindex="0"`, `role="button"`, and handling `keydown` events (Enter/Space) is a baseline requirement for accessibility.
**Action:** Always ensure any non-semantic interactive elements have appropriate ARIA roles and keyboard listeners.
