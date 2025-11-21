5 most pulular in us include pohantomPROJECT INSTRUCTIONS

#new Pay2Chat

Build a fully serverless, peer-to-peer video chat application with Solana USDC payments, X402 automatic per-minute billing, accurate timekeeping, and encrypted P2P file sales. The only required technologies are:

WebRTC (for media + data channels)

Solana USDC transfers

X402 (automated per-minute billing protocol)

No backend. No database. No cloud services.
All logic must run entirely in the browser.

Follow the build order below exactly and do not skip or reorder any stage.
Each stage must be completed and fully validated before generating or modifying code for the next stage.

STAGE 1 — WebRTC P2P CALL CORE (NO PAYMENTS, NO UI WORKAROUNDS)

Your job at this stage:

Implement direct WebRTC Host → Invitee video/audio connections.

Implement the offer/answer handshake in pure client code.

Implement a stable WebRTC DataChannel.

Implement reconnection logic and error events.

Zero UI requirements except simple video elements.
Zero payment logic.
Zero wallet logic.

Validation Checklist (Agent must self-verify):

Can two browser windows connect by exchanging SDP manually?

Are audio/video stable for ≥10 minutes?

Can DataChannel send/receive simple messages?

No backend endpoints, no WebSockets, no server.

Only proceed to Stage 2 when all items above are stable.

STAGE 2 — BASIC CALL UI (NO PAYMENTS)

Add minimal UI around the call:

Local video, remote video

Mute

Camera toggle

End call

Connection state indicator

Do not introduce any payment logic, wallet logic, timers, or billing.

Validation Checklist:

Full call lifecycle works.

User can join/leave cleanly.

UI never masks WebRTC issues.

Proceed only when this stage is solid.

STAGE 3 — WALLET CONNECTION (SOLANA ONLY)

Implement:

Wallet connect

Reading USDC balance

Detecting wrong network

Proper error messages for missing balance or network mismatch

No payments yet.
No billing.
No pricing.

Validation Checklist:

User can connect a Solana wallet.

Wallet address + USDC balance load properly.

Network validation works.

STAGE 4 — USDC TRANSFER ENGINE

Implement the low-level Solana USDC transfer logic:

Function to send USDC from Invitee → Host

Confirmation events

Retry strategies

Proper error responses:

insufficient funds

user rejects transaction

RPC failure

Do NOT integrate this into call flow yet.

Validation Checklist:

A test USDC transfer inside the app succeeds predictably.

Errors produce structured, actionable results.

STAGE 5 — UPFRONT PAYMENT (3-MINUTE PREPAYMENT)

Integrate payment gating into the joining flow:

Invitee must pay the Host for 3 minutes before joining call.

Block call start until payment is confirmed.

If payment fails, user cannot enter.

Validation Checklist:

Invitee cannot enter call until payment succeeds.

Host sees incoming connection only after payment.

STAGE 6 — X402 AUTOMATIC PER-MINUTE BILLING

Implement the automated billing engine:

Trigger minute-tick billing every 60 seconds.

Use X402 for autopay transactions.

Communicate billing events over WebRTC DataChannel.

Freeze video instantly if payment fails.

Allow a single retry → then end call if still unpaid.

Validation Checklist:

Payment fires automatically every minute.

Freeze-on-failure works 100% of the time.

Retry works correctly.

STAGE 7 — TIMER & TIMEKEEPING SYSTEM

Implement call timers AFTER billing is stable:

Elapsed call time (mm:ss)

Countdown to next minute billing

Color states:

green = paid

yellow = 10-second warning

red = failure/freeze

Must use monotonic time and remain accurate if tab loses focus.

Validation Checklist:

Timer aligns with X402 minute billing exactly.

No measurable drift after several minutes.

STAGE 8 — BILLING + TIMER UI

Integrate billing + timer results into UI:

Total elapsed time

Next payment countdown

Per-minute confirmations

Running total paid

Failure → freeze indicator

Validation Checklist:

Billing and timers display consistently and instantly.

UI events match backend events without lag.

STAGE 9 — FILE SALES (P2P VIA WEBRTC DATACHANNEL)

Implement file sales with direct encrypted transfer:

Host lists files (name, size, price).

Invitee buys using USDC via X402.

After confirmation:

Host sends file in encrypted chunks over DataChannel.

Invitee reconstructs and downloads the file locally.

Validation Checklist:

File purchase → transfer → download works flawlessly.

Large files are chunked and reassembled.

Zero server involvement.

STAGE 10 — UI & UX POLISH

Enhance presentation:

Layout improvements

Better hierarchy of billing/time/file elements

Notifications (“Minute paid”, “Transfer complete”)

Responsive design

Validation Checklist:

Full application feels coherent and clean.

STAGE 11 — CONSENT MODAL (FINAL STEP)

Build the final blocking modal:

Displays P2P nature of calls

Upfront USDC required

Automatic per-minute billing via X402

P2P file transfer

No server storage

Checkbox + continue button

Blocks all interaction until accepted

Validation Checklist:

User cannot use app without accepting.

Modal text reflects full behavior of the implemented system.

GLOBAL RULES FOR THE AGENT

Never introduce a backend, database, API server, or cloud service.

**Never assume specific libraries or frameworks unless necessary for:

WebRTC

Solana USDC

X402**

Always complete each stage 100% before touching the next.

Never overwrite working code from a previous stage; only extend.

Never skip validation checklists.

Ask for clarification ONLY if logically required to proceed.

Do not hallucinate features, APIs, or network calls.

Maintain strict P2P architecture at all times.

FINAL INSTRUCTION TO THE AGENT

Begin at Stage 1 and execute sequentially. Produce code, file structures, and explanations for each stage. Validate thoroughly before moving to the next stage. Do not modify later stages until earlier ones are fully implemented and stable.