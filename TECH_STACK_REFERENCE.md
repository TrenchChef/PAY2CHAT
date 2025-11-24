# TECH_STACK_REFERENCE.md

Latest Libraries, Versions, and Documentation Links

(Optimized for Cursor multi-agent rebuild, WebRTC + wallet + payments overhaul)

## 1. Core Framework

### Next.js (App Router)
- **Latest Stable:** 14.2.x
- **Docs:** https://nextjs.org/docs
- **Notes:**
  - Required for SSR, streaming, server actions.
  - Supports modern file-based routing and React Server Components.

### React
- **Latest Stable:** 18.3.x
- **Docs:** https://react.dev
- **Notes:**
  - Keep UI components; rebuild logic layers beneath.

## 2. State Management

### Zustand
- **Latest Stable:** 4.x
- **Docs:** https://docs.pmnd.rs/zustand/getting-started/introduction
- **Why:**
  - Clean, minimal, reliable for RTC state machines and call session state.
  - Better than Redux for a P2P WebRTC app.

### Jotai (optional alternative)
- **Latest Stable:** 2.x
- **Docs:** https://jotai.org/docs/introduction
- **Why:**
  - Atom-based, simple global store.
  - Works well with highly reactive WebRTC flows.

## 3. WebRTC Layer

### simple-peer
- **Latest Stable:** 9.x
- **Docs:** https://github.com/feross/simple-peer
- **Why:**
  - Simplifies signaling, ICE, STUN/TURN integration.
  - Clean abstraction for Cursor agents to build on.

### WebRTC Official API
- **Docs:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- **Notes:**
  - Use simple-peer + native WebRTC fallback when needed.

### STUN/TURN Service (Recommended)
- **Twilio Network Traversal**
  - **Docs:** https://www.twilio.com/docs/stun-turn
  - **Notes:**
    - Works reliably for p2p video apps.
    - Can replace homebrew TURN attempts.

## 4. Wallet Connection Layer (Solana)

### @solana/wallet-adapter
- **Latest Stable:** 0.9x
- **Docs:** https://github.com/solana-labs/wallet-adapter
- **Why:**
  - Standardized multi-wallet support.
  - Phantom, Solflare, Backpack, and WalletConnect built-in.

### Phantom Docs
- https://docs.phantom.app/integrating/extension-and-in-app-browser

### Solana Web3.js
- **Latest Stable:** 1.95.x
- **Docs:** https://solana-labs.github.io/solana-web3.js/
- **Notes:**
  - Required for USDC transfers, token-account creation, and rent-exemption rules.

## 5. Payments / Token Transfers (USDC on Solana)

### @solana/spl-token
- **Latest Stable:** 0.3x
- **Docs:** https://spl.solana.com/token
- **Use Cases:**
  - Transfer USDC between host ↔ invitee.
  - Create ATA.
  - Check rent exemptions.

### @solana/wallet-standard
- **Docs:** https://github.com/solana-labs/wallet-standard
- **Why:**
  - Simplifies wallet compatibility with modern wallets.

## 6. P2P File Transfer Layer

### WebRTC DataChannel
- **Docs:** https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
- **Notes:**
  - Your file-transfer feature must use DataChannel for true P2P, no server storage.
  - Cursor agents will build chunked uploads + secure encryption wrappers.

## 7. UI Component Libraries

### TailwindCSS
- **Latest Stable:** 3.4.x
- **Docs:** https://tailwindcss.com/docs
- **Notes:**
  - Works seamlessly with Next.js App Router.
  - Keep all existing UI; stable and safe.

### Headless UI
- **Latest Stable:** 2.x
- **Docs:** https://headlessui.com
- **Notes:**
  - Great for modals, menus, UI states without logic entanglement.

## 8. Validation Layer

### Zod
- **Latest Stable:** 3.x
- **Docs:** https://zod.dev
- **Use:**
  - Validate session payloads
  - Validate tipping and file-purchase messages
  - Validate signaling events for WebRTC

## 9. Signaling Server (Lightweight)

### Socket.IO
- **Latest Stable:** 4.x
- **Docs:** https://socket.io/docs/v4
- **Notes:**
  - Best for signaling messages: offer, answer, ICE candidates.

### Alternatively:
- **Hono.js (Edge-first API)**
  - **Docs:** https://hono.dev
  - **Why:**
    - Ultra-light.
    - Ideal for event-level signaling if you want Cloudflare Workers later.

## 10. Security Layer

### Helmet (HTTP headers)
- **Latest Stable:** 7.x
- **Docs:** https://helmetjs.github.io
- **Use:**
  - Protect RTCS signaling endpoints.

### OWASP WebRTC Guidelines
- **Docs:** https://owasp.org/www-project-web-security-testing-guide/v41/Web-Testing_WebRTC
- **Notes:**
  - Mandatory to enforce ICE, DTLS-SRTP, and sanitize DataChannel metadata.

## 11. Testing / QA

### Vitest
- **Latest Stable:** 1.x
- **Docs:** https://vitest.dev
- **Notes:**
  - Fast, works with Next.js App Router.

### Playwright
- **Latest Stable:** 1.44+
- **Docs:** https://playwright.dev/docs/intro
- **Use:**
  - End-to-end testing of call flows, file transfers, modal gating.

