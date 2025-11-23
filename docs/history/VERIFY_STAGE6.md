# Verify Stage 6 — X402 Autopay

## 🌐 Live Deployment

**GitHub Pages URL**: https://trenchchef.github.io/PAY2CHAT/

The Stage 6 implementation is now live on GitHub Pages (deploys automatically from `gh-pages` branch).

## 🏠 Local Testing

### Option 1: Python HTTP Server (Quick)

```bash
cd "/Users/noamrubinstein/Dev Workspaces/PAY2CHAT"
python3 -m http.server 8080
```

Then open in two browser windows:
- **Browser A**: http://localhost:8080/
- **Browser B**: http://localhost:8080/

### Option 2: Node.js Dev Server (With WebSocket Signaling)

```bash
cd "/Users/noamrubinstein/Dev Workspaces/PAY2CHAT"
npm install
npm run dev
```

Starts:
- Static HTTP server on port **8080**
- WebSocket signaling server on port **8888**

## ✅ Stage 6 Verification Checklist

### 1. Billing Timing Test
- [ ] Connect as Host: Create room, set price per minute (e.g., 1.0 USDC/min)
- [ ] Connect as Invitee: Join room, prepay 3 minutes
- [ ] Wait 60 seconds after connection established
- [ ] Verify: Wallet approval prompt appears automatically
- [ ] Verify: Billing status UI shows "⏳ Processing minute payment"

### 2. Payment Flow Test
- [ ] Approve transaction in wallet
- [ ] Verify: Payment succeeds and shows "✓ Minute paid (X.XX USDC total)"
- [ ] Verify: Running total increments correctly
- [ ] Wait another 60 seconds
- [ ] Verify: Next billing cycle triggers automatically

### 3. DataChannel Communication Test
- [ ] Open browser console on both Host and Invitee
- [ ] Verify: Host sees "Remote attempting minute payment" logs
- [ ] Verify: Host sees "Remote minute paid: [txid]" logs
- [ ] Verify: Billing events appear in DataChannel message logs

### 4. Failure Handling Test
- [ ] During billing, reject the transaction in wallet
- [ ] Verify: Video freezes immediately (both local and remote)
- [ ] Verify: Billing status shows "❄️ Video frozen - Payment failed"
- [ ] Verify: Status shows "⚠️ Payment failed, retrying..." after 5 seconds
- [ ] Approve retry transaction
- [ ] Verify: Video unfreezes after successful payment

### 5. Retry Failure Test (Optional - ends call)
- [ ] Reject first billing transaction
- [ ] Reject retry transaction
- [ ] Verify: Status shows "❌ Payment failed - Call ending"
- [ ] Verify: Call ends automatically after 3 seconds

### 6. UI Status Indicator Test
- [ ] Verify: Billing status badge appears in top-right corner
- [ ] Verify: Uses monospace font (JetBrains Mono)
- [ ] Verify: Color coding:
  - Green when paid
  - Amber when pending
  - Red when failed/frozen

### 7. Edge Cases
- [ ] Test with `PAYMENTS_DISABLED: true` in config.js (billing should not start)
- [ ] Test when wallet disconnected during billing
- [ ] Test when connection lost during billing
- [ ] Test insufficient funds scenario

## 🐛 Troubleshooting

### Billing Not Starting
- Check browser console for errors
- Verify `joinHostAddr.value` is filled (invitee role)
- Verify `PAYMENTS_DISABLED` is not set to `true` in config.js
- Verify connection reached 'connected' state

### Video Not Freezing
- Check if video tracks exist: `localStream.getVideoTracks()`
- Check browser console for errors
- Verify `freezeVideo()` function is called on payment failure

### DataChannel Events Not Received
- Check DataChannel state: `dataChannel.readyState === 'open'`
- Check browser console for message parsing errors
- Verify both peers are connected

## 📊 Expected Behavior

### Timeline After Connection
1. **0s**: Connection established, billing status shows "✓ Prepay confirmed - Billing active"
2. **60s**: First automatic billing triggers, wallet approval prompt
3. **60s+5s**: If payment fails, video freezes immediately
4. **60s+10s**: If payment failed, retry automatically triggers
5. **60s+15s**: If retry failed, call ends automatically

### Billing Status Messages
- **Paid**: "✓ Minute paid (X.XX USDC total)" (green)
- **Pending**: "⏳ Processing minute payment (X.XX USDC)..." (amber)
- **Failed**: "⚠️ Payment failed, retrying..." → "❌ Payment failed - Call ending" (red)
- **Frozen**: "❄️ Video frozen - Payment failed" (red)

## 🔗 Quick Links

- **Live Site**: https://trenchchef.github.io/PAY2CHAT/
- **Local Test**: http://localhost:8080/
- **GitHub Repo**: https://github.com/TrenchChef/PAY2CHAT
- **Stage 6 Validation**: See `STAGE6_VALIDATION.md`
- **Code Review**: See `STAGE6_CODE_REVIEW.md`

---

## ✅ Continue to Next Stage

Once Stage 6 is verified working correctly, proceed to:

**Stage 7 — Timer & Timekeeping System**

See `.AGENT_PROMPT.md` lines 169-185 for Stage 7 requirements.

