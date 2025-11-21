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

## Quick dev build: Call-only (payments disabled)

This workspace now includes a build-mode that disables payments and prepay gating so you can test pure WebRTC call flows locally.

To run the local static server and test on two devices/browsers:

1. Start a local static server from the project root:

```bash
python3 -m http.server 8080
```

2. Open two browsers or two profiles (e.g., Chrome normal + Chrome incognito, or laptop + phone on same network):
 - In browser A, go to `http://<your-machine-ip>:8080/` (or `http://localhost:8080/` if testing on same machine).
 - Click `Create Room` → `Begin` to create an offer. Use the Host flow to copy the Offer.
 - In browser B, go to the same URL and click `Join Room` → `Begin`, then paste the Host's Offer and generate/copy the Answer.
 - Paste the Answer back into the Host (or use the embedded invite link flow if you enabled "Include Offer in Link").
 - Once the offer/answer are applied both sides should reach the `connected` state and media will flow.

Notes and troubleshooting:
- Payments are disabled in this build; UI elements related to Prepay, Tip, and Send USDC are hidden or disabled.
- For callers behind NATs or mobile networks, use a TURN server (add credentials to `config.js` under `PAY2CHAT_CONFIG.ICE_SERVERS`) for reliable connectivity.
- If copy/paste signaling is tedious, consider enabling the on-chain memo publish via `window.signaling.publishOfferOnchain(roomCode, payload)`, but be aware this costs SOL and is public on-chain.

If you want I can:
- Wire a simple on-screen "Publish Offer on-chain" button for hosts (shows tx link).
- Add TURN server entries to `config.js` and apply them to the PeerConnection for improved connectivity.
- Create a small ephemeral WebSocket signaling example (requires optional tiny server).

## Ephemeral WebSocket signaling (recommended for reliable auto-join)

For reliable automatic offer/answer exchange, run the included minimal WebSocket signaling server locally. It is ephemeral and stateless and just forwards messages between peers in the same room.

Files added:
- `server.js` — minimal Node `ws` server that forwards JSON messages between peers in a room.

Run locally (from project root):

```bash
# install dependencies
npm init -y
npm install ws

# run signaling server
node server.js
```

Signaling client usage (in the browser console):

- Connect and join a room: `window.signaling.connectWebsocket('ws://<host>:8888', 'ROOM123')`
- Host: after creating an offer call `window.signaling.sendOfferToRoom('ROOM123')` (this will send your `pc.localDescription` to the room).
- Guest: connect to the same room, the client will auto-create an answer when it receives an `offer` and send `answer` back.

Notes:
- This server is intended for local/dev use only. It is a tiny example that helps you get automatic signaling without building full infra.
- For production, use a managed WebSocket or ephemeral serverless WebSocket (e.g., WebSocket on Cloud Run, AWS API Gateway + WebSocket, or a small Heroku/Vercel server). Keep auth in mind.

### Local env & secrets (safe handling)

This project intentionally avoids committing secrets. To provide a metered API key or other secrets to the signaling server locally, do one of the following:

- Option A (recommended): create a `.env` from the example and install `dotenv`:

```bash
cp .env.example .env
# edit .env and set METERED_API_KEY
npm install dotenv
node server.js
```

- Option B: export the env var directly in your shell (no files written):

```bash
export METERED_API_KEY="your_key_here"
node server.js
```

The server logs whether the key was detected but does not print the secret. Do NOT commit `.env` — it is in `.gitignore`.

## TURN / STUN

To improve connectivity across mobile and restrictive NATs, add STUN/TURN entries to `config.js` under `PAY2CHAT_CONFIG.ICE_SERVERS`. Example:

```js
window.PAY2CHAT_CONFIG.ICE_SERVERS = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
];
window.PAY2CHAT_CONFIG.ICE_CANDIDATE_POOL_SIZE = 10;
```

When you add TURN credentials, the client will include them when creating the `RTCPeerConnection` and this significantly increases the chance of successful connections across networks.

