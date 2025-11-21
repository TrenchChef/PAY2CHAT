// Pay2Chat configuration - editable constants for rates, prices, and platform settings
window.PAY2CHAT_CONFIG = {
  // Rates (per-minute) in USDC
  MIN_RATE: 0.10,
  MAX_RATE: 100.0,
  DEFAULT_RATE: 1.0,
  // Prices for files (USDC)
  MIN_PRICE: 5.0,
  MAX_PRICE: 1000.0,
  DEFAULT_PRICE: 20.0,

  // Billing / platform split (percent kept by platform)
  PLATFORM_FEE_PERCENT: 15, // 15% platform fee (UI-only for now)

  // Protocol / owner wallet (for future sweeping of protocol fees)
  PROTOCOL_WALLET: 'tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW',

  // Toggle prototype behaviors
  AUTO_OFFER_IN_LINK_DEFAULT: false, // default for 'include offer in link' checkbox

  // Invite offer size guard (chars)
  MAX_OFFER_LENGTH: 16000
  ,
  // Build toggle: disable on-chain payments for this build
  PAYMENTS_DISABLED: true
  ,
  // ICE / TURN configuration: add STUN/TURN servers here for improved connectivity.
  // Example entry: { urls: 'stun:stun.l.google.com:19302' }
  // Example TURN entry: { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }
  ICE_SERVERS: [],
  // iceCandidatePoolSize for RTCPeerConnection: 0 (default) or >0 to warm candidates
  ICE_CANDIDATE_POOL_SIZE: 0
};
