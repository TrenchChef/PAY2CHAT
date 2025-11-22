# Design Guidelines for x402 P2P Video Chat

## Design Approach
**Reference-Based Approach**: Drawing inspiration from:
- **Discord** - Video call interface patterns
- **Zoom** - Clean meeting layout and controls
- **MetaMask** - Crypto wallet payment flow patterns

This is a utility-focused application requiring efficient video communication with clear payment transparency.

## Core Design Principles
- Dark theme optimized for video chat sessions
- Crypto-native styling with blockchain payment transparency
- Real-time status indicators for connection, payment, and timer states
- Card-based component structure for clear information hierarchy
- Single-page responsive design with modal overlays for payment flows

## Color System
- **Primary**: `#7C3AED` (Purple) - CTAs, active states, branding
- **Secondary**: `#10B981` (Emerald) - Success states, connection indicators
- **Accent**: `#F59E0B` (Amber) - Warnings, timer alerts, attention elements
- **Background**: `#1F2937` (Dark grey) - Main application background
- **Surface**: `#374151` (Medium grey) - Cards, panels, elevated surfaces
- **Text**: `#F9FAFB` (Light) - Primary text and UI labels

## Typography
- **Primary Font**: Inter - UI text, labels, body content
- **Monospace Font**: JetBrains Mono - Wallet addresses, room codes, transaction hashes, pricing
- **Hierarchy**: 
  - Headings: 24px/32px (bold)
  - Body: 14px/16px (regular)
  - Small/Meta: 12px (medium)
  - Monospace data: 14px (medium)

## Layout System
**Spacing Scale**: Use Tailwind units of `2, 4, 8, 12, 16` for consistent rhythm
- Component padding: `p-4` to `p-8`
- Section spacing: `gap-4`, `gap-8`
- Card spacing: `p-6` standard, `p-4` compact

**Container Structure**:
- Max width: `max-w-6xl` for main content
- Modal overlays: `max-w-md` for payment confirmations
- Video grid: Full viewport with responsive breakpoints

## Component Library

### Video Call Interface
- Large video feeds with Discord-style rounded corners (`rounded-lg`)
- Floating control bar at bottom with blur backdrop
- Camera/mic toggles with clear on/off states using emerald/red indicators
- Participant name overlays with semi-transparent backgrounds

### Payment Components
**SplitBreakdown Card**:
- Light surface (`bg-gray-50` or `bg-surface-lighter` in dark mode)
- Emoji indicators (🎥 Host, 🤝 Inviter, 🏗 Platform)
- Percentage breakdown with calculated USD amounts in monospace
- Border with subtle highlight (`border-primary/20`)

**Payment Confirmation Modal**:
- Center-screen overlay with backdrop blur
- Clear split visualization before wallet approval
- Chain indicator badge
- Large approve button in primary color

### Timer & Status
**Countdown Display**:
- Large monospace numerals (32px+)
- Color transitions: Emerald → Amber (< 60s) → Red (< 10s)
- Pulsing animation for critical warnings
- WebSocket sync indicator (small dot)

**Status Indicators**:
- Connection status: Green dot (connected), Amber (connecting), Red (disconnected)
- Payment status: Badge system with color coding
- Real-time updates with smooth transitions

### Input & Forms
- Dark input fields with light borders (`border-gray-600`)
- Focus states in primary purple with glow
- Wallet address inputs use monospace font
- Checkbox for invite code with clear label

### Buttons
- Primary: Purple bg, white text, hover brighten
- Secondary: Transparent with purple border, hover fill
- Danger: Red for disconnect/end session
- All buttons: `px-6 py-3`, `rounded-lg`, medium weight

### Room Creation/Join
- Card-based split layout for Create vs Join options
- Room code display in large monospace (`text-2xl`)
- Copy button with success feedback
- Shareable invite link with referrer parameter handling

## Responsive Behavior
- **Desktop**: Side-by-side video feeds, sidebar for chat/controls
- **Tablet**: Stacked video with persistent bottom controls
- **Mobile**: Full-screen video, slide-up payment drawer

## Images
No hero images required - this is a functional application. Use:
- Wallet provider logos (MetaMask, Phantom) at 24px in connection UI
- Blockchain network icons (ETH, SOL) in payment selection
- Abstract gradient backgrounds for empty states only

## Key User Flows Visual Patterns
1. **Landing**: Two-card choice (Create Room / Join Room) centered on dark background
2. **Payment Modal**: Full-screen overlay → Split breakdown → Wallet approval → Loading → Success
3. **Active Call**: Video dominant → Timer overlay top-right → Controls bottom center → Refill modal on timer warning
4. **Refill**: Slide-up drawer on mobile, centered modal on desktop, same split visualization pattern

## Animation Guidelines
- Minimal animations - prioritize performance during video calls
- Timer countdown: Smooth color transitions only
- Modal entry/exit: Fast fade (150ms)
- Connection status: Pulse for connecting state
- No hover animations on video controls - instant state changes