# Testing Instructions - Rebuilt Pay2Chat (Stages 1-4)

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **npm** or **yarn**
3. **Two browser windows/tabs** (or two devices) for WebRTC testing
4. **Solana wallet** (Phantom, Solflare, Backpack, or Glow) for wallet testing

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the WebSocket Signaling Server

The signaling server enables automatic offer/answer exchange. Start it in a separate terminal:

```bash
node server.js
```

The server will run on port 8888 by default. You should see:
```
Pay2Chat signaling server running on port 8888
```

### 3. Start the Next.js Development Server

In a new terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing Stages

---

## Stage 1: WebRTC P2P Call Core

**Goal:** Test pure WebRTC connection with manual SDP exchange (no payments, no wallet)

### Test 1.1: Manual SDP Exchange (No Signaling Server)

1. Open two browser windows/tabs:
   - Window A: `http://localhost:3000/room/test-room-123/call`
   - Window B: `http://localhost:3000/room/test-room-123/call`

2. **In Window A (Host):**
   - Wait for local video to appear
   - Copy the "Offer" SDP description from the textarea
   - The offer should appear automatically when the page loads

3. **In Window B (Invitee):**
   - Paste the Offer into the "Paste Offer here" textarea
   - Click "Set Remote Description"
   - Copy the "Answer" SDP description that appears

4. **Back in Window A:**
   - Paste the Answer into the "Paste Answer here" textarea
   - Click "Set Remote Description"

5. **Expected Result:**
   - Connection state should change to "CONNECTED" (green)
   - Remote video should appear in both windows
   - Audio should work (test by speaking)

### Test 1.2: Data Channel Communication

1. Once connected (from Test 1.1):
   - In either window, type a message in the "Data Channel Test" input
   - Click "Send Message" or press Enter
   - **Expected:** Message should appear in the "Messages" section of the other window

2. Test bidirectional communication:
   - Send messages from both windows
   - **Expected:** All messages should appear in both windows

### Test 1.3: Connection Stability

1. Establish a connection (from Test 1.1)
2. Keep the call active for at least 10 minutes
3. **Expected:**
   - Video/audio should remain stable
   - Connection state should stay "CONNECTED"
   - No disconnections or freezes

### Test 1.4: Reconnection Logic

1. Establish a connection
2. Temporarily disable your network (or close one browser tab)
3. Re-enable network (or refresh the page)
4. **Expected:**
   - The client should attempt to reconnect
   - Connection should restore automatically

---

## Stage 2: Basic Call UI

**Goal:** Test the call UI with controls (mute, camera, end call)

### Test 2.1: Video Display

1. Navigate to a call page: `http://localhost:3000/room/test-room-123/call`
2. **Expected:**
   - Local video should appear in the left panel
   - Remote video area should show "Waiting for remote video..." until connected
   - Both videos should be properly sized and centered

### Test 2.2: Mute/Unmute

1. Establish a connection (from Stage 1)
2. Click the "Mute" button
3. **Expected:**
   - Button should change to "🔇 Unmute"
   - Your audio should be muted (test by speaking - other side shouldn't hear)
4. Click "Unmute"
5. **Expected:**
   - Button should change back to "🎤 Mute"
   - Audio should work again

### Test 2.3: Camera Toggle

1. Establish a connection
2. Click "Turn Off Camera"
3. **Expected:**
   - Button should change to "📷 Turn On Camera"
   - Local video should show "Video Off" overlay
   - Remote side should see black screen or placeholder
4. Click "Turn On Camera"
5. **Expected:**
   - Video should resume
   - Button should change back to "📹 Turn Off Camera"

### Test 2.4: End Call

1. Establish a connection
2. Click "End Call" button
3. **Expected:**
   - Should redirect to home page (`/`)
   - Connection should be cleaned up
   - No errors in console

### Test 2.5: Connection State Indicator

1. Navigate to call page
2. **Expected:**
   - Connection state should show in header
   - States should be:
     - "Connecting" (yellow) - when establishing connection
     - "Connected" (green) - when connected
     - "Failed" (red) - if connection fails
     - "Disconnected" (gray) - when not connected

---

## Stage 3: Wallet Connection (Solana)

**Goal:** Test wallet connection, USDC balance reading, and network validation

### Test 3.1: Wallet Connection

1. Navigate to any page (e.g., `http://localhost:3000`)
2. **Expected:**
   - Wallet modal should auto-open (if no wallet connected)
   - Or wallet connection button should be visible

3. Connect a wallet:
   - Select Phantom, Solflare, Backpack, or Glow
   - Approve connection in wallet extension
4. **Expected:**
   - Wallet address should appear (truncated format: `xxxx...xxxx`)
   - USDC balance should load and display
   - No errors in console

### Test 3.2: USDC Balance Display

1. Connect a wallet (from Test 3.1)
2. **Expected:**
   - Balance should show as "X.XX USDC"
   - If balance is 0, should show "0.00 USDC"
   - Balance should update if you have USDC in wallet

### Test 3.3: Network Validation

1. Connect a wallet on mainnet
2. **Expected:**
   - No network error should appear
   - Wallet should work normally

3. (Optional) Test wrong network:
   - Switch wallet to devnet/testnet
   - **Expected:**
     - Network error should appear: "Please switch to mainnet-beta network"
     - Error should be visible in red text below wallet address

### Test 3.4: Wallet Disconnect

1. Connect a wallet
2. Click "Disconnect" button
3. **Expected:**
   - Wallet should disconnect
   - Address and balance should disappear
   - No errors in console

---

## Stage 4: USDC Transfer Engine

**Goal:** Test low-level USDC transfer functionality (not integrated into call flow yet)

### Test 4.1: Create Test Transfer Function

Since Stage 4 is not yet integrated into the UI, you'll need to test it via browser console or create a simple test page.

#### Option A: Browser Console Test

1. Navigate to any page with wallet connected
2. Open browser console (F12)
3. Run this test code:

```javascript
// Import the transfer function (adjust path as needed)
import { transferUSDC } from '@/lib/solana/payments';
import { useWallet } from '@solana/wallet-adapter-react';

// This would need to be in a React component context
// For now, test the function structure
```

#### Option B: Create Simple Test Component

Create a test page at `app/test-transfer/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { transferUSDC, TransferErrorCode } from '@/lib/solana/payments';

export default function TestTransferPage() {
  const { publicKey, signTransaction } = useWallet();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!publicKey || !signTransaction) {
      setResult({ error: 'Wallet not connected' });
      return;
    }

    if (!toAddress) {
      setResult({ error: 'Please enter recipient address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const toPubkey = new PublicKey(toAddress);
      const result = await transferUSDC({
        from: publicKey,
        to: toPubkey,
        amount: parseFloat(amount),
        signTransaction,
      });

      setResult(result);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-text">Test USDC Transfer</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-text">
              Recipient Address:
            </label>
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              className="w-full p-2 bg-surface rounded border border-border text-text"
              placeholder="Enter Solana address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-text">
              Amount (USDC):
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full p-2 bg-surface rounded border border-border text-text"
            />
          </div>

          <button
            onClick={handleTransfer}
            disabled={loading || !publicKey}
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Send USDC'}
          </button>

          {result && (
            <div className={`p-4 rounded ${
              result.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
            }`}>
              {result.success ? (
                <div>
                  <p>✅ Transfer successful!</p>
                  <p className="text-sm mt-2">Signature: {result.signature}</p>
                  <a
                    href={`https://solscan.io/tx/${result.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline mt-2 inline-block"
                  >
                    View on Solscan
                  </a>
                </div>
              ) : (
                <div>
                  <p>❌ Transfer failed</p>
                  <p className="text-sm mt-2">Error: {result.error?.message}</p>
                  <p className="text-xs mt-1">Code: {result.error?.code}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Test 4.2: Transfer Success

1. Connect wallet with USDC balance
2. Enter a valid recipient address (another wallet you control)
3. Enter amount (e.g., 0.1 USDC)
4. Click "Send USDC"
5. Approve transaction in wallet
6. **Expected:**
   - Success message with transaction signature
   - Link to view on Solscan
   - Balance should decrease

### Test 4.3: Insufficient Funds Error

1. Connect wallet with low/no USDC balance
2. Enter recipient address
3. Enter amount larger than balance
4. Click "Send USDC"
5. **Expected:**
   - Error message: "Insufficient USDC balance"
   - Error code: `INSUFFICIENT_FUNDS`
   - No transaction sent

### Test 4.4: User Rejection

1. Connect wallet
2. Enter recipient and amount
3. Click "Send USDC"
4. **Reject** the transaction in wallet popup
5. **Expected:**
   - Error message: "Transaction was rejected by user"
   - Error code: `USER_REJECTED`
   - No transaction sent

### Test 4.5: Retry Logic

1. Temporarily disconnect internet
2. Attempt transfer
3. Reconnect internet
4. **Expected:**
   - Function should retry automatically (up to 3 times)
   - Should eventually succeed or show network error

---

## Integration Testing

### Test All Stages Together

1. **Start servers:**
   ```bash
   # Terminal 1
   node server.js

   # Terminal 2
   npm run dev
   ```

2. **Test full flow:**
   - Connect wallet (Stage 3)
   - Navigate to call page
   - Establish WebRTC connection (Stage 1)
   - Test UI controls (Stage 2)
   - (Stage 4 can be tested separately via test page)

---

## Troubleshooting

### WebRTC Connection Issues

- **No remote video:** Check that both windows are on the same page
- **Connection fails:** Try using TURN servers (configure in `lib/webrtc/turnCredentials.ts`)
- **Data channel not working:** Check browser console for errors

### Wallet Connection Issues

- **Wallet not detected:** Make sure wallet extension is installed and enabled
- **Balance not loading:** Check network connection and RPC endpoint
- **Network validation fails:** Ensure wallet is on mainnet

### Transfer Issues

- **Transaction fails:** Check you have enough SOL for fees (not just USDC)
- **RPC errors:** Try a different RPC endpoint via `NEXT_PUBLIC_SOLANA_RPC_URL`
- **Timeout:** Increase retry count or check network connection

---

## Expected Console Output

### Successful WebRTC Connection:
```
Data channel opened
Signaling WebSocket connected
Connection state: connected
```

### Successful Wallet Connection:
```
✅ Wallet connected
Balance loaded: X.XX USDC
```

### Successful Transfer:
```
Transfer initiated
Transaction signed
Transaction confirmed
Transfer successful: [signature]
```

---

## Next Steps

After testing Stages 1-4, the remaining stages (5-11) will integrate these components:
- **Stage 5:** Integrate prepayment into join flow
- **Stage 6:** X402 automatic per-minute billing
- **Stage 7:** Timer and timekeeping
- **Stage 8:** Billing UI integration
- **Stage 9:** File sales
- **Stage 10:** UI polish
- **Stage 11:** Consent modal

---

## Notes

- All tests should be done on **mainnet** for production-like testing
- Use **testnet** for initial development if preferred (update RPC endpoint)
- Keep browser console open to see detailed logs
- Test on different browsers (Chrome, Firefox, Safari) for compatibility

