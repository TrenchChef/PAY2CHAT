# Vercel Environment Variables - Quick Reference

## ✅ Variable Already Exists

If you see the message: **"A variable with the name `NEXT_PUBLIC_SIGNALING_URL` already exists"**

This means the variable is already configured. Here's what to do:

## About "Branch is undefined"

If you see **"branch is undefined"** in Vercel environment variables:

**This is CORRECT and NORMAL!** ✅

- "undefined" means the variable is set for **all environments** (Production, Preview, Development)
- This is the **recommended setup** for `NEXT_PUBLIC_*` variables
- You don't need to change anything
- The variable will work in all deployments

### Option 1: Update Existing Variable

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Find** `NEXT_PUBLIC_SIGNALING_URL` in the list
3. **Click on the variable name** to edit it
4. **Update the value** with your Railway URL:
   - Format: `wss://your-railway-service.up.railway.app`
   - Make sure it uses `wss://` (secure WebSocket)
5. **Verify environments** are selected (Production, Preview, Development)
6. **Save** the changes
7. **Redeploy** your application

### Option 2: Check Current Value

1. **View the variable** in the Environment Variables list
2. **Verify** it has the correct Railway URL
3. If it's correct, you're done! ✅
4. If it's incorrect or pointing to localhost, update it (see Option 1)

## Required Variables Checklist

### ✅ `NEXT_PUBLIC_SIGNALING_URL`
- **Status**: Already exists (needs verification/update)
- **Value Should Be**: `wss://your-railway-service.up.railway.app`
- **Current Value**: Check in Vercel dashboard
- **Action**: Verify or update if needed

### ⚠️ `NEXT_PUBLIC_SOLANA_RPC_URL`
- **Status**: Check if exists
- **Value**: `https://api.mainnet-beta.solana.com` (or custom RPC)
- **Action**: Add if missing, or verify value

## How to Get Railway URL

1. **Go to Railway Dashboard**
2. **Select your service** (the signaling server)
3. **Go to Settings** → **Networking**
4. **Copy the public domain** (e.g., `your-service-production.up.railway.app`)
5. **Add `wss://` prefix** → `wss://your-service-production.up.railway.app`

## After Updating Variables

1. **Redeploy** your Vercel application:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on latest deployment
   - Select **Redeploy**
   - Or push a new commit to trigger auto-deploy

2. **Verify** the new value is used:
   - Check deployment logs
   - Test the application
   - Check browser console for WebSocket connection

## Troubleshooting

### Variable Not Updating
- Make sure you **saved** the changes
- **Redeploy** after updating
- Check that you updated the correct environment (Production/Preview/Development)

### Wrong URL Format
- Must use `wss://` not `ws://` (secure WebSocket)
- No trailing slash
- Should be: `wss://domain.up.railway.app`

### Variable Not Working
- Ensure variable name starts with `NEXT_PUBLIC_` for client-side access
- Check browser console: `console.log(process.env.NEXT_PUBLIC_SIGNALING_URL)`
- Verify Railway service is running and accessible

---

**Quick Action**: Go to Vercel → Settings → Environment Variables → Click on `NEXT_PUBLIC_SIGNALING_URL` → Update value → Save → Redeploy

