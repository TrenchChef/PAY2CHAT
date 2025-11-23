# Quick Start - E2E Testing

## First Time Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Run Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Interactive test runner
npm run test:e2e:ui
```

## What Gets Tested

1. **Landing Page** - Consent modal, navigation, hero section
2. **Navigation** - Header, wallet badges, panel toggling
3. **WebRTC** - SDP exchange, connection flow (two browsers)
4. **Wallet UI** - Connection buttons, cluster selector, balance display
5. **Room Management** - Create/join forms, invite parsing
6. **Timer/Billing** - UI elements for call timing

## Test Output

- Screenshots on failure: `test-results/`
- HTML report: `playwright-report/`
- View report: `npm run test:e2e:report`

## Troubleshooting

**Tests fail to start server:**
- Make sure port 8080 is available
- Or set `BASE_URL` env var: `BASE_URL=http://localhost:8080 npm run test:e2e`

**WebRTC tests timeout:**
- These require actual WebRTC support
- May need TURN server for NAT traversal
- Tests use longer timeouts (60s)

**Wallet tests fail:**
- Wallet connection requires browser extensions
- Tests verify UI elements, not actual connections

