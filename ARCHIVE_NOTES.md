# Archive Notes - Pre-Rebuild State

**Archive Date:** $(date +%Y-%m-%d)
**Archive Branch:** `archive/pre-rebuild-{timestamp}`
**Commit:** Latest commit before rebuild

## Current Features and Functionality

### Core Features
- WebRTC P2P video/audio chat with manual SDP exchange
- WebSocket signaling server for automatic offer/answer exchange
- Solana wallet integration (Phantom, Solflare, Backpack, Glow, WalletConnect)
- USDC payment processing
- X402 automatic per-minute billing
- Encrypted P2P file sales via WebRTC DataChannel
- Call timers and timekeeping system
- Room creation and joining flows
- Host and Invitee post-call screens

### Frontend Structure
- **Next.js 14** with App Router
- **Pages:**
  - `/` - Landing page
  - `/create` - Create room page
  - `/join` - Join room page
  - `/room/[id]/host` - Host lobby
  - `/room/[id]/call` - Active call page
  - `/room/[id]/host/post-call` - Host post-call
  - `/room/[id]/invitee/post-call` - Invitee post-call

### Components
- `ActionScreen.tsx` - Action screen component
- `AdBlockerModal.tsx` - Ad blocker detection modal
- `CallUI.tsx` - Main call UI component
- `ConnectWalletButton.tsx` - Wallet connection button
- `ConsentModal.tsx` - User consent modal
- `ConsentModalWrapper.tsx` - Consent modal wrapper
- `CreateRoomForm.tsx` - Room creation form
- `CustomWalletSelector.tsx` - Custom wallet selector
- `ErrorBoundary.tsx` - Error boundary component
- `FilePurchaseModal.tsx` - File purchase modal
- `FileUploadList.tsx` - File upload list
- `Footer.tsx` - Footer component
- `HostLobby.tsx` - Host lobby component
- `JoinRoomForm.tsx` - Join room form
- `NavBar.tsx` - Navigation bar
- `PostCallHost.tsx` - Host post-call screen
- `PostCallInvitee.tsx` - Invitee post-call screen
- `Spinner.tsx` - Loading spinner
- `TipModal.tsx` - Tip modal

### Providers
- `AdBlockerProvider.tsx` - Ad blocker detection
- `ClientProviders.tsx` - Main client providers wrapper
- `ConsentProvider.tsx` - Consent state management
- `WalletConnectionHandler.tsx` - Wallet connection handler
- `WalletProvider.tsx` - Solana wallet provider

### Backend
- **server.js** - Minimal WebSocket signaling server
  - Port: 8888 (configurable via PORT env var)
  - Protocol: JSON messages (join, offer, answer, candidate, peer-joined)
  - Ephemeral and stateless

### Libraries and Utilities
- **lib/webrtc/** - WebRTC client and TURN credentials
- **lib/solana/** - Solana wallet and payment utilities
- **lib/store/** - Zustand stores (call, room, wallet)
- **lib/hooks/** - Custom React hooks (billing, payments)
- **lib/room/** - Room creation and joining logic
- **lib/files/** - File encryption/decryption
- **lib/utils/** - Utility functions (payment split, room sharing, time)

### Styling
- **Tailwind CSS** with custom dark theme
- **Color Scheme:**
  - Primary: #7C3AED (purple)
  - Secondary: #10B981 (green)
  - Accent: #F59E0B (amber)
  - Background: #181c20 (dark)
  - Surface: #1F2937 (dark gray)
- **Fonts:** Inter (sans), JetBrains Mono (mono)

## Dependencies and Versions

### Core Dependencies
- `next`: ^14.0.0
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `typescript`: ^5.3.0

### Solana Dependencies
- `@solana/web3.js`: ^1.87.0
- `@solana/wallet-adapter-react`: ^0.15.35
- `@solana/wallet-adapter-react-ui`: ^0.9.35
- `@solana/wallet-adapter-phantom`: ^0.9.23
- `@solana/wallet-adapter-solflare`: ^0.6.23
- `@solana/wallet-adapter-backpack`: ^0.1.4
- `@solana/wallet-adapter-glow`: ^0.1.18
- `@solana/wallet-adapter-walletconnect`: ^0.1.21
- `@solana/wallet-adapter-wallets`: ^0.19.26
- `@solana/spl-token`: ^0.3.9
- `@coinbase/cdp-solana-standard-wallet`: ^0.0.67

### WebRTC & Networking
- `ws`: ^8.16.0 (WebSocket server)

### Utilities
- `zustand`: ^4.4.7 (state management)
- `x402-fetch`: ^0.7.3 (X402 billing protocol)
- `lz-string`: ^1.4.4 (compression)
- `clsx`: ^2.0.0 (class utilities)
- `class-variance-authority`: ^0.7.0
- `tailwind-merge`: ^2.2.0

### Development Dependencies
- `@playwright/test`: ^1.40.0 (E2E testing)
- `tailwindcss`: ^3.4.0
- `postcss`: ^8.4.32
- `autoprefixer`: ^10.4.16
- `eslint`: ^8.56.0
- `eslint-config-next`: ^14.0.0
- `dotenv`: ^16.3.1

## Environment Variables

### Required
- None (all optional)

### Optional
- `PORT` - WebSocket server port (default: 8888)
- `METERED_API_KEY` - Reserved for future URL shortener integration (not currently used)

### Next.js Environment
- `.env.local` - Local environment variables (not committed)

## Known Issues

1. **TURN_SERVER_TESTING.md** - Modified but not fully documented
2. Various deployment documentation files may contain outdated information
3. Some console errors may exist (see CONSOLE_ERRORS_EXPLAINED.md if present)

## Build Configuration

### Next.js Config
- React Strict Mode: enabled
- Image optimization: unoptimized (for static export compatibility)
- Webpack fallbacks for Node.js modules (fs, net, tls)
- Webpack alias to suppress pino-pretty warning

### TypeScript Config
- Standard Next.js TypeScript configuration
- Path aliases: `@/` points to project root

### Tailwind Config
- Content paths: `./pages/**/*`, `./components/**/*`, `./app/**/*`
- Custom color theme defined
- Custom font families (Inter, JetBrains Mono)

## Multiagent System

### x402chat Agents
Located in `x402chat/` directory:
- `x402MetaRunner` - Orchestrates all agents
- `x402TechAudit` - Technical audit and dependency analysis
- `x402Fixer` - Automatic fixes for common issues
- `x402SecScan` - Security scanning
- `x402Refactorer` - Code refactoring
- `x402Finisher` - Final polish and validation
- `x402Rollback` - Version control and rollback
- `x402ProgressReporter` - Progress tracking
- `x402AgentLogDashboard` - Agent activity dashboard

### Installation
Run `x402chat/install_all.sh` to install agents to `.cursor/agents/`

## Testing

### E2E Tests
- Playwright test suite in `tests/e2e/`
- Test files cover ad blocker detection, navigation, wallet connection, room creation/joining

### Test Scripts
- `npm run test:e2e` - Run all tests
- `npm run test:e2e:ui` - Run with UI
- `npm run test:e2e:headed` - Run in headed mode
- `npm run test:e2e:debug` - Debug mode

## Deployment

### Platforms Supported
- Vercel (primary)
- Railway
- Static export (GitHub Pages compatible)

### Build Artifacts
- `out/` - Static export output
- `.next/` - Next.js build cache

## Project Structure Summary

```
PAY2CHAT/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── create/           # Create room page
│   ├── join/             # Join room page
│   ├── room/[id]/        # Room pages (host, call, post-call)
│   └── globals.css       # Global styles
├── components/            # React components
│   └── providers/        # Context providers
├── lib/                   # Utilities and business logic
│   ├── files/           # File encryption/decryption
│   ├── hooks/           # Custom React hooks
│   ├── room/            # Room logic
│   ├── solana/          # Solana utilities
│   ├── store/           # Zustand stores
│   ├── utils/           # General utilities
│   └── webrtc/          # WebRTC client
├── x402chat/            # Multiagent system
│   ├── agents/          # Agent definitions
│   └── install_all.sh   # Installation script
├── server.js            # WebSocket signaling server
├── package.json         # Dependencies
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

## Notes for Rebuild

1. **Preserve:** Frontend structure, backend server, styling, multiagent system
2. **Rebuild:** WebRTC core, payment logic, billing logic following PROJECT INSTRUCTIONS.md
3. **Follow:** 11-stage build process strictly in order
4. **Validate:** Each stage must be complete before proceeding
5. **Maintain:** P2P architecture, no backend dependencies, browser-only logic

