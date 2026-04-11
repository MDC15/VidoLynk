# Palette's UX Journal

## 2025-04-11 - [Accessibility and Interaction Polish]
**Learning:** Real-time applications often miss basic accessibility features like ARIA live regions for dynamic updates (room lists, error messages) and keyboard navigation for custom interactive elements (list items as buttons).
**Action:** Always wrap interactive inputs in a `<form>` to support native "Enter" key submission. Use `aria-live="polite"` for dynamic content and ensure custom interactive elements have a proper `tabindex`, `role="button"`, and keyboard event handlers. Provide immediate visual feedback (loading states) for asynchronous operations like camera access.
