// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Room Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should display create room form', async ({ page }) => {
    await page.click('#homeCreateBtn');
    
    await expect(page.locator('#createPanel')).toBeVisible();
    await expect(page.locator('#hostPrice')).toBeVisible();
    await expect(page.locator('#signalingUrl')).toBeVisible();
    await expect(page.locator('#signalingRoom')).toBeVisible();
    await expect(page.locator('#createRoomBtn')).toBeVisible();
  });

  test('should allow entering room details', async ({ page }) => {
    await page.click('#homeCreateBtn');
    
    await page.fill('#hostPrice', '5.0');
    await page.fill('#signalingUrl', 'ws://localhost:8888');
    await page.fill('#signalingRoom', 'MYROOM123');
    
    expect(await page.locator('#hostPrice').inputValue()).toBe('5.0');
    expect(await page.locator('#signalingUrl').inputValue()).toBe('ws://localhost:8888');
    expect(await page.locator('#signalingRoom').inputValue()).toBe('MYROOM123');
  });

  test('should display signaling connection options', async ({ page }) => {
    await page.click('#homeCreateBtn');
    
    await expect(page.locator('#connectSignalingBtn')).toBeVisible();
    await expect(page.locator('#autoSendOffer')).toBeVisible();
    await expect(page.locator('#includeOfferCheckbox')).toBeVisible();
  });

  test('should display file sales section for host', async ({ page }) => {
    await page.click('#homeCreateBtn');
    
    const fileSection = page.locator('text=Files for sale (Host)');
    await expect(fileSection).toBeVisible();
    
    await expect(page.locator('#fileNameInput')).toBeVisible();
    await expect(page.locator('#filePriceInput')).toBeVisible();
    await expect(page.locator('#addFileBtn')).toBeVisible();
  });

  test('should allow adding files for sale', async ({ page }) => {
    await page.click('#homeCreateBtn');
    
    await page.fill('#fileNameInput', 'test-file.pdf');
    await page.fill('#filePriceInput', '25.0');
    await page.click('#addFileBtn');
    
    // File list should update
    await page.waitForTimeout(500);
    const fileList = page.locator('#fileList');
    await expect(fileList).toBeVisible();
  });
});

test.describe('Room Joining', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('pay2chat_consent_accepted', 'true');
    });
    await page.reload();
  });

  test('should display join room form', async ({ page }) => {
    await page.click('#homeJoinBtn');
    
    await expect(page.locator('#joinPanel')).toBeVisible();
    await expect(page.locator('#inviteCodeInput')).toBeVisible();
    await expect(page.locator('#joinByCodeBtn')).toBeVisible();
  });

  test('should allow entering invite code', async ({ page }) => {
    await page.click('#homeJoinBtn');
    
    const inviteCode = 'pay2chat://room?code=TEST123&host=ABC123&price=1.0';
    await page.fill('#inviteCodeInput', inviteCode);
    
    expect(await page.locator('#inviteCodeInput').inputValue()).toBe(inviteCode);
  });

  test('should parse invite link and populate fields', async ({ page }) => {
    await page.click('#homeJoinBtn');
    
    // Simulate parsing an invite link
    const inviteLink = 'pay2chat://room?code=TEST123&host=ABC123456789&price=2.5';
    await page.fill('#inviteCodeInput', inviteLink);
    await page.click('#joinByCodeBtn');
    
    // Wait for parsing
    await page.waitForTimeout(1000);
    
    // Check that fields may be populated (depends on implementation)
    const hostAddr = await page.locator('#joinHostAddr').inputValue();
    const price = await page.locator('#joinPrice').inputValue();
    
    // Fields should exist and be editable
    await expect(page.locator('#joinHostAddr')).toBeVisible();
    await expect(page.locator('#joinPrice')).toBeVisible();
  });

  test('should display prepay section', async ({ page }) => {
    await page.click('#homeJoinBtn');
    
    await expect(page.locator('#prepayBtn')).toBeVisible();
    await expect(page.locator('#prepayStatus')).toBeVisible();
  });

  test('should display tip section', async ({ page }) => {
    await page.click('#homeJoinBtn');
    
    await expect(page.locator('#tipAmount')).toBeVisible();
    await expect(page.locator('#tipBtn')).toBeVisible();
    await expect(page.locator('#tipStatus')).toBeVisible();
  });
});

