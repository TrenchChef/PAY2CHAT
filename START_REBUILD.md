# START REBUILD - Agent Instructions

## 🎯 Your Mission
Rebuild Pay2Chat using the modern tech stack. You are starting from **STAGE 1**. Complete ONE stage at a time, then STOP for approval.

## 📚 Required Reading (Read These First)

1. **`TECH_STACK_REFERENCE.md`** - Complete library documentation and versions
2. **`config/versions.json`** - STRICT version constraints (MUST match exactly)
3. **`MULTI_AGENT_REBUILD_PROMPT.md`** - Full rebuild plan with all 8 stages

## ⚠️ Critical Rules

1. **STOP AFTER EACH STAGE** - Complete stage, test, then request approval before proceeding
2. **Version Compliance** - All dependencies MUST match `config/versions.json` exactly
3. **Preserve UI** - Keep existing TailwindCSS UI; only rebuild logic layers
4. **TypeScript Only** - No `any` types, strict typing required
5. **Test Everything** - Write Vitest unit tests + update Playwright E2E tests

## 🚀 START HERE: STAGE 1

### STAGE 1 — WebRTC Migration → simple-peer

**Goal**: Migrate from native WebRTC API to `simple-peer` (v9.x)

**Your Tasks**:
1. ✅ Read `TECH_STACK_REFERENCE.md` section on simple-peer
2. ✅ Check `config/versions.json` - verify `simple-peer: "9.x"`
3. ✅ Install `simple-peer@^9.11.1` (or latest 9.x)
4. ✅ Refactor `lib/webrtc/client.ts` to use `simple-peer` instead of native `RTCPeerConnection`
5. ✅ Maintain existing API: `initialize()`, `connect()`, `disconnect()`, `sendData()`
6. ✅ Preserve DataChannel functionality
7. ✅ Create `lib/webrtc/schemas.ts` with Zod (v3.x) validation for signaling messages
8. ✅ Write Vitest unit tests: `lib/webrtc/__tests__/client.test.ts`
9. ✅ Update Playwright E2E tests to verify call establishment
10. ✅ Run tests: `npm run test` and `npm run test:e2e`

**Deliverables Checklist**:
- [ ] `simple-peer@9.x` installed (verify in package.json)
- [ ] `lib/webrtc/client.ts` refactored to use simple-peer
- [ ] `lib/webrtc/schemas.ts` with Zod schemas for signaling
- [ ] `lib/webrtc/__tests__/client.test.ts` (Vitest unit tests)
- [ ] All existing E2E tests pass
- [ ] Manual test: Two browser windows can establish a call
- [ ] Manual test: DataChannel messages work

**Testing Requirements**:
- [ ] Unit tests pass: `npm run test`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Manual test: Create room → Join room → Call connects
- [ ] Manual test: DataChannel sends/receives messages

## 🛑 STOP POINT

After completing Stage 1:
1. ✅ All deliverables checked off
2. ✅ All tests passing
3. ✅ Manual testing successful
4. **STOP and report completion**
5. **Request user approval to proceed to Stage 2**

**DO NOT proceed to Stage 2 without explicit approval.**

## 📋 Quick Reference

**Key Files to Modify**:
- `lib/webrtc/client.ts` - Main WebRTC client
- `lib/webrtc/turnCredentials.ts` - TURN server config (keep as-is)
- `package.json` - Add simple-peer dependency

**Key Files to Create**:
- `lib/webrtc/schemas.ts` - Zod validation schemas
- `lib/webrtc/__tests__/client.test.ts` - Unit tests

**Version Check**:
```bash
# Verify simple-peer version matches config/versions.json
npm list simple-peer
# Should show 9.x.x
```

## 🆘 If You Get Stuck

1. **Version conflicts?** → Check `config/versions.json` and report
2. **API changes?** → Check `TECH_STACK_REFERENCE.md` for simple-peer docs
3. **Tests failing?** → Fix before requesting approval
4. **Unclear requirements?** → Read `MULTI_AGENT_REBUILD_PROMPT.md` Stage 1 details

## ✅ Success Criteria for Stage 1

- ✅ `simple-peer@9.x` integrated
- ✅ WebRTC calls work with simple-peer
- ✅ DataChannel functional
- ✅ Zod validation in place
- ✅ Unit tests written and passing
- ✅ E2E tests updated and passing
- ✅ Manual testing successful

**Ready? Start with Step 1 above!**

