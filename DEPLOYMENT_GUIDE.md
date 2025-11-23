# Deployment Guide

## Understanding the Architecture

Your application has **two separate components**:

### 1. **Next.js Frontend (Static Export)**
- **Type**: Static HTML/CSS/JS files
- **Build Output**: `out/` directory
- **Server Needed**: ❌ No - just static file hosting
- **Deploy To**: GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.

### 2. **WebRTC Signaling Server**
- **Type**: Node.js WebSocket server
- **File**: `server.js`
- **Port**: 8888 (default)
- **Server Needed**: ✅ Yes - requires a Node.js runtime
- **Deploy To**: Railway, Render, Fly.io, DigitalOcean, AWS, etc.

## The Static Export Build Issue

**Problem**: Next.js with `output: 'export'` requires `generateStaticParams()` for all dynamic routes (`[id]`). The build fails because Next.js expects to pre-render all possible routes at build time, but our routes are generated client-side.

**Current Status**: The build fails, but the dev server works fine. For production, we have two options:

### Option A: Fix Static Export (Recommended for GitHub Pages)
- Keep `output: 'export'`
- Ensure all dynamic routes have `generateStaticParams()`
- Deploy static files to GitHub Pages

### Option B: Use Next.js Server Mode (Recommended for Vercel/Netlify)
- Remove `output: 'export'` from `next.config.js`
- Deploy to Vercel/Netlify (they handle Next.js automatically)
- Better for dynamic routes

## Deployment Options

### Option 1: GitHub Pages (Static Files Only)

**Frontend:**
```bash
# Build static files
npm run build

# Deploy the `out/` directory to GitHub Pages
# GitHub Actions can automate this
```

**Signaling Server:**
- Deploy `server.js` separately to Railway/Render/Fly.io
- Set environment variable: `NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.com`

### Option 2: Vercel (Recommended - Easiest)

**Frontend:**
1. Push code to GitHub
2. Import project in Vercel
3. Vercel auto-detects Next.js and deploys
4. Add environment variable: `NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.com`

**Signaling Server:**
- Deploy separately to Railway/Render

### Option 3: Netlify

**Frontend:**
1. Push code to GitHub
2. Import project in Netlify
3. Build command: `npm run build`
4. Publish directory: `out`
5. Add environment variable: `NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.com`

**Signaling Server:**
- Deploy separately to Railway/Render

## Deploying the Signaling Server

### Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects Node.js
5. Set environment variables:
   - `PORT=8888` (optional, Railway assigns one)
   - `METERED_API_KEY=your_key` (optional)
6. Railway provides a URL like: `your-app.railway.app`
7. Update `NEXT_PUBLIC_SIGNALING_URL` in frontend to: `wss://your-app.railway.app`

### Render

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Build Command**: (leave empty, no build needed)
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Set environment variables:
   - `PORT=10000` (Render uses port 10000)
   - `METERED_API_KEY=your_key` (optional)
6. Render provides a URL
7. Update `NEXT_PUBLIC_SIGNALING_URL` in frontend

### Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Initialize: `fly launch`
4. Create `fly.toml`:
```toml
app = "your-app-name"
primary_region = "iad"

[build]

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 8080
    handlers = ["http"]
```
5. Deploy: `fly deploy`

## Environment Variables

### Frontend (Next.js)
```bash
NEXT_PUBLIC_SIGNALING_URL=wss://your-signaling-server.com
```

### Signaling Server
```bash
PORT=8888  # Optional, defaults to 8888
METERED_API_KEY=your_key  # Optional, for URL shortener
```

## Quick Start: Deploy to Vercel + Railway

### Step 1: Deploy Signaling Server (Railway)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects `server.js`
5. Copy the provided URL (e.g., `your-app.up.railway.app`)

### Step 2: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Import Project → Select your GitHub repo
3. Framework Preset: Next.js (auto-detected)
4. Add Environment Variable:
   - Key: `NEXT_PUBLIC_SIGNALING_URL`
   - Value: `wss://your-app.up.railway.app`
5. Deploy

### Step 3: Update Next.js Config (if using static export)

If you want to keep static export for GitHub Pages, you need to fix the build issue. Otherwise, remove `output: 'export'` for Vercel.

## Testing Your Deployment

1. **Frontend**: Visit your Vercel/Netlify URL
2. **Signaling Server**: Test WebSocket connection:
   ```bash
   wscat -c wss://your-signaling-server.com
   ```
3. **Full Test**: Open two browser windows, connect wallets, create/join room, test video call

## Troubleshooting

### Build Fails with "missing generateStaticParams"
- **Solution A**: Remove `output: 'export'` from `next.config.js` (use Vercel/Netlify)
- **Solution B**: Fix `generateStaticParams()` in all dynamic routes (for GitHub Pages)

### WebRTC Connection Fails
- Check `NEXT_PUBLIC_SIGNALING_URL` is set correctly
- Ensure signaling server is running
- Check WebSocket URL uses `wss://` (secure) not `ws://` (insecure)

### CORS Issues
- Signaling server doesn't need CORS (WebSocket protocol)
- Frontend static files don't need CORS

## Recommended Setup

**For Production:**
- **Frontend**: Vercel (easiest, best Next.js support)
- **Signaling Server**: Railway (easiest Node.js deployment)

**For Development:**
- **Frontend**: `npm run dev` (localhost:3000)
- **Signaling Server**: `node server.js` (localhost:8888)

