# PAY2CHAT Deployment Instructions

This document provides comprehensive instructions for deploying the PAY2CHAT application.

## 📋 Table of Contents

1. [GitHub Pages Deployment (Recommended)](#github-pages-deployment)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment Options](#production-deployment-options)
4. [Configuration](#configuration)
5. [Verification](#verification)

---

## 🚀 GitHub Pages Deployment (Recommended)

GitHub Pages is the simplest deployment method for this static web application.

### Prerequisites

- Git repository on GitHub
- GitHub Pages enabled on your repository

### Step-by-Step Deployment

1. **Ensure you're on the `gh-pages` branch:**
   ```bash
   git checkout gh-pages
   ```

2. **Make sure all changes are committed:**
   ```bash
   git status
   git add .
   git commit -m "Your deployment message"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin gh-pages
   ```

4. **Enable GitHub Pages (if not already enabled):**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under **Source**, select:
     - **Branch**: `gh-pages`
     - **Folder**: `/ (root)`
   - Click **Save**

5. **Wait for deployment:**
   - GitHub Pages typically deploys within 1-5 minutes
   - Check deployment status at: `https://github.com/YOUR_USERNAME/PAY2CHAT/actions`

6. **Access your deployed application:**
   - URL: `https://YOUR_USERNAME.github.io/PAY2CHAT/`
   - Example: `https://trenchchef.github.io/PAY2CHAT/`

### GitHub Pages Deployment Checklist

- [ ] All files committed to `gh-pages` branch
- [ ] GitHub Pages enabled in repository settings
- [ ] Branch set to `gh-pages` with root folder
- [ ] Deployment successful (check Actions tab)
- [ ] Application accessible at GitHub Pages URL
- [ ] Test WebRTC connection between two browsers
- [ ] Verify wallet connection works
- [ ] Check browser console for errors

---

## 💻 Local Development Setup

For local testing and development, you have several options:

### Option 1: Simple Static Server (WebRTC Only)

Best for testing WebRTC functionality without signaling server:

```bash
# From project root
python3 -m http.server 8080
```

Then open in two browser windows:
- Browser A: `http://localhost:8080/`
- Browser B: `http://localhost:8080/`

**Note**: This requires manual SDP exchange (copy/paste offer/answer).

### Option 2: With WebSocket Signaling Server (Recommended for Development)

Includes automatic signaling for easier testing:

```bash
# Install dependencies (one-time)
npm install

# Start both signaling server + static HTTP server
npm run dev
```

This starts:
- **Static HTTP server** on port `8080`
- **WebSocket signaling server** on port `8888`

Then open:
- Browser A: `http://localhost:8080/`
- Browser B: `http://localhost:8080/`

The signaling server enables automatic offer/answer exchange.

### Option 3: Individual Services

Start services separately:

```bash
# Terminal 1: Signaling server only
npm start
# Runs on port 8888

# Terminal 2: Static server only
npm run serve
# Runs on port 8080
```

### Environment Variables (Optional)

For TURN server credentials or API keys:

1. Create `.env` file (if using dotenv):
   ```bash
   # .env
   METERED_API_KEY=your_key_here
   PORT=8888
   ```

2. Install dotenv:
   ```bash
   npm install dotenv
   ```

3. The server will automatically load `.env` when dotenv is installed.

**⚠️ Important**: Never commit `.env` files. They should be in `.gitignore`.

---

## 🌐 Production Deployment Options

For production deployments beyond GitHub Pages, consider these options:

### Option 1: Static Hosting Services

Deploy to any static hosting service:

- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop `index.html` and related files
- **Cloudflare Pages**: Connect GitHub repository
- **AWS S3 + CloudFront**: Upload files to S3 bucket

**Required files for static deployment:**
- `index.html`
- `webrtc.js`
- `config.js`
- `legal/` directory (privacy.html, tos.html)

### Option 2: Custom Server with Signaling

For production signaling server, deploy `server.js` to:

- **Heroku**: Add `Procfile` with `web: node server.js`
- **Railway**: Connect repository, auto-detects Node.js
- **Render**: Create Web Service, set start command: `node server.js`
- **AWS EC2/ECS**: Run Node.js container with `server.js`
- **Google Cloud Run**: Deploy as containerized service

**Example Heroku deployment:**

```bash
# Create Procfile
echo "web: node server.js" > Procfile

# Deploy
heroku create your-app-name
git push heroku gh-pages:main
```

**Environment variables on hosting platform:**
- `PORT` (usually auto-set by platform)
- `METERED_API_KEY` (optional, for URL shortener)

### Option 3: Serverless Signaling

Use serverless WebSocket services:

- **AWS API Gateway WebSocket**
- **Google Cloud Functions** (with WebSocket support)
- **Cloudflare Workers** (with Durable Objects)

---

## ⚙️ Configuration

### Application Configuration (`config.js`)

Edit `config.js` to customize:

```javascript
window.PAY2CHAT_CONFIG = {
  // Rates (per-minute) in USDC
  MIN_RATE: 0.10,
  MAX_RATE: 100.0,
  DEFAULT_RATE: 1.0,
  
  // Prices for files (USDC)
  MIN_PRICE: 5.0,
  MAX_PRICE: 1000.0,
  DEFAULT_PRICE: 20.0,
  
  // Platform fee percentage
  PLATFORM_FEE_PERCENT: 15,
  
  // Protocol wallet address
  PROTOCOL_WALLET: 'tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW',
  
  // Build toggles
  PAYMENTS_DISABLED: true, // Set to false for production
  AUTO_OFFER_IN_LINK_DEFAULT: false,
  
  // ICE/TURN servers for improved connectivity
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN server for production:
    // { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
  ],
  
  ICE_CANDIDATE_POOL_SIZE: 0
};
```

### Production Configuration Checklist

Before deploying to production:

- [ ] Set `PAYMENTS_DISABLED: false` (if payments should be enabled)
- [ ] Add TURN server credentials to `ICE_SERVERS` (for better connectivity)
- [ ] Update `PROTOCOL_WALLET` with your actual wallet address
- [ ] Adjust rate/price limits as needed
- [ ] Test on multiple networks (mobile, different ISPs)

### TURN Server Setup

For production, add a TURN server to improve WebRTC connectivity:

1. **Get TURN server credentials** from:
   - [Twilio](https://www.twilio.com/stun-turn)
   - [Metered](https://www.metered.ca/stun-turn)
   - Self-hosted (coturn)

2. **Add to `config.js`:**
   ```javascript
   ICE_SERVERS: [
     { urls: 'stun:stun.l.google.com:19302' },
     { 
       urls: 'turn:your-turn-server.com:3478', 
       username: 'your-username', 
       credential: 'your-password' 
     }
   ]
   ```

---

## ✅ Verification

### Post-Deployment Testing

1. **Basic Functionality:**
   - [ ] Page loads without errors
   - [ ] No console errors in browser DevTools
   - [ ] Wallet connection works (Phantom/Solflare)
   - [ ] USDC balance displays correctly

2. **WebRTC Connection:**
   - [ ] Create room in Browser A
   - [ ] Join room in Browser B
   - [ ] Video/audio streams work
   - [ ] DataChannel communication works
   - [ ] Mute/unmute functions work
   - [ ] End call button works

3. **Payment Flow (if enabled):**
   - [ ] Host can create room with price
   - [ ] Invitee can prepay 3 minutes
   - [ ] Payment detection works
   - [ ] Per-minute billing triggers correctly
   - [ ] Timer displays correctly

4. **Cross-Browser Testing:**
   - [ ] Chrome/Edge
   - [ ] Firefox
   - [ ] Safari (if supported)
   - [ ] Mobile browsers

### Troubleshooting

**WebRTC Connection Issues:**
- Ensure TURN server is configured for NAT traversal
- Check browser console for WebRTC errors
- Verify both peers are using HTTPS (required for production)

**Payment Issues:**
- Verify `PAYMENTS_DISABLED` is set correctly
- Check wallet extension is installed
- Verify RPC endpoint is accessible
- Check browser console for Solana/web3 errors

**Signaling Issues:**
- Verify signaling server is running (if using)
- Check WebSocket connection in browser DevTools → Network
- Ensure signaling server URL is correct in client code

---

## 📝 Quick Reference

### Deployment Commands

```bash
# GitHub Pages
git checkout gh-pages
git add .
git commit -m "Deploy"
git push origin gh-pages

# Local development
npm install
npm run dev

# Static server only
python3 -m http.server 8080

# Signaling server only
npm start
```

### Important URLs

- **GitHub Pages**: `https://YOUR_USERNAME.github.io/PAY2CHAT/`
- **Repository**: `https://github.com/YOUR_USERNAME/PAY2CHAT`
- **Deployment Status**: `https://github.com/YOUR_USERNAME/PAY2CHAT/actions`

### File Structure

```
PAY2CHAT/
├── index.html          # Main application
├── webrtc.js          # WebRTC logic
├── config.js          # Configuration
├── server.js          # Signaling server (optional)
├── package.json       # Dependencies
├── legal/             # Legal pages
│   ├── privacy.html
│   └── tos.html
└── scripts/           # Helper scripts
    └── start-dev.js
```

---

## 🔒 Security Considerations

1. **Never commit secrets:**
   - `.env` files
   - API keys
   - TURN server credentials
   - Private keys

2. **HTTPS Required:**
   - WebRTC requires HTTPS in production
   - GitHub Pages provides HTTPS automatically
   - For custom hosting, ensure SSL certificate

3. **CORS Configuration:**
   - Verify CORS settings if using custom signaling server
   - Restrict origins in production

4. **Content Security Policy:**
   - Consider adding CSP headers for production
   - Allow WebRTC and wallet extensions

---

## 📚 Additional Resources

- [WebRTC Documentation](https://webrtc.org/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [TURN Server Setup Guide](https://webrtc.org/getting-started/turn-server)

---

**Last Updated**: 2024
**Maintained By**: PAY2CHAT Development Team

