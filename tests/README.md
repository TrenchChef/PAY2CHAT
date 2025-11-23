# E2E Tests for PAY2CHAT

This directory contains end-to-end tests for the PAY2CHAT application using Playwright.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Structure

- `landing-page.spec.js` - Tests for landing page and consent modal
- `navigation.spec.js` - Tests for navigation and UI elements
- `webrtc-connection.spec.js` - Tests for WebRTC connection flows
- `wallet-ui.spec.js` - Tests for wallet connection UI
- `room-management.spec.js` - Tests for room creation and joining
- `timer-billing.spec.js` - Tests for timer and billing UI elements
- `helpers.js` - Shared helper functions

## Test Coverage

### ✅ Covered
- Landing page and consent modal
- Navigation and UI elements
- Room creation and joining forms
- WebRTC SDP exchange (basic)
- Wallet connection UI
- USDC transfer UI
- Timer and billing UI elements

### ⚠️ Limitations
- Wallet connection requires actual browser extensions (Phantom/Solflare)
- Full WebRTC connection requires two browser contexts (tested separately)
- Payment flows require actual wallet with funds (not tested in e2e)
- File transfers require active WebRTC connection

## Configuration

Tests are configured in `playwright.config.js`:
- Base URL: `http://localhost:8080` (or set `BASE_URL` env var)
- Automatically starts local server before tests
- Runs on Chromium by default (can be extended to Firefox/WebKit)

## CI/CD

For CI environments, set the `CI` environment variable:
```bash
CI=true npm run test:e2e
```

This will:
- Retry failed tests twice
- Run tests serially (one worker)
- Generate HTML reports

## Debugging

1. Use `npm run test:e2e:debug` to step through tests
2. Use `npm run test:e2e:ui` for interactive test runner
3. Check `test-results/` for screenshots and videos of failures
4. Check `playwright-report/` for HTML test report

## Notes

- Tests automatically accept consent modal by setting localStorage
- WebRTC tests use longer timeouts (60s) for connection establishment
- Some tests verify UI elements exist rather than full functionality (due to wallet/payment requirements)

