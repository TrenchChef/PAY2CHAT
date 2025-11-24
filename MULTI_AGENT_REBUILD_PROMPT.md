# Multi-Agent Rebuild Prompt for Pay2Chat

## Context
You are rebuilding Pay2Chat using the modern tech stack defined in `TECH_STACK_REFERENCE.md` and version constraints in `config/versions.json`. This is a peer-to-peer video chat application with Solana USDC payments, X402 automatic per-minute billing, and encrypted P2P file transfers.

## Tech Stack Requirements
- **Reference Document**: `TECH_STACK_REFERENCE.md` (MUST READ FIRST)
- **Version Constraints**: `config/versions.json` (STRICT VERSION COMPLIANCE)
- **Current Architecture**: Next.js App Router, Zustand state management, native WebRTC API

## Critical Rules
1. **STOP AFTER EACH STAGE** - You MUST pause and request testing approval before proceeding
2. **Version Compliance** - All dependencies MUST match versions in `config/versions.json`
3. **Preserve UI** - Keep all existing TailwindCSS UI components; only rebuild logic layers
4. **Incremental Changes** - Extend existing code, don't rewrite working functionality
5. **Test Coverage** - Add Vitest unit tests for each stage; update Playwright E2E tests

## Rebuild Stages (Execute Sequentially)

### STAGE 1: WebRTC Layer Migration to simple-peer
**Goal**: Migrate from native WebRTC API to `simple-peer` (v9.x) for cleaner signaling abstraction

**Tasks**:
1. Install `simple-peer` (v9.x) - verify version matches `config/versions.json`
2. Refactor `lib/webrtc/client.ts` to use `simple-peer` instead of native `RTCPeerConnection`
3. Maintain existing API surface: `initialize()`, `connect()`, `disconnect()`, `sendData()`
4. Keep DataChannel functionality intact
5. Update signaling to work with `simple-peer`'s event model
6. Add Zod (v3.x) validation for signaling messages
7. Write Vitest unit tests for WebRTC client
8. Update existing Playwright E2E tests to verify call establishment

**Deliverables**:
- [ ] `lib/webrtc/client.ts` refactored to use `simple-peer`
- [ ] `lib/webrtc/signaling.ts` with Zod-validated message schemas
- [ ] `lib/webrtc/__tests__/client.test.ts` (Vitest)
- [ ] All existing E2E tests pass
- [ ] Documentation updated in `lib/webrtc/README.md`

**Testing Checkpoint**: 
- [ ] Two browser windows can establish a call
- [ ] DataChannel messages send/receive correctly
- [ ] Connection state transitions work (disconnected → connecting → connected)
- [ ] Reconnection logic functions properly
- [ ] Unit tests pass: `npm run test`
- [ ] E2E tests pass: `npm run test:e2e`

**STOP HERE - Request user approval before proceeding to Stage 2**

---

### STAGE 2: Signaling Server Migration to Socket.IO
**Goal**: Replace native WebSocket (`ws`) with Socket.IO (v4.x) for better signaling reliability

**Tasks**:
1. Install `socket.io` (v4.x) and `socket.io-client` - verify versions
2. Refactor `server.js` to use Socket.IO server instead of native `ws`
3. Update client-side signaling in `lib/webrtc/client.ts` to use `socket.io-client`
4. Add Zod validation for all Socket.IO event payloads
5. Implement room-based namespaces for better isolation
6. Add connection retry logic with exponential backoff
7. Write Vitest tests for signaling server logic
8. Update Playwright tests for new signaling flow

**Deliverables**:
- [ ] `server.js` migrated to Socket.IO
- [ ] `lib/webrtc/signaling.ts` updated with Socket.IO client
- [ ] `lib/webrtc/schemas.ts` with Zod schemas for all events
- [ ] `server/__tests__/signaling.test.ts` (Vitest)
- [ ] E2E tests updated and passing

**Testing Checkpoint**:
- [ ] Signaling server starts without errors
- [ ] Host can create room and send offer
- [ ] Invitee can join room and receive offer
- [ ] Answer exchange works correctly
- [ ] ICE candidates exchange properly
- [ ] Multiple rooms work independently
- [ ] Server handles disconnections gracefully
- [ ] Unit tests pass
- [ ] E2E tests pass

**STOP HERE - Request user approval before proceeding to Stage 3**

---

### STAGE 3: State Management Consolidation with Zustand
**Goal**: Ensure all state management uses Zustand (v4.x) consistently and efficiently

**Tasks**:
1. Audit all state stores in `lib/store/`:
   - `useCallStore.ts` - WebRTC call state
   - `useRoomStore.ts` - Room/session state
   - `useWalletStore.ts` - Wallet connection state
2. Refactor any non-Zustand state to Zustand
3. Add Zod schemas for store state validation
4. Implement proper TypeScript types for all stores
5. Add middleware for persistence (if needed)
6. Write Vitest tests for each store
7. Ensure no prop drilling; all components use stores directly

**Deliverables**:
- [ ] All stores use Zustand v4.x
- [ ] Type-safe store interfaces
- [ ] Zod validation for state updates
- [ ] `lib/store/__tests__/` with unit tests
- [ ] No React Context or prop drilling for global state

**Testing Checkpoint**:
- [ ] All stores initialize correctly
- [ ] State updates trigger re-renders
- [ ] State persists across navigation (if required)
- [ ] No state leaks between rooms/calls
- [ ] Unit tests pass for all stores
- [ ] Manual testing: create room → join room → verify state

**STOP HERE - Request user approval before proceeding to Stage 4**

---

### STAGE 4: Wallet Layer Modernization
**Goal**: Update Solana wallet integration to use latest `@solana/wallet-adapter` (v0.9x) and `@solana/wallet-standard` (v1.x)

**Tasks**:
1. Update `@solana/web3.js` to v1.95.x (verify in `config/versions.json`)
2. Update all `@solana/wallet-adapter-*` packages to v0.9x
3. Add `@solana/wallet-standard` for modern wallet compatibility
4. Refactor `lib/solana/wallet.ts` to use latest adapter patterns
5. Update `components/providers/WalletProvider.tsx` with latest adapter setup
6. Ensure multi-wallet support: Phantom, Solflare, Backpack, WalletConnect
7. Add Zod validation for wallet transaction payloads
8. Write Vitest tests for wallet operations
9. Update Playwright tests for wallet connection flows

**Deliverables**:
- [ ] All Solana packages updated to specified versions
- [ ] `lib/solana/wallet.ts` modernized
- [ ] Wallet provider uses latest adapter patterns
- [ ] `lib/solana/__tests__/wallet.test.ts` (Vitest)
- [ ] E2E tests for wallet connection

**Testing Checkpoint**:
- [ ] Wallet connects successfully (Phantom, Solflare, Backpack)
- [ ] Wallet disconnects cleanly
- [ ] Wallet state persists in Zustand store
- [ ] Multiple wallets can be switched
- [ ] WalletConnect integration works (if applicable)
- [ ] Unit tests pass
- [ ] E2E tests pass

**STOP HERE - Request user approval before proceeding to Stage 5**

---

### STAGE 5: Payment System Validation & Security
**Goal**: Add Zod validation to all payment flows and implement security best practices

**Tasks**:
1. Add Zod schemas for all payment-related data:
   - USDC transfer payloads
   - Payment confirmation messages
   - Tipping messages
   - File purchase messages
2. Update `lib/solana/payments.ts` with Zod validation
3. Validate all DataChannel messages with Zod before processing
4. Add Helmet (v7.x) to Next.js middleware for security headers
5. Implement OWASP WebRTC security guidelines:
   - Validate ICE candidates
   - Sanitize DataChannel metadata
   - Enforce DTLS-SRTP
6. Add input sanitization for all user inputs
7. Write Vitest tests for payment validation
8. Security audit checklist

**Deliverables**:
- [ ] `lib/validation/` directory with Zod schemas
- [ ] All payment flows validated with Zod
- [ ] `middleware.ts` with Helmet security headers
- [ ] `lib/security/webrtc.ts` with OWASP compliance
- [ ] `lib/validation/__tests__/` (Vitest)

**Testing Checkpoint**:
- [ ] Invalid payment payloads are rejected
- [ ] Malformed DataChannel messages are ignored
- [ ] Security headers are present in HTTP responses
- [ ] ICE candidate validation works
- [ ] Unit tests pass (including negative test cases)
- [ ] Manual security testing: try invalid inputs

**STOP HERE - Request user approval before proceeding to Stage 6**

---

### STAGE 6: UI Component Library Integration (Headless UI)
**Goal**: Migrate custom modals/menus to Headless UI (v2.x) for better accessibility and maintainability

**Tasks**:
1. Install `@headlessui/react` (v2.x)
2. Identify all custom modal/dialog components:
   - `components/ConsentModal.tsx`
   - `components/TipModal.tsx`
   - `components/FilePurchaseModal.tsx`
   - `components/AdBlockerModal.tsx`
3. Refactor each modal to use Headless UI `Dialog` component
4. Replace custom menu implementations with Headless UI `Menu`
5. Ensure accessibility (ARIA labels, keyboard navigation)
6. Maintain existing TailwindCSS styling
7. Write Vitest tests for modal interactions
8. Update Playwright tests for modal flows

**Deliverables**:
- [ ] All modals use Headless UI `Dialog`
- [ ] All menus use Headless UI `Menu`
- [ ] Accessibility improvements (ARIA, keyboard nav)
- [ ] `components/__tests__/modals.test.tsx` (Vitest)
- [ ] E2E tests updated

**Testing Checkpoint**:
- [ ] All modals open/close correctly
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader compatibility (test with VoiceOver/NVDA)
- [ ] Focus management works correctly
- [ ] Unit tests pass
- [ ] E2E tests pass

**STOP HERE - Request user approval before proceeding to Stage 7**

---

### STAGE 7: Testing Infrastructure Enhancement
**Goal**: Set up comprehensive Vitest (v1.x) unit testing and improve Playwright (v1.44.x) E2E coverage

**Tasks**:
1. Configure Vitest for Next.js App Router compatibility
2. Set up test utilities and mocks:
   - WebRTC mocks
   - Solana wallet mocks
   - Socket.IO mocks
3. Write unit tests for:
   - WebRTC client (`lib/webrtc/client.ts`)
   - Payment logic (`lib/solana/payments.ts`)
   - State stores (`lib/store/*.ts`)
   - Validation schemas (`lib/validation/*.ts`)
4. Expand Playwright E2E tests:
   - Full call flow (create → join → connect)
   - Wallet connection flow
   - Payment flow (if testnet available)
   - File transfer flow
5. Add test coverage reporting
6. Set up CI/CD test execution

**Deliverables**:
- [ ] `vitest.config.ts` configured
- [ ] `lib/**/__tests__/` with comprehensive unit tests
- [ ] `tests/e2e/` expanded with full flow tests
- [ ] Coverage reports generated
- [ ] CI/CD pipeline runs tests

**Testing Checkpoint**:
- [ ] All unit tests pass: `npm run test`
- [ ] Test coverage > 70% for core logic
- [ ] All E2E tests pass: `npm run test:e2e`
- [ ] Tests run in CI/CD (if applicable)
- [ ] Mock data is realistic and comprehensive

**STOP HERE - Request user approval before proceeding to Stage 8**

---

### STAGE 8: Documentation & Final Validation
**Goal**: Update all documentation, verify version compliance, and perform final system validation

**Tasks**:
1. Update `README.md` with new tech stack information
2. Document all API changes in `docs/API.md`
3. Create migration guide from old to new implementation
4. Verify all dependencies match `config/versions.json` exactly
5. Run full system integration test:
   - Create room → Join room → Connect wallet → Make payment → Transfer file
6. Performance audit:
   - Bundle size analysis
   - Runtime performance
   - Memory leak detection
7. Security audit:
   - Dependency vulnerabilities: `npm audit`
   - OWASP compliance verification
8. Final code review checklist

**Deliverables**:
- [ ] `README.md` updated
- [ ] `docs/API.md` with new APIs
- [ ] `MIGRATION_GUIDE.md` for upgrading
- [ ] `docs/PERFORMANCE.md` with metrics
- [ ] `docs/SECURITY.md` with audit results
- [ ] All versions verified against `config/versions.json`

**Testing Checkpoint**:
- [ ] Full end-to-end flow works: room → wallet → call → payment → file
- [ ] No console errors or warnings
- [ ] Bundle size is acceptable
- [ ] No memory leaks detected
- [ ] All documentation is accurate
- [ ] `npm audit` shows no critical vulnerabilities

**FINAL APPROVAL REQUIRED**

---

## Execution Instructions for Agents

1. **Read First**: 
   - `TECH_STACK_REFERENCE.md` - Understand all libraries and their purposes
   - `config/versions.json` - Verify exact version constraints
   - Current codebase structure

2. **Stage Execution**:
   - Complete ONE stage at a time
   - Implement all tasks in that stage
   - Write tests for that stage
   - Run all tests (unit + E2E)
   - Document changes

3. **Testing Pause**:
   - After completing a stage, STOP
   - Report completion status
   - List all deliverables with checkboxes
   - Request user approval to proceed
   - DO NOT proceed to next stage without approval

4. **Version Compliance**:
   - Before installing any package, check `config/versions.json`
   - Use exact versions specified (e.g., `^14.2.0` for Next.js)
   - If a version conflict arises, report it immediately

5. **Code Quality**:
   - Follow existing code style
   - Use TypeScript strictly (no `any` types)
   - Add JSDoc comments for public APIs
   - Keep functions small and focused

6. **Error Handling**:
   - All async operations must have error handling
   - User-friendly error messages
   - Logging for debugging (use console.error in dev, proper logging in prod)

## Success Criteria

The rebuild is complete when:
- ✅ All 8 stages are completed and tested
- ✅ All dependencies match `config/versions.json`
- ✅ All unit tests pass (>70% coverage)
- ✅ All E2E tests pass
- ✅ No console errors or warnings
- ✅ Documentation is up-to-date
- ✅ Security audit passes
- ✅ Performance is acceptable

## Questions or Issues?

If you encounter:
- Version conflicts → Check `config/versions.json` and report
- Breaking changes → Document in `MIGRATION_GUIDE.md`
- Missing dependencies → Verify against `TECH_STACK_REFERENCE.md`
- Test failures → Fix before proceeding to next stage

**Remember: PAUSE AFTER EACH STAGE FOR TESTING APPROVAL**

