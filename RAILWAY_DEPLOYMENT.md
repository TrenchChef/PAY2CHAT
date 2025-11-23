# Railway Deployment Guide for Pay2Chat Signaling Server

## Overview

This service deploys **only** the WebSocket signaling server (`server.js`), NOT the Next.js frontend application.

## Quick Deploy

1. **Connect Repository to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `PAY2CHAT` repository

2. **Configure Service**
   - Railway will auto-detect Node.js
   - The `nixpacks.toml` and `railway.json` files will configure the build
   - **Start Command**: `node server.js` (automatically set)

3. **Set Environment Variables**
   - Go to your service → "Variables" tab
   - Add these variables:
     ```
     PORT=8888
     METERED_API_KEY=your_key_here (optional)
     ```
   - **Note**: Railway automatically provides `PORT`, but you can override it

4. **Deploy**
   - Railway will automatically deploy on push to your connected branch
   - Or click "Deploy" to trigger a manual deployment

## Configuration Files

### `railway.json`
- Uses **Railpack** builder (better Node.js support than Nixpacks)
- Specifies the start command: `node server.js`
- Sets restart policy for failures

### `nixpacks.toml`
- Lets Nixpacks auto-detect Node.js from `package.json`
- Installs all dependencies (needed for `ws` package)
- Skips Next.js build (only runs signaling server)
- **Note**: Used as fallback if Railpack isn't available

### `Dockerfile`
- Fallback option if Railpack/Nixpacks fail
- Uses Node.js 20 Alpine image
- Minimal setup for signaling server only

### `railway.toml`
- Alternative Railway configuration format
- Specifies build and deploy settings

## Environment Variables

### Required
- `PORT` - Railway automatically provides this, defaults to 8888 if not set

### Optional
- `METERED_API_KEY` - For Metered API integration (optional feature)

## Troubleshooting

### Build Fails with Next.js Errors
**Problem**: Railway tries to build Next.js application

**Solution**: 
- Railway is configured to use **Railpack** builder (better Node.js support)
- If Railpack fails, Railway will fall back to Dockerfile
- Ensure `railway.json` has correct start command
- Verify `nixpacks.toml` skips Next.js build

### Build Fails with "undefined variable 'nodejs-20_x'"
**Problem**: Nixpacks package name error

**Solution**: 
- Fixed: Removed invalid package name from `nixpacks.toml`
- Railway now uses Railpack builder (more reliable)
- Nixpacks will auto-detect Node.js from `package.json`
- Dockerfile is available as fallback

### Server Won't Start
**Problem**: `node server.js` fails

**Solution**:
- Check Railway logs for error messages
- Verify `ws` package is installed (check `package.json`)
- Ensure Node.js version is 20.x (specified in `nixpacks.toml`)

### Port Binding Issues
**Problem**: Server can't bind to port

**Solution**:
- Railway automatically provides `PORT` environment variable
- Server uses `process.env.PORT || 8888` which should work
- Check Railway service settings → Networking for port configuration

### WebSocket Connection Fails
**Problem**: Frontend can't connect to signaling server

**Solution**:
- Get Railway public URL from Settings → Networking
- Use `wss://` (secure WebSocket) not `ws://`
- Format: `wss://your-service-name.up.railway.app`
- Update frontend `NEXT_PUBLIC_SIGNALING_URL` environment variable

## Verification Checklist

After deployment, verify:

- [ ] Railway service shows "Deployed" status
- [ ] Logs show: "Pay2Chat signaling server running on port XXXX"
- [ ] No Next.js build errors in logs
- [ ] Public URL is accessible (check Railway Networking settings)
- [ ] WebSocket connection works from frontend (test with browser console)

## Manual Testing

Test the WebSocket server:

```bash
# Install wscat
npm install -g wscat

# Connect to your Railway service
wscat -c wss://your-service-name.up.railway.app
```

If connection succeeds, the server is working correctly.

## Dependencies

The signaling server only requires:
- `ws` - WebSocket library (in dependencies)
- `dotenv` - Optional, for local .env file support (in dependencies)

All other packages (Next.js, React, etc.) are for the frontend and not needed for the server.

## Notes

- Railway provides a public HTTPS URL automatically
- WebSocket connections use `wss://` (secure) protocol
- The server is stateless - rooms are stored in memory
- Restarting the service will clear all active rooms
- For production, consider adding persistence or using a managed WebSocket service

