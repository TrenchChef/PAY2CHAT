# Vercel "Branch is undefined" - Explained

## ✅ This is CORRECT!

If you see **"branch is undefined"** in Vercel's Environment Variables page, this is **normal and correct**.

## What "Branch is undefined" Means

When a variable shows "branch is undefined", it means:

- ✅ The variable is set for **ALL environments**
- ✅ It applies to **Production**, **Preview**, and **Development**
- ✅ This is the **recommended configuration** for `NEXT_PUBLIC_*` variables

## Why This is Good

For `NEXT_PUBLIC_SIGNALING_URL`, you want it to work in:
- **Production** deployments (main branch)
- **Preview** deployments (pull requests, other branches)
- **Development** (local development)

Setting it for "all environments" (undefined branch) ensures it works everywhere.

## When to Use Specific Branches

You would only set a variable for a specific branch if:
- You want different values for different environments
- You're testing different configurations
- You have staging vs production differences

## For Your Setup

**Current Configuration**: ✅ Correct
- Variable: `NEXT_PUBLIC_SIGNALING_URL`
- Value: `wss://pay2chat-production.up.railway.app`
- Branch: `undefined` (all environments) ✅

**This means**:
- Production deployments will use this URL
- Preview deployments will use this URL
- Development will use this URL

## Verification

To verify it's working:

1. **Check the variable value** is correct: `wss://pay2chat-production.up.railway.app`
2. **Deploy your app** (or redeploy)
3. **Test the WebSocket connection** in your deployed app
4. **Check browser console** for connection success

## Summary

**"Branch is undefined" = Set for all environments = CORRECT** ✅

You don't need to change anything. Your configuration is perfect!

---

**Status**: ✅ Configuration is correct | No action needed

