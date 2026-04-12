## 2025-05-15 - [Improving Room List Accessibility]
**Learning:** Custom interactive elements like `li` room items often lack keyboard support and ARIA roles by default, making them inaccessible to screen readers and keyboard-only users.
**Action:** Always add `role="button"`, `tabindex="0"`, and `aria-label` to interactive list items, and implement a `keydown` listener for 'Enter' and 'Space' keys. Ensure `:focus-visible` styles are provided for clear visual feedback.
