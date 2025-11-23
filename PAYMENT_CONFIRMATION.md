# Payment System Confirmation

## ✅ Implemented Features

### 1. 3-Minute Prepayment
- **Status**: ✅ Implemented
- **Location**: `components/JoinRoomForm.tsx`
- **Flow**:
  1. Invitee joins room and sees room details
  2. Must prepay for 3 minutes before joining call
  3. Prepayment amount = `rate × 3` USDC
  4. Payment is split 85% to host, 15% to platform
  5. Once prepayment is confirmed, invitee can join the call

### 2. Payment Split (85/15)
- **Status**: ✅ Implemented
- **Location**: 
  - `lib/utils/paymentSplit.ts` - Split calculation utilities
  - `lib/solana/payments.ts` - Split payment transaction creation
  - `lib/hooks/usePayments.ts` - Payment hooks with split support

- **Split Details**:
  - **Host receives**: 85% of all payments
  - **Platform receives**: 15% of all payments
  - Applies to:
    - 3-minute prepayment
    - Per-minute billing (when implemented)

### 3. Platform Wallet
- **Status**: ✅ Configured
- **Location**: `lib/utils/paymentSplit.ts`
- **Configuration**: 
  - Uses `NEXT_PUBLIC_PLATFORM_WALLET` environment variable
  - Default placeholder: `11111111111111111111111111111111`
  - **⚠️ IMPORTANT**: Set this to your actual platform wallet address in production

## Payment Flow

### Prepayment Flow:
1. Invitee clicks "Join Room"
2. Enters room code/URL
3. Sees room details with rate (e.g., 1.0 USDC/min)
4. Must prepay: `1.0 × 3 = 3.0 USDC`
5. Payment split:
   - Host gets: `3.0 × 0.85 = 2.55 USDC`
   - Platform gets: `3.0 × 0.15 = 0.45 USDC`
6. Once confirmed, can join call

### Per-Minute Billing (Future):
- Each minute: `rate × 1` USDC
- Split: 85% host, 15% platform
- Automatic every 60 seconds

## Environment Variables

Add to your `.env.local` or deployment platform:

```bash
NEXT_PUBLIC_PLATFORM_WALLET=tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW
```

**Note**: This is the same wallet address for all deployments (dev, staging, production).

## Testing Checklist

- [ ] Prepayment required before joining call
- [ ] Prepayment amount = rate × 3
- [ ] Payment split correctly (85/15)
- [ ] Transaction confirms before allowing call join
- [ ] Platform wallet receives 15%
- [ ] Host wallet receives 85%
- [ ] Error handling for failed payments
- [ ] Insufficient balance handling

## Notes

- All payments use Solana USDC transfers
- Transactions are on-chain and irreversible
- Platform wallet must be set before production use
- Split is calculated with 6 decimal precision (USDC standard)

