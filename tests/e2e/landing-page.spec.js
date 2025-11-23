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
    
    // Consent modal should be visible
    const consentModal = page.locator('#consentModal');
    await expect(consentModal).toBeVisible();
    
    // Check all required elements are present
    await expect(page.locator('#consentAge')).toBeVisible();
    await expect(page.locator('#consentTOS')).toBeVisible();
    await expect(page.locator('#consentPP')).toBeVisible();
    await expect(page.locator('#consentResponsibility')).toBeVisible();
    await expect(page.locator('#consentContinueBtn')).toBeVisible();
    
    // Continue button should be disabled initially
    await expect(page.locator('#consentContinueBtn')).toBeDisabled();
  });

  test('should enable continue button when all checkboxes are checked', async ({ page }) => {
    await page.goto('/');
    
    const continueBtn = page.locator('#consentContinueBtn');
    await expect(continueBtn).toBeDisabled();
    
    // Check all checkboxes
    await page.check('#consentAge');
    await page.check('#consentTOS');
    await page.check('#consentPP');
    await page.check('#consentResponsibility');
    
    // Continue button should be enabled
    await expect(continueBtn).toBeEnabled();
  });

  test('should hide consent modal after accepting', async ({ page }) => {
    await page.goto('/');
    
    // Accept consent
    await page.check('#consentAge');
    await page.check('#consentTOS');
    await page.check('#consentPP');
    await page.check('#consentResponsibility');
    await page.click('#consentContinueBtn');
    
    // Modal should be hidden
    await expect(page.locator('#consentModal')).not.toBeVisible();
    
    // Landing page should be visible
    await expect(page.locator('#landing')).toBeVisible();
  });

  test('should not show consent modal on subsequent visits', async ({ page }) => {
    // First visit - accept consent
    await page.goto('/');
    await page.check('#consentAge');
    await page.check('#consentTOS');
    await page.check('#consentPP');
    await page.check('#consentResponsibility');
    await page.click('#consentContinueBtn');
    
    // Reload page
    await page.reload();
    
    // Consent modal should not appear
    await expect(page.locator('#consentModal')).not.toBeVisible();
  });

  test('should display landing page elements', async ({ page }) => {
    // Accept consent first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    
    // Check hero section
    await expect(page.locator('.hero-section h1')).toContainText('Private, peer-to-peer chat');
    await expect(page.locator('.tagline')).toBeVisible();
    
    // Check CTA buttons
    await expect(page.locator('#landingCreateBtn')).toBeVisible();
    await expect(page.locator('#landingJoinBtn')).toBeVisible();
    
    // Check feature cards
    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(3);
    
    // Check action cards
    await expect(page.locator('#landingCreateCardBtn')).toBeVisible();
    await expect(page.locator('#landingJoinCardBtn')).toBeVisible();
  });

  test('should navigate to create room from landing page', async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    
    // Click create button
    await page.click('#landingCreateBtn');
    
    // Should show create panel (homePage section)
    await expect(page.locator('#homePage')).toBeVisible();
    await expect(page.locator('#createPanel')).toBeVisible();
  });

  test('should navigate to join room from landing page', async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    
    // Click join button
    await page.click('#landingJoinBtn');
    
    // Should show join panel
    await expect(page.locator('#homePage')).toBeVisible();
    await expect(page.locator('#joinPanel')).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
    
    // Test navigation links exist
    await expect(page.locator('#navHomeLanding')).toBeVisible();
    await expect(page.locator('a[href="#start"]')).toBeVisible();
    await expect(page.locator('a[href="#join"]')).toBeVisible();
    await expect(page.locator('a[href="#faq"]')).toBeVisible();
    await expect(page.locator('a[href="#privacy"]')).toBeVisible();
    await expect(page.locator('a[href="#terms"]')).toBeVisible();
  });
});

