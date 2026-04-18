## 2025-05-14 - Keyboard Accessibility and Screen Reader Improvements for Room Lists
**Learning:** Interactive list items (like the room list) need explicit keyboard support (`tabindex`, `role="button"`, and `keydown` listeners) and visual focus states to be accessible to keyboard-only users. Additionally, dynamic status changes and error messages require ARIA live regions (`aria-live="polite"`) to be announced by screen readers.
**Action:** Always ensure any custom interactive elements are keyboard-navigable and have corresponding ARIA roles and live region attributes for status updates.
