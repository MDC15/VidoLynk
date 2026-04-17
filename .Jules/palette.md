# Palette's UX Journal

## 2026-04-17 - Room List Keyboard Accessibility
**Learning:** Interactive elements implemented as list items (`li`) without `tabindex` or `role` are invisible to keyboard-only users and screen readers. Adding `tabindex="0"`, `role="button"`, and handling `keydown` events (Enter/Space) is a baseline requirement for accessibility.
**Action:** Always ensure any non-semantic interactive elements have appropriate ARIA roles and keyboard listeners.
