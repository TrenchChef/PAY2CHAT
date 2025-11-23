# X402Chat - Next.js Implementation

This is the complete Next.js rebuild of the x402Chat application with the full user flow as specified.

## Project Structure

```
/app
  /page.tsx              # Home page with Action Screen
  /create/page.tsx       # Create Room flow
  /join/page.tsx         # Join Room flow
  /room/[id]/
    /host/page.tsx       # Host Lobby
    /call/page.tsx       # In-Call UI
    /host/post-call/page.tsx    # Host Post-Call
    /invitee/post-call/page.tsx # Invitee Post-Call

/components
  ConnectWalletButton.tsx    # Global wallet button
  ConsentModal.tsx           # First-load consent
  ActionScreen.tsx           # Create/Join selection
  CreateRoomForm.tsx         # Multi-step room creation
  FileUploadList.tsx         # File upload with encryption
  HostLobby.tsx              # Host waiting room
  JoinRoomForm.tsx           # Join room + pre-call lobby
  CallUI.tsx                 # In-call interface
  TipModal.tsx               # Tip host modal
  FilePurchaseModal.tsx      # Purchase files modal
  PostCallHost.tsx           # Host earnings summary
  PostCallInvitee.tsx        # Invitee receipt

/lib
  /store
    useWalletStore.ts        # Wallet state (Zustand)
    useRoomStore.ts          # Room state
    useCallStore.ts          # Call state
  /solana
    wallet.ts                # Wallet utilities
    payments.ts              # Payment functions
  /room
    createRoom.ts            # Room creation logic
    joinRoom.ts              # Room joining logic
  /webrtc
    client.ts                # WebRTC peer connection
  /files
    encrypt.ts               # File encryption
    decrypt.ts               # File decryption + time-limited URLs
  /hooks
    usePayments.ts           # Payment hook with wallet adapter
  /utils
    time.ts                  # Time formatting
```

## Features Implemented

### ✅ Global Wallet Connection
- Always-visible Connect Wallet button in header
- Supports Phantom, Solflare, Backpack
- Wallet state managed globally

### ✅ Consent Modal
- Shows on first load only
- Requires all 4 checkboxes:
  - Age confirmation (18+)
  - Terms of Service
  - Privacy Policy
  - Responsibility acknowledgment
- Stores consent in localStorage

### ✅ Action Screen
- Two cards: Create Room / Join Room
- Wallet enforcement (opens wallet selector if not connected)

### ✅ Create Room Flow
1. **Room Configuration**
   - Per-minute USDC rate (0.1-100)
   - Description (multiline)
   - Toggles: camera, mic, screen share, pre-call file purchases

2. **File Upload**
   - Upload files with encryption
   - Set price per file
   - Visibility flags (before/during/after call)

3. **Create Room**
   - Generates room ID and join code
   - Creates room URL
   - Redirects to Host Lobby

### ✅ Host Lobby
- Displays room URL and join code
- Copy buttons for both
- File list with prices
- Editable description (rate/files locked)
- Auto-navigates to call when invitee joins

### ✅ Join Room Flow
1. **Join Screen**
   - Enter room code or paste URL
   - Wallet enforcement

2. **Pre-Call Lobby**
   - Shows host wallet (short form)
   - Rate display
   - Description
   - Visible files list
   - Agreement checkboxes
   - "Agree & Join Call" button

### ✅ In-Call UI
- **Shared Components**
  - Local/remote video feeds
  - Call timer (elapsed time)
  - Next payment countdown
  - Mute/unmute, camera toggle
  - End call button

- **Host Controls**
  - See tips incoming
  - See file purchases
  - Real-time earnings

- **Invitee Controls**
  - Tip Host (1/5/10 USDC or custom)
  - Purchase Files (during call)
  - Time-limited download URLs

### ✅ Post-Call Screens

**Host:**
- Earnings summary (minutes, tips, file sales)
- Total earnings
- Share on Twitter button

**Invitee:**
- Final receipt (minutes, tips, files)
- Final tip modal
- Post-call file purchases
- Total spent

### ✅ File Security
- Client-side encryption (AES-GCM)
- Time-limited download URLs (5 minutes)
- URLs invalid after use
- No server storage

### ✅ WebRTC Integration
- P2P peer connection
- Data channel for signaling
- ICE candidate handling
- Signaling server support (WebSocket)

### ✅ Solana Payments
- USDC transfers via SPL Token
- Tip host function
- File purchase function
- Transaction confirmation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (create `.env.local`):
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:3001
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Export static site (for GitHub Pages):
```bash
npm run export
```

## Key Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **@solana/wallet-adapter** - Wallet integration
- **WebRTC** - P2P video/audio
- **Web Crypto API** - File encryption

## Notes

- Room data is stored in localStorage (replace with on-chain/server in production)
- File encryption happens client-side
- WebRTC signaling requires a WebSocket server (see `server.js`)
- All payments use USDC on Solana mainnet
- Static export configured for GitHub Pages deployment

## Next Steps for Production

1. Replace localStorage with on-chain room storage
2. Implement smart contracts for billing, tips, file purchases
3. Add TURN server for better connectivity
4. Implement proper error handling and retries
5. Add analytics and monitoring
6. Set up CI/CD for deployments

