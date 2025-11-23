# Vercel Deployment Troubleshooting

## Common Build Failures

### 1. TypeScript Errors

**Symptoms**: Build fails with TypeScript compilation errors

**Solutions**:
- Check Vercel build logs for specific TypeScript errors
- Run `npm run build` locally to reproduce errors
- Fix TypeScript errors in the codebase
- Ensure `tsconfig.json` is properly configured

### 2. Missing Dependencies

**Symptoms**: Build fails with "Cannot find module" errors

**Solutions**:
- Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check that `package-lock.json` is committed
- Verify no missing peer dependencies

### 3. Build Script Issues

**Symptoms**: Build command fails

**Solutions**:
- Verify `package.json` has `"build": "next build"` script
- Check Next.js version compatibility
- Ensure Node.js version is compatible (Vercel uses Node 18+ by default)

### 4. Environment Variable Issues

**Symptoms**: Build succeeds but runtime errors

**Solutions**:
- Verify `NEXT_PUBLIC_*` variables are set correctly
- Check that variables are added to all environments
- Redeploy after adding/updating variables

### 5. Memory/Timeout Issues

**Symptoms**: Build times out or runs out of memory

**Solutions**:
- Optimize build process
- Reduce bundle size
- Check for large dependencies
- Consider upgrading Vercel plan if needed

## How to Get Build Logs

1. **Go to Vercel Dashboard** → Your Project
2. **Click on the failed deployment**
3. **View Build Logs** tab
4. **Look for error messages** (usually in red)
5. **Copy the error** to identify the issue

## Quick Fixes

### Check Build Locally

```bash
# Install dependencies
npm install

# Run build locally
npm run build

# Check for errors
npm run build 2>&1 | grep -i error
```

### Verify Configuration

```bash
# Check package.json
cat package.json | grep -A 5 '"scripts"'

# Check Next.js config
cat next.config.js

# Check TypeScript config
cat tsconfig.json
```

## Common Error Messages

### "Cannot find module"
- **Fix**: Add missing dependency to `package.json`
- **Run**: `npm install <package-name>`

### "Type error: ..."
- **Fix**: Fix TypeScript errors in code
- **Check**: `tsconfig.json` settings

### "Build failed: Command 'npm run build' exited with code 1"
- **Fix**: Check build logs for specific error
- **Run**: `npm run build` locally to reproduce

### "Module not found: Can't resolve ..."
- **Fix**: Check import paths are correct
- **Verify**: All files exist and paths are correct

## Next Steps

1. **Get the exact error** from Vercel build logs
2. **Reproduce locally** with `npm run build`
3. **Fix the specific error**
4. **Commit and push** the fix
5. **Redeploy** on Vercel

---

**Need Help?** Share the specific error message from Vercel build logs for targeted assistance.

