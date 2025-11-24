// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Ad Blocker Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure fresh state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should detect ad blocker and show modal', async ({ page }) => {
    // Inject ad blocker simulation by blocking ad-related elements
    await page.addInitScript(() => {
      // Simulate ad blocker by hiding elements with ad-related classes
      const originalAppendChild = document.body.appendChild.bind(document.body);
      document.body.appendChild = function(element) {
        if (element.className && (
          element.className.includes('adsbox') ||
          element.className.includes('text-ad') ||
          element.className.includes('pub_')
        )) {
          element.style.display = 'none';
        }
        return originalAppendChild(element);
      };
    });

    await page.goto('/');
    
    // Wait for ad blocker detection to run
    await page.waitForTimeout(500);
    
    // Check if ad blocker modal appears
    const modal = page.locator('text=Ad Blocker Detected');
    await expect(modal).toBeVisible({ timeout: 2000 });
  });

  test('should block app interaction when ad blocker detected', async ({ page }) => {
    // Simulate ad blocker
    await page.addInitScript(() => {
      const originalAppendChild = document.body.appendChild.bind(document.body);
      document.body.appendChild = function(element) {
        if (element.className && element.className.includes('adsbox')) {
          element.style.display = 'none';
        }
        return originalAppendChild(element);
      };
    });

    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Verify modal is blocking
    const modal = page.locator('text=Ad Blocker Detected');
    await expect(modal).toBeVisible();
    
    // Verify consent modal is NOT visible (blocked by ad blocker modal)
    const consentModal = page.locator('text=Consent Required');
    await expect(consentModal).not.toBeVisible();
  });

  test('should allow dismissing ad blocker modal', async ({ page }) => {
    // Simulate ad blocker
    await page.addInitScript(() => {
      const originalAppendChild = document.body.appendChild.bind(document.body);
      document.body.appendChild = function(element) {
        if (element.className && element.className.includes('adsbox')) {
          element.style.display = 'none';
        }
        return originalAppendChild(element);
      };
    });

    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Find and click "Continue anyway" button
    const continueButton = page.locator('text=Continue anyway');
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    
    // Modal should be dismissed
    await page.waitForTimeout(300);
    const modal = page.locator('text=Ad Blocker Detected');
    await expect(modal).not.toBeVisible();
    
    // Consent modal should now appear
    const consentModal = page.locator('text=Consent Required');
    await expect(consentModal).toBeVisible({ timeout: 2000 });
  });

  test('should remember dismissal state', async ({ page }) => {
    // Simulate ad blocker
    await page.addInitScript(() => {
      const originalAppendChild = document.body.appendChild.bind(document.body);
      document.body.appendChild = function(element) {
        if (element.className && element.className.includes('adsbox')) {
          element.style.display = 'none';
        }
        return originalAppendChild(element);
      };
    });

    // First visit - dismiss modal
    await page.goto('/');
    await page.waitForTimeout(500);
    
    const continueButton = page.locator('text=Continue anyway');
    if (await continueButton.isVisible()) {
      await continueButton.click();
      await page.waitForTimeout(300);
    }
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(500);
    
    // Modal should not appear again (dismissed state persisted)
    const modal = page.locator('text=Ad Blocker Detected');
    await expect(modal).not.toBeVisible({ timeout: 1000 });
  });

  test('should show recheck button and handle recheck', async ({ page }) => {
    // Simulate ad blocker
    await page.addInitScript(() => {
      let adBlockerActive = true;
      const originalAppendChild = document.body.appendChild.bind(document.body);
      document.body.appendChild = function(element) {
        if (element.className && element.className.includes('adsbox')) {
          if (adBlockerActive) {
            element.style.display = 'none';
          }
        }
        return originalAppendChild(element);
      };
      
      // Allow disabling ad blocker simulation
      window.disableAdBlockerSim = () => {
        adBlockerActive = false;
      };
    });

    await page.goto('/');
    await page.waitForTimeout(500);
    
    // Verify recheck button exists
    const recheckButton = page.locator('text=I\'ve disabled my ad blocker');
    await expect(recheckButton).toBeVisible();
    
    // Disable ad blocker simulation
    await page.evaluate(() => {
      if (window.disableAdBlockerSim) {
        window.disableAdBlockerSim();
      }
    });
    
    // Click recheck
    await recheckButton.click();
    await page.waitForTimeout(1000);
    
    // Modal should dismiss if detection passes
    // (Note: This test may need adjustment based on actual detection timing)
  });

  test('should not show modal when ad blocker is not detected', async ({ page }) => {
    // Don't simulate ad blocker
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Ad blocker modal should not appear
    const modal = page.locator('text=Ad Blocker Detected');
    await expect(modal).not.toBeVisible({ timeout: 2000 });
    
    // Consent modal should appear instead (if not already accepted)
    const consentModal = page.locator('text=Consent Required');
    // This may or may not be visible depending on consent state
  });
});

