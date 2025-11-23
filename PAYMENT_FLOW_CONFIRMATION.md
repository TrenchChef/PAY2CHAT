# Payment Flow & Disbursement Confirmation

## Overview

This document confirms how user payments work throughout the PAY2CHAT platform and how payments are disbursed between the host and platform.

## Payment Split Structure

**All payments use an 85/15 split:**
- **85%** → Host wallet (the wallet connected when the room was created)
- **15%** → Platform wallet (same wallet for all deployments)

**Platform Wallet Address:**
- Default: `tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW`
- Configurable via: `NEXT_PUBLIC_PLATFORM_WALLET` environment variable
- **Important**: Same wallet for dev, staging, and production

## Payment Types & Flow

### 1. 3-Minute Prepayment (Required Before Call)

**When:** Before invitee can join the call  
**Who Pays:** Invitee (person joining the room)  
**Who Receives:** Host (85%) + Platform (15%)

**Amount Calculation:**
```
Prepayment Amount = Rate per Minute × 3
```

**Disbursement:**
- Host receives: `(Rate × 3) × 0.85` USDC
- Platform receives: `(Rate × 3) × 0.15` USDC

**Example:**
- Rate: 10 USDC/minute
- Prepayment: 30 USDC total
- Host: 25.50 USDC (85%)
- Platform: 4.50 USDC (15%)

**Flow:**
1. Invitee enters room code/URL
2. System displays prepayment requirement
3. Invitee clicks "Prepay" button
4. Wallet approval prompt appears
5. Transaction sent to Solana blockchain
6. Two transfers in single transaction:
   - 85% to host wallet
   - 15% to platform wallet
7. Transaction confirmed on-chain
8. "Join Call" button becomes available
9. Invitee can now join the call

**Location:** `components/JoinRoomForm.tsx` (line 163)

---

### 2. Automatic Per-Minute Billing (X402)

**When:** Every 60 seconds after the 3-minute prepay period  
**Who Pays:** Invitee (person in the call)  
**Who Receives:** Host (85%) + Platform (15%)

**Timing:**
- First billing: 180 seconds (3 minutes) after call starts
- Subsequent billings: Every 60 seconds thereafter
- Note: First 3 minutes are covered by prepayment

**Amount Calculation:**
```
Per-Minute Amount = Rate per Minute × 1
```

**Disbursement:**
- Host receives: `Rate × 0.85` USDC per minute
- Platform receives: `Rate × 0.15` USDC per minute

**Example:**
- Rate: 10 USDC/minute
- Per-minute charge: 10 USDC
- Host: 8.50 USDC (85%)
- Platform: 1.50 USDC (15%)

**Flow:**
1. Call starts (after prepayment)
2. Timer counts down to first billing (3 minutes)
3. At 3 minutes: First automatic billing triggers
4. Wallet approval prompt appears (if not auto-approved)
5. Transaction sent to Solana blockchain
6. Two transfers in single transaction:
   - 85% to host wallet
   - 15% to platform wallet
7. Transaction confirmed on-chain
8. Billing status updates to "Paid"
9. Process repeats every 60 seconds

**Failure Handling:**
- If payment fails: Video freezes immediately
- Retry: Single retry after 5 seconds
- If retry fails: Call ends after 3 seconds

**Location:** `lib/hooks/useBilling.ts`

---

### 3. Tips (Optional)

**When:** During the call (invitee can tip host)  
**Who Pays:** Invitee  
**Who Receives:** Host (85%) + Platform (15%)

**Amount:** User-specified USDC amount

**Disbursement:**
- Host receives: `Tip Amount × 0.85` USDC
- Platform receives: `Tip Amount × 0.15` USDC

**Example:**
- Tip: 50 USDC
- Host: 42.50 USDC (85%)
- Platform: 7.50 USDC (15%)

**Flow:**
1. Invitee clicks "Tip" button during call
2. Modal opens with amount input
3. Invitee enters tip amount
4. Wallet approval prompt appears
5. Transaction sent to Solana blockchain
6. Two transfers in single transaction:
   - 85% to host wallet
   - 15% to platform wallet
7. Transaction confirmed on-chain
8. Tip notification sent to host

**Location:** `components/TipModal.tsx`

---

### 4. File Sales (Optional)

**When:** During or after the call (if host enabled file sales)  
**Who Pays:** Invitee (purchasing file)  
**Who Receives:** Host (85%) + Platform (15%)

**Amount:** File price set by host

**Disbursement:**
- Host receives: `File Price × 0.85` USDC
- Platform receives: `File Price × 0.15` USDC

**Example:**
- File price: 100 USDC
- Host: 85.00 USDC (85%)
- Platform: 15.00 USDC (15%)

**Flow:**
1. Invitee clicks "Files" button during call
2. Modal opens showing available files
3. Invitee selects file to purchase
4. Wallet approval prompt appears
5. Transaction sent to Solana blockchain
6. Two transfers in single transaction:
   - 85% to host wallet
   - 15% to platform wallet
7. Transaction confirmed on-chain
8. Encrypted file sent via WebRTC DataChannel
9. File decrypted and downloaded by invitee

**Location:** `components/FilePurchaseModal.tsx`

---

## Complete Call Payment Timeline

### Example: 10-minute call at 10 USDC/minute

**Time 0:00 - Prepayment (Before Call)**
- Invitee pays: 30 USDC (3 minutes × 10 USDC/min)
- Host receives: 25.50 USDC (85%)
- Platform receives: 4.50 USDC (15%)
- **Status:** Call can now start

**Time 3:00 - First Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 4 covered

**Time 4:00 - Second Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 5 covered

**Time 5:00 - Third Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 6 covered

**Time 6:00 - Fourth Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 7 covered

**Time 7:00 - Fifth Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 8 covered

**Time 8:00 - Sixth Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 9 covered

**Time 9:00 - Seventh Automatic Billing**
- Invitee pays: 10 USDC (1 minute)
- Host receives: 8.50 USDC (85%)
- Platform receives: 1.50 USDC (15%)
- **Status:** Minute 10 covered

**Total for 10-minute call:**
- **Invitee paid:** 100 USDC total
  - Prepayment: 30 USDC
  - Per-minute billing: 70 USDC (7 minutes)
- **Host received:** 85.00 USDC (85%)
- **Platform received:** 15.00 USDC (15%)

---

## Technical Implementation

### Payment Transaction Structure

All payments use a **single Solana transaction** with **two transfer instructions**:

```typescript
Transaction {
  Instruction 1: Transfer 85% to Host Wallet
  Instruction 2: Transfer 15% to Platform Wallet
}
```

**Function:** `createSplitPaymentTransaction()` in `lib/solana/payments.ts`

### Payment Functions

All payment functions use the split payment structure:

1. **`prepayForCall()`** - 3-minute prepayment
   - Location: `lib/hooks/usePayments.ts` (line 81)
   - Called from: `components/JoinRoomForm.tsx` (line 163)

2. **`payPerMinute()`** - Automatic per-minute billing
   - Location: `lib/hooks/usePayments.ts` (line 113)
   - Called from: `lib/hooks/useBilling.ts` (line 94)

3. **`tipHost()`** - Tips
   - Location: `lib/hooks/usePayments.ts` (line 24)
   - Called from: `components/TipModal.tsx`

4. **`purchaseFile()`** - File sales
   - Location: `lib/hooks/usePayments.ts` (line 51)
   - Called from: `components/FilePurchaseModal.tsx`

### Wallet Addresses

**Host Wallet:**
- Captured when room is created
- Stored in `room.hostWallet`
- Used for all payments in that room

**Platform Wallet:**
- Constant: `tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW`
- Same for all deployments (dev, staging, production)
- Defined in: `lib/utils/paymentSplit.ts` (line 17)

---

## Payment Verification

### On-Chain Verification

All payments are:
- ✅ Executed on Solana blockchain
- ✅ Confirmed before proceeding
- ✅ Visible in Solana explorer
- ✅ Immutable and verifiable

### Transaction Signatures

Each payment returns a transaction signature (txid) that can be:
- Viewed on Solana explorer
- Verified on-chain
- Used for dispute resolution

### Payment Tracking

The application tracks:
- Total paid by invitee (displayed in UI)
- Billing status (paid/pending/failed/frozen)
- Transaction IDs for all payments

---

## Summary

### Payment Flow Summary

1. **Prepayment (Required)**
   - Amount: Rate × 3 USDC
   - Split: 85% host, 15% platform
   - Timing: Before call starts

2. **Automatic Billing (Every 60 seconds)**
   - Amount: Rate × 1 USDC per minute
   - Split: 85% host, 15% platform
   - Timing: Starts at 3 minutes, then every 60 seconds

3. **Tips (Optional)**
   - Amount: User-specified
   - Split: 85% host, 15% platform
   - Timing: Anytime during call

4. **File Sales (Optional)**
   - Amount: File price
   - Split: 85% host, 15% platform
   - Timing: During or after call

### Disbursement Summary

**All payments:**
- Use single transaction with two transfers
- 85% to host wallet (room creator)
- 15% to platform wallet (same for all deployments)
- Confirmed on Solana blockchain before proceeding
- Fully transparent and verifiable

---

**Last Updated:** 2024  
**Status:** ✅ Confirmed and Implemented

