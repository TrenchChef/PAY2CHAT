# Legacy Files

This directory contains legacy files from the original single-page application implementation.

## Files

- **`index.html`** - Original single-page HTML application (deprecated)
- **`webrtc.js`** - Original WebRTC implementation (deprecated)
- **`config.js`** - Original configuration file (deprecated)

## Status

⚠️ **DEPRECATED** - These files are kept for reference only.

The application has been migrated to Next.js and these files are no longer used in production.

## Current Implementation

- **Frontend**: Next.js application in `app/` directory
- **WebRTC**: Modern implementation in `lib/webrtc/client.ts`
- **Configuration**: Next.js config in `next.config.js` and environment variables

## Migration Notes

- The Next.js app provides the same functionality with improved architecture
- All features from the legacy implementation have been ported to the new structure
- See `DEPLOYMENT_GUIDE.md` for current deployment instructions

