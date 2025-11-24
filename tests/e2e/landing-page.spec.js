// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure consent modal shows
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display consent modal on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Wait for modal to appear (may need to wait for ad blocker check first)
    await page.waitForTimeout(1000);
    
    // Consent modal should be visible (check for text content)
    const consentModal = page.locator('text=Consent Required');
    await expect(consentModal).toBeVisible({ timeout: 5000 });
    
    // Check all required elements are present (using text content)
    await expect(page.locator('text=I confirm I am 18 or older')).toBeVisible();
    await expect(page.locator('text=I accept the')).toBeVisible();
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
    await expect(page.locator('text=You are solely responsible')).toBeVisible();
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();
    
    // Continue button should be disabled initially (check all checkboxes)
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
  });

  test('should enable continue button when all checkboxes are checked', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeDisabled();
    
    // Check all checkboxes by label text
    await page.locator('label:has-text("I confirm I am 18 or older") input[type="checkbox"]').check();
    await page.locator('label:has-text("I accept the")').first().locator('input[type="checkbox"]').check();
    await page.locator('label:has-text("Privacy Policy")').locator('input[type="checkbox"]').check();
    await page.locator('label:has-text("You are solely responsible")').locator('input[type="checkbox"]').check();
    
    // Continue button should be enabled
    await expect(continueBtn).toBeEnabled();
  });

  test('should hide consent modal after accepting', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Accept consent - check all checkboxes
    await page.locator('label:has-text("I confirm I am 18 or older") input[type="checkbox"]').check();
    await page.locator('label:has-text("Terms of Service")').locator('input[type="checkbox"]').check();
    await page.locator('label:has-text("Privacy Policy")').locator('input[type="checkbox"]').check();
    await page.locator('label:has-text("You are solely responsible")').locator('input[type="checkbox"]').check();
    
    // Click continue button
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);
    
    // Modal should be hidden
    await expect(page.locator('text=Consent Required')).not.toBeVisible();
    
    // Landing page content should be visible
    await expect(page.locator('text=Private P2P Video Chat')).toBeVisible({ timeout: 3000 });
  });

  test('should not show consent modal on subsequent visits', async ({ page }) => {
    // First visit - accept consent
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Accept consent
    await page.locator('label:has-text("I confirm I am 18 or older") input[type="checkbox"]').check();
    await page.locator('label:has-text("Terms of Service")').locator('input[type="checkbox"]').check();
    await page.locator('label:has-text("Privacy Policy")').locator('input[type="checkbox"]').check();
    await page.locator('label:has-text("You are solely responsible")').locator('input[type="checkbox"]').check();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Consent modal should not appear
    await expect(page.locator('text=Consent Required')).not.toBeVisible({ timeout: 2000 });
  });

  test('should display landing page elements', async ({ page }) => {
    // Accept consent first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Check hero section
    await expect(page.locator('h1:has-text("Private P2P Video Chat")')).toBeVisible();
    await expect(page.locator('text=Built on Solana')).toBeVisible();
    
    // Check CTA buttons (Create Chat and Join Chat)
    await expect(page.locator('button:has-text("Create Chat")')).toBeVisible();
    await expect(page.locator('button:has-text("Join Chat")')).toBeVisible();
    
    // Check features section
    await expect(page.locator('text=Features')).toBeVisible();
    await expect(page.locator('text=Fully Encrypted')).toBeVisible();
    await expect(page.locator('text=Instant Payments')).toBeVisible();
  });

  test('should navigate to create room from landing page', async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Click create button
    await page.locator('button:has-text("Create Chat")').click();
    
    // Should navigate to create page or show create form
    // Check for create room form elements
    await expect(page.locator('h1:has-text("Create Room")').or(page.locator('text=Create Room'))).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to join room from landing page', async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Click join button
    await page.locator('button:has-text("Join Chat")').click();
    
    // Should navigate to join page or show join form
    // Check for join room form elements
    await expect(page.locator('h1:has-text("Join Room")').or(page.locator('text=Join Room'))).toBeVisible({ timeout: 3000 });
  });

  test('should have working navigation links', async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Test navigation links exist (check for NavBar)
    await expect(page.locator('a[href="/legal/tos.html"]')).toBeVisible();
    await expect(page.locator('a[href="/legal/privacy.html"]')).toBeVisible();
    
    // Check for footer links
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });
});

