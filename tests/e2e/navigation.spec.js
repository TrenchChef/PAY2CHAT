// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Navigation and UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    // Accept consent and navigate to main page
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should display header with logo and navigation', async ({ page }) => {
    await expect(page.locator('.logo')).toContainText('X402 CHAT');
    await expect(page.locator('nav')).toBeVisible();
    
    // Check navigation links
    await expect(page.locator('#navHome')).toBeVisible();
    await expect(page.locator('#navStart')).toBeVisible();
    await expect(page.locator('#navJoin')).toBeVisible();
  });

  test('should display wallet badges', async ({ page }) => {
    const solBadge = page.locator('#solBadge');
    const usdcBadge = page.locator('#usdcBadge');
    
    await expect(solBadge).toBeVisible();
    await expect(usdcBadge).toBeVisible();
    
    // Should show default values
    await expect(solBadge).toContainText('SOL:');
    await expect(usdcBadge).toContainText('USDC:');
  });

  test('should toggle between create and join panels', async ({ page }) => {
    // Initially, both panels should be hidden
    await expect(page.locator('#createPanel')).not.toBeVisible();
    await expect(page.locator('#joinPanel')).not.toBeVisible();
    
    // Click create button
    await page.click('#homeCreateBtn');
    await expect(page.locator('#createPanel')).toBeVisible();
    await expect(page.locator('#joinPanel')).not.toBeVisible();
    
    // Click join button
    await page.click('#homeJoinBtn');
    await expect(page.locator('#createPanel')).not.toBeVisible();
    await expect(page.locator('#joinPanel')).toBeVisible();
  });

  test('should display wallet connection section', async ({ page }) => {
    // Scroll to wallet section
    const walletSection = page.locator('text=Stage 3: Wallet (Solana)');
    await expect(walletSection).toBeVisible();
    
    // Check wallet connection buttons
    await expect(page.locator('#connectPhantomBtn')).toBeVisible();
    await expect(page.locator('#connectSolflareBtn')).toBeVisible();
    await expect(page.locator('#connectWCBtn')).toBeVisible();
    
    // Check cluster selector
    await expect(page.locator('#clusterSelect')).toBeVisible();
  });

  test('should display USDC transfer test section', async ({ page }) => {
    const transferSection = page.locator('text=Stage 4: USDC Transfer Engine (Test)');
    await expect(transferSection).toBeVisible();
    
    // Check transfer form elements
    await expect(page.locator('#txRecipient')).toBeVisible();
    await expect(page.locator('#txAmount')).toBeVisible();
    await expect(page.locator('#sendUsdcBtn')).toBeVisible();
  });

  test('should display room creation form', async ({ page }) => {
    await page.click('#homeCreateBtn');
    
    // Check create room form elements
    await expect(page.locator('#hostPrice')).toBeVisible();
    await expect(page.locator('#signalingUrl')).toBeVisible();
    await expect(page.locator('#signalingRoom')).toBeVisible();
    await expect(page.locator('#createRoomBtn')).toBeVisible();
    await expect(page.locator('#createBeginBtn')).toBeVisible();
  });

  test('should display join room form', async ({ page }) => {
    await page.click('#homeJoinBtn');
    
    // Check join room form elements
    await expect(page.locator('#inviteCodeInput')).toBeVisible();
    await expect(page.locator('#joinByCodeBtn')).toBeVisible();
    await expect(page.locator('#joinBeginBtn')).toBeVisible();
    await expect(page.locator('#joinHostAddr')).toBeVisible();
    await expect(page.locator('#joinPrice')).toBeVisible();
    await expect(page.locator('#prepayBtn')).toBeVisible();
  });

  test('should display call page elements when call is active', async ({ page }) => {
    // Call page should be hidden initially
    await expect(page.locator('#callPage')).not.toBeVisible();
    
    // Note: Call page visibility is controlled by JavaScript
    // This test verifies elements exist in DOM
    const callPage = page.locator('#callPage');
    await expect(callPage.locator('#localVideo')).toBeAttached();
    await expect(callPage.locator('#remoteVideo')).toBeAttached();
    await expect(callPage.locator('#startBtn')).toBeAttached();
    await expect(callPage.locator('#muteBtn')).toBeAttached();
    await expect(callPage.locator('#cameraBtn')).toBeAttached();
    await expect(callPage.locator('#endCallBtn')).toBeAttached();
  });

  test('should have responsive design elements', async ({ page }) => {
    // Check that container exists
    await expect(page.locator('.container')).toBeVisible();
    
    // Check that cards have proper styling
    const cards = page.locator('.card, .section-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});

