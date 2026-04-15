# Palette's UX Journal

## 2025-05-14 - Keyboard Accessibility in Room Lists
**Learning:** Interactive list items (like rooms in a list) often miss keyboard navigation support when only `onclick` is used. This makes them inaccessible to screen reader and keyboard-only users.
**Action:** Always add `role="button"`, `tabindex="0"`, and a keydown listener for "Enter" and "Space" to interactive `<li>` elements.
