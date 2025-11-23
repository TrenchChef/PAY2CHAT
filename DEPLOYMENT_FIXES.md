# Deployment Fixes Applied

## Issues Fixed

### 1. Railway Configuration
- **Problem**: Railway was trying to auto-detect and build Next.js application
- **Solution**: 
  - Updated `nixpacks.toml` to explicitly skip Next.js build
  - Configured `railway.json` with correct start command
  - Created `railway.toml` as alternative configuration
  - Added `RAILWAY_DEPLOYMENT.md` with troubleshooting guide

### 2. Build Process
- **Problem**: Railway might run `npm run build` which builds Next.js
- **Solution**: 
  - `nixpacks.toml` explicitly defines build phase to skip Next.js
  - Uses `npm ci` for faster, reliable installs
  - Build phase only echoes messages, doesn't build Next.js

### 3. Start Command
- **Problem**: Need to ensure Railway runs `node server.js`
- **Solution**: 
  - `railway.json` specifies `startCommand: "node server.js"`
  - `nixpacks.toml` specifies `cmd = "node server.js"`
  - `package.json` has `"start": "node server.js"` as fallback

## Files Modified

1. **railway.json** - Updated with correct schema and start command
2. **nixpacks.toml** - Improved build configuration to skip Next.js
3. **railway.toml** - Created as alternative Railway configuration
4. **RAILWAY_DEPLOYMENT.md** - Created comprehensive deployment guide

## Verification Steps

After deploying to Railway, verify:

1. **Build Phase**
   - Check logs for: "Building signaling server only - skipping Next.js build"
   - Should NOT see Next.js build output
   - Should see: "Server dependencies: ws, dotenv (optional)"

2. **Start Phase**
   - Check logs for: "Pay2Chat signaling server running on port XXXX"
   - Port should match Railway's assigned PORT (usually not 8888)

3. **Service Status**
   - Service should show "Deployed" status
   - No errors in Railway logs
   - Public URL should be accessible

4. **WebSocket Connection**
   - Test with: `wscat -c wss://your-service.up.railway.app`
   - Connection should succeed

## Environment Variables

Railway automatically provides:
- `PORT` - Automatically set by Railway

Optional:
- `METERED_API_KEY` - For Metered API integration

## Next Steps

1. **Deploy to Railway**
   - Push changes to your repository
   - Railway will auto-deploy (if connected)
   - Or manually trigger deployment

2. **Get Public URL**
   - Go to Railway service → Settings → Networking
   - Copy the public domain
   - Use `wss://` protocol for WebSocket connections

3. **Update Frontend**
   - Set `NEXT_PUBLIC_SIGNALING_URL=wss://your-service.up.railway.app`
   - Deploy frontend to Vercel/Netlify with updated env var

## Troubleshooting

If deployment still fails:

1. **Check Railway Logs**
   - Look for error messages
   - Verify Node.js version (should be 20.x)
   - Check if `ws` package installed correctly

2. **Verify Configuration**
   - Ensure `nixpacks.toml` is in root directory
   - Check `railway.json` syntax is valid
   - Verify `server.js` exists and is valid

3. **Manual Test**
   - Test server locally: `node server.js`
   - Should start without errors
   - Check port binding works

4. **Railway Settings**
   - Go to service → Settings
   - Verify "Start Command" is `node server.js`
   - Check builder is "Nixpacks" (not Dockerfile)

## Common Issues

### Issue: "Cannot find module 'ws'"
**Solution**: Ensure `npm ci` runs successfully. Check `package.json` has `ws` in dependencies.

### Issue: "Next.js build errors"
**Solution**: Railway is still trying to build Next.js. Verify `nixpacks.toml` is being used and build phase is skipped.

### Issue: "Port already in use"
**Solution**: Railway manages ports automatically. Don't hardcode port in `server.js` - use `process.env.PORT`.

### Issue: "Service won't start"
**Solution**: Check Railway logs for specific error. Verify `node server.js` works locally first.

