# Vercel Deployment Setup Guide

## ✅ Status: Vercel Connected to Repository

Vercel is set up and connected to your repository. Follow these steps to complete the deployment configuration.

## Required Environment Variables

You need to configure these environment variables in Vercel:

### 1. WebRTC Signaling Server URL (Required)

**Variable Name**: `NEXT_PUBLIC_SIGNALING_URL`

**Value Format**: `wss://your-railway-service.up.railway.app`

**How to Get This**:
1. Deploy your Railway service (if not already deployed)
2. Go to Railway dashboard → Your service → Settings → Networking
3. Copy the public domain (e.g., `your-service-production.up.railway.app`)
4. Use `wss://` protocol (secure WebSocket)

**Example**:
```
NEXT_PUBLIC_SIGNALING_URL=wss://pay2chat-signaling-production.up.railway.app
```

### 2. Solana RPC URL (Optional but Recommended)

**Variable Name**: `NEXT_PUBLIC_SOLANA_RPC_URL`

**Value**: `https://api.mainnet-beta.solana.com` (default Solana RPC)

**Or use a custom RPC**:
- QuickNode: `https://your-endpoint.solana-mainnet.quiknode.pro/your-key/`
- Alchemy: `https://solana-mainnet.g.alchemy.com/v2/your-key`
- Helius: `https://mainnet.helius-rpc.com/?api-key=your-key`

**Example**:
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## How to Add Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Select your project

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add or Update Variables**
   - If variable doesn't exist: Click **Add New**
   - If variable already exists: Click on the variable name to edit it
   - Enter variable name (e.g., `NEXT_PUBLIC_SIGNALING_URL`)
   - Enter variable value (e.g., `wss://your-railway-url`)
   - Select environments: **Production**, **Preview**, and **Development**
   - Click **Save**
   
   **Note**: If you see "A variable with the name already exists", click on the existing variable to edit/update its value instead of creating a new one.

4. **Redeploy**
   - After adding variables, go to **Deployments**
   - Click the three dots (⋯) on the latest deployment
   - Select **Redeploy**
   - Or push a new commit to trigger automatic redeploy

## Vercel Configuration Check

### ✅ Verified Configuration

- [x] **Next.js Config**: `next.config.js` is configured for Vercel (no `output: 'export'`)
- [x] **Build Command**: Vercel auto-detects `npm run build`
- [x] **Output Directory**: Vercel auto-detects `.next`
- [x] **Framework**: Vercel auto-detects Next.js

### ⚠️ Required Actions

- [ ] **Add Environment Variables** (see above)
- [ ] **Deploy Railway Service** (if not already deployed)
- [ ] **Get Railway Public URL** (for `NEXT_PUBLIC_SIGNALING_URL`)
- [ ] **Redeploy Vercel** (after adding env vars)

## Deployment Checklist

### Before First Deploy

- [ ] Railway service is deployed and running
- [ ] Railway public URL is obtained
- [ ] Environment variables are added to Vercel
- [ ] All env vars are set for Production, Preview, and Development

### After Deploy

- [ ] Visit Vercel deployment URL
- [ ] Check browser console for errors
- [ ] Verify WebSocket connection to Railway
- [ ] Test creating a room
- [ ] Test joining a room
- [ ] Test WebRTC call connection

## Troubleshooting

### Build Fails

**Check**:
- Vercel build logs for specific errors
- Ensure `package.json` has correct build script
- Verify Next.js version compatibility

### WebSocket Connection Fails

**Check**:
- `NEXT_PUBLIC_SIGNALING_URL` is set correctly
- Railway service is running (check Railway logs)
- URL uses `wss://` not `ws://`
- Railway service is not sleeping (upgrade plan if needed)

### Environment Variables Not Working

**Check**:
- Variables start with `NEXT_PUBLIC_` for client-side access
- Variables are added to all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check browser console: `console.log(process.env.NEXT_PUBLIC_SIGNALING_URL)`

## Quick Setup Commands

If you need to test locally with the same env vars:

```bash
# Create .env.local file
echo "NEXT_PUBLIC_SIGNALING_URL=wss://your-railway-url" > .env.local
echo "NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com" >> .env.local

# Run dev server
npm run dev
```

## Next Steps

1. **Deploy Railway** (if not done):
   - Go to Railway dashboard
   - Create project from GitHub
   - Get public URL

2. **Configure Vercel Environment Variables**:
   - Add `NEXT_PUBLIC_SIGNALING_URL` with Railway URL
   - Add `NEXT_PUBLIC_SOLANA_RPC_URL` (optional)

3. **Redeploy Vercel**:
   - Trigger new deployment
   - Verify deployment succeeds

4. **Test Deployment**:
   - Visit Vercel URL
   - Test full application flow

---

**Status**: Vercel connected ✅ | Environment variables needed ⚠️

