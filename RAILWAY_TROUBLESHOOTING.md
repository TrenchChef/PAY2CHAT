# Railway Deployment Troubleshooting

## Common Issues and Solutions

### Issue: Docker Build Fails

**Possible Causes:**
1. Missing `package-lock.json`
2. npm install fails
3. Build context too large
4. Port binding issues

**Solutions:**
- ✅ Added `.dockerignore` to reduce build context
- ✅ Simplified Dockerfile with fallback npm install
- ✅ Using `npm install` instead of `npm ci` for flexibility

### Issue: "Cannot find module 'ws'"

**Solution:**
- Ensure `ws` is in `package.json` dependencies (it is)
- Dockerfile installs all dependencies from package.json
- If still failing, check Railway logs for npm install errors

### Issue: Port Binding Errors

**Solution:**
- Railway automatically sets `PORT` environment variable
- Server uses `process.env.PORT || 8888`
- No manual port configuration needed

### Issue: Service Won't Start

**Check:**
1. Railway logs for error messages
2. Verify `node server.js` works locally
3. Check Railway service settings → Start Command is `node server.js`
4. Verify PORT environment variable is set (Railway does this automatically)

### Issue: Build Takes Too Long

**Solution:**
- `.dockerignore` excludes unnecessary files
- Only copies `package.json`, `package-lock.json`, and `server.js`
- Reduces build context significantly

## Verification Steps

1. **Check Railway Logs**
   - Go to Railway dashboard → Your service → Logs
   - Look for build errors or runtime errors

2. **Verify Dockerfile Build Locally** (if Docker installed)
   ```bash
   docker build -t pay2chat-test .
   docker run -p 8888:8888 pay2chat-test
   ```

3. **Test Server Locally**
   ```bash
   npm install
   node server.js
   ```
   Should see: "Pay2Chat signaling server running on port 8888"

4. **Check Railway Service Settings**
   - Builder: Should be "Dockerfile"
   - Start Command: Should be `node server.js`
   - Port: Railway sets automatically

## Current Configuration

- **Builder**: Dockerfile (forced in `railway.json`)
- **Base Image**: `node:20-alpine` (lightweight, reliable)
- **Dependencies**: Installed from `package.json`
- **Start Command**: `node server.js`
- **Port**: Auto-configured by Railway

## If Still Failing

1. **Share Railway Logs**: Copy the full error message from Railway logs
2. **Check Service Settings**: Verify builder and start command
3. **Try Manual Deploy**: Trigger a new deployment from Railway dashboard
4. **Verify Files**: Ensure `server.js` and `package.json` are in repository

## Expected Successful Build Output

```
Step 1/5 : FROM node:20-alpine
Step 2/5 : WORKDIR /app
Step 3/5 : COPY package.json package-lock.json* ./
Step 4/5 : RUN npm install --production || npm install
Step 5/5 : COPY server.js ./
```

## Expected Runtime Output

```
Pay2Chat signaling server running on port <PORT>
```

Where `<PORT>` is the port Railway assigned (usually not 8888).

