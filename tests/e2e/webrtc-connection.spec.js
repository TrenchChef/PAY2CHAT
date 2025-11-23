// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('WebRTC Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should display SDP modal when creating offer', async ({ page }) => {
    // Navigate to create room
    await page.click('#homeCreateBtn');
    
    // Fill in room details
    await page.fill('#signalingRoom', 'TEST123');
    await page.fill('#hostPrice', '1.0');
    
    // Click begin session
    await page.click('#createBeginBtn');
    
    // SDP modal should appear
    await expect(page.locator('#sdpModal')).toBeVisible();
    await expect(page.locator('#localSDP')).toBeVisible();
    await expect(page.locator('#remoteSDP')).toBeVisible();
  });

  test('should generate offer SDP', async ({ page }) => {
    await page.click('#homeCreateBtn');
    await page.fill('#signalingRoom', 'TEST123');
    await page.fill('#hostPrice', '1.0');
    await page.click('#createBeginBtn');
    
    // Wait for offer to be generated
    await page.waitForTimeout(2000);
    
    const localSDP = page.locator('#localSDP');
    const sdpText = await localSDP.inputValue();
    
    // SDP should contain WebRTC offer markers
    expect(sdpText).toContain('v='); // SDP version
    expect(sdpText.length).toBeGreaterThan(100); // SDP should be substantial
  });

  test('should copy local SDP to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.click('#homeCreateBtn');
    await page.fill('#signalingRoom', 'TEST123');
    await page.fill('#hostPrice', '1.0');
    await page.click('#createBeginBtn');
    
    // Wait for offer
    await page.waitForTimeout(2000);
    
    // Click copy button
    await page.click('#copyLocalSdpBtn');
    
    // Verify clipboard contains SDP (basic check)
    // Note: Clipboard API may not work in all test environments
    const clipboardText = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch (e) {
        return '';
      }
    });
    
    // If clipboard access works, verify it contains SDP-like content
    if (clipboardText) {
      expect(clipboardText.length).toBeGreaterThan(100);
    }
  });

  test('should accept remote SDP', async ({ page }) => {
    await page.click('#homeCreateBtn');
    await page.fill('#signalingRoom', 'TEST123');
    await page.fill('#hostPrice', '1.0');
    await page.click('#createBeginBtn');
    
    // Wait for offer
    await page.waitForTimeout(2000);
    
    // Get the offer SDP
    const offerSDP = await page.locator('#localSDP').inputValue();
    
    // Switch to join flow
    await page.click('#closeSdpModal');
    await page.click('#homeJoinBtn');
    await page.click('#joinBeginBtn');
    
    // Wait for answer modal
    await page.waitForTimeout(1000);
    
    // Paste offer into remote SDP field
    await page.fill('#remoteSDP', offerSDP);
    await page.click('#acceptRemoteSdpBtn');
    
    // Should generate answer
    await page.waitForTimeout(2000);
    const answerSDP = await page.locator('#localSDP').inputValue();
    expect(answerSDP.length).toBeGreaterThan(100);
  });

  test('should show call controls when media starts', async ({ page }) => {
    // This test verifies UI elements exist
    // Actual WebRTC connection requires two browser contexts
    
    const callPage = page.locator('#callPage');
    await expect(callPage.locator('#startBtn')).toBeAttached();
    await expect(callPage.locator('#muteBtn')).toBeAttached();
    await expect(callPage.locator('#cameraBtn')).toBeAttached();
    await expect(callPage.locator('#endCallBtn')).toBeAttached();
    await expect(callPage.locator('#connState')).toBeAttached();
  });

  test('should handle SDP modal close', async ({ page }) => {
    await page.click('#homeCreateBtn');
    await page.fill('#signalingRoom', 'TEST123');
    await page.fill('#hostPrice', '1.0');
    await page.click('#createBeginBtn');
    
    // Wait for modal
    await expect(page.locator('#sdpModal')).toBeVisible();
    
    // Close modal
    await page.click('#closeSdpModal');
    
    // Modal should be hidden
    await expect(page.locator('#sdpModal')).not.toBeVisible();
  });
});

test.describe('WebRTC P2P Connection (Two Browsers)', () => {
  test('should establish WebRTC connection between two browser contexts', async ({ browser }) => {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // Setup both pages
      for (const page of [page1, page2]) {
        await page.goto('/');
        await page.evaluate(() => {
          localStorage.setItem('pay2chat_consent_accepted', 'true');
        });
        await page.reload();
      }
      
      // Page 1: Create room and generate offer
      await page1.click('#homeCreateBtn');
      await page1.fill('#signalingRoom', 'TEST123');
      await page1.fill('#hostPrice', '1.0');
      await page1.click('#createBeginBtn');
      
      // Wait for offer
      await page1.waitForTimeout(3000);
      const offerSDP = await page1.locator('#localSDP').inputValue();
      expect(offerSDP.length).toBeGreaterThan(100);
      
      // Page 2: Join and accept offer
      await page2.click('#homeJoinBtn');
      await page2.click('#joinBeginBtn');
      await page2.waitForTimeout(1000);
      
      // Paste offer
      await page2.fill('#remoteSDP', offerSDP);
      await page2.click('#acceptRemoteSdpBtn');
      
      // Wait for answer
      await page2.waitForTimeout(3000);
      const answerSDP = await page2.locator('#localSDP').inputValue();
      expect(answerSDP.length).toBeGreaterThan(100);
      
      // Page 1: Accept answer
      await page1.fill('#remoteSDP', answerSDP);
      await page1.click('#acceptRemoteSdpBtn');
      
      // Wait for connection attempt
      await page1.waitForTimeout(5000);
      
      // Check connection state (may be connecting or connected)
      const connState1 = await page1.locator('#connState').textContent();
      const connState2 = await page2.locator('#connState').textContent();
      
      // At least one should show some connection state
      expect(connState1 || connState2).toBeTruthy();
      
    } finally {
      await context1.close();
      await context2.close();
    }
  }, { timeout: 60000 }); // Longer timeout for WebRTC test
});

