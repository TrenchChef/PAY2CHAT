# METERED_API_KEY Explanation

## What is Metered.ca?

Metered.ca is a service that provides **TURN servers** for WebRTC applications. TURN (Traversal Using Relays around NAT) servers help establish WebRTC connections when direct peer-to-peer connections fail.

## Current Setup

Your application currently uses:
- **STUN server**: `stun:stun.l.google.com:19302` (free Google STUN server)
- **TURN servers**: None configured

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

## How to Add TURN Servers (When Needed)

If you decide to add TURN servers later:

1. **Sign up for Metered.ca** (or similar service)
2. **Get API key** from Metered.ca dashboard
3. **Add to Railway environment variables**: `METERED_API_KEY=your_key`
4. **Update WebRTC client** to use TURN servers:

```typescript
// In lib/webrtc/client.ts
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:global.relay.metered.ca:80',
    username: 'your_username',
    credential: 'your_credential',
  },
  {
    urls: 'turn:global.relay.metered.ca:443',
    username: 'your_username',
    credential: 'your_credential',
  },
];
```

## Current Status

**METERED_API_KEY is NOT needed right now** because:
- ✅ No TURN servers are configured
- ✅ The code doesn't use it
- ✅ Free STUN server works for basic connections
- ✅ You can add it later if connection issues arise

## Recommendation

**Start without TURN servers** and add them if you experience:
- Connection failures
- Mobile user issues
- Production reliability needs

This approach:
- Saves costs initially
- Lets you test with real users first
- Easy to add later when needed

---

**Bottom line**: METERED_API_KEY is for future use if you need TURN servers. Not needed now, but useful if connection reliability becomes an issue.

