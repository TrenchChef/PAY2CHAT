// Pay2Chat Stage 1: WebRTC P2P Core
// No backend, no payments, no UI workarounds. Pure browser logic.

let localStream = null;
let pc = null;
let dataChannel = null;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 3;
// Build toggle read from config (if set in config.js)
const PAYMENTS_DISABLED = (window.PAY2CHAT_CONFIG && window.PAY2CHAT_CONFIG.PAYMENTS_DISABLED) || false;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startBtn = document.getElementById('startBtn');
const createOfferBtn = document.getElementById('createOfferBtn');
const createAnswerBtn = document.getElementById('createAnswerBtn');
const setRemoteBtn = document.getElementById('setRemoteBtn');
const muteBtn = document.getElementById('muteBtn');
const cameraBtn = document.getElementById('cameraBtn');
const endCallBtn = document.getElementById('endCallBtn');
const connState = document.getElementById('connState');
const localSDP = document.getElementById('localSDP');
const remoteSDP = document.getElementById('remoteSDP');
const dataMsg = document.getElementById('dataMsg');
const sendDataBtn = document.getElementById('sendDataBtn');
const dataLog = document.getElementById('dataLog');
const status = document.getElementById('status');

// hide raw SDP textareas from casual view (we use step-by-step modal)
try { if (localSDP) localSDP.style.display = 'none'; if (remoteSDP) remoteSDP.style.display = 'none'; } catch(e){}

function logStatus(msg) {
  status.textContent = msg;
}

function logData(msg) {
  dataLog.textContent += msg + '\n';
}

function updateConnState(state) {
  connState.textContent = state ? `State: ${state}` : '';
}

function resetUI() {
  muteBtn.disabled = true;
  cameraBtn.disabled = true;
  endCallBtn.disabled = true;
  muteBtn.textContent = 'Mute';
  cameraBtn.textContent = 'Camera Off';
  audioMuted = false;
  videoOff = false;
  updateConnState('');
}

async function startLocalMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    logStatus('Local media started.');
    muteBtn.disabled = false;
    cameraBtn.disabled = false;
    resetUI();
  } catch (e) {
    logStatus('Error starting local media: ' + e.message);
  }
}

function createPeerConnection() {
  // Use config-driven ICE servers and candidate pool size for better connectivity
  const cfg = (window.PAY2CHAT_CONFIG || {});
  const iceServers = cfg.ICE_SERVERS || [];
  const iceCandidatePoolSize = cfg.ICE_CANDIDATE_POOL_SIZE || 0;
  try {
    pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize });
  } catch (e) {
    // fallback to default constructor on older browsers
    pc = new RTCPeerConnection();
  }
  // attach local tracks if available so media flows to peer
  try {
    if (localStream) {
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }
  } catch (e) { console.warn('Failed to add local tracks to PeerConnection', e); }
  pc.onicecandidate = (e) => {
    // When gathering finished, update the hidden localSDP value
    if (!e.candidate) {
      try { localSDP.value = JSON.stringify(pc.localDescription); } catch(e){}
    } else {
      // If a signaling WebSocket is active, send candidates incrementally
      try {
        if (window.signaling && window.signaling._ws && window.signaling._ws.readyState === 1 && window.signaling._room) {
          const msg = { type: 'candidate', room: window.signaling._room, candidate: e.candidate };
          window.signaling._ws.send(JSON.stringify(msg));
        }
      } catch(e) { /* ignore */ }
    }
  };
  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };
  pc.onconnectionstatechange = () => {
    logStatus('Connection state: ' + pc.connectionState);
    updateConnState(pc.connectionState);
    if (pc.connectionState === 'connected') {
      endCallBtn.disabled = false;
      muteBtn.disabled = false;
      cameraBtn.disabled = false;
      // If host detected a prepayment, notify peer via DataChannel
      if (hostRoom && hostRoom.detectedTx) {
        const evt = { type: 'transfer_success', txid: hostRoom.detectedTx.sig, amount: hostRoom.detectedTx.amount };
        if (dataChannel && dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(evt));
        } else {
          // send later when dataChannel opens
          pendingPaymentEvent = evt;
        }
      }
    }
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      endCallBtn.disabled = true;
      muteBtn.disabled = true;
      cameraBtn.disabled = true;
    }
    if (pc.connectionState === 'closed') {
      resetUI();
    }
    if (pc.connectionState === 'failed' && reconnectAttempts < MAX_RECONNECTS) {
      reconnectAttempts++;
      logStatus('Reconnecting... (' + reconnectAttempts + ')');
      restartConnection();
    }
  };
  pc.ondatachannel = (e) => {
    dataChannel = e.channel;
    setupDataChannel();
  };
}

// pending event to send over DataChannel once open
let pendingPaymentEvent = null;

function setupDataChannel() {
  if (!dataChannel) return;
  dataChannel.onopen = () => {
    logData('[DataChannel open]');
    if (pendingPaymentEvent && dataChannel && dataChannel.readyState === 'open') {
      try { dataChannel.send(JSON.stringify(pendingPaymentEvent)); pendingPaymentEvent = null; }
      catch(e){ /* ignore */ }
    }
  };
  dataChannel.onclose = () => logData('[DataChannel closed]');
  dataChannel.onerror = (e) => logData('[DataChannel error] ' + (e.message || e));
  dataChannel.onmessage = (e) => {
    try {
      const msg = typeof e.data === 'string' ? JSON.parse(e.data) : null;
      if (msg && msg.type) {
        switch (msg.type) {
          case 'transfer_request':
            logData(`[Transfer request] id=${msg.id} from=${msg.from} amount=${msg.amount}`);
            break;
          case 'transfer_progress':
            logData(`[Transfer progress] id=${msg.id} status=${msg.status} attempt=${msg.attempt}`);
            break;
          case 'transfer_success':
            logData(`[Transfer success] txid=${msg.txid} amount=${msg.amount}`);
            // show UI notification
            prepayStatus && (prepayStatus.textContent = 'Payment confirmed (tx: ' + msg.txid + ')');
            break;
          case 'transfer_failed':
            logData(`[Transfer failed] code=${msg.code} msg=${msg.message}`);
            break;
          default:
            logData('[Remote event] ' + e.data);
        }
      } else {
        logData('[Remote] ' + e.data);
      }
    } catch (err) {
      logData('[Remote] ' + e.data);
    }
  };
}

async function createOffer() {
  // If joining a room and not prepaid, block (skipped when payments disabled)
  if (!PAYMENTS_DISABLED && !hostRoom && joinHostAddr && joinHostAddr.value && !window.lastPrepay) {
    logStatus('Prepay required before creating offer. Use Prepay 3 minutes.');
    return;
  }
  createPeerConnection();
  dataChannel = pc.createDataChannel('chat');
  setupDataChannel();
    // initial role UI update
    try { updateRoleUI(); } catch(e) { /* ignore */ }
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
}

async function createAnswer() {
  // If joining a room and not prepaid, block (skipped when payments disabled)
  if (!PAYMENTS_DISABLED && !hostRoom && joinHostAddr && joinHostAddr.value && !window.lastPrepay) {
    logStatus('Prepay required before creating answer. Use Prepay 3 minutes.');
    return;
  }
  createPeerConnection();
  const remote = JSON.parse(remoteSDP.value);
  await pc.setRemoteDescription(remote);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
}
async function setRemote() {
  // If host created a room and payment not detected, block accepting remote SDP (skipped when payments disabled)
  if (!PAYMENTS_DISABLED && hostRoom && !hostRoom.paid) {
    logStatus('Waiting for prepayment before accepting connection.');
    return;
  }
  if (!pc) {
    createPeerConnection();
  }
  const remote = JSON.parse(remoteSDP.value);
  await pc.setRemoteDescription(remote);
}

function restartConnection() {
  if (pc) pc.close();
  createPeerConnection();
  logStatus('PeerConnection restarted.');
  updateConnState('restarting');
}

sendDataBtn.onclick = () => {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(dataMsg.value);
    logData('[You] ' + dataMsg.value);
  }
};

let audioMuted = false;
let videoOff = false;

muteBtn.onclick = () => {
  if (!localStream) return;
  audioMuted = !audioMuted;
  localStream.getAudioTracks().forEach(track => track.enabled = !audioMuted);
  muteBtn.textContent = audioMuted ? 'Unmute' : 'Mute';
};

cameraBtn.onclick = () => {
  if (!localStream) return;
  videoOff = !videoOff;
  localStream.getVideoTracks().forEach(track => track.enabled = !videoOff);
  cameraBtn.textContent = videoOff ? 'Camera On' : 'Camera Off';
};

endCallBtn.onclick = () => {
  if (pc) {
    pc.close();
    updateConnState('closed');
    logStatus('Call ended.');
    endCallBtn.disabled = true;
    muteBtn.disabled = true;
    cameraBtn.disabled = true;
    resetUI();
  }
};


// On load, reset UI
resetUI();
// Ensure all main buttons are wired up
startBtn.onclick = startLocalMedia;
createOfferBtn.onclick = createOffer;

// Ensure all main buttons are wired up
startBtn.onclick = startLocalMedia;
createOfferBtn.onclick = createOffer;
createAnswerBtn.onclick = createAnswer;
setRemoteBtn.onclick = setRemote;

// --- Solana wallet (Stage 3) ---
const connectPhantomBtn = document.getElementById('connectPhantomBtn');
const connectSolflareBtn = document.getElementById('connectSolflareBtn');
const connectWCBtn = document.getElementById('connectWCBtn');
const disconnectWalletBtn = document.getElementById('disconnectWalletBtn');
const copyAddressBtn = document.getElementById('copyAddressBtn');
const walletAddrSpan = document.getElementById('walletAddr');
const usdcBalanceSpan = document.getElementById('usdcBalance');
const walletError = document.getElementById('walletError');
const walletNotes = document.getElementById('walletNotes');
const clusterSelect = document.getElementById('clusterSelect');
const customRpcInput = document.getElementById('customRpc');

// USDC mint constant declared in Stage 4 section below

function rpcUrlForCluster(cluster) {
  // If user provided a custom RPC, prefer it
  try {
    const custom = (customRpcInput && customRpcInput.value && customRpcInput.value.trim()) || null;
    if (custom) return custom.trim();
  } catch (e) { /* ignore */ }
  if (cluster === 'devnet') return 'https://api.devnet.solana.com';
  return 'https://api.mainnet-beta.solana.com';
}

const FALLBACK_RPC_MAINNET = 'https://api.mainnet-beta.solana.com';
const FALLBACK_RPC_DEVNET = 'https://api.devnet.solana.com';

function getFallbackRpc(cluster) {
  return cluster === 'devnet' ? FALLBACK_RPC_DEVNET : FALLBACK_RPC_MAINNET;
}

async function connectWallet() {
  // Backwards-compatible; prefer explicit connectPhantom/connectSolflare
  return connectPhantom();
}

async function connectPhantom() {
  walletError.textContent = '';
  usdcBalanceSpan.textContent = '-';
  if (!window.solana || !window.solana.isPhantom) {
    walletError.textContent = 'Phantom wallet not detected.';
    return;
  }
  try {
    const resp = await window.solana.connect();
    const pubkey = resp.publicKey;
    walletAddrSpan.textContent = pubkey.toString();
    // load balances on selected cluster
    await loadUsdcBalance(pubkey);
    try { updateSolBadge(pubkey); } catch(e){}
    // listen for disconnect
    window.solana.on && window.solana.on('disconnect', () => {
      walletAddrSpan.textContent = '';
      usdcBalanceSpan.textContent = '-';
    });
    currentWallet = { provider: window.solana, pubkey, name: 'Phantom' };
    // update UI state for roles
    try { updateRoleUI(); } catch(e) { /* ignore */ }
    // show disconnect / copy address controls
    try { if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'inline-block'; } catch(e){}
    try { if (copyAddressBtn) copyAddressBtn.style.display = 'inline-block'; } catch(e){}
  } catch (err) {
    walletError.textContent = 'Wallet connection failed: ' + (err.message || err.toString());
  }
}

async function connectSolflare() {
  walletError.textContent = '';
  usdcBalanceSpan.textContent = '-';
  if (!window.solflare) {
    walletError.textContent = 'Solflare wallet not detected.';
    return;
  }
  try {
    const resp = await window.solflare.connect();
    // solflare may return { publicKey } or { publicKey: PublicKey }
    const pubkey = resp.publicKey || resp;
    let pubkeyObj = pubkey;
    try { pubkeyObj = new solanaWeb3.PublicKey(pubkey.toString ? pubkey.toString() : pubkey); } catch (e) { /* ignore */ }
    walletAddrSpan.textContent = pubkeyObj.toString();
    await loadUsdcBalance(pubkeyObj);
    try { updateSolBadge(pubkeyObj); } catch(e){}
    currentWallet = { provider: window.solflare, pubkey: pubkeyObj, name: 'Solflare' };
    // update UI state for roles
    try { updateRoleUI(); } catch(e) { /* ignore */ }
    try { if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'inline-block'; } catch(e){}
    try { if (copyAddressBtn) copyAddressBtn.style.display = 'inline-block'; } catch(e){}
  } catch (err) {
    walletError.textContent = 'Solflare connection failed: ' + (err.message || err.toString());
  }
}

async function connectWalletConnect() {
  // Placeholder: full WalletConnect support for Solana requires a Solana-specific adapter.
  walletError.textContent = 'WalletConnect for Solana is not enabled in this demo. To enable it, include a Solana WalletConnect adapter or the Wallet Adapter library and re-run.';
  console.info('WalletConnect requested; include a Solana WalletConnect adapter or wallet-adapter integration to enable.');
}

// MetaMask/EVM wallet support removed for now. Will add when EVM networks (Base, etc.) are supported.

async function loadUsdcBalance(pubkey) {
  walletError.textContent = '';
  try {
    const cluster = clusterSelect.value || 'mainnet';
    let rpc = rpcUrlForCluster(cluster);
    let conn = new solanaWeb3.Connection(rpc, 'confirmed');
    const mint = cluster === 'mainnet' ? USDC_MINT_MAINNET : null;
    if (!mint) {
      usdcBalanceSpan.textContent = 'N/A on devnet (supply a devnet USDC mint)';
      return;
    }
    let res;
    try {
      res = await conn.getParsedTokenAccountsByOwner(pubkey, { mint });
    } catch (err) {
      // Try fallback RPC once on any RPC/provider error
      const fb = getFallbackRpc(cluster);
      if (fb && fb !== rpc) {
        walletError.textContent = 'Primary RPC error; retrying with fallback RPC.';
        rpc = fb;
        conn = new solanaWeb3.Connection(rpc, 'confirmed');
        res = await conn.getParsedTokenAccountsByOwner(pubkey, { mint });
      } else throw err;
    }
    if (!res || res.value.length === 0) {
      usdcBalanceSpan.textContent = '0 (no USDC token account found — check network)';
      try { const b = document.getElementById('usdcBadge'); if (b) b.textContent = 'USDC: 0'; } catch(e){}
      return;
    }
    let total = 0;
    for (const acc of res.value) {
      const ui = acc.account.data.parsed.info.tokenAmount.uiAmount;
      total += (ui || 0);
    }
    usdcBalanceSpan.textContent = String(total);
    try { const b = document.getElementById('usdcBadge'); if (b) b.textContent = 'USDC: ' + String(total); } catch(e){}
  } catch (err) {
    console.error('Failed to read balance', err);
    // detect RPC 403 style error and show actionable message
    try {
      if (err && err.message && err.message.includes('403')) {
        walletError.textContent = 'RPC Error 403 (Access forbidden): your RPC provider is refusing requests. Try switching cluster or using a different RPC provider.';
        return;
      }
    } catch (e) { /* ignore */ }
    walletError.textContent = 'Failed to read balance: ' + (err.message || err.toString());
  }
}

// Update SOL badge when reading SOL balance
async function updateSolBadge(pubkey) {
  try {
    const val = await getSolBalance(pubkey);
    const b = document.getElementById('solBadge'); if (b) b.textContent = 'SOL: ' + (typeof val === 'number' ? String(val) : '-');
  } catch(e) { /* ignore */ }
}

connectPhantomBtn && (connectPhantomBtn.onclick = connectPhantom);
connectSolflareBtn && (connectSolflareBtn.onclick = connectSolflare);
connectWCBtn && (connectWCBtn.onclick = connectWalletConnect);
// Disconnect wallet handler (works for Phantom/Solflare providers)
if (disconnectWalletBtn) {
  disconnectWalletBtn.onclick = async () => {
    try {
      walletError.textContent = '';
      if (currentWallet && currentWallet.provider && currentWallet.provider.disconnect) {
        try { await currentWallet.provider.disconnect(); } catch(e) { /* ignore */ }
      }
      // try legacy window.solana disconnect
      if (window.solana && window.solana.isPhantom && window.solana.disconnect) {
        try { await window.solana.disconnect(); } catch(e) { /* ignore */ }
      }
      if (window.solflare && window.solflare.disconnect) {
        try { await window.solflare.disconnect(); } catch(e) { /* ignore */ }
      }
    } catch (e) { console.warn('Disconnect error', e); }
    // clear UI
    try { walletAddrSpan.textContent = ''; } catch(e){}
    try { usdcBalanceSpan.textContent = '-'; } catch(e){}
    try { document.getElementById('solBadge').textContent = 'SOL: -'; } catch(e){}
    try { disconnectWalletBtn.style.display = 'none'; } catch(e){}
    try { copyAddressBtn.style.display = 'none'; } catch(e){}
    currentWallet = null;
    try { updateRoleUI(); } catch(e){}
  };
}

if (copyAddressBtn) {
  copyAddressBtn.onclick = async () => {
    try {
      const addr = (walletAddrSpan && walletAddrSpan.textContent) || '';
      if (!addr) return;
      await navigator.clipboard.writeText(addr);
      copyAddressBtn.textContent = 'Copied';
      setTimeout(()=>{ try{ copyAddressBtn.textContent = 'Copy Address'; }catch(e){} }, 1400);
    } catch (e) { console.warn('Copy address failed', e); }
  };
}
// MetaMask/EVM wallet support removed for now; will add when EVM/Base networks are supported.
clusterSelect && (clusterSelect.onchange = () => {
  // if connected, reload balances
  try {
    const maybe = (currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey);
    const addr = ensureSolanaPublicKey(maybe);
    if (addr) loadUsdcBalance(addr);
  } catch (e) { /* ignore */ }
});

  // --- UI: Home / Create / Join panels ---
  const homeCreateBtn = document.getElementById('homeCreateBtn');
  const homeJoinBtn = document.getElementById('homeJoinBtn');
  const createPanel = document.getElementById('createPanel');
  const joinPanel = document.getElementById('joinPanel');
  const homePanel = document.getElementById('homePanel');

  function showPanel(name) {
    // hide landing overlay if present when navigating into panels
    try { const _land = document.getElementById('landing'); if (_land) _land.style.display = 'none'; } catch(e){}
    if (name === 'create') {
      createPanel.style.display = 'block';
      joinPanel.style.display = 'none';
    } else if (name === 'join') {
      createPanel.style.display = 'none';
      joinPanel.style.display = 'block';
    } else {
      createPanel.style.display = 'none';
      joinPanel.style.display = 'none';
    }
  }

  homeCreateBtn && (homeCreateBtn.onclick = () => { navigateTo('create'); });
  homeJoinBtn && (homeJoinBtn.onclick = () => { navigateTo('join'); });

  // Landing overlay wiring (initial home screen)
  const landing = document.getElementById('landing');
  const landingCreateBtn = document.getElementById('landingCreateBtn');
  const landingJoinBtn = document.getElementById('landingJoinBtn');
  if (landingCreateBtn) landingCreateBtn.onclick = () => { if (landing) landing.style.display = 'none'; navigateTo('create'); };
  if (landingJoinBtn) landingJoinBtn.onclick = () => { if (landing) landing.style.display = 'none'; navigateTo('join'); };

  // Role-based UI update: hosts should not send USDC from the browser test widget
  function updateRoleUI() {
    try {
      const isHost = !!(hostRoom && currentWallet && hostRoom.hostPubkey && currentWallet.pubkey && hostRoom.hostPubkey.toString() === currentWallet.pubkey.toString());
      if (sendUsdcBtn) sendUsdcBtn.disabled = isHost;
      if (txRecipientInput) txRecipientInput.disabled = isHost;
      if (txAmountInput) txAmountInput.disabled = isHost;
      if (txStatus && isHost) txStatus.textContent = 'Host mode: sending disabled. Hosts only receive payments.';
    } catch (e) { /* ignore */ }
  }

  // Page navigation helper: show home/create/join/call
  function navigateTo(page) {
    try {
      const home = document.getElementById('homePage');
      const cp = document.getElementById('createPanel');
      const jp = document.getElementById('joinPanel');
      const call = document.getElementById('callPage');
      if (home) home.style.display = 'none';
      if (cp) cp.style.display = 'none';
      if (jp) jp.style.display = 'none';
      if (call) call.style.display = 'none';
      if (page === 'home' && home) home.style.display = 'block';
      if (page === 'create' && cp) cp.style.display = 'block';
      if (page === 'join' && jp) jp.style.display = 'block';
      if (page === 'call' && call) call.style.display = 'block';
      // hide landing overlay when navigating
      try { if (landing) landing.style.display = 'none'; } catch(e){}
    } catch (e) { /* ignore */ }
  }

  // wire header navigation if present
  try {
    document.getElementById('navHome') && (document.getElementById('navHome').onclick = (e)=>{e.preventDefault(); navigateTo('home');});
    document.getElementById('navCreate') && (document.getElementById('navCreate').onclick = (e)=>{e.preventDefault(); navigateTo('create');});
    document.getElementById('navJoin') && (document.getElementById('navJoin').onclick = (e)=>{e.preventDefault(); navigateTo('join');});
  } catch(e){}

  // SDP modal helpers
  const sdpModal = document.getElementById('sdpModal');
  const copyLocalSdpBtn = document.getElementById('copyLocalSdpBtn');
  const acceptRemoteSdpBtn = document.getElementById('acceptRemoteSdpBtn');
  const closeSdpModal = document.getElementById('closeSdpModal');
  function showSdpModal() { if (sdpModal) sdpModal.style.display = 'flex'; }
  function hideSdpModal() { if (sdpModal) sdpModal.style.display = 'none'; }
  if (copyLocalSdpBtn) copyLocalSdpBtn.onclick = async () => { try { const txt = (localSDP && localSDP.value) || ''; await navigator.clipboard.writeText(txt); copyLocalSdpBtn.textContent = 'Copied'; setTimeout(()=>copyLocalSdpBtn.textContent = 'Copy Local SDP',1500); } catch(e){ console.warn(e); } };
  if (closeSdpModal) closeSdpModal.onclick = hideSdpModal;
  // Convert SDP modal into step-by-step flow: hide raw JSON and use clipboard/prompt
  function renderSdpStepModalForHost() {
    if (!sdpModal) return;
    sdpModal.style.display = 'flex';
    sdpModal.innerHTML = `
      <div style="background:#0b0f10;padding:16px;border-radius:8px;width:520px;">
        <h3 style="margin-top:0;color:#fff;">Signaling — Host</h3>
        <div style="margin-top:8px;color:#ccc;">Step 1: Click <strong>Copy Offer</strong> and share it with your guest (clipboard).</div>
        <div style="margin-top:12px;display:flex;gap:8px;"><button id="stepCopyOffer">Copy Offer</button><button id="stepPasteAnswer">Paste Answer (from guest)</button><span id="sdpStatus" style="margin-left:8px;color:#9aa;"></span></div>
        <div style="text-align:right;margin-top:10px;"><button id="sdpCloseBtn">Close</button></div>
      </div>`;
    // wire buttons
    const btnCopy = document.getElementById('stepCopyOffer');
    const btnPaste = document.getElementById('stepPasteAnswer');
    const sdpStatus = document.getElementById('sdpStatus');
    const closeBtn = document.getElementById('sdpCloseBtn');
    if (btnCopy) btnCopy.onclick = async () => {
      try {
        // ensure offer is created
        if (!pc || !pc.localDescription) {
          await createOffer();
        }
        const txt = JSON.stringify(pc.localDescription);
        await navigator.clipboard.writeText(txt);
        if (sdpStatus) sdpStatus.textContent = 'Offer copied to clipboard';
      } catch (e) { console.warn(e); if (sdpStatus) sdpStatus.textContent = 'Copy failed'; }
    };
    if (btnPaste) btnPaste.onclick = async () => {
      try {
        let txt = '';
        try { txt = await navigator.clipboard.readText(); } catch(e){}
        if (!txt) txt = window.prompt('Paste guest answer here');
        if (!txt) return;
        // apply answer
        try { if (remoteSDP) remoteSDP.value = txt; } catch(e){}
        await setRemote();
        if (sdpStatus) sdpStatus.textContent = 'Answer applied — connection should progress';
        // close modal after a moment
        setTimeout(()=>{ try { hideSdpModal(); navigateTo('call'); } catch(e){} }, 800);
      } catch (e) { console.warn('Paste answer failed', e); if (sdpStatus) sdpStatus.textContent = 'Failed to apply answer'; }
    };
    if (closeBtn) closeBtn.onclick = hideSdpModal;
  }

  function renderSdpStepModalForInvitee() {
    if (!sdpModal) return;
    sdpModal.style.display = 'flex';
    sdpModal.innerHTML = `
      <div style="background:#0b0f10;padding:16px;border-radius:8px;width:520px;">
        <h3 style="margin-top:0;color:#fff;">Signaling — Guest</h3>
        <div style="margin-top:8px;color:#ccc;">Step 1: Click <strong>Paste Host Offer</strong> (reads clipboard or prompts). Step 2: Click <strong>Copy Answer</strong> and send it back to the host.</div>
        <div style="margin-top:12px;display:flex;gap:8px;"><button id="stepPasteOffer">Paste Host Offer</button><button id="stepCopyAnswer" disabled>Copy Answer</button><span id="sdpStatusGuest" style="margin-left:8px;color:#9aa;"></span></div>
        <div style="text-align:right;margin-top:10px;"><button id="sdpCloseBtnGuest">Close</button></div>
      </div>`;
    const btnPaste = document.getElementById('stepPasteOffer');
    const btnCopy = document.getElementById('stepCopyAnswer');
    const sdpStatus = document.getElementById('sdpStatusGuest');
    const closeBtn = document.getElementById('sdpCloseBtnGuest');
    if (btnPaste) btnPaste.onclick = async () => {
      try {
        let txt = '';
        try { txt = await navigator.clipboard.readText(); } catch(e){}
        if (!txt) txt = window.prompt('Paste host offer here');
        if (!txt) return;
        // set remote offer
        try { if (remoteSDP) remoteSDP.value = txt; } catch(e){}
        await createAnswer();
        if (sdpStatus) sdpStatus.textContent = 'Answer created — click Copy Answer to send to host';
        if (btnCopy) btnCopy.disabled = false;
      } catch (e) { console.warn('Paste offer failed', e); if (sdpStatus) sdpStatus.textContent = 'Failed to process offer'; }
    };
    if (btnCopy) btnCopy.onclick = async () => {
      try {
        const txt = JSON.stringify(pc.localDescription || (localSDP && localSDP.value) || '');
        await navigator.clipboard.writeText(txt);
        if (sdpStatus) sdpStatus.textContent = 'Answer copied to clipboard — send to host';
        // navigate to call page for guest — host will accept later
        setTimeout(()=>{ try { hideSdpModal(); navigateTo('call'); } catch(e){} }, 600);
      } catch (e) { console.warn('Copy answer failed', e); if (sdpStatus) sdpStatus.textContent = 'Copy failed'; }
    };
    if (closeBtn) closeBtn.onclick = hideSdpModal;
  }

  // disable DataChannel text messaging UI (users cannot send chat)
  try { if (sendDataBtn) sendDataBtn.disabled = true; if (dataMsg) dataMsg.disabled = true; } catch(e){}

  // Invite code / link generation for host
  function generateRoomCode(length = 8) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i=0;i<length;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }

  const addFileBtn = document.getElementById('addFileBtn');
  const fileNameInput = document.getElementById('fileNameInput');
  const filePriceInput = document.getElementById('filePriceInput');
  const fileList = document.getElementById('fileList');
  const copyInviteBtn = document.getElementById('copyInviteBtn');
  const includeOfferCheckbox = document.getElementById('includeOfferCheckbox');

  // helper: base64url encode/decode
  function b64UrlEncode(str) {
    try { return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); } catch(e){ return null; }
  }
  function b64UrlDecode(s) {
    try { s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '='; return atob(s); } catch(e){ return null; }
  }

  // Attempt to compress using LZString if available, falling back to base64url
  function compressForUrl(str) {
    try {
      if (window.LZString && LZString.compressToEncodedURIComponent) {
        return { method: 'lz', data: LZString.compressToEncodedURIComponent(str) };
      }
    } catch (e) { /* ignore */ }
    const b = b64UrlEncode(str);
    return { method: 'b64', data: b };
  }

  function decompressFromUrl(obj) {
    try {
      if (!obj) return null;
      if (obj.method === 'lz' && window.LZString && LZString.decompressFromEncodedURIComponent) {
        return LZString.decompressFromEncodedURIComponent(obj.data);
      }
      if (obj.method === 'b64') {
        return b64UrlDecode(obj.data);
      }
      return null;
    } catch (e) { return null; }
  }

  // Shorten a long URL using TinyURL public API as a best-effort fallback.
  // This may fail due to CORS; we handle failures gracefully.
  async function tryShortenUrl(longUrl) {
    try {
      const api = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl);
      const res = await fetch(api);
      if (!res.ok) throw new Error('shorten failed');
      const text = await res.text();
      // TinyURL returns the shortened URL in plain text
      if (text && text.startsWith('http')) return text.trim();
      return null;
    } catch (e) {
      // network or CORS; do not throw — caller will fallback to manual instructions
      console.warn('Shorten failed', e);
      return null;
    }
  }

  function renderFileList() {
    if (!hostRoom || !hostRoom.files) { fileList.innerHTML = '<em>No files added</em>'; return; }
    fileList.innerHTML = hostRoom.files.map((f,i)=>`<div>${i+1}. ${f.name} — ${f.price} USDC</div>`).join('');
  }

  addFileBtn && (addFileBtn.onclick = () => {
    if (!hostRoom) { roomInfoSpan.textContent = 'Create room first to add files'; return; }
    const name = (fileNameInput.value || '').trim();
    const cfg = (window.PAY2CHAT_CONFIG || {});
    const minPrice = cfg.MIN_PRICE || 5.0;
    const maxPrice = cfg.MAX_PRICE || 1000.0;
    const defaultPrice = cfg.DEFAULT_PRICE || 20.0;
    let price = parseFloat(filePriceInput.value || '') || defaultPrice;
    if (price < minPrice) price = minPrice;
    if (price > maxPrice) price = maxPrice;
    if (!name || !(price > 0)) return;
    hostRoom.files = hostRoom.files || [];
    hostRoom.files.push({ name, price });
    renderFileList();
    fileNameInput.value = '';
    filePriceInput.value = '';
  });

  // Override createRoomBtn to also create invite link and code
  const createRoomBtnEl = document.getElementById('createRoomBtn');
  if (createRoomBtnEl) {
    createRoomBtnEl.onclick = async () => {
      await createRoom();
      if (!hostRoom) return;
      const code = generateRoomCode(8);
      hostRoom.code = code;
      const price = hostRoom.price;
      const pub = hostRoom.hostPubkey.toString();
      const params = new URLSearchParams({ room: pub, code, price: String(price) });
      const invite = location.origin + location.pathname + '?' + params.toString();
      hostRoom.inviteLink = invite;
      roomInfoSpan.innerHTML = `Room created. Invite: <a href="${invite}" target="_blank">${invite}</a>`;
      try { if (copyInviteBtn) { copyInviteBtn.style.display = 'inline-block'; copyInviteBtn.onclick = async () => { try { await navigator.clipboard.writeText(hostRoom.inviteLink || ''); copyInviteBtn.textContent = 'Copied'; setTimeout(()=>copyInviteBtn.textContent = 'Copy Invite',1400); } catch(e){ console.warn(e); } }; } } catch(e){}
    };
  }

  // Begin session (host) - create room, generate offer and show SDP modal
  const createBeginBtn = document.getElementById('createBeginBtn');
  if (createBeginBtn) {
    createBeginBtn.onclick = async () => {
      try {
        await createRoom();
        if (!hostRoom) return;
        // ensure invite link exists
        // create offer and then generate invite (optionally include offer in link)
        await createOffer();
        // build base invite params
        const code = hostRoom.code || generateRoomCode(8);
        hostRoom.code = code;
        const price = hostRoom.price;
        const pub = hostRoom.hostPubkey.toString();
        const params = new URLSearchParams({ room: pub, code, price: String(price) });
        // if includeOfferCheckbox or config default is on, embed compressed offer
        const includeOffer = (includeOfferCheckbox && includeOfferCheckbox.checked) || (window.PAY2CHAT_CONFIG && window.PAY2CHAT_CONFIG.AUTO_OFFER_IN_LINK_DEFAULT);
        if (includeOffer && pc && pc.localDescription) {
          const s = JSON.stringify(pc.localDescription || {});
          const cfg = window.PAY2CHAT_CONFIG || {};
          const maxLen = cfg.MAX_OFFER_LENGTH || 16000;
          // compress (prefer LZString) then attach method marker
          const compressed = compressForUrl(s);
          if (compressed && compressed.data && compressed.data.length <= maxLen) {
            // store method prefix so decoder knows how to interpret
            params.set('o_m', compressed.method);
            params.set('o', compressed.data);
          } else {
            roomInfoSpan.textContent = 'Offer too large to embed in link; generating long invite and attempting shortlink fallback.';
          }
        }
        const invite = location.origin + location.pathname + '?' + params.toString();
        hostRoom.inviteLink = invite;
        roomInfoSpan.innerHTML = `Room created. Invite: <a href="${hostRoom.inviteLink}" target="_blank">${hostRoom.inviteLink}</a>`;
        try {
          if (copyInviteBtn) {
            copyInviteBtn.style.display = 'inline-block';
            copyInviteBtn.onclick = async () => {
              try { await navigator.clipboard.writeText(hostRoom.inviteLink || ''); copyInviteBtn.textContent = 'Copied'; setTimeout(()=>copyInviteBtn.textContent = 'Copy Invite',1400); } catch(e){ console.warn(e); }
            };
          }
          // if invite link is long and TinyURL available, attempt a shortlink
          (async ()=>{
            try {
              if (hostRoom.inviteLink && hostRoom.inviteLink.length > 120) {
                const short = await tryShortenUrl(hostRoom.inviteLink);
                if (short) {
                  hostRoom.shortInvite = short;
                  roomInfoSpan.innerHTML = `Room created. Invite: <a href="${short}" target="_blank">${short}</a> <span style="color:#9aa;font-size:0.9rem;">(shortened)</span>`;
                  if (copyInviteBtn) { copyInviteBtn.onclick = async () => { try { await navigator.clipboard.writeText(short || ''); copyInviteBtn.textContent = 'Copied'; setTimeout(()=>copyInviteBtn.textContent = 'Copy Invite',1400); } catch(e){ console.warn(e); } }; }
                } else {
                  // no shortlink available — leave long invite and inform host
                  roomInfoSpan.innerHTML += '<div style="color:#dca;font-size:0.9rem;">Invite is long; if you want auto-join for all guests consider enabling a signaling server.</div>';
                }
              }
            } catch (e) { console.warn('Shorten attempt failed', e); }
          })();
        } catch(e){}
        // show host step-by-step modal to let host copy offer if needed
        renderSdpStepModalForHost();
      } catch (e) { console.warn('Begin session failed', e); }
    };
  }

  // Join by invite link or code
  const joinByCodeBtn = document.getElementById('joinByCodeBtn');
  const inviteCodeInput = document.getElementById('inviteCodeInput');
  if (joinByCodeBtn) {
    joinByCodeBtn.onclick = () => {
      const raw = (inviteCodeInput.value || '').trim();
      if (!raw) return;
      // If it's a URL, parse params; else try to parse as querystring
      try {
        let params = null;
        if (raw.startsWith('http')) {
          const u = new URL(raw);
          params = u.searchParams;
        } else if (raw.includes('?')) {
          params = new URLSearchParams(raw.split('?')[1]);
        } else {
          // assume code only (not supported without server); show message
          prepayStatus.style.color = '#f66';
          prepayStatus.textContent = 'Code-only invites not supported in this client; paste the full invite URL.';
          return;
        }
        const room = params.get('room');
        const price = params.get('price');
        if (room) {
          joinHostAddr.value = room;
          joinPrice.value = price || '';
          prepayStatus.textContent = '';
          showPanel('join');
        } else {
          prepayStatus.style.color = '#f66';
          prepayStatus.textContent = 'Invalid invite link';
        }
      } catch (e) {
        prepayStatus.style.color = '#f66';
        prepayStatus.textContent = 'Invalid invite link';
      }
    };
  }

  // Join session (invitee) - load invite and show SDP modal to paste host offer
  const joinBeginBtn = document.getElementById('joinBeginBtn');
  if (joinBeginBtn) {
    joinBeginBtn.onclick = async () => {
      try {
        const raw = (inviteCodeInput.value || '').trim();
        if (!raw) { prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Paste the invite link first'; return; }
        let params = null;
        if (raw.startsWith('http')) {
          const u = new URL(raw);
          params = u.searchParams;
        } else if (raw.includes('?')) {
          params = new URLSearchParams(raw.split('?')[1]);
        } else { prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Code-only invites not supported; paste full URL.'; return; }
        const room = params.get('room');
        const price = params.get('price');
        const offerEnc = params.get('o');
        if (room) {
          // validate host address
          const hostPk = ensureSolanaPublicKey(room);
          if (!hostPk) { prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Invalid host address in invite'; return; }
          joinHostAddr.value = room;
          joinPrice.value = price || '';
          prepayStatus.textContent = '';
          // If the invite contains an embedded offer ('o'), decode and auto-create answer (links-only prototype)
          if (offerEnc) {
            // support compressed offers: check optional method param 'o_m' (e.g., 'lz' or 'b64')
            const offerMethod = params.get('o_m');
            let decoded = null;
            try {
              if (offerMethod === 'lz' && window.LZString && LZString.decompressFromEncodedURIComponent) {
                decoded = LZString.decompressFromEncodedURIComponent(offerEnc);
              } else if (offerMethod === 'b64') {
                decoded = b64UrlDecode(offerEnc);
              } else {
                // unknown/missing method — try base64 then lz fallback
                decoded = b64UrlDecode(offerEnc) || null;
                if (!decoded && window.LZString && LZString.decompressFromEncodedURIComponent) {
                  try { decoded = LZString.decompressFromEncodedURIComponent(offerEnc); } catch(e) { decoded = null; }
                }
              }
            } catch (e) { decoded = null; }
            if (!decoded) { prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Invite contains invalid or unsupported embedded offer'; return; }
            try {
              // set remote description directly
              if (!pc) createPeerConnection();
              await pc.setRemoteDescription(JSON.parse(decoded));
              // create answer automatically
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              // copy answer to clipboard for host to paste
              try { await navigator.clipboard.writeText(JSON.stringify(pc.localDescription)); } catch(e) {}
              prepayStatus.style.color = '#8f8';
              prepayStatus.textContent = 'Answer created and copied to clipboard. Send it to the host to complete the connection.';
              // navigate guest to call page (guest side)
              navigateTo('call');
            } catch (e) {
              console.warn('Auto-answer failed', e);
              prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Failed to auto-create answer; use manual signaling.';
              renderSdpStepModalForInvitee();
            }
            return;
          }
          // require prepay before joining (no offer embedded) — skipped when payments disabled
          if (!PAYMENTS_DISABLED && (!window.lastPrepay || (window.lastPrepay && !window.lastPrepay.txid))) {
            prepayStatus.style.color = '#f66';
            prepayStatus.textContent = 'Please Prepay before joining. Use Prepay 3 minutes.';
            // show join panel so user can prepay
            showPanel('join');
            return;
          }
          // show step-by-step SDP modal for invitee (manual flow)
          renderSdpStepModalForInvitee();
        } else {
          prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Invalid invite link';
        }
      } catch (e) { prepayStatus.style.color = '#f66'; prepayStatus.textContent = 'Invalid invite link'; }
    };
  }

  // Tip button wiring
  const tipBtn = document.getElementById('tipBtn');
  const tipAmount = document.getElementById('tipAmount');
  const tipStatus = document.getElementById('tipStatus');
  if (tipBtn) {
    tipBtn.onclick = async () => {
      try {
        tipStatus.textContent = '';
        const amt = parseFloat((tipAmount && tipAmount.value) || '0');
        if (!(amt > 0)) { tipStatus.style.color = '#f66'; tipStatus.textContent = 'Enter tip amount'; return; }
        const hostAddr = (joinHostAddr && joinHostAddr.value) || (hostRoom && hostRoom.hostPubkey && hostRoom.hostPubkey.toString());
        if (!hostAddr) { tipStatus.style.color = '#f66'; tipStatus.textContent = 'No host address available'; return; }
        const from = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
        if (!from) { tipStatus.style.color = '#f66'; tipStatus.textContent = 'Connect your wallet first'; return; }
        tipStatus.style.color = '#ccc'; tipStatus.textContent = 'Sending tip...';
        const res = await sendUsdcTransfer({ fromPubkey: from, toOwner: hostAddr, amount: amt });
        tipStatus.style.color = '#8f8'; tipStatus.textContent = 'Tip sent: ' + res.txid;
      } catch (err) {
        if (err && err.code === 'INSUFFICIENT_GAS') {
          tipStatus.style.color = '#f66';
          tipStatus.textContent = 'Insufficient SOL for fees. Please top up SOL.';
          try {
            const from = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
            const cur = from ? await getSolBalance(from) : null;
            showSolTopupModal(MIN_SOL_BALANCE_FOR_FEES, cur, (currentWallet && currentWallet.pubkey) || '');
          } catch (e) { showSolTopupModal(MIN_SOL_BALANCE_FOR_FEES, null, (currentWallet && currentWallet.pubkey) || ''); }
          return;
        }
        tipStatus.style.color = '#f66'; tipStatus.textContent = `Tip failed: ${err.message || err}`;
      }
    };
  }

// --- Stage 4: USDC Transfer Engine ---
const sendUsdcBtn = document.getElementById('sendUsdcBtn');
const txRecipientInput = document.getElementById('txRecipient');
const txAmountInput = document.getElementById('txAmount');
const txStatus = document.getElementById('txStatus');

// If payments are disabled for this build, disable/hide payment UI controls
try {
  if (PAYMENTS_DISABLED) {
    if (sendUsdcBtn) { sendUsdcBtn.disabled = true; try { sendUsdcBtn.style.display = 'none'; } catch(e){} }
    if (txRecipientInput) txRecipientInput.disabled = true;
    if (txAmountInput) txAmountInput.disabled = true;
    try { if (prepayBtn) { prepayBtn.disabled = true; prepayBtn.style.display = 'none'; } } catch(e){}
    try { if (tipBtn) { tipBtn.disabled = true; tipBtn.style.display = 'none'; } } catch(e){}
    try { if (prepayStatus) prepayStatus.textContent = 'Payments disabled in this build (call-only mode)'; } catch(e){}
    try { if (txStatus) txStatus.textContent = 'Payments disabled in this build'; } catch(e){}
  }
} catch(e){}

const SPL_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// NOTE: We use mainnet USDC mint by default. For devnet testing, user must supply a devnet USDC mint.
const USDC_MINT_MAINNET = new solanaWeb3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Minimum SOL balance required to cover transaction fees and ATA creation rent (approx)
const MIN_SOL_BALANCE_FOR_FEES = 0.0015; // SOL

async function getSolBalance(pubkey) {
  const cluster = clusterSelect.value || 'mainnet';
  let rpc = rpcForCluster();
  let conn = new solanaWeb3.Connection(rpc, 'confirmed');
  try {
    const lamports = await conn.getBalance(pubkey);
    return lamports / solanaWeb3.LAMPORTS_PER_SOL;
  } catch (err) {
    // fallback on RPC/provider error
    const fb = getFallbackRpc(cluster);
    if (fb && fb !== rpc) {
      conn = new solanaWeb3.Connection(fb, 'confirmed');
      const lamports = await conn.getBalance(pubkey);
      return lamports / solanaWeb3.LAMPORTS_PER_SOL;
    }
    throw err;
  }
}

// --- Signaling helper: on-chain memo publish & poll (best-effort, costs SOL) ---
// These helpers let hosts publish a compressed offer to the Solana Memo program
// addressed to the configured PROTOCOL_WALLET so guests can poll the chain
// and retrieve the offer. This is a best-effort browser-only signaling channel
// (requires wallet signing and incurs SOL fees). Use only as an optional fallback.
async function publishOfferOnchain(roomCode, payload) {
  try {
    const cfg = window.PAY2CHAT_CONFIG || {};
    const protocol = cfg.PROTOCOL_WALLET || cfg.protocolWallet || null;
    if (!protocol) throw new Error('PROTOCOL_WALLET not set in config');
    const toPub = new solanaWeb3.PublicKey(protocol);
    const conn = new solanaWeb3.Connection(rpcForCluster(), 'confirmed');
    const memoProgramId = new solanaWeb3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    // tag the memo so we can find it later
    const tag = `PAY2CHAT_OFFER:${roomCode}:`;
    const dataStr = tag + payload;
    const tx = new solanaWeb3.Transaction();
    const ins = new solanaWeb3.TransactionInstruction({
      keys: [],
      programId: memoProgramId,
      data: Buffer.from(dataStr, 'utf8')
    });
    tx.add(ins);
    // send via wallet provider
    const signerProvider = (currentWallet && currentWallet.provider) || window.solana;
    if (!signerProvider) throw new Error('No wallet provider available to sign memo transaction');
    // attempt high-level signAndSendTransaction if available (Phantom modern API)
    if (signerProvider.signAndSendTransaction) {
      const signed = await signerProvider.signAndSendTransaction(tx);
      return { success: true, txid: signed.signature };
    }
    // fallback: signTransaction + sendRawTransaction
    if (signerProvider.signTransaction) {
      const signedTx = await signerProvider.signTransaction(tx);
      const raw = signedTx.serialize();
      const txid = await conn.sendRawTransaction(raw);
      await conn.confirmTransaction(txid, 'confirmed');
      return { success: true, txid };
    }
    throw new Error('Wallet provider does not support signing transactions in this environment');
  } catch (e) {
    console.warn('publishOfferOnchain failed', e);
    return { success: false, error: (e && e.message) ? e.message : String(e) };
  }
}

async function pollForOnchainOffer(roomCode, lookback = 200) {
  // Polls recent PROTOCOL_WALLET transactions for a memo tagged with PAY2CHAT_OFFER:<roomCode>:
  try {
    const cfg = window.PAY2CHAT_CONFIG || {};
    const protocol = cfg.PROTOCOL_WALLET || cfg.protocolWallet || null;
    if (!protocol) throw new Error('PROTOCOL_WALLET not set in config');
    const protocolPub = new solanaWeb3.PublicKey(protocol);
    const conn = new solanaWeb3.Connection(rpcForCluster(), 'confirmed');
    const sigs = await conn.getSignaturesForAddress(protocolPub, { limit: lookback });
    const memoProgramId = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
    for (const s of sigs) {
      try {
        const tx = await conn.getParsedTransaction(s.signature, 'confirmed');
        if (!tx) continue;
        // try to find memo instruction in transaction message
        const instrs = (tx.transaction && tx.transaction.message && tx.transaction.message.instructions) || [];
        for (const ins of instrs) {
          try {
            const pid = ins.programId && ins.programId.toString ? ins.programId.toString() : (ins.programId || ins.program);
            if (!pid) continue;
            if (pid === memoProgramId) {
              // memo data may be in 'data' (base64) or 'parsed' fields depending on RPC
              let raw = null;
              if (ins.data) {
                // some RPCs return memo data as base64
                try { raw = Buffer.from(ins.data, 'base64').toString('utf8'); } catch(e) { raw = ins.data; }
              } else if (ins.parsed && ins.parsed === 'memo') {
                raw = ins.parsed; // fallback
              } else if (ins.parsed && ins.parsed.info && ins.parsed.info.memo) {
                raw = ins.parsed.info.memo;
              }
              if (!raw && tx.meta && tx.meta.logMessages) {
                // sometimes memo shows up in logs — cheap heuristic
                for (const lm of tx.meta.logMessages) {
                  if (typeof lm === 'string' && lm.includes('PAY2CHAT_OFFER')) raw = lm;
                }
              }
              if (!raw) continue;
              // look for tag
              const tag = `PAY2CHAT_OFFER:${roomCode}:`;
              if (raw.indexOf(tag) !== -1) {
                const payload = raw.split(tag)[1];
                return { success: true, txid: s.signature, payload };
              }
            }
          } catch (e) { /* ignore instruction parse errors */ }
        }
      } catch (e) { /* ignore per-tx errors */ }
    }
    return { success: false, reason: 'not_found' };
  } catch (e) {
    console.warn('pollForOnchainOffer failed', e);
    return { success: false, error: (e && e.message) ? e.message : String(e) };
  }
}

function recommendSignalingImprovements() {
  return [
    'Use a TURN server (paid or self-hosted) and add credentials to PAY2CHAT_CONFIG. This dramatically improves connectivity in NAT/restrictive networks.',
    'Increase RTCPeerConnection iceCandidatePoolSize (e.g., 10) when creating the connection to warm up ICE candidates.',
    'Provide an optional ephemeral signaling server (WebSocket) for short-lived offer/answer exchange — simplest and most reliable for auto-join.',
    'Keep offers small: prefer Opus-only audio or reduce resolution/bitrate to shrink SDP payloads.',
    'On mobile, encourage use of native wallet adapters (Wallet Adapter / WalletConnect) to avoid browser extension limitations.'
  ];
}

// expose signaling helpers for debug/UI wiring
window.signaling = window.signaling || {};
window.signaling.publishOfferOnchain = publishOfferOnchain;
window.signaling.pollForOnchainOffer = pollForOnchainOffer;
window.signaling.recommendSignalingImprovements = recommendSignalingImprovements;

// --- WebSocket Signaling Client (ephemeral signaling server) ---
// Usage: window.signaling.connectWebsocket(url, room) -> joins room
// Protocol: JSON messages {type:'join'|'offer'|'answer'|'candidate', room, payload}
window.signaling._ws = null;
window.signaling._room = null;
window.signaling.connectWebsocket = function(url, room) {
  try {
    if (!url) throw new Error('WebSocket URL required');
    const ws = new WebSocket(url);
    window.signaling._ws = ws;
    window.signaling._room = room || null;
    ws.onopen = () => {
      console.info('Signaling WS connected');
      if (room) ws.send(JSON.stringify({ type: 'join', room }));
    };
    ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (!msg || !msg.type) return;
        switch (msg.type) {
          case 'offer':
            // Guest receives offer -> set as remote, create answer and send back
            try {
              if (!pc) createPeerConnection();
              await ensureMedia();
              await pc.setRemoteDescription(msg.offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              // send answer back
              ws.send(JSON.stringify({ type: 'answer', room: msg.room, answer: pc.localDescription }));
            } catch (e) { console.warn('Auto-answer error', e); }
            break;
          case 'answer':
            // Host receives answer -> set remote
            try { if (pc) pc.setRemoteDescription(msg.answer); } catch(e){ console.warn('Apply answer failed', e); }
            break;
          case 'candidate':
            try {
              if (pc && msg.candidate) {
                await pc.addIceCandidate(msg.candidate);
              }
            } catch(e){ console.warn('Add candidate failed', e); }
            break;
          default: break;
        }
      } catch (e) { console.warn('Signaling message parse failed', e); }
    };
    ws.onclose = () => { console.info('Signaling WS closed'); window.signaling._ws = null; };
    ws.onerror = (e) => { console.warn('Signaling WS error', e); };
    return ws;
  } catch (e) { console.warn('connectWebsocket failed', e); return null; }
};

window.signaling.sendOfferToRoom = async function(room) {
  try {
    const ws = window.signaling._ws;
    if (!ws || ws.readyState !== 1) throw new Error('Signaling socket not connected');
    if (!pc || !pc.localDescription) {
      await createOffer();
    }
    ws.send(JSON.stringify({ type: 'offer', room: room || window.signaling._room, offer: pc.localDescription }));
    return { success: true };
  } catch (e) { console.warn('sendOfferToRoom failed', e); return { success: false, error: e.message || String(e) }; }
};

window.signaling.close = function() {
  try { if (window.signaling._ws) window.signaling._ws.close(); } catch(e){}
  window.signaling._ws = null; window.signaling._room = null;
};


// --- SOL top-up modal helpers ---
function showSolTopupModal(requiredSol, currentSol, walletPubkey) {
  try {
    const modal = document.getElementById('solTopupModal');
    const req = document.getElementById('modalRequiredSol');
    const cur = document.getElementById('modalCurrentSol');
    const addr = document.getElementById('modalWalletAddr');
    const recheck = document.getElementById('modalRecheckBtn');
    const close = document.getElementById('modalCloseBtn');
    if (!modal) return;
    req.textContent = String(requiredSol);
    cur.textContent = (typeof currentSol === 'number') ? String(currentSol) : '-';
    addr.textContent = (walletPubkey && walletPubkey.toString) ? walletPubkey.toString() : (walletPubkey || '');
    modal.style.display = 'flex';
    recheck.onclick = async () => {
      try {
        const pk = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
        if (!pk) return;
        const bal = await getSolBalance(pk);
        cur.textContent = String(bal);
        if (bal >= requiredSol) {
          // Inform user they've topped up
          cur.style.color = '#8f8';
        } else {
          cur.style.color = '#f66';
        }
      } catch (e) { console.warn('Recheck failed', e); }
    };
    close.onclick = () => { modal.style.display = 'none'; };
  } catch (e) { console.warn('showSolTopupModal error', e); }
}

function hideSolTopupModal() { try { const m = document.getElementById('solTopupModal'); if (m) m.style.display = 'none'; } catch(e){} }

function rpcForCluster() {
  return rpcUrlForCluster(clusterSelect.value || 'mainnet');
}

function ensureSolanaPublicKey(maybe) {
  if (!maybe) return null;
  try {
    if (maybe instanceof solanaWeb3.PublicKey) return maybe;
    return new solanaWeb3.PublicKey(maybe.toString ? maybe.toString() : maybe);
  } catch (e) {
    return null;
  }
}

async function findAta(owner, mint, connection) {
  if (window.splToken && splToken.getAssociatedTokenAddress) {
    return await splToken.getAssociatedTokenAddress(mint, owner);
  }
  throw { code: 'LIB_MISSING', message: 'spl-token helper required to resolve ATA' };
}

async function getTokenAmountForOwner(ownerPubkey, mint) {
  const cluster = clusterSelect.value || 'mainnet';
  let rpc = rpcForCluster();
  let conn = new solanaWeb3.Connection(rpc, 'confirmed');
  let res;
  try {
    res = await conn.getParsedTokenAccountsByOwner(ownerPubkey, { mint });
  } catch (err) {
    // fallback on any RPC/provider error
    const fb = getFallbackRpc(cluster);
    if (fb && fb !== rpc) {
      rpc = fb;
      conn = new solanaWeb3.Connection(rpc, 'confirmed');
      res = await conn.getParsedTokenAccountsByOwner(ownerPubkey, { mint });
    } else throw err;
  }
  let total = 0;
  for (const acc of res.value) {
    total += (acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
  }
  return total;
}

async function sendUsdcTransfer({ fromPubkey, toOwner, amount, mint = USDC_MINT_MAINNET, maxRetries = 3, onProgress = null }) {
  // Respect build toggle: if payments are disabled, abort early
  if (PAYMENTS_DISABLED) throw { code: 'PAYMENTS_DISABLED', message: 'Payments are disabled in this build (call-only mode)' };
  let cluster = clusterSelect.value || 'mainnet';
  let rpc = rpcForCluster();
  let conn = new solanaWeb3.Connection(rpc, 'confirmed');

  // validation
  if (!fromPubkey) throw { code: 'NO_WALLET', message: 'Sender wallet not connected' };
  if (!toOwner) throw { code: 'NO_RECIPIENT', message: 'Recipient address required' };
  if (!(amount > 0)) throw { code: 'INVALID_AMOUNT', message: 'Amount must be > 0' };

  // check balance (this function has its own fallback logic)
  const balance = await getTokenAmountForOwner(fromPubkey, mint);
  if (balance < amount) throw { code: 'INSUFFICIENT_FUNDS', message: `Insufficient USDC: ${balance}` };

  // check SOL balance for fees (ATA creation + tx fees)
  try {
    const solBal = await getSolBalance(fromPubkey);
    if (solBal < MIN_SOL_BALANCE_FOR_FEES) {
      throw { code: 'INSUFFICIENT_GAS', message: `Insufficient SOL for fees: ${solBal} SOL (need >= ${MIN_SOL_BALANCE_FOR_FEES} SOL)` };
    }
  } catch (err) {
    if (err && err.code === 'INSUFFICIENT_GAS') throw err;
    // if balance check failed due to RPC, include helpful message
    console.warn('SOL balance check failed', err);
  }

  // build transaction
  const tx = new solanaWeb3.Transaction();

  // resolve ATAs (attempt on current conn; on 403 try fallback once)
  let fromAta, toAta;
  try {
    fromAta = await findAta(fromPubkey, mint, conn);
    toAta = await findAta(new solanaWeb3.PublicKey(toOwner), mint, conn);
  } catch (err) {
    // fallback on any RPC/provider error during ATA resolution
    const fb = getFallbackRpc(cluster);
    if (fb && fb !== rpc) {
      walletError.textContent = 'Primary RPC error during transfer; retrying using fallback RPC.';
      rpc = fb;
      conn = new solanaWeb3.Connection(rpc, 'confirmed');
      fromAta = await findAta(fromPubkey, mint, conn);
      toAta = await findAta(new solanaWeb3.PublicKey(toOwner), mint, conn);
    } else throw err;
  }

  // create ATA for recipient if missing
  const toInfo = await conn.getAccountInfo(toAta);
  if (!toInfo) {
    // create associated token account instruction
    if (window.splToken && splToken.createAssociatedTokenAccountInstruction) {
      tx.add(splToken.createAssociatedTokenAccountInstruction(fromPubkey, toAta, new solanaWeb3.PublicKey(toOwner), mint));
    } else {
      // best-effort: skip and hope recipient has an ATA
    }
  }

  // transfer checked (amount in USDC has 6 decimals)
  const decimals = 6;
  const rawAmount = Math.round(amount * Math.pow(10, decimals));
  if (window.splToken && splToken.createTransferCheckedInstruction) {
    tx.add(splToken.createTransferCheckedInstruction(fromAta, mint, toAta, fromPubkey, rawAmount, decimals));
  } else {
    throw { code: 'LIB_MISSING', message: 'spl-token helper not available' };
  }

  // sign & send with retries
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // sign using available Solana wallet provider (Phantom, Solflare, etc.)
      onProgress && onProgress({ attempt: attempt + 1, status: 'signing' });
      const signerProvider = (currentWallet && currentWallet.provider) || window.solana;
      if (!signerProvider || !signerProvider.signTransaction) throw { code: 'NO_SIGNER', message: 'No wallet signer available for Solana transaction' };
      const signed = await signerProvider.signTransaction(tx);
      const raw = signed.serialize();
      onProgress && onProgress({ attempt: attempt + 1, status: 'sending' });
      let txid = await conn.sendRawTransaction(raw);
      try {
        await conn.confirmTransaction(txid, 'confirmed');
      } catch (confErr) {
        // fallback on any confirmation/provider error
        const fb = getFallbackRpc(cluster);
        if (fb && fb !== rpc) {
          rpc = fb;
          conn = new solanaWeb3.Connection(rpc, 'confirmed');
          // re-send raw transaction on fallback
          txid = await conn.sendRawTransaction(raw);
          await conn.confirmTransaction(txid, 'confirmed');
        } else throw confErr;
      }
      return { success: true, txid };
    } catch (err) {
      // user rejected
      if (err && err.message && err.message.toLowerCase().includes('user rejected')) {
        throw { code: 'USER_REJECTED', message: 'User rejected transaction' };
      }
      attempt++;
      onProgress && onProgress({ attempt, status: 'retry' });
      if (attempt >= maxRetries) {
        throw { code: 'RPC_ERROR', message: `RPC/send failed after ${attempt} attempts: ${err.message || err}` };
      }
      // backoff
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

// Hook up UI test button
if (sendUsdcBtn) {
  sendUsdcBtn.onclick = async () => {
    txStatus.textContent = '';
    try {
        const from = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
        if (!from) throw { code: 'NO_WALLET', message: 'Connect your Solana wallet first' };
      const to = txRecipientInput.value.trim();
      const amt = parseFloat(txAmountInput.value);
      txStatus.textContent = 'Sending...';
        const res = await sendUsdcTransfer({ fromPubkey: from, toOwner: to, amount: amt });
      txStatus.style.color = '#8f8';
      txStatus.textContent = 'Success: ' + res.txid;
    } catch (err) {
      if (err && err.code === 'INSUFFICIENT_GAS') {
        txStatus.style.color = '#f66';
        txStatus.textContent = 'Insufficient SOL for fees. Please top up SOL.';
        try {
          const from = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
          const cur = from ? await getSolBalance(from) : null;
          showSolTopupModal(MIN_SOL_BALANCE_FOR_FEES, cur, (currentWallet && currentWallet.pubkey) || '');
        } catch (e) { showSolTopupModal(MIN_SOL_BALANCE_FOR_FEES, null, (currentWallet && currentWallet.pubkey) || ''); }
      } else {
        txStatus.style.color = '#f66';
        txStatus.textContent = `Error (${err.code || 'UNKNOWN'}): ${err.message || err}`;
      }
    }
  };
}

// --- Stage 5: Room creation and prepay gating ---
const createRoomBtn = document.getElementById('createRoomBtn');
const hostPriceInput = document.getElementById('hostPrice');
const roomInfoSpan = document.getElementById('roomInfo');
const joinHostAddr = document.getElementById('joinHostAddr');
const joinPrice = document.getElementById('joinPrice');
const prepayBtn = document.getElementById('prepayBtn');
const prepayStatus = document.getElementById('prepayStatus');

let hostRoom = null; // {price, hostPubkey, requiredAmountRaw, ata, detectedTx}
let paymentPollInterval = null;
let seenSigs = new Set();

async function createRoom() {
  const hostMaybe = (currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey);
  const hostPub = ensureSolanaPublicKey(hostMaybe);
  if (!hostPub) {
    roomInfoSpan.textContent = 'Connect wallet as Host first (Phantom or Solflare)';
    return;
  }
  // validate rate (per-minute)
  const cfg = (window.PAY2CHAT_CONFIG || {});
  const minRate = cfg.MIN_RATE || 0.1;
  const maxRate = cfg.MAX_RATE || 100.0;
  const defaultRate = cfg.DEFAULT_RATE || 1.0;
  let price = parseFloat(hostPriceInput.value);
  if (!(price > 0)) {
    price = defaultRate;
  }
  if (price < minRate) price = minRate;
  if (price > maxRate) price = maxRate;
  const requiredAmount = price * 3; // upfront 3 minutes
  hostRoom = { price, hostPubkey: hostPub, requiredAmount, detectedTx: null };
  roomInfoSpan.textContent = `Room created — host=${hostPub.toString()} price=${price} USDC/min (prepay ${requiredAmount} USDC)`;
  // derive host USDC ATA
  try {
    const ata = await findAta(hostPub, USDC_MINT_MAINNET);
    hostRoom.ata = ata;
  } catch (e) {
    hostRoom.ata = null;
  }
  // start polling for payments
  if (paymentPollInterval) clearInterval(paymentPollInterval);
  paymentPollInterval = setInterval(() => pollForPayments(), 5000);
  try { updateRoleUI(); } catch(e) { /* ignore */ }
}

async function pollForPayments() {
  if (!hostRoom || !hostRoom.ata) return;
  const conn = new solanaWeb3.Connection(rpcForCluster(), 'confirmed');
  try {
    const sigs = await conn.getSignaturesForAddress(hostRoom.ata, { limit: 20 });
    for (const s of sigs) {
      if (seenSigs.has(s.signature)) continue;
      seenSigs.add(s.signature);
      const tx = await conn.getParsedTransaction(s.signature, 'confirmed');
      if (!tx) continue;
      // inspect instructions for transfer of USDC to this ATA
      const meta = tx.transaction.message;
      // iterate parsed instructions
      const parsed = tx.transaction.message.instructions || tx.meta?.innerInstructions || [];
      // fallback: check postTokenBalances
      const postBalances = tx.meta && tx.meta.postTokenBalances ? tx.meta.postTokenBalances : [];
      for (const b of postBalances) {
        if (b.mint === USDC_MINT_MAINNET.toString()) {
          const uiAmount = parseFloat(b.uiTokenAmount?.uiAmountString || b.uiTokenAmount?.uiAmount || 0);
          if (uiAmount >= hostRoom.requiredAmount) {
            // mark detected
            hostRoom.detectedTx = { sig: s.signature, amount: uiAmount, slot: s.slot };
            // show host notification
            roomInfoSpan.textContent = `Payment detected: ${uiAmount} USDC (tx=${s.signature}) — allowing incoming connections`;
            // set flag allowing incoming connections
            hostRoom.paid = true;
            return;
          }
        }
      }
    }
  } catch (e) {
    console.error('Payment poll error', e);
  }
}

createRoomBtn && (createRoomBtn.onclick = createRoom);

// Invitee prepay flow
if (prepayBtn) {
  prepayBtn.onclick = async () => {
    prepayStatus.textContent = '';
    try {
      const fromPub = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
      if (!fromPub) throw { code: 'NO_WALLET', message: 'Connect your Solana wallet first' };
      const hostAddr = joinHostAddr.value.trim();
      const price = parseFloat(joinPrice.value);
      if (!hostAddr || !(price > 0)) throw { code: 'INVALID_INPUT', message: 'Enter host address and price' };
      const amount = price * 3;
      prepayStatus.textContent = 'Paying ' + amount + ' USDC...';
      const res = await sendUsdcTransfer({ fromPubkey: fromPub, toOwner: hostAddr, amount });
      prepayStatus.style.color = '#8f8';
      prepayStatus.textContent = 'Prepay success: ' + res.txid;
      // notify host later via on-chain detection; also keep local record
      window.lastPrepay = { txid: res.txid, amount };
    } catch (err) {
      if (err && err.code === 'INSUFFICIENT_GAS') {
        prepayStatus.style.color = '#f66';
        prepayStatus.textContent = 'Insufficient SOL for fees. Please top up SOL.';
        try {
          const fromPub = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
          const cur = fromPub ? await getSolBalance(fromPub) : null;
          showSolTopupModal(MIN_SOL_BALANCE_FOR_FEES, cur, (currentWallet && currentWallet.pubkey) || '');
        } catch (e) { showSolTopupModal(MIN_SOL_BALANCE_FOR_FEES, null, (currentWallet && currentWallet.pubkey) || ''); }
      } else {
        prepayStatus.style.color = '#f66';
        prepayStatus.textContent = `Prepay failed (${err.code||'ERR'}): ${err.message || err}`;
      }
    }
  };
}
