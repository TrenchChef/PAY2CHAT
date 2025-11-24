# METERED_API_KEY Explanation

## What is Metered.ca?

Metered.ca is a service that provides **TURN servers** for WebRTC applications. TURN (Traversal Using Relays around NAT) servers help establish WebRTC connections when direct peer-to-peer connections fail.

## Current Setup

Your application currently uses:
- **STUN server**: `stun:stun.l.google.com:19302` (free Google STUN server) - Always available as fallback
- **TURN servers**: Dynamically fetched from Metered.ca API when `METERED_API_KEY` is configured
- **Fallback behavior**: If TURN credentials are unavailable, the app gracefully falls back to STUN-only

## When Do You Need TURN Servers?

### ✅ You DON'T need TURN servers if:
- Both users are on the same network (local testing)
- Users are behind simple NATs that allow direct connections
- Most connections work without issues
- You're okay with some connection failures (~10-30% of cases)

### ⚠️ You DO need TURN servers if:
- **High connection failure rate** - Many users can't connect
- **Mobile devices** - Often behind restrictive NATs/firewalls
- **Corporate networks** - Strict firewalls block direct P2P
- **Different networks** - Users on different ISPs/networks
- **Production reliability** - Need >95% connection success rate

## Benefits of Using Metered.ca TURN Servers

1. **Higher Connection Success Rate**
   - Direct P2P: ~70-90% success rate
   - With TURN: ~95-99% success rate

2. **Global Infrastructure**
   - Servers in multiple regions
   - Low latency connections
   - Better performance worldwide

3. **Mobile Support**
   - Mobile devices often need TURN servers
   - Better experience on cellular networks

4. **Corporate Network Support**
   - Works through strict firewalls
   - Bypasses NAT restrictions

## Cost Considerations

- **Free tier**: Usually limited (e.g., 1GB/month)
- **Pay-as-you-go**: ~$0.50-2.00 per GB of traffic
- **Typical usage**: 1-5 GB per 1000 calls (depends on call length)

## When to Add TURN Servers

### Add TURN servers if you experience:
1. **Connection failures** - Users report "can't connect" errors
2. **Mobile issues** - Mobile users can't connect reliably
3. **Production deployment** - Need reliable service for real users
4. **Global users** - Users in different countries/regions

### You can wait if:
1. **Testing phase** - Still in development/testing
2. **Low user count** - Small number of users
3. **Same network** - Most users on same network
4. **Connection works** - Most connections succeed without TURN

## How TURN Servers Work (Now Implemented)

TURN servers are now **automatically enabled** when you configure `METERED_API_KEY`:

1. **Sign up for Metered.ca** and get your API key from the dashboard
2. **Add to environment variables**: 
   - Local development: Add `METERED_API_KEY=your_key` to `.env.local`
   - Production: Add `METERED_API_KEY=your_key` to your deployment platform's environment variables
3. **That's it!** The app will automatically:
   - Fetch TURN credentials dynamically from Metered.ca API
   - Use TURN servers for improved connectivity
   - Fall back to STUN-only if TURN is unavailable

### Implementation Details

- **API Route**: `/api/turn-credentials` - Server-side endpoint that securely fetches credentials
- **Dynamic Fetching**: Credentials are fetched per-session (not hardcoded)
- **Automatic Fallback**: If TURN is unavailable, connection works with STUN only
- **Security**: `METERED_API_KEY` is never exposed to the client (server-side only)

### TURN Server URLs Used

When credentials are available, the app uses:
- `turn:global.relay.metered.ca:80` (UDP)
- `turn:global.relay.metered.ca:443` (TCP/TLS)
- `turn:global.relay.metered.ca:443?transport=tcp` (explicit TCP)

## Current Status

**TURN servers are now implemented with dynamic credentials!**

- ✅ TURN server support is built-in and ready to use
- ✅ Credentials are fetched dynamically (no hardcoding)
- ✅ Automatic fallback to STUN if TURN unavailable
- ✅ `METERED_API_KEY` is optional - app works without it (STUN-only)

## Recommendation

**Start without TURN servers** (no `METERED_API_KEY` needed) and add them if you experience:
- Connection failures
- Mobile user issues
- Production reliability needs

When you're ready to enable TURN:
1. Sign up for Metered.ca
2. Get your API key
3. Add `METERED_API_KEY=your_key` to environment variables
4. The app will automatically use TURN servers

This approach:
- Saves costs initially (no TURN usage until needed)
- Lets you test with real users first
- Easy to enable when needed (just add the API key)

---

**Bottom line**: TURN servers are now implemented and ready. Add `METERED_API_KEY` when you need improved connectivity. The app works perfectly without it using STUN-only.

