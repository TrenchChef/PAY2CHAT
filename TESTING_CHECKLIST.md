# PAY2CHAT Testing Checklist

## Wallet Extension Testing

### Desktop Extension Detection

#### Phantom Wallet
- [ ] Install Phantom extension in Chrome
- [ ] Visit site - verify Phantom appears in wallet modal
- [ ] Click Phantom - verify extension popup opens
- [ ] Approve connection - verify wallet connects
- [ ] Verify wallet address displays correctly
- [ ] Verify USDC balance loads
- [ ] Test on Firefox (if Phantom supports it)
- [ ] Test on Edge

#### Solflare Wallet
- [ ] Install Solflare extension in Chrome
- [ ] Visit site - verify Solflare appears in wallet modal
- [ ] Click Solflare - verify extension popup opens
- [ ] Approve connection - verify wallet connects
- [ ] Verify wallet address displays correctly
- [ ] Verify USDC balance loads
- [ ] Test on Firefox (if Solflare supports it)
- [ ] Test on Edge

#### Backpack Wallet
- [ ] Install Backpack extension in Chrome
- [ ] Visit site - verify Backpack appears in wallet modal
- [ ] Click Backpack - verify extension popup opens
- [ ] Approve connection - verify wallet connects
- [ ] Verify wallet address displays correctly
- [ ] Verify USDC balance loads

#### Glow Wallet
- [ ] Install Glow extension in Chrome
- [ ] Visit site - verify Glow appears in wallet modal
- [ ] Click Glow - verify extension popup opens
- [ ] Approve connection - verify wallet connects
- [ ] Verify wallet address displays correctly
- [ ] Verify USDC balance loads

### WalletConnect Testing

#### Desktop (QR Code)
- [ ] Visit site on desktop
- [ ] Verify WalletConnect appears in wallet modal
- [ ] Click WalletConnect - verify QR code displays
- [ ] Scan QR code with mobile wallet app
- [ ] Verify connection completes
- [ ] Verify wallet address displays
- [ ] Verify USDC balance loads

#### Mobile (Deep Linking)
- [ ] Visit site on mobile device
- [ ] Verify WalletConnect appears in wallet modal
- [ ] Click WalletConnect - verify wallet app opens automatically
- [ ] Approve connection in wallet app
- [ ] Verify redirect back to browser
- [ ] Verify connection completes
- [ ] Verify wallet address displays
- [ ] Verify USDC balance loads
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome

## Payment Flow Testing

### Prepay Flow
- [ ] Create room as host
- [ ] Set rate (e.g., 1 USDC/min)
- [ ] Join room as invitee
- [ ] Verify prepay modal appears
- [ ] Verify prepay amount is 3x rate (3 USDC for 1 USDC/min)
- [ ] Approve prepay transaction
- [ ] Verify payment confirmation
- [ ] Verify call starts after prepay

### Per-Minute Billing
- [ ] Start call after prepay
- [ ] Wait 60 seconds
- [ ] Verify automatic payment fires
- [ ] Verify payment confirmation appears
- [ ] Verify timer updates correctly
- [ ] Wait another 60 seconds
- [ ] Verify second automatic payment fires
- [ ] Verify running total updates

### Payment Failure Handling
- [ ] Start call with low balance
- [ ] Wait for first minute payment
- [ ] Verify payment fails
- [ ] Verify video freezes immediately
- [ ] Verify retry option appears
- [ ] Add funds and retry
- [ ] Verify call resumes
- [ ] Test second failure - verify call ends

## Ad Blocker Detection Testing

### Detection
- [ ] Enable uBlock Origin
- [ ] Visit site - verify ad blocker modal appears
- [ ] Verify modal blocks all interaction
- [ ] Verify "I've disabled my ad blocker" button works
- [ ] Disable ad blocker
- [ ] Click "I've disabled" - verify recheck passes
- [ ] Verify modal dismisses
- [ ] Verify consent modal appears

### Dismissal
- [ ] Enable ad blocker
- [ ] Visit site - verify modal appears
- [ ] Click "Continue anyway"
- [ ] Verify modal dismisses
- [ ] Verify warning message about service not working
- [ ] Refresh page - verify modal doesn't reappear (dismissed state persists)

### Different Ad Blockers
- [ ] Test with uBlock Origin
- [ ] Test with AdBlock Plus
- [ ] Test with AdGuard
- [ ] Test with Privacy Badger
- [ ] Verify no false positives (works when ad blocker is off)

## End-to-End Flow Testing

### Full Call Flow
- [ ] Host creates room
- [ ] Host sets rate
- [ ] Host shares room code/link
- [ ] Invitee joins room
- [ ] Invitee connects wallet
- [ ] Invitee completes prepay
- [ ] Call connects (WebRTC)
- [ ] Audio/video works
- [ ] Per-minute billing works
- [ ] Timer displays correctly
- [ ] Either party can end call
- [ ] Post-call summary displays

### File Sales Flow
- [ ] Host uploads file
- [ ] Host sets price
- [ ] Invitee views file list
- [ ] Invitee purchases file
- [ ] Payment completes
- [ ] File transfers via DataChannel
- [ ] Invitee receives and downloads file

## Cross-Platform Testing

### Desktop Browsers
- [ ] Chrome (Windows)
- [ ] Chrome (macOS)
- [ ] Chrome (Linux)
- [ ] Firefox (Windows)
- [ ] Firefox (macOS)
- [ ] Edge (Windows)

### Mobile Devices
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile responsive design
- [ ] Touch interactions work

## Error Handling Testing

### Wallet Errors
- [ ] Test connection rejection
- [ ] Test insufficient funds
- [ ] Test network errors
- [ ] Test wrong network
- [ ] Verify error messages are clear

### Payment Errors
- [ ] Test transaction rejection
- [ ] Test insufficient balance
- [ ] Test RPC failures
- [ ] Verify retry mechanisms work

### WebRTC Errors
- [ ] Test connection failures
- [ ] Test reconnection logic
- [ ] Test ICE candidate failures
- [ ] Verify error recovery

## Performance Testing

### Load Times
- [ ] Initial page load < 3 seconds
- [ ] Wallet connection < 2 seconds
- [ ] Payment confirmation < 5 seconds
- [ ] Call establishment < 5 seconds

### Stability
- [ ] Call stable for 10+ minutes
- [ ] No memory leaks
- [ ] Timer accuracy maintained
- [ ] No UI freezing

## Security Testing

### Wallet Security
- [ ] Private keys never exposed
- [ ] Transactions require explicit approval
- [ ] No auto-approval of transactions
- [ ] Connection requires user action

### Data Privacy
- [ ] No data sent to servers
- [ ] All communication P2P
- [ ] Files encrypted in transit
- [ ] No tracking or analytics

