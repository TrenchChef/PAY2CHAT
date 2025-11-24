# Rebuild Wallet Connection & Room Creation Flow - Complete Specification

## Current Problem
The wallet connection flow is broken. Users cannot reliably connect their wallet when creating a room. The connection modal opens but wallets don't connect after selection.

## Tech Stack Context
- **Framework**: Next.js 14 with App Router
- **Wallet Library**: @solana/wallet-adapter-react v0.15+ with @solana/wallet-adapter-react-ui
- **Supported Wallets**: Phantom, Solflare
- **Network**: Solana Mainnet
- **State Management**: Zustand for wallet state, React hooks for UI state

## Core Requirements

### 1. Wallet Connection Flow (MUST WORK)

**User Journey:**
1. User navigates to `/create` page
2. Wallet connection modal **automatically opens** after page loads (300ms delay)
3. User clicks on a wallet (Phantom or Solflare) in the modal
4. User approves connection in wallet extension popup
5. Wallet connects and `publicKey` is available
6. Form automatically advances to rate configuration step

**Technical Requirements:**
- Use `useWallet()` hook from `@solana/wallet-adapter-react`
- Use `useWalletModal()` from `@solana/wallet-adapter-react-ui`
- Modal must use the official `WalletMultiButton` or modal trigger
- Connection must persist across page refreshes (if user previously connected)
- Handle connection errors gracefully with user-friendly messages
- Show loading states during connection

**Files to Modify:**
- `components/CreateRoomForm.tsx` - Main form component
- `components/providers/WalletProvider.tsx` - Wallet provider setup
- `components/providers/ClientProviders.tsx` - Provider wrapper

### 2. CreateRoomForm Component Structure

**Step Flow:**
```
Step 0: Wallet Connection (required first step)
├─ Auto-open wallet modal on mount
├─ Show "Connect Wallet" button if modal closed
├─ Display wallet address and USDC balance when connected
└─ "Continue" button to proceed to step 1

Step 1: Rate Configuration
├─ Per-minute USDC rate input (0.1 - 100)
├─ Checkboxes: allowCamera, allowMic, allowFilePurchasesDuringCall
└─ "Next" button (conditional routing based on file purchases)

Step 2: File Upload (optional, only if file purchases enabled)
├─ FileUploadList component
└─ "Next" button

Step 3: Review & Create
├─ Summary of room configuration
└─ "Create Room" button
```

**State Management:**
```typescript
// Required state
const [step, setStep] = useState(0);
const { publicKey, connecting, wallet, connect } = useWallet();
const { setVisible } = useWalletModal();
const [rate, setRate] = useState(1.0);
const [allowCamera, setAllowCamera] = useState(true);
const [allowMic, setAllowMic] = useState(true);
const [allowFilePurchasesDuringCall, setAllowFilePurchasesDuringCall] = useState(false);
const [files, setFiles] = useState<FileMetadata[]>([]);
```

### 3. WalletProvider Configuration

**Required Setup:**
```typescript
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Configuration
const network = WalletAdapterNetwork.Mainnet;
const endpoint = clusterApiUrl(network);
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

// Provider setup
<ConnectionProvider endpoint={endpoint}>
  <WalletProvider wallets={wallets} autoConnect={false}>
    <WalletModalProvider>
      {children}
    </WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

**Important Notes:**
- `autoConnect={false}` to prevent unwanted auto-connections
- Must wrap all wallet-using components
- Modal provider required for wallet selection UI

### 4. Wallet Connection Implementation

**Auto-Open Modal on Create Page:**
```typescript
useEffect(() => {
  if (!publicKey && !connecting && step === 0) {
    const timer = setTimeout(() => {
      setVisible(true); // Opens wallet modal
    }, 300);
    return () => clearTimeout(timer);
  }
}, [publicKey, connecting, step, setVisible]);
```

**Handle Wallet Selection:**
```typescript
// When wallet is selected from modal, it should automatically connect
// But we can also explicitly handle it:
useEffect(() => {
  if (wallet && !publicKey && !connecting && connect) {
    // Wallet selected but not connected - trigger connection
    connect().catch(error => {
      console.error('Connection failed:', error);
      // Show error to user
    });
  }
}, [wallet, publicKey, connecting, connect]);
```

**Connection Success:**
```typescript
useEffect(() => {
  if (publicKey && step === 0) {
    // Auto-advance to next step when connected
    setStep(1);
  }
}, [publicKey, step]);
```

### 5. Error Handling

**Required Error States:**
- Wallet extension not installed
- User rejected connection
- Connection timeout
- Network errors

**Error Display:**
```typescript
{connectionError && (
  <div className="error-message">
    {connectionError}
    <button onClick={() => setVisible(true)}>Try Again</button>
  </div>
)}
```

### 6. Testing Checklist

**Must Pass:**
- [ ] Navigate to `/create` → Modal opens automatically
- [ ] Click Phantom in modal → Phantom popup appears
- [ ] Approve connection → Wallet connects, form shows address
- [ ] Form advances to rate configuration automatically
- [ ] Refresh page with wallet connected → Wallet remains connected (optional, if implementing persistence)
- [ ] Click "Connect Wallet" manually → Modal opens
- [ ] Reject connection in wallet → Error message shown
- [ ] Disconnect wallet → Returns to step 0

### 7. Code Quality Requirements

**Must Have:**
- Clean, readable code with comments
- Proper TypeScript types
- Error boundaries where appropriate
- Console logging for debugging (can be removed in production)
- No console errors or warnings

**File Structure:**
```
components/
  CreateRoomForm.tsx        # Main form (200-300 lines max)
  providers/
    WalletProvider.tsx      # Wallet adapter setup (50 lines max)
    ClientProviders.tsx     # Provider wrapper (30 lines max)
```

### 8. Implementation Priority

1. **CRITICAL**: Wallet modal opens and wallet connects after selection
2. **HIGH**: Error handling and user feedback
3. **MEDIUM**: Auto-advance to next step after connection
4. **LOW**: Connection persistence across refreshes

## Expected Behavior

**Happy Path:**
1. User clicks "Create Room" from homepage
2. Navigates to `/create`
3. Wallet modal opens automatically
4. User clicks "Phantom" → Phantom popup opens
5. User clicks "Connect" in Phantom → Wallet connects
6. Form shows wallet address and balance
7. User clicks "Continue" → Moves to rate configuration
8. User completes form and creates room

**No manual "Connect Wallet" button clicks should be needed** - the flow should guide the user automatically.

## Debugging Tips

**Check These First:**
1. Is wallet extension installed? (`window.solana` or `window.solflare`)
2. Is wallet provider wrapping the component? (Check component tree)
3. Are wallet adapters properly initialized?
4. Check browser console for errors
5. Check network tab for failed requests

**Common Issues:**
- Modal not opening → Check `setVisible(true)` is called
- Wallet not connecting → Check `connect()` is called after selection
- Stuck on connecting → Check wallet adapter state
- No publicKey → Wallet didn't approve connection

## Success Criteria

The implementation is successful when:
1. ✅ User can create a room without manual intervention (modal auto-opens, wallet connects)
2. ✅ No console errors during the flow
3. ✅ Clear error messages if something fails
4. ✅ Loading states shown during connection
5. ✅ Code is clean and maintainable

---

**Rebuild Instructions:**
1. Start with `WalletProvider.tsx` - get the basic setup working
2. Then `CreateRoomForm.tsx` - implement the step flow
3. Test wallet connection in isolation first
4. Then integrate with room creation flow
5. Add error handling last

**Remember**: The Solana wallet adapter should handle most of the heavy lifting. Your job is to:
- Set it up correctly
- Trigger the modal
- Handle connection state
- Show appropriate UI based on state

