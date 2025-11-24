# TURN Server Testing Guide

## Quick Test

After adding `METERED_API_KEY` to your environment, test the TURN server integration:

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test API Route Directly

Open your browser and navigate to:
```
http://localhost:3000/api/turn-credentials
```

**Expected Response (if working):**
```json
{
  "credentials": {
    "username": "your_username",
    "credential": "your_password",
    "urls": [
      "turn:global.relay.metered.ca:80",
      "turn:global.relay.metered.ca:443",
      "turn:global.relay.metered.ca:443?transport=tcp"
    ]
  }
}
```

**Expected Response (if API key missing/invalid):**
```json
{
  "credentials": null
}
```

### 3. Check Browser Console

When starting a call, check the browser console for TURN-related messages:

**If TURN is working:**
```
[TURN] Using TURN servers for improved connectivity
```

**If TURN is unavailable (fallback):**
```
[TURN] TURN servers unavailable, using STUN only
```

### 4. Verify ICE Servers in WebRTC

1. Open browser DevTools
2. Go to Console
3. Start a call
4. Type in console:
```javascript
const pc = new RTCPeerConnection();
console.log('ICE Servers:', pc.getConfiguration().iceServers);
```

You should see TURN servers listed if credentials were fetched successfully.

## Troubleshooting

### API Returns null

**Check:**
1. Is `METERED_API_KEY` in `.env.local`? (not `.env`)
2. Did you restart the dev server after adding the key?
3. Check server logs for API errors

**Common Issues:**
- API endpoint might be different - check Metered.ca documentation
- API key format might be incorrect
- Network/firewall blocking API calls

### TURN Servers Not Used

**Check:**
1. Browser console for TURN messages
2. Network tab - is `/api/turn-credentials` returning credentials?
3. Verify ICE servers in RTCPeerConnection configuration

### Connection Still Fails

**Remember:**
- TURN servers improve connectivity but don't guarantee 100% success
- Some network configurations still block WebRTC
- Check if both peers can reach the TURN server

## Metered.ca API Endpoint

If the default endpoint doesn't work, you may need to update `app/api/turn-credentials/route.ts` with the correct Metered.ca API endpoint.

Check Metered.ca documentation:
- https://www.metered.ca/docs/rest-api/

Common endpoint patterns:
- `https://api.metered.ca/v1/turn/credentials`
- `https://api.metered.ca/turn/credentials`
- `https://turn.metered.ca/api/credentials`

## Testing Connection Quality

1. **Same Network Test**: Should work with STUN only
2. **Different Networks Test**: TURN should help here
3. **Mobile Test**: TURN often required for mobile devices
4. **Corporate Network Test**: TURN helps bypass firewalls

## Next Steps

Once TURN is working:
- Monitor Metered.ca dashboard for usage
- Check connection success rates
- Adjust TURN server configuration if needed

