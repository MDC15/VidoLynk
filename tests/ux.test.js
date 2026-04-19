const { test, expect } = require('@playwright/test');

test.describe('UX and Accessibility Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('Join button should show connecting status', async ({ page }) => {
    await page.fill('#nickname', 'TestUser');
    await page.fill('#roomId', 'TestRoom');

    // Click join button
    // We expect it to try to get media and then change text
    await page.click('#joinBtn');

    // Check if text changed to "Đang tham gia..."
    const btnText = await page.textContent('#joinBtn');
    expect(btnText).toBe('Đang tham gia...');
  });

  test('Error message should have correct ARIA attributes', async ({ page }) => {
    const errorMsg = page.locator('#joinError');
    await expect(errorMsg).toHaveAttribute('role', 'alert');
    await expect(errorMsg).toHaveAttribute('aria-live', 'assertive');
  });

  test('Room list items should be keyboard accessible', async ({ page }) => {
    const stylesheet = await page.evaluate(() => {
      return Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules);
          } catch (e) {
            return [];
          }
        })
        .map(rule => rule.cssText)
        .filter(text => text.includes(':focus-visible'));
    });
    expect(stylesheet.length).toBeGreaterThan(0);
  });
});
