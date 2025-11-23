# Payment System Confirmation

## ✅ Confirmed Implementation

### 1. Host Wallet
- **Source**: The wallet connected by the host when creating a room
- **Storage**: Stored in `room.hostWallet` when room is created
- **Usage**: Receives 85% of all payments:
  - 3-minute prepayment (85% of prepayment amount)
  - Per-minute X402 billing (85% of each minute's rate)
  - Tips (85% of tip amount)
  - File sales (85% of file price)

### 2. Platform Wallet
- **Configuration**: `NEXT_PUBLIC_PLATFORM_WALLET` environment variable
- **Important**: **SAME wallet for ALL deployments** (dev, staging, production)
- **Usage**: Receives 15% of ALL transactions on the platform:
  - 3-minute prepayment (15% of prepayment amount)
  - Per-minute X402 billing (15% of each minute's rate)
  - Tips (15% of tip amount)
  - File sales (15% of file price)

### 3. Payment Split (85/15)
All payments are split using a single transaction with two transfers:
- **85%** → Host wallet (connected when room created)
- **15%** → Platform wallet (same for all deployments)

## Transaction Types

### 1. 3-Minute Prepayment
- **Amount**: `rate × 3` USDC
- **Split**:
  - Host: `(rate × 3) × 0.85` USDC
  - Platform: `(rate × 3) × 0.15` USDC
- **Location**: `components/JoinRoomForm.tsx`
- **Function**: `usePayments().prepayForCall()`

### 2. Per-Minute X402 Billing
- **Amount**: `rate × 1` USDC (every 60 seconds)
- **Split**:
  - Host: `rate × 0.85` USDC
  - Platform: `rate × 0.15` USDC
- **Function**: `usePayments().payPerMinute()`

### 3. Tips
- **Amount**: User-specified USDC
- **Split**:
  - Host: `amount × 0.85` USDC
  - Platform: `amount × 0.15` USDC
- **Location**: `components/TipModal.tsx`
- **Function**: `usePayments().tipHost()`

### 4. File Sales
- **Amount**: File price in USDC
- **Split**:
  - Host: `price × 0.85` USDC
  - Platform: `price × 0.15` USDC
- **Location**: `components/FilePurchaseModal.tsx`
- **Function**: `usePayments().purchaseFile()`

## Implementation Details

### Files Updated:
1. `lib/utils/paymentSplit.ts` - Platform wallet constant and split calculations
2. `lib/solana/payments.ts` - `createSplitPaymentTransaction()` function
3. `lib/hooks/usePayments.ts` - All payment functions use split:
   - `prepayForCall()` ✅
   - `payPerMinute()` ✅
   - `tipHost()` ✅
   - `purchaseFile()` ✅

### Room Creation:
- Host wallet is captured from `useWallet().publicKey` when room is created
- Stored in `room.hostWallet` field
- Used for all subsequent payments in that room

## Environment Variable

```bash
# Platform wallet address (SAME for dev, staging, and production)
NEXT_PUBLIC_PLATFORM_WALLET=tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW
```

**Note**: The code defaults to this address if the environment variable is not set, but it's recommended to set it explicitly via environment variable for clarity.

## Verification Checklist

- [x] Host wallet = wallet connected when room created
- [x] Platform wallet = same for all deployments
- [x] 3-minute prepayment uses 85/15 split
- [x] Per-minute billing uses 85/15 split
- [x] Tips use 85/15 split
- [x] File sales use 85/15 split
- [x] All payments use single transaction with two transfers
- [x] Platform wallet receives 15% of all transactions

