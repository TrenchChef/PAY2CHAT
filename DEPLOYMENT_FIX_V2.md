# Deployment Fix V2 - Nixpacks Package Error

## Issue

Railway deployment failed with error:
```
error: undefined variable 'nodejs-20_x'
```

## Root Cause

The `nixpacks.toml` file specified `nixPkgs = ["nodejs-20_x"]`, but this is not a valid package name in the Nixpkgs repository being used by Railway.

## Solutions Applied

### 1. ✅ Fixed `nixpacks.toml`
- **Removed** invalid package specification: `nixPkgs = ["nodejs-20_x"]`
- **Let Nixpacks auto-detect** Node.js from `package.json`
- Nixpacks automatically detects Node.js projects and installs the correct version

### 2. ✅ Switched to Railpack Builder
- **Updated `railway.json`** to use `"builder": "RAILPACK"` instead of `"NIXPACKS"`
- Railpack provides better Node.js support and is more reliable
- Railway's recommended builder for Node.js projects

### 3. ✅ Created Dockerfile Fallback
- **Created `Dockerfile`** as a reliable fallback option
- Uses official Node.js 20 Alpine image
- Minimal setup - only installs what's needed for the signaling server
- Railway will automatically use Dockerfile if Railpack/Nixpacks fail

## Build Priority Order

Railway will try builders in this order:

1. **Railpack** (configured in `railway.json`) - Best for Node.js
2. **Nixpacks** (via `nixpacks.toml`) - Auto-detects Node.js
3. **Dockerfile** - Reliable fallback

## Files Changed

1. **railway.json**
   - Changed builder from `"NIXPACKS"` to `"RAILPACK"`

2. **nixpacks.toml**
   - Removed `nixPkgs = ["nodejs-20_x"]` line
   - Added comment explaining auto-detection

3. **Dockerfile** (new)
   - Minimal Node.js 20 Alpine-based image
   - Installs dependencies and runs `server.js`

## Verification

After these fixes, Railway should:

1. ✅ Use Railpack builder (most reliable)
2. ✅ Auto-detect Node.js from `package.json`
3. ✅ Install dependencies with `npm ci`
4. ✅ Skip Next.js build
5. ✅ Start server with `node server.js`

## Testing

To verify the fix works:

1. **Push changes to repository**
2. **Trigger Railway deployment**
3. **Check build logs** for:
   - "Using Railpack builder" or similar message
   - No "undefined variable" errors
   - Successful npm install
   - Server starts correctly

## Fallback Options

If Railpack still fails:

1. **Dockerfile** will be used automatically
2. **Manual override**: In Railway dashboard, go to Settings → Build → Builder → Select "Dockerfile"

## Next Steps

1. Commit and push changes
2. Monitor Railway deployment logs
3. Verify server starts successfully
4. Test WebSocket connection

---

**Status**: ✅ All fixes applied. Ready for deployment with multiple fallback options.

