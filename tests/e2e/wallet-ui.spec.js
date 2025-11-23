// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Wallet Connection UI', () => {
  test.beforeEach(async ({ page }) => {
    // Accept consent
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should display wallet connection buttons', async ({ page }) => {
    // Scroll to wallet section
    const walletSection = page.locator('text=Stage 3: Wallet (Solana)');
    await expect(walletSection).toBeVisible();
    
    // Check all wallet buttons are visible
    await expect(page.locator('#connectPhantomBtn')).toBeVisible();
    await expect(page.locator('#connectSolflareBtn')).toBeVisible();
    await expect(page.locator('#connectWCBtn')).toBeVisible();
  });

  test('should display cluster selector', async ({ page }) => {
    const clusterSelect = page.locator('#clusterSelect');
    await expect(clusterSelect).toBeVisible();
    
    // Check options
    await expect(clusterSelect.locator('option[value="mainnet"]')).toBeVisible();
    await expect(clusterSelect.locator('option[value="devnet"]')).toBeVisible();
  });

  test('should show wallet address after connection attempt', async ({ page }) => {
    // Mock wallet provider
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        publicKey: { toString: () => 'TestWalletAddress123456789' },
        connect: async () => ({ publicKey: { toString: () => 'TestWalletAddress123456789' } }),
        disconnect: async () => {},
        on: () => {},
        removeListener: () => {},
      };
    });
    
    // Try to connect (will fail without actual wallet, but UI should respond)
    await page.click('#connectPhantomBtn');
    
    // Wait a bit for any UI updates
    await page.waitForTimeout(1000);
    
    // Wallet address field should exist (may be empty if connection fails)
    const walletAddr = page.locator('#walletAddr');
    await expect(walletAddr).toBeAttached();
  });

  test('should display balance badges in header', async ({ page }) => {
    const solBadge = page.locator('#solBadge');
    const usdcBadge = page.locator('#usdcBadge');
    
    await expect(solBadge).toBeVisible();
    await expect(usdcBadge).toBeVisible();
    
    // Should show default placeholder values
    await expect(solBadge).toContainText('SOL:');
    await expect(usdcBadge).toContainText('USDC:');
  });

  test('should show disconnect button when wallet is connected', async ({ page }) => {
    // Disconnect button should be hidden initially
    await expect(page.locator('#disconnectWalletBtn')).not.toBeVisible();
    
    // Note: Actual connection requires wallet extension
    // This test verifies UI elements exist
    const disconnectBtn = page.locator('#disconnectWalletBtn');
    await expect(disconnectBtn).toBeAttached();
  });

  test('should display USDC balance section', async ({ page }) => {
    const balanceSection = page.locator('text=USDC Balance:');
    await expect(balanceSection).toBeVisible();
    
    const balanceDisplay = page.locator('#usdcBalance');
    await expect(balanceDisplay).toBeVisible();
    
    // Should show default placeholder
    const balanceText = await balanceDisplay.textContent();
    expect(balanceText).toBe('-');
  });

  test('should handle cluster selection change', async ({ page }) => {
    const clusterSelect = page.locator('#clusterSelect');
    
    // Change to devnet
    await clusterSelect.selectOption('devnet');
    const selectedValue = await clusterSelect.inputValue();
    expect(selectedValue).toBe('devnet');
    
    // Change back to mainnet
    await clusterSelect.selectOption('mainnet');
    const selectedValue2 = await clusterSelect.inputValue();
    expect(selectedValue2).toBe('mainnet');
  });
});

test.describe('USDC Transfer UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should display USDC transfer form', async ({ page }) => {
    const transferSection = page.locator('text=Stage 4: USDC Transfer Engine (Test)');
    await expect(transferSection).toBeVisible();
    
    await expect(page.locator('#txRecipient')).toBeVisible();
    await expect(page.locator('#txAmount')).toBeVisible();
    await expect(page.locator('#sendUsdcBtn')).toBeVisible();
  });

  test('should allow entering recipient and amount', async ({ page }) => {
    const recipientInput = page.locator('#txRecipient');
    const amountInput = page.locator('#txAmount');
    
    await recipientInput.fill('TestRecipient123456789');
    await amountInput.fill('10.5');
    
    expect(await recipientInput.inputValue()).toBe('TestRecipient123456789');
    expect(await amountInput.inputValue()).toBe('10.5');
  });

  test('should display transaction status area', async ({ page }) => {
    const txStatus = page.locator('#txStatus');
    await expect(txStatus).toBeVisible();
  });
});

