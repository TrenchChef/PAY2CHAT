# How to Clear Cache for Testing

## Chrome/Edge (Windows/Linux/Mac)
1. Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Time range: "All time" or "Last hour"
4. Click "Clear data"

## Firefox
1. Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
2. Select "Cache"
3. Time range: "Everything"
4. Click "Clear Now"

## Safari (Mac)
1. Press `Cmd+Option+E` to clear cache
2. Or: Safari menu → Preferences → Advanced → Show Develop menu
3. Then: Develop → Empty Caches

## Hard Refresh (Faster Option)
- **Windows/Linux**: `Ctrl+Shift+R` or `Ctrl+F5`
- **Mac**: `Cmd+Shift+R`

## Clear LocalStorage/SessionStorage (Important for Wallet)
1. Open DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Clear:
   - Local Storage
   - Session Storage
   - IndexedDB (if any)

## Clear Wallet Connection State
1. Open DevTools Console
2. Run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Nuclear Option - Incognito/Private Window
- **Chrome**: `Ctrl+Shift+N` (Windows/Linux) or `Cmd+Shift+N` (Mac)
- **Firefox**: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- **Safari**: `Cmd+Shift+N`

This gives you a completely fresh environment to test.
