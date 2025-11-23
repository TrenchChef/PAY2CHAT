# Testing Links - PAY2CHAT

## 🌐 GitHub Pages (Live Deployment)

**Main Link**: https://trenchchef.github.io/PAY2CHAT/

If the repository has GitHub Pages enabled on the `gh-pages` branch, this should be your live deployment link.

## 🏠 Local Testing

### Option 1: Python HTTP Server (Simple)

From the project root directory:

```bash
python3 -m http.server 8080
```

Then open in two browser windows/tabs:
- **Browser A**: http://localhost:8080/
- **Browser B**: http://localhost:8080/

Or from another device on the same network:
- **Browser A**: http://localhost:8080/
- **Browser B**: http://<your-local-ip>:8080/

### Option 2: Node.js Dev Server (Includes WebSocket Signaling)

From the project root:

```bash
# Install dependencies first (one time)
npm install

# Start both signaling server + static HTTP server
npm run dev
```

This starts:
- Static HTTP server on port **8080**
- WebSocket signaling server on port **8888**

Then open:
- **Browser A**: http://localhost:8080/
- **Browser B**: http://localhost:8080/

### Option 3: Direct File Access

You can also open `index.html` directly in a browser (less reliable for WebRTC).

## 📋 Testing Checklist

### Stage 1-2: WebRTC Core + Call UI
1. Open two browser windows (or use Chrome normal + incognito)
2. In Browser A: Click "Create Room" → "Begin" to create an offer
3. Copy the Offer SDP from Browser A
4. In Browser B: Click "Join Room" → Paste the Offer
5. Generate Answer in Browser B and copy it
6. Paste Answer back into Browser A
7. Verify both sides reach "connected" state
8. Test mute, camera toggle, and end call buttons

### Stage 3: Wallet Connection
1. Connect Phantom or Solflare wallet
2. Verify wallet address displays
3. Verify USDC balance loads
4. Test network switching (mainnet/devnet)

### Stage 4: USDC Transfer (Test Mode)
1. Connect wallet with USDC balance
2. Enter recipient address and amount
3. Click "Send USDC (test)"
4. Approve transaction in wallet
5. Verify success message with transaction ID

### Stage 5: Upfront Prepay
1. **Host**: Connect wallet, enter price per minute, click "Create Room"
2. **Invitee**: Paste invite link/code, enter host address and price
3. **Invitee**: Click "Prepay 3 minutes" and approve transaction
4. **Host**: Wait for payment detection (polls every 5 seconds)
5. **Invitee**: Should be able to create answer after prepay succeeds
6. **Host**: Should only accept connection after payment detected

## 🔧 Troubleshooting

### WebRTC Connection Issues
- Ensure both browsers are on the same network (or use TURN server)
- Check browser console for WebRTC errors
- Try different browsers (Chrome/Edge recommended)

### Payments Disabled Mode
- If `PAYMENTS_DISABLED: true` in `config.js`, payment features are hidden
- This allows testing pure WebRTC flows without wallet setup

### Wallet Connection Issues
- Ensure Phantom/Solflare browser extension is installed
- Try refreshing the page after connecting wallet
- Check browser console for wallet errors

### Signaling Issues
- For automatic signaling, use the WebSocket signaling server (`npm run dev`)
- Or use manual copy/paste SDP exchange (more reliable)

## 📝 Quick Test Commands

```bash
# Start local server
python3 -m http.server 8080

# Or with WebSocket signaling
npm run dev

# Check if server is running
curl http://localhost:8080/
```

## 🔗 Related Links

- Repository: https://github.com/TrenchChef/PAY2CHAT
- GitHub Pages: https://trenchchef.github.io/PAY2CHAT/



