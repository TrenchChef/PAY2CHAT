# Pay2Chat

A fully serverless, peer-to-peer video chat application with Solana USDC payments, X402 automatic per-minute billing, accurate timekeeping, and encrypted P2P file sales. All logic runs entirely in the browser. No backend, no database, no cloud services.

## Technologies
- WebRTC (media + data channels)
- Solana USDC transfers
- X402 (automated per-minute billing protocol)

## Build Stages
1. WebRTC P2P Call Core
2. Basic Call UI
3. Wallet Connection (Solana)
4. USDC Transfer Engine
5. Upfront Payment (3-Minute Prepayment)
6. X402 Automatic Per-Minute Billing
7. Timer & Timekeeping System
8. Billing + Timer UI
9. File Sales (P2P via WebRTC DataChannel)
10. UI & UX Polish
11. Consent Modal

See copilot-instructions.md in `.github/` for agent build rules and validation checklists.
