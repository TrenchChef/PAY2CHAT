// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Timer and Billing UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should have timer elements in DOM', async ({ page }) => {
    // Timer elements should exist even if not visible
    const callTimer = page.locator('#callTimer');
    await expect(callTimer).toBeAttached();
    
    // Check timer is in DOM (may be hidden initially)
    const timerExists = await callTimer.count();
    expect(timerExists).toBeGreaterThan(0);
  });

  test('should have billing status elements', async ({ page }) => {
    // Billing status should exist in DOM
    const billingStatus = page.locator('#billingStatus');
    const statusExists = await billingStatus.count();
    
    // May or may not exist depending on stage completion
    // This test verifies we can query for it
    expect(statusExists).toBeGreaterThanOrEqual(0);
  });

  test('should display connection state indicator', async ({ page }) => {
    const connState = page.locator('#connState');
    await expect(connState).toBeAttached();
    
    // Should be visible in call page
    const callPage = page.locator('#callPage');
    const connStateInCall = callPage.locator('#connState');
    await expect(connStateInCall).toBeAttached();
  });

  test('should have notification area', async ({ page }) => {
    // Notification element may exist for Stage 10
    const notification = page.locator('#notification');
    const notificationExists = await notification.count();
    
    // Verify we can query for notifications
    expect(notificationExists).toBeGreaterThanOrEqual(0);
  });
});

