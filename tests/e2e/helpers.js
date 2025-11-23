/**
 * Helper functions for e2e tests
 */

/**
 * Accept consent modal on a page
 * @param {import('@playwright/test').Page} page
 */
async function acceptConsent(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('pay2chat_consent_accepted', 'true');
  });
  await page.reload();
}

/**
 * Wait for WebRTC offer to be generated
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout
 */
async function waitForOffer(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const sdp = document.getElementById('localSDP');
      return sdp && sdp.value && sdp.value.length > 100;
    },
    { timeout }
  );
}

/**
 * Wait for WebRTC answer to be generated
 * @param {import('@playwright/test').Page} page
 * @param {number} timeout
 */
async function waitForAnswer(page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const sdp = document.getElementById('localSDP');
      return sdp && sdp.value && sdp.value.length > 100;
    },
    { timeout }
  );
}

/**
 * Get SDP from local SDP textarea
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function getLocalSDP(page) {
  return await page.locator('#localSDP').inputValue();
}

/**
 * Set remote SDP
 * @param {import('@playwright/test').Page} page
 * @param {string} sdp
 */
async function setRemoteSDP(page, sdp) {
  await page.fill('#remoteSDP', sdp);
  await page.click('#acceptRemoteSdpBtn');
}

/**
 * Create a room and generate offer
 * @param {import('@playwright/test').Page} page
 * @param {object} options
 */
async function createRoomAndOffer(page, options = {}) {
  const {
    roomCode = 'TEST123',
    price = '1.0',
    signalingUrl = 'ws://localhost:8888'
  } = options;

  await page.click('#homeCreateBtn');
  await page.fill('#signalingRoom', roomCode);
  await page.fill('#hostPrice', price);
  if (signalingUrl) {
    await page.fill('#signalingUrl', signalingUrl);
  }
  await page.click('#createBeginBtn');
  
  // Wait for offer
  await waitForOffer(page);
}

/**
 * Join room and generate answer
 * @param {import('@playwright/test').Page} page
 * @param {string} offerSDP
 */
async function joinRoomAndAnswer(page, offerSDP) {
  await page.click('#homeJoinBtn');
  await page.click('#joinBeginBtn');
  await page.waitForTimeout(1000);
  
  await setRemoteSDP(page, offerSDP);
  await waitForAnswer(page);
}

module.exports = {
  acceptConsent,
  waitForOffer,
  waitForAnswer,
  getLocalSDP,
  setRemoteSDP,
  createRoomAndOffer,
  joinRoomAndAnswer,
};

