// Pay2Chat Stage 1: WebRTC P2P Core
// No backend, no payments, no UI workarounds. Pure browser logic.

// Stage 11: Consent Modal Management
const CONSENT_STORAGE_KEY = 'pay2chat_consent_accepted';

function initConsentModal() {
  // Check if consent already given
  const consentAccepted = localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
  if (consentAccepted) {
    return; // Consent already given, don't show modal
  }
  
  const consentModal = document.getElementById('consentModal');
  const consentAge = document.getElementById('consentAge');
  const consentTOS = document.getElementById('consentTOS');
  const consentPP = document.getElementById('consentPP');
  const consentResponsibility = document.getElementById('consentResponsibility');
  const consentContinueBtn = document.getElementById('consentContinueBtn');
  
  if (!consentModal || !consentContinueBtn) return;
  
  // Show modal
  consentModal.style.display = 'flex';
  
  // Block all app interaction
  const root = document.getElementById('landing');
  if (root) root.style.pointerEvents = 'none';
  if (root) root.style.opacity = '0.3';
  
  // Update continue button state based on checkboxes
  function updateContinueButton() {
    const allChecked = consentAge && consentAge.checked && consentTOS && consentTOS.checked && consentPP && consentPP.checked && consentResponsibility && consentResponsibility.checked;
    consentContinueBtn.disabled = !allChecked;
    consentContinueBtn.style.cursor = allChecked ? 'pointer' : 'not-allowed';
    consentContinueBtn.style.opacity = allChecked ? '1' : '0.5';
  }
  
  // Wire up checkboxes
  [consentAge, consentTOS, consentPP, consentResponsibility].forEach(checkbox => {
    if (checkbox) checkbox.addEventListener('change', updateContinueButton);
  });
  
  // Wire up continue button
  consentContinueBtn.addEventListener('click', () => {
    if (!consentAge || !consentAge.checked || !consentTOS || !consentTOS.checked || !consentPP || !consentPP.checked || !consentResponsibility || !consentResponsibility.checked) {
      return; // Should not happen, but safety check
    }
    
    // Store consent
    localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    
    // Hide modal
    consentModal.style.display = 'none';
    
    // Restore app interaction
    if (root) root.style.pointerEvents = 'auto';
    if (root) root.style.opacity = '1';
    
    if (typeof logStatus === 'function') {
      logStatus('Consent accepted - Access granted');
    } else {
      console.log('Consent accepted - Access granted');
    }
  });
  
  // Prevent modal from being closed without consent
  consentModal.addEventListener('click', (e) => {
    if (e.target === consentModal) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

// Initialize consent modal on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConsentModal);
} else {
  initConsentModal();
}

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
      // Stage 9: Send file list to invitee when connection established (host side)
      if (hostRoom && hostRoom.files && hostRoom.files.length > 0) {
        setTimeout(() => sendFileListToInvitee(), 2000); // Small delay to ensure DataChannel is ready
      }
      // Stage 6: Start automatic billing when connection is established
      // Stage 7: Start timer when connection is established
      setTimeout(() => {
        startBilling();
        startTimer(); // Start timer alongside billing
      }, 1000); // Small delay to ensure everything is ready
    }
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      endCallBtn.disabled = true;
      muteBtn.disabled = true;
      cameraBtn.disabled = true;
      // Stage 6: Stop billing when connection closes
      // Stage 7: Stop timer when connection closes
      stopBilling();
      stopTimer();
    }
    if (pc.connectionState === 'closed') {
      resetUI();
      stopBilling();
      stopTimer();
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
          // Stage 6: Handle billing events over DataChannel
          case 'billing_attempt':
            logData(`[Billing attempt] amount=${msg.amount} timestamp=${msg.timestamp}`);
            logStatus(`Remote attempting minute payment: ${msg.amount} USDC`);
            break;
          case 'billing_success':
            logData(`[Billing success] txid=${msg.txid} amount=${msg.amount} total=${msg.totalPaid}`);
            logStatus(`Remote minute paid: ${msg.txid} (total: ${msg.totalPaid} USDC)`);
            break;
          case 'billing_failed':
            logData(`[Billing failed] code=${msg.code} message=${msg.message}`);
            logStatus(`Remote billing failed: ${msg.code} - ${msg.message}`);
            break;
          // Stage 9: Handle file sales events
          case 'file_list':
            logData(`[File list] ${msg.files.length} files available`);
            availableFiles = msg.files || [];
            updateInviteeFileListUI();
            logStatus(`${availableFiles.length} file(s) available for purchase`);
            break;
          case 'file_purchase':
            logData(`[File purchase] fileId=${msg.fileId} txid=${msg.txid}`);
            // Host receives purchase request - initiate file transfer
            handleFilePurchaseRequest(msg.fileId, msg.txid);
            break;
          case 'file_chunk':
            logData(`[File chunk] fileId=${msg.fileId} chunk=${msg.chunkIndex}/${msg.totalChunks}`);
            handleFileChunk(msg.fileId, msg.chunkIndex, msg.totalChunks, msg.data, msg.fileName);
            break;
          case 'file_complete':
            logData(`[File complete] fileId=${msg.fileId}`);
            handleFileComplete(msg.fileId, msg.fileName);
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
    // Stage 6: Stop billing when call ends
    // Stage 7: Stop timer when call ends
    stopBilling();
    stopTimer();
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
    
    // Listen for disconnect event (Solflare supports disconnect events)
    if (window.solflare.on && typeof window.solflare.on === 'function') {
      window.solflare.on('disconnect', () => {
        walletAddrSpan.textContent = '';
        usdcBalanceSpan.textContent = '-';
        currentWallet = null;
        try { if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'none'; } catch(e){}
        try { if (copyAddressBtn) copyAddressBtn.style.display = 'none'; } catch(e){}
        try { updateRoleUI(); } catch(e){}
      });
    }
    
    currentWallet = { provider: window.solflare, pubkey: pubkeyObj, name: 'Solflare' };
    // update UI state for roles
    try { updateRoleUI(); } catch(e) { /* ignore */ }
    try { if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'inline-block'; } catch(e){}
    try { if (copyAddressBtn) copyAddressBtn.style.display = 'inline-block'; } catch(e){}
  } catch (err) {
    walletError.textContent = 'Solflare connection failed: ' + (err.message || err.toString());
  }
}

// WalletConnect adapter support
let walletConnectAdapter = null;

async function connectWalletConnect() {
  walletError.textContent = '';
  usdcBalanceSpan.textContent = '-';
  
  try {
    // Check if wallet adapter library is available
    // Try multiple possible global variable names for CDN compatibility
    const WalletAdapterBase = window.SolanaWalletAdapterBase || window.WalletAdapterBase;
    const WalletAdapterWalletConnect = window.SolanaWalletAdapterWalletConnect || window.WalletAdapterWalletConnect;
    const WalletAdapterWallets = window.SolanaWalletAdapterWallets || window.WalletAdapterWallets;
    
    if (!WalletAdapterBase || (!WalletAdapterWalletConnect && !WalletAdapterWallets)) {
      walletError.textContent = 'Wallet adapter library not loaded. Please refresh the page.';
      console.warn('Wallet adapter CDN scripts not loaded. Available globals:', Object.keys(window).filter(k => k.includes('Wallet')));
      return;
    }
    
    // Initialize WalletConnect adapter if not already initialized
    if (!walletConnectAdapter) {
      // Try to get WalletConnectWalletAdapter from wallets package or direct package
      let WalletConnectWalletAdapter;
      if (WalletAdapterWallets && WalletAdapterWallets.WalletConnectWalletAdapter) {
        WalletConnectWalletAdapter = WalletAdapterWallets.WalletConnectWalletAdapter;
      } else if (WalletAdapterWalletConnect && WalletAdapterWalletConnect.WalletConnectWalletAdapter) {
        WalletConnectWalletAdapter = WalletAdapterWalletConnect.WalletConnectWalletAdapter;
      } else {
        walletError.textContent = 'WalletConnect adapter not found in loaded libraries.';
        console.warn('WalletConnect adapter not available');
        return;
      }
      
      // Create adapter with network configuration
      const cluster = (clusterSelect && clusterSelect.value) || 'mainnet-beta';
      const network = cluster === 'devnet' ? 'devnet' : 'mainnet-beta';
      
      walletConnectAdapter = new WalletConnectWalletAdapter({
        network,
        options: {
          relayUrl: 'wss://relay.walletconnect.com',
          // Optional: Add project ID from WalletConnect Cloud for better UX
          // projectId: 'YOUR_PROJECT_ID'
        }
      });
      
      // Set up adapter event listeners
      walletConnectAdapter.on('connect', async (publicKey) => {
        try {
          const pubkeyObj = new solanaWeb3.PublicKey(publicKey.toString());
          walletAddrSpan.textContent = pubkeyObj.toString();
          await loadUsdcBalance(pubkeyObj);
          try { updateSolBadge(pubkeyObj); } catch(e){}
          currentWallet = { 
            provider: walletConnectAdapter, 
            adapter: walletConnectAdapter,
            pubkey: pubkeyObj, 
            name: 'WalletConnect' 
          };
          try { updateRoleUI(); } catch(e) { /* ignore */ }
          try { if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'inline-block'; } catch(e){}
          try { if (copyAddressBtn) copyAddressBtn.style.display = 'inline-block'; } catch(e){}
        } catch (err) {
          console.error('WalletConnect connect handler error:', err);
        }
      });
      
      walletConnectAdapter.on('disconnect', () => {
        walletAddrSpan.textContent = '';
        usdcBalanceSpan.textContent = '-';
        currentWallet = null;
      });
      
      walletConnectAdapter.on('error', (error) => {
        console.error('WalletConnect error:', error);
        walletError.textContent = 'WalletConnect error: ' + (error.message || error);
      });
    }
    
    // Connect the adapter
    await walletConnectAdapter.connect();
    
    if (walletConnectAdapter.connected && walletConnectAdapter.publicKey) {
      const pubkeyObj = new solanaWeb3.PublicKey(walletConnectAdapter.publicKey.toString());
      walletAddrSpan.textContent = pubkeyObj.toString();
      await loadUsdcBalance(pubkeyObj);
      try { updateSolBadge(pubkeyObj); } catch(e){}
      currentWallet = { 
        provider: walletConnectAdapter, 
        adapter: walletConnectAdapter,
        pubkey: pubkeyObj, 
        name: 'WalletConnect' 
      };
      try { updateRoleUI(); } catch(e) { /* ignore */ }
      try { if (disconnectWalletBtn) disconnectWalletBtn.style.display = 'inline-block'; } catch(e){}
      try { if (copyAddressBtn) copyAddressBtn.style.display = 'inline-block'; } catch(e){}
    }
  } catch (err) {
    console.error('WalletConnect connection failed:', err);
    walletError.textContent = 'WalletConnect connection failed: ' + (err.message || err.toString());
  }
}

// Unified transaction signing interface
// Supports Phantom, Solflare, and WalletConnect adapters
async function signTransactionUnified(wallet, transaction, connection = null) {
  if (!wallet || !transaction) {
    throw { code: 'NO_WALLET', message: 'Wallet or transaction not provided' };
  }
  
  const provider = wallet.provider || wallet;
  const adapter = wallet.adapter || wallet.provider?.adapter;
  
  // Handle WalletAdapter interface (for WalletConnect and adapter-based wallets)
  if (adapter && typeof adapter.signTransaction === 'function') {
    try {
      // Adapter-based signing
      const signed = await adapter.signTransaction(transaction);
      return signed;
    } catch (err) {
      // Fallback to direct provider if adapter fails
      console.warn('Adapter signTransaction failed, trying provider:', err);
    }
  }
  
  // Handle direct wallet provider API (Phantom, Solflare)
  if (provider) {
    // Try signAndSendTransaction first (Phantom modern API)
    if (typeof provider.signAndSendTransaction === 'function') {
      try {
        const result = await provider.signAndSendTransaction(transaction);
        // Return transaction with signature property
        if (result.signature) {
          return { serialize: () => transaction.serialize(), signature: result.signature };
        }
        return result;
      } catch (err) {
        // Fall back to signTransaction if signAndSendTransaction fails
        console.warn('signAndSendTransaction failed, trying signTransaction:', err);
      }
    }
    
    // Try signTransaction (standard API)
    if (typeof provider.signTransaction === 'function') {
      try {
        const signed = await provider.signTransaction(transaction);
        return signed;
      } catch (err) {
        throw { code: 'SIGN_FAILED', message: 'Transaction signing failed: ' + (err.message || err) };
      }
    }
  }
  
  throw { code: 'NO_SIGNER', message: 'No transaction signer available for this wallet' };
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
// Disconnect wallet handler (works for Phantom/Solflare/WalletConnect providers)
if (disconnectWalletBtn) {
  disconnectWalletBtn.onclick = async () => {
    try {
      walletError.textContent = '';
      
      // Handle WalletConnect adapter disconnect
      if (currentWallet && currentWallet.adapter && typeof currentWallet.adapter.disconnect === 'function') {
        try { 
          await currentWallet.adapter.disconnect(); 
        } catch(e) { 
          console.warn('WalletConnect adapter disconnect error:', e);
        }
      }
      
      // Handle direct provider disconnect (Phantom, Solflare)
      if (currentWallet && currentWallet.provider && currentWallet.provider.disconnect) {
        try { await currentWallet.provider.disconnect(); } catch(e) { /* ignore */ }
      }
      
      // try legacy window.solana disconnect (Phantom)
      if (window.solana && window.solana.isPhantom && window.solana.disconnect) {
        try { await window.solana.disconnect(); } catch(e) { /* ignore */ }
      }
      
      // try legacy window.solflare disconnect
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
    walletConnectAdapter = null; // Reset WalletConnect adapter
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
    try { const _land = document.getElementById('landing'); if (_land) _land.style.display = 'none'; } catch(e){} // Keep inline for landing overlay
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
  const landingCreateCardBtn = document.getElementById('landingCreateCardBtn');
  const landingJoinCardBtn = document.getElementById('landingJoinCardBtn');
  const navHomeLanding = document.getElementById('navHomeLanding');
  
  const hideLandingAndNavigate = (page) => {
    if (landing) landing.style.display = 'none';
    navigateTo(page);
  };
  
  if (landingCreateBtn) landingCreateBtn.onclick = () => hideLandingAndNavigate('create');
  if (landingJoinBtn) landingJoinBtn.onclick = () => hideLandingAndNavigate('join');
  if (landingCreateCardBtn) landingCreateCardBtn.onclick = () => hideLandingAndNavigate('create');
  if (landingJoinCardBtn) landingJoinCardBtn.onclick = () => hideLandingAndNavigate('join');
  if (navHomeLanding) navHomeLanding.onclick = (e) => { e.preventDefault(); hideLandingAndNavigate('home'); };

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
      try { if (landing) landing.style.display = 'none'; } catch(e){} // Keep inline for landing overlay
    } catch (e) { /* ignore */ }
  }

  // wire header navigation if present (main container nav)
  try {
    document.getElementById('navHome') && (document.getElementById('navHome').onclick = (e)=>{e.preventDefault(); navigateTo('home');});
    document.getElementById('navStart') && (document.getElementById('navStart').onclick = (e)=>{e.preventDefault(); navigateTo('create');});
    document.getElementById('navJoin') && (document.getElementById('navJoin').onclick = (e)=>{e.preventDefault(); navigateTo('join');});
    
    // Additional navigation links (FAQ, Privacy, Terms)
    document.getElementById('navFaq') && (document.getElementById('navFaq').onclick = (e)=>{e.preventDefault(); /* FAQ functionality can be added later */});
    document.getElementById('navPrivacy') && (document.getElementById('navPrivacy').onclick = (e)=>{e.preventDefault(); window.open('legal/privacy.html', '_blank');});
    document.getElementById('navTerms') && (document.getElementById('navTerms').onclick = (e)=>{e.preventDefault(); window.open('legal/tos.html', '_blank');});
    
    // Landing page navigation handlers (ensure all landing nav links work)
    const landingNavStart = document.querySelector('#landing nav a[href="#start"]');
    const landingNavJoin = document.querySelector('#landing nav a[href="#join"]');
    const landingNavFaq = document.querySelector('#landing nav a[href="#faq"]');
    const landingNavPrivacy = document.querySelector('#landing nav a[href="#privacy"]');
    const landingNavTerms = document.querySelector('#landing nav a[href="#terms"]');
    
    if (landingNavStart) landingNavStart.onclick = (e) => { e.preventDefault(); hideLandingAndNavigate('create'); };
    if (landingNavJoin) landingNavJoin.onclick = (e) => { e.preventDefault(); hideLandingAndNavigate('join'); };
    if (landingNavFaq) landingNavFaq.onclick = (e) => { e.preventDefault(); /* FAQ functionality can be added later */ };
    if (landingNavPrivacy) landingNavPrivacy.onclick = (e) => { e.preventDefault(); window.open('legal/privacy.html', '_blank'); };
    if (landingNavTerms) landingNavTerms.onclick = (e) => { e.preventDefault(); window.open('legal/tos.html', '_blank'); };
  } catch(e){}

  // SDP modal helpers
  const sdpModal = document.getElementById('sdpModal');
  const copyLocalSdpBtn = document.getElementById('copyLocalSdpBtn');
  const acceptRemoteSdpBtn = document.getElementById('acceptRemoteSdpBtn');
  const closeSdpModal = document.getElementById('closeSdpModal');
  function showSdpModal() { if (sdpModal) sdpModal.classList.add('active'); }
  function hideSdpModal() { if (sdpModal) sdpModal.classList.remove('active'); }
  if (copyLocalSdpBtn) copyLocalSdpBtn.onclick = async () => { try { const txt = (localSDP && localSDP.value) || ''; await navigator.clipboard.writeText(txt); copyLocalSdpBtn.textContent = 'Copied'; setTimeout(()=>copyLocalSdpBtn.textContent = 'Copy Local SDP',1500); } catch(e){ console.warn(e); } };
  if (closeSdpModal) closeSdpModal.onclick = hideSdpModal;
  // Convert SDP modal into step-by-step flow: hide raw JSON and use clipboard/prompt
  function renderSdpStepModalForHost() {
    if (!sdpModal) return;
    sdpModal.classList.add('active');
    sdpModal.innerHTML = `
      <div class="modal" style="max-width: 560px;">
        <h3>Signaling — Host</h3>
        <div class="muted" style="margin-bottom: 16px;">Step 1: Click <strong>Copy Offer</strong> and share it with your guest (clipboard).</div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
          <button id="stepCopyOffer">Copy Offer</button>
          <button id="stepPasteAnswer" class="secondary">Paste Answer (from guest)</button>
          <span id="sdpStatus" style="color:#9CA3AF;font-size:14px;"></span>
        </div>
        <div class="actions">
          <button id="sdpCloseBtn" class="secondary">Close</button>
        </div>
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
    sdpModal.classList.add('active');
    sdpModal.innerHTML = `
      <div class="modal" style="max-width: 560px;">
        <h3>Signaling — Guest</h3>
        <div class="muted" style="margin-bottom: 16px;">Step 1: Click <strong>Paste Host Offer</strong> (reads clipboard or prompts). Step 2: Click <strong>Copy Answer</strong> and send it back to the host.</div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
          <button id="stepPasteOffer">Paste Host Offer</button>
          <button id="stepCopyAnswer" disabled>Copy Answer</button>
          <span id="sdpStatusGuest" style="color:#9CA3AF;font-size:14px;"></span>
        </div>
        <div class="actions">
          <button id="sdpCloseBtnGuest" class="secondary">Close</button>
        </div>
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
    // Stage 9: Assign IDs to files for transfer (only if not already assigned)
    // IDs must be stable and match when sending to invitee
    if (!hostRoom.filesAssigned || hostRoom.filesAssigned !== true) {
      hostRoom.files = hostRoom.files.map((f, i) => ({
        ...f,
        id: f.id || `file_${i}_${Date.now()}`
      }));
      hostRoom.filesAssigned = true; // Mark as assigned to prevent regeneration
    }
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
      // wire connect signaling button if present
      try {
        const connectBtn = document.getElementById('connectSignalingBtn');
        if (connectBtn) {
          connectBtn.onclick = () => {
            const wsUrl = (document.getElementById('signalingUrl') && document.getElementById('signalingUrl').value) || null;
            const room = (document.getElementById('signalingRoom') && document.getElementById('signalingRoom').value) || null;
            if (wsUrl) window.signaling.connectWebsocket(wsUrl, room);
          };
        }
      } catch(e){}
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
        // If signaling WS is connected and auto-send is checked, send offer
        try {
          const auto = (document.getElementById('autoSendOffer') && document.getElementById('autoSendOffer').checked);
          if (auto && window.signaling && window.signaling._ws && window.signaling._ws.readyState === 1) {
            const room = (document.getElementById('signalingRoom') && document.getElementById('signalingRoom').value) || window.signaling._room;
            await window.signaling.sendOfferToRoom(room);
            roomInfoSpan.innerHTML += ' <span style="color:#9aa;">(offer auto-sent)</span>';
          }
        } catch(e) { console.warn('Auto-send offer failed', e); }
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
          // If signaling WS is connected, ensure the client joined the room so host can send offers
          try {
            const wsUrl = (document.getElementById('signalingUrl') && document.getElementById('signalingUrl').value) || null;
            const room = (document.getElementById('signalingRoom') && document.getElementById('signalingRoom').value) || null;
            if (wsUrl && room && window.signaling && (!window.signaling._ws || window.signaling._room !== room)) {
              window.signaling.connectWebsocket(wsUrl, room);
            }
          } catch(e) { /* ignore */ }
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
    // send via unified wallet adapter interface
    const wallet = currentWallet || (window.solana ? { provider: window.solana } : null);
    if (!wallet) throw new Error('No wallet provider available to sign memo transaction');
    
    // Use unified transaction signing
    const signed = await signTransactionUnified(wallet, tx, conn);
    
    // Handle signAndSendTransaction result (if signature is already present)
    if (signed.signature) {
      return { success: true, txid: signed.signature };
    }
    
    // Handle signTransaction result (need to send manually)
    const raw = signed.serialize();
    const txid = await conn.sendRawTransaction(raw);
    await conn.confirmTransaction(txid, 'confirmed');
    return { success: true, txid };
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
    modal.classList.add('active');
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
    close.onclick = () => { modal.classList.remove('active'); };
  } catch (e) { console.warn('showSolTopupModal error', e); }
}

function hideSolTopupModal() { try { const m = document.getElementById('solTopupModal'); if (m) m.classList.remove('active'); } catch(e){} }

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
      // sign using unified wallet adapter interface (Phantom, Solflare, WalletConnect)
      onProgress && onProgress({ attempt: attempt + 1, status: 'signing' });
      const wallet = currentWallet || (window.solana ? { provider: window.solana } : null);
      if (!wallet) throw { code: 'NO_SIGNER', message: 'No wallet signer available for Solana transaction' };
      
      const signed = await signTransactionUnified(wallet, tx, conn);
      
      // Handle signAndSendTransaction result (if signature is already present)
      let txid;
      let raw = null; // Initialize raw to null - will be set if we need to send manually
      if (signed.signature) {
        onProgress && onProgress({ attempt: attempt + 1, status: 'sending' });
        txid = signed.signature;
        // Transaction was already sent via signAndSendTransaction, so we don't have raw
        // We'll only be able to confirm on fallback, not resend
      } else {
        // Handle signTransaction result (need to send manually)
        raw = signed.serialize();
        onProgress && onProgress({ attempt: attempt + 1, status: 'sending' });
        txid = await conn.sendRawTransaction(raw);
      }
      
      try {
        await conn.confirmTransaction(txid, 'confirmed');
      } catch (confErr) {
        // fallback on any confirmation/provider error
        const fb = getFallbackRpc(cluster);
        if (fb && fb !== rpc) {
          rpc = fb;
          conn = new solanaWeb3.Connection(rpc, 'confirmed');
          // If we have raw transaction, resend it; otherwise just try to confirm existing txid
          if (raw) {
            // Re-send raw transaction on fallback RPC
            txid = await conn.sendRawTransaction(raw);
            await conn.confirmTransaction(txid, 'confirmed');
          } else {
            // Transaction was already sent (via signAndSendTransaction), just confirm on fallback
            await conn.confirmTransaction(txid, 'confirmed');
          }
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

// --- Stage 6: X402 Automatic Per-Minute Billing ---
// --- Stage 8: Enhanced billing UI with confirmations feed ---
let billingInterval = null;
let billingRetryAttempted = false;
let callStartTime = null;
let billingStatus = null; // 'paid', 'pending', 'failed', 'frozen'
let totalPaid = 0; // Running total in USDC
let billingStatusElement = null;
let billingConfirmationsElement = null; // Stage 8: Per-minute confirmations feed
let billingConfirmations = []; // Stage 8: Array of confirmation objects {txid, amount, timestamp}
let freezeOverlayElement = null; // Stage 8: Freeze overlay on failed payment

// Initialize billing status UI element
function initBillingStatusUI() {
  if (!billingStatusElement) {
    const callPage = document.getElementById('callPage');
    if (callPage) {
      billingStatusElement = document.createElement('div');
      billingStatusElement.id = 'billingStatus';
      billingStatusElement.style.cssText = 'position: fixed; top: 16px; right: 16px; background: var(--surface); padding: 12px 16px; border-radius: 8px; font-family: JetBrains Mono, monospace; font-size: 14px; z-index: 100; border: 1px solid var(--border); display: none;';
      document.body.appendChild(billingStatusElement);
    }
  }
}

function updateBillingStatusUI(status, message) {
  if (!billingStatusElement) initBillingStatusUI();
  if (!billingStatusElement) return;
  
  let color = 'var(--text-muted)';
  if (status === 'paid') color = 'var(--secondary)';
  else if (status === 'pending') color = 'var(--accent)';
  else if (status === 'failed' || status === 'frozen') color = 'var(--danger)';
  
  // Stage 8: Enhanced billing status UI with running total
  let statusHTML = `<div style="font-weight: 600; margin-bottom: 6px;">${message || `Status: ${status}`}</div>`;
  statusHTML += `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Total Paid: <span style="color: ${status === 'paid' ? 'var(--secondary)' : 'var(--text-muted)'}; font-weight: 600;">${totalPaid.toFixed(2)} USDC</span></div>`;
  
  billingStatusElement.innerHTML = statusHTML;
  billingStatusElement.style.color = color;
  billingStatusElement.style.borderColor = color;
  if (status === 'paid' || status === 'pending' || status === 'failed' || status === 'frozen') {
    billingStatusElement.style.display = 'block';
  }
}

// Stage 8: Initialize billing confirmations feed UI
function initBillingConfirmationsUI() {
  if (!billingConfirmationsElement) {
    const callPage = document.getElementById('callPage');
    if (callPage) {
      billingConfirmationsElement = document.createElement('div');
      billingConfirmationsElement.id = 'billingConfirmations';
      billingConfirmationsElement.style.cssText = 'position: fixed; bottom: 16px; right: 16px; background: var(--surface); padding: 12px 16px; border-radius: 8px; font-family: JetBrains Mono, monospace; font-size: 12px; z-index: 100; border: 1px solid var(--border); display: none; max-width: 320px; max-height: 200px; overflow-y: auto;';
      document.body.appendChild(billingConfirmationsElement);
    }
  }
}

// Stage 8: Update billing confirmations feed
function updateBillingConfirmationsUI() {
  if (!billingConfirmationsElement) initBillingConfirmationsUI();
  if (!billingConfirmationsElement || billingConfirmations.length === 0) {
    if (billingConfirmationsElement) billingConfirmationsElement.style.display = 'none';
    return;
  }
  
  let html = '<div style="font-weight: 600; margin-bottom: 8px; color: var(--text);">Per-Minute Payments:</div>';
  
  // Show last 5 confirmations (most recent first)
  const recentConfirmations = billingConfirmations.slice(-5).reverse();
  recentConfirmations.forEach((conf, idx) => {
    const timeAgo = Math.floor((Date.now() - conf.timestamp) / 1000);
    const timeStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`;
    html += `<div style="margin-bottom: 4px; padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 11px;">`;
    html += `<span style="color: var(--secondary);">✓</span> ${conf.amount.toFixed(2)} USDC <span style="color: var(--text-muted);">${timeStr}</span>`;
    html += `</div>`;
  });
  
  billingConfirmationsElement.innerHTML = html;
  billingConfirmationsElement.style.display = 'block';
}

// Stage 8: Add confirmation to feed
function addBillingConfirmation(txid, amount) {
  billingConfirmations.push({
    txid,
    amount,
    timestamp: Date.now()
  });
  updateBillingConfirmationsUI();
}

// Stage 8: Initialize freeze overlay
function initFreezeOverlay() {
  if (!freezeOverlayElement) {
    const callPage = document.getElementById('callPage');
    if (callPage) {
      freezeOverlayElement = document.createElement('div');
      freezeOverlayElement.id = 'freezeOverlay';
      freezeOverlayElement.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px);';
      freezeOverlayElement.innerHTML = `
        <div style="background: var(--surface); padding: 32px; border-radius: 16px; text-align: center; border: 2px solid var(--danger); max-width: 480px;">
          <div style="font-size: 48px; margin-bottom: 16px;">❄️</div>
          <h2 style="color: var(--danger); margin-bottom: 12px;">Video Frozen</h2>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Payment failed. Video is frozen until payment succeeds.</p>
          <p style="color: var(--text-muted); font-size: 14px;">Retrying payment automatically...</p>
        </div>
      `;
      document.body.appendChild(freezeOverlayElement);
    }
  }
}

// Stage 8: Show/hide freeze overlay
function showFreezeOverlay() {
  if (!freezeOverlayElement) initFreezeOverlay();
  if (freezeOverlayElement) {
    freezeOverlayElement.style.display = 'flex';
  }
}

function hideFreezeOverlay() {
  if (freezeOverlayElement) {
    freezeOverlayElement.style.display = 'none';
  }
}

// --- Stage 10: UI/UX Polish - Notifications ---
let notificationElement = null;

// Stage 10: Initialize notification UI
function initNotificationUI() {
  if (!notificationElement) {
    notificationElement = document.createElement('div');
    notificationElement.id = 'notification';
    notificationElement.style.cssText = 'position: fixed; bottom: 80px; right: 16px; background: var(--surface); padding: 16px 20px; border-radius: 8px; font-size: 14px; z-index: 2000; border: 1px solid var(--border); display: none; min-width: 280px; max-width: 400px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); transition: all 0.3s ease;';
    document.body.appendChild(notificationElement);
  }
}

// Stage 10: Show notification
function showNotification(message, type = 'info', duration = 3000) {
  if (!notificationElement) initNotificationUI();
  if (!notificationElement) return;
  
  let color = 'var(--text)';
  let bgColor = 'var(--surface)';
  let borderColor = 'var(--border)';
  
  if (type === 'success') {
    color = 'var(--secondary)';
    borderColor = 'var(--secondary)';
    bgColor = 'rgba(16, 185, 129, 0.1)';
  } else if (type === 'error') {
    color = 'var(--danger)';
    borderColor = 'var(--danger)';
    bgColor = 'rgba(239, 68, 68, 0.1)';
  } else if (type === 'warning') {
    color = 'var(--accent)';
    borderColor = 'var(--accent)';
    bgColor = 'rgba(245, 158, 11, 0.1)';
  }
  
  notificationElement.style.color = color;
  notificationElement.style.borderColor = borderColor;
  notificationElement.style.background = bgColor;
  notificationElement.textContent = message;
  notificationElement.style.display = 'block';
  notificationElement.style.opacity = '0';
  notificationElement.style.transform = 'translateY(20px)';
  
  // Animate in
  setTimeout(() => {
    notificationElement.style.opacity = '1';
    notificationElement.style.transform = 'translateY(0)';
  }, 10);
  
  // Auto-hide after duration
  setTimeout(() => {
    notificationElement.style.opacity = '0';
    notificationElement.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (notificationElement) notificationElement.style.display = 'none';
    }, 300);
  }, duration);
}

function freezeVideo() {
  // Freeze local video by disabling tracks
  if (localStream && localStream.getVideoTracks) {
    localStream.getVideoTracks().forEach(track => {
      track.enabled = false;
    });
  }
  // Freeze remote video if available
  if (remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.getVideoTracks) {
    try {
      remoteVideo.srcObject.getVideoTracks().forEach(track => track.enabled = false);
    } catch (e) { 
      console.warn('Failed to freeze remote video:', e);
    }
  }
  billingStatus = 'frozen';
  updateBillingStatusUI('frozen', '❄️ Video frozen - Payment failed');
  // Stage 8: Show freeze overlay on failed payment
  showFreezeOverlay();
  logStatus('Video frozen due to payment failure');
}

function unfreezeVideo() {
  // Unfreeze local video by enabling tracks
  if (localStream && localStream.getVideoTracks) {
    localStream.getVideoTracks().forEach(track => track.enabled = true);
  }
  // Unfreeze remote video if available
  if (remoteVideo && remoteVideo.srcObject && remoteVideo.srcObject.getVideoTracks) {
    try {
      remoteVideo.srcObject.getVideoTracks().forEach(track => track.enabled = true);
    } catch (e) { 
      console.warn('Failed to unfreeze remote video:', e);
    }
  }
  billingStatus = 'paid';
  // Stage 8: Hide freeze overlay when video unfreezes
  hideFreezeOverlay();
}

async function sendMinuteBilling() {
  // Only invitee pays for ongoing billing
  if (!joinHostAddr || !joinHostAddr.value || !joinPrice || !joinPrice.value) {
    console.warn('Cannot bill: missing host address or price');
    return;
  }
  
  // Respect build toggle
  if (PAYMENTS_DISABLED) {
    console.info('Billing skipped: payments disabled');
    return;
  }
  
  const fromPub = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
  if (!fromPub) {
    logStatus('Billing failed: wallet not connected');
    billingStatus = 'failed';
    freezeVideo();
    return;
  }
  
  const hostAddr = joinHostAddr.value.trim();
  const price = parseFloat(joinPrice.value);
  if (!hostAddr || !(price > 0)) {
    logStatus('Billing failed: invalid host address or price');
    billingStatus = 'failed';
    freezeVideo();
    return;
  }
  
  const amount = price; // 1 minute = price per minute
  
  billingStatus = 'pending';
  updateBillingStatusUI('pending', `⏳ Processing minute payment (${amount} USDC)...`);
  
  // Send billing event over DataChannel
  if (dataChannel && dataChannel.readyState === 'open') {
    try {
      dataChannel.send(JSON.stringify({
        type: 'billing_attempt',
        amount,
        timestamp: Date.now()
      }));
    } catch (e) { console.warn('Failed to send billing event', e); }
  }
  
  try {
    const res = await sendUsdcTransfer({
      fromPubkey: fromPub,
      toOwner: hostAddr,
      amount,
      onProgress: ({ attempt, status: progressStatus }) => {
        if (progressStatus === 'signing' || progressStatus === 'sending') {
          updateBillingStatusUI('pending', `⏳ ${progressStatus === 'signing' ? 'Waiting for wallet approval...' : 'Sending transaction...'}`);
        }
      }
    });
    
    // Success
    totalPaid += amount;
    billingStatus = 'paid';
    billingRetryAttempted = false; // Reset retry flag on success
    updateBillingStatusUI('paid', `✓ Minute paid`);
    
    // Stage 8: Add confirmation to feed
    addBillingConfirmation(res.txid, amount);
    
    // Stage 10: Show notification for minute paid
    showNotification(`Minute paid: ${amount} USDC (Total: ${totalPaid.toFixed(2)} USDC)`, 'success');
    
    // Stage 7: Sync timer with successful billing
    syncTimerWithBilling();
    
    // Send success event over DataChannel
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({
          type: 'billing_success',
          txid: res.txid,
          amount,
          totalPaid,
          timestamp: Date.now()
        }));
      } catch (e) { console.warn('Failed to send billing success event', e); }
    }
    
    // Unfreeze video if it was frozen
    unfreezeVideo();
    
    logStatus(`Minute billing successful: ${res.txid}`);
    
  } catch (err) {
    console.error('Minute billing failed:', err);
    billingStatus = 'failed';
    
    // Send failure event over DataChannel
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({
          type: 'billing_failed',
          code: err.code || 'UNKNOWN',
          message: err.message || String(err),
          timestamp: Date.now()
        }));
      } catch (e) { console.warn('Failed to send billing failure event', e); }
    }
    
    // Freeze video immediately
    freezeVideo();
    
    // Stage 7: Update timer to show failure state
    if (timerStartTime) {
      const now = performance.now();
      const elapsedMs = now - timerStartTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      updateTimerUI(elapsedSeconds, null, 'failed');
    }
    
    // Retry logic: single retry attempt
    if (!billingRetryAttempted) {
      billingRetryAttempted = true;
      updateBillingStatusUI('failed', `⚠️ Payment failed, retrying...`);
      logStatus('Payment failed, retrying once...');
      
      // Wait 5 seconds before retry
      setTimeout(async () => {
        if (billingStatus === 'failed' || billingStatus === 'frozen') {
          await sendMinuteBilling();
        }
      }, 5000);
    } else {
      // Retry already attempted - end call
      updateBillingStatusUI('failed', `❌ Payment failed - Call ending`);
      logStatus('Payment failed after retry. Ending call.');
      
      // End call after 3 seconds
      setTimeout(() => {
        if (endCallBtn) {
          endCallBtn.click();
        }
      }, 3000);
    }
  }
}

function startBilling() {
  if (billingInterval) {
    clearInterval(billingInterval);
    billingInterval = null;
  }
  
  // Only start billing if we're the invitee (have joinHostAddr filled)
  if (!joinHostAddr || !joinHostAddr.value || PAYMENTS_DISABLED) {
    return;
  }
  
  callStartTime = Date.now();
  billingRetryAttempted = false;
  billingStatus = 'paid'; // Initial prepay covers first billing
  totalPaid = 0;
  
  // Show billing status UI
  initBillingStatusUI();
  updateBillingStatusUI('paid', '✓ Prepay confirmed - Billing active');
  
  // Start billing interval: every 60 seconds
  billingInterval = setInterval(() => {
    if (pc && pc.connectionState === 'connected') {
      sendMinuteBilling();
    } else {
      // Connection lost - stop billing
      stopBilling();
    }
  }, 60000); // 60 seconds
  
  logStatus('X402 automatic billing started (every 60 seconds)');
}

function stopBilling() {
  if (billingInterval) {
    clearInterval(billingInterval);
    billingInterval = null;
  }
  if (billingStatusElement) {
    billingStatusElement.style.display = 'none';
  }
  // Stage 8: Hide confirmations feed and freeze overlay when billing stops
  if (billingConfirmationsElement) {
    billingConfirmationsElement.style.display = 'none';
  }
  hideFreezeOverlay();
  billingStatus = null;
  billingConfirmations = []; // Clear confirmations
  totalPaid = 0; // Reset total
  // Stage 7: Stop timer when billing stops
  stopTimer();
  logStatus('X402 automatic billing stopped');
}

// --- Stage 7: Timer / Timekeeping System ---
let timerInterval = null;
let timerStartTime = null; // Monotonic time (performance.now())
let nextBillingTime = null; // When next billing should occur (60s intervals)
let timerElement = null;
let lastBillingTimestamp = null; // Track when last successful billing occurred

// Format time as mm:ss
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Initialize timer UI element
function initTimerUI() {
  if (!timerElement) {
    const callPage = document.getElementById('callPage');
    if (callPage) {
      timerElement = document.createElement('div');
      timerElement.id = 'callTimer';
      timerElement.style.cssText = 'position: fixed; top: 16px; left: 16px; background: var(--surface); padding: 16px 20px; border-radius: 8px; font-family: JetBrains Mono, monospace; font-size: 20px; font-weight: 600; z-index: 100; border: 1px solid var(--border); display: none; min-width: 200px;';
      document.body.appendChild(timerElement);
    }
  }
}

function updateTimerUI(elapsedSeconds, countdownSeconds, status) {
  if (!timerElement) initTimerUI();
  if (!timerElement) return;
  
  // Color states: green (paid), yellow (<10s), red (failure/frozen)
  let color = 'var(--secondary)'; // green (paid)
  if (status === 'failed' || status === 'frozen') {
    color = 'var(--danger)'; // red
  } else if (countdownSeconds !== null && countdownSeconds <= 10) {
    color = 'var(--accent)'; // yellow (warning)
  }
  
  const elapsedStr = formatTime(elapsedSeconds);
  const countdownStr = countdownSeconds !== null ? formatTime(countdownSeconds) : '--:--';
  
  // Build timer HTML with color coding
  let timerHTML = `<div style="margin-bottom: 8px; color: var(--text);">Call: ${elapsedStr}</div>`;
  timerHTML += `<div style="font-size: 16px; color: ${color}; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px;">Next: ${countdownStr}</div>`;
  
  timerElement.innerHTML = timerHTML;
  timerElement.style.borderColor = color;
  timerElement.style.display = 'block';
  
  // Add pulsing animation for critical warnings (<10s and not failed)
  if (countdownSeconds !== null && countdownSeconds <= 10 && status !== 'failed' && status !== 'frozen') {
    timerElement.style.animation = 'pulse 1s infinite';
  } else {
    timerElement.style.animation = 'none';
  }
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Use monotonic time for accuracy (performance.now() doesn't drift with tab focus)
  timerStartTime = performance.now();
  nextBillingTime = timerStartTime + 60000; // First billing in 60 seconds
  lastBillingTimestamp = timerStartTime;
  
  // Initialize timer UI
  initTimerUI();
  updateTimerUI(0, 60, billingStatus || 'paid');
  
  // Update timer every second
  timerInterval = setInterval(() => {
    if (!timerStartTime) return;
    
    // Calculate elapsed time using monotonic time
    const now = performance.now();
    const elapsedMs = now - timerStartTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    
    // Calculate countdown to next billing
    let countdownSeconds = null;
    if (nextBillingTime) {
      const countdownMs = nextBillingTime - now;
      countdownSeconds = Math.max(0, Math.floor(countdownMs / 1000));
      
      // If countdown reached 0, it means billing should have occurred
      // Reset for next 60-second cycle
      if (countdownSeconds === 0 && billingStatus === 'paid') {
        nextBillingTime = now + 60000; // Next billing in 60 seconds
        countdownSeconds = 60;
      }
    }
    
    // Update UI with current status
    updateTimerUI(elapsedSeconds, countdownSeconds, billingStatus || 'paid');
  }, 1000); // Update every second
  
  logStatus('Call timer started');
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (timerElement) {
    timerElement.style.display = 'none';
  }
  timerStartTime = null;
  nextBillingTime = null;
  lastBillingTimestamp = null;
  logStatus('Call timer stopped');
}

// Sync timer with billing events
function syncTimerWithBilling() {
  if (!timerStartTime || !nextBillingTime) return;
  
  // When billing succeeds, reset countdown for next 60-second cycle
  const now = performance.now();
  nextBillingTime = now + 60000; // Next billing in exactly 60 seconds
  lastBillingTimestamp = now;
  
  // Update UI immediately
  const elapsedMs = now - timerStartTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  updateTimerUI(elapsedSeconds, 60, billingStatus || 'paid');
}

// --- Stage 9: File Sales (P2P over DataChannel) ---
let availableFiles = []; // Files available for purchase (invitee side)
let filePurchases = {}; // Track purchased files {fileId: {txid, status, chunks}}
let fileTransferChunks = {}; // Track file chunks being received {fileId: {chunks: [], expected: 0, totalSize: 0}}
let inviteeFileListElement = null; // Invitee file list UI

// Stage 9: Initialize invitee file list UI
function initInviteeFileListUI() {
  if (!inviteeFileListElement) {
    const joinPanel = document.getElementById('joinPanel');
    if (joinPanel) {
      inviteeFileListElement = document.createElement('div');
      inviteeFileListElement.id = 'inviteeFileList';
      inviteeFileListElement.style.cssText = 'margin-top: 16px; padding: 16px; background: var(--surface-light); border-radius: 8px; border: 1px solid var(--border);';
      inviteeFileListElement.innerHTML = '<h4 style="margin-top: 0; margin-bottom: 12px;">Files for Sale</h4><div id="availableFilesList" style="display: flex; flex-direction: column; gap: 8px;"></div>';
      joinPanel.appendChild(inviteeFileListElement);
    }
  }
}

// Stage 9: Update invitee file list UI
function updateInviteeFileListUI() {
  if (!inviteeFileListElement) initInviteeFileListUI();
  const filesList = document.getElementById('availableFilesList');
  if (!filesList || availableFiles.length === 0) {
    if (inviteeFileListElement) inviteeFileListElement.style.display = 'none';
    return;
  }
  
  inviteeFileListElement.style.display = 'block';
  filesList.innerHTML = availableFiles.map((file, idx) => {
    const purchased = filePurchases[file.id] && filePurchases[file.id].status === 'completed';
    const purchasing = filePurchases[file.id] && filePurchases[file.id].status === 'purchasing';
    const transferring = filePurchases[file.id] && filePurchases[file.id].status === 'transferring';
    const statusText = purchased ? '✓ Downloaded' : (purchasing ? '⏳ Purchasing...' : (transferring ? '📥 Downloading...' : ''));
    
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--surface); border-radius: 6px; border: 1px solid var(--border);">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">${file.name}</div>
          <div style="font-size: 12px; color: var(--text-muted); font-family: JetBrains Mono, monospace;">${file.price.toFixed(2)} USDC</div>
          ${statusText ? `<div style="font-size: 11px; color: var(--secondary); margin-top: 4px;">${statusText}</div>` : ''}
        </div>
        <button id="buyFileBtn_${file.id}" class="${purchased || purchasing || transferring ? 'secondary' : ''}" ${purchased || purchasing || transferring ? 'disabled' : ''} style="margin-left: 12px; white-space: nowrap;">
          ${purchased ? 'Downloaded' : (purchasing ? 'Purchasing...' : (transferring ? 'Downloading...' : 'Buy'))}
        </button>
      </div>
    `;
  }).join('');
  
  // Wire up buy buttons
  availableFiles.forEach((file) => {
    const btn = document.getElementById(`buyFileBtn_${file.id}`);
    if (btn && !btn.disabled) {
      btn.onclick = () => purchaseFile(file);
    }
  });
}

// Stage 9: Send file list to invitee over DataChannel
function sendFileListToInvitee() {
  if (!hostRoom || !hostRoom.files || hostRoom.files.length === 0) return;
  if (!dataChannel || dataChannel.readyState !== 'open') return;
  
  try {
    // Use existing file IDs that were assigned during renderFileList()
    // This ensures IDs match between host and invitee
    dataChannel.send(JSON.stringify({
      type: 'file_list',
      files: hostRoom.files.map((f) => ({
        id: f.id || `file_${hostRoom.files.indexOf(f)}_${Date.now()}`, // Fallback only if missing
        name: f.name,
        price: f.price
      })),
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to send file list', e);
  }
}

// Stage 9: Purchase file flow
async function purchaseFile(file) {
  if (!joinHostAddr || !joinHostAddr.value) {
    logStatus('Cannot purchase: missing host address');
    return;
  }
  
  if (PAYMENTS_DISABLED) {
    logStatus('File purchases disabled in this build');
    return;
  }
  
  const fromPub = ensureSolanaPublicKey((currentWallet && currentWallet.pubkey) || (window.solana && window.solana.publicKey));
  if (!fromPub) {
    logStatus('Connect wallet to purchase file');
    return;
  }
  
  const hostAddr = joinHostAddr.value.trim();
  const price = file.price;
  
  // Mark as purchasing
  filePurchases[file.id] = { status: 'purchasing', txid: null };
  updateInviteeFileListUI();
  
  try {
    // Purchase file via USDC transfer
    const res = await sendUsdcTransfer({
      fromPubkey: fromPub,
      toOwner: hostAddr,
      amount: price,
      onProgress: ({ attempt, status: progressStatus }) => {
        if (progressStatus === 'signing' || progressStatus === 'sending') {
          logStatus(`Purchasing file: ${progressStatus}...`);
        }
      }
    });
    
    // Purchase successful - request file transfer
    filePurchases[file.id] = { status: 'transferring', txid: res.txid, chunks: [] };
    updateInviteeFileListUI();
    
    // Request file from host
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({
          type: 'file_purchase',
          fileId: file.id,
          txid: res.txid,
          timestamp: Date.now()
        }));
      } catch (e) { console.warn('Failed to send file purchase request', e); }
    }
    
    logStatus(`File purchased: ${file.name} (${res.txid})`);
    
  } catch (err) {
    console.error('File purchase failed:', err);
    delete filePurchases[file.id];
    updateInviteeFileListUI();
    logStatus(`File purchase failed: ${err.message || err}`);
  }
}

// Stage 9: Handle file chunk transfer (simple encryption placeholder - AES would be ideal)
function encryptChunk(data, key) {
  // Simple XOR encryption (in production, use proper AES encryption)
  // This is a placeholder - real implementation would use Web Crypto API
  return data;
}

function decryptChunk(data, key) {
  // Simple XOR decryption (in production, use proper AES decryption)
  return data;
}

// Stage 9: Download file locally
function downloadFile(fileName, fileData) {
  const blob = new Blob([fileData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  logStatus(`File downloaded: ${fileName}`);
  
  // Stage 10: Show notification for file delivered
  showNotification(`File delivered: ${fileName}`, 'success', 5000);
}

// Stage 9: Handle file purchase request (host side)
async function handleFilePurchaseRequest(fileId, txid) {
  if (!hostRoom || !hostRoom.files) return;
  
  const file = hostRoom.files.find(f => f.id === fileId) || hostRoom.files[parseInt(fileId.split('_')[1])];
  if (!file) {
    console.warn('File not found:', fileId);
    return;
  }
  
  // Verify purchase transaction (simplified - in production, verify on-chain)
  logStatus(`File purchase verified: ${file.name} (${txid})`);
  
  // For demo: create a dummy file or use file.data if available
  // In production, host would read actual file from disk/storage
  const fileData = new Uint8Array(1024).map(() => Math.floor(Math.random() * 256)); // Dummy file data
  const fileName = file.name || 'purchased_file.bin';
  
  // Transfer file in chunks over DataChannel
  const CHUNK_SIZE = 16 * 1024; // 16KB chunks (DataChannel has size limits)
  const totalChunks = Math.ceil(fileData.length / CHUNK_SIZE);
  
  logStatus(`Transferring file: ${fileName} (${totalChunks} chunks)`);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileData.length);
    const chunk = fileData.slice(start, end);
    
    // Convert chunk to base64 for transfer over DataChannel
    const chunkBase64 = btoa(String.fromCharCode.apply(null, chunk));
    
    // Simple encryption (placeholder - use proper encryption in production)
    const encryptedChunk = encryptChunk(chunkBase64, txid);
    
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify({
          type: 'file_chunk',
          fileId,
          chunkIndex: i,
          totalChunks,
          data: encryptedChunk,
          fileName: i === 0 ? fileName : undefined // Send filename with first chunk
        }));
        
        // Small delay between chunks to avoid overwhelming DataChannel
        if (i < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (e) {
        console.error('Failed to send file chunk', e);
        logStatus(`File transfer failed at chunk ${i + 1}/${totalChunks}`);
        return;
      }
    } else {
      logStatus('DataChannel not ready for file transfer');
      return;
    }
  }
  
  // Send completion message
  if (dataChannel && dataChannel.readyState === 'open') {
    try {
      dataChannel.send(JSON.stringify({
        type: 'file_complete',
        fileId,
        fileName
      }));
    } catch (e) { console.warn('Failed to send file complete', e); }
  }
  
  logStatus(`File transfer complete: ${fileName}`);
}

// Stage 9: Handle file chunk (invitee side)
function handleFileChunk(fileId, chunkIndex, totalChunks, chunkData, fileName) {
  if (!fileTransferChunks[fileId]) {
    fileTransferChunks[fileId] = { 
      chunks: new Array(totalChunks), // Pre-allocate array with exact size
      expected: totalChunks, 
      received: 0, // Track number of chunks received
      fileName: null 
    };
  }
  
  const transfer = fileTransferChunks[fileId];
  
  // Update expected chunks if we learn the real total
  if (totalChunks > transfer.expected) {
    transfer.expected = totalChunks;
    // Expand chunks array if needed
    if (transfer.chunks.length < totalChunks) {
      const oldChunks = transfer.chunks;
      transfer.chunks = new Array(totalChunks);
      oldChunks.forEach((chunk, idx) => {
        if (chunk) transfer.chunks[idx] = chunk;
      });
    }
  }
  
  if (!transfer.fileName && fileName) {
    transfer.fileName = fileName;
  }
  
  // Skip if we already have this chunk (idempotent handling)
  if (transfer.chunks[chunkIndex]) {
    logStatus(`File chunk ${chunkIndex + 1}/${totalChunks} already received (duplicate ignored)`);
    return;
  }
  
  // Decrypt chunk (simple placeholder)
  const decryptedChunk = decryptChunk(chunkData, filePurchases[fileId]?.txid || '');
  
  // Convert base64 back to Uint8Array
  try {
    const binaryString = atob(decryptedChunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Store chunk at correct index (handles out-of-order arrival)
    transfer.chunks[chunkIndex] = bytes;
    transfer.received += 1;
    
    // Update UI with progress
    if (filePurchases[fileId]) {
      filePurchases[fileId].status = 'transferring';
      filePurchases[fileId].progress = Math.floor((transfer.received / transfer.expected) * 100);
      updateInviteeFileListUI();
    }
    
    logStatus(`File chunk received: ${chunkIndex + 1}/${totalChunks} (${transfer.received}/${transfer.expected} chunks)`);
  } catch (e) {
    console.error('Failed to decode chunk', e);
  }
}

// Stage 9: Handle file transfer complete (invitee side)
function handleFileComplete(fileId, fileName) {
  const transfer = fileTransferChunks[fileId];
  if (!transfer || !transfer.chunks || transfer.chunks.length === 0) {
    console.warn('No chunks received for file:', fileId);
    return;
  }
  
  // Validate all chunks received
  const missingChunks = [];
  for (let i = 0; i < transfer.expected; i++) {
    if (!transfer.chunks[i]) {
      missingChunks.push(i);
    }
  }
  
  if (missingChunks.length > 0) {
    console.error(`File transfer incomplete: missing chunks ${missingChunks.join(', ')}`);
    logStatus(`File transfer incomplete: missing ${missingChunks.length} chunk(s). Please retry.`);
    // Optionally: request retransmission of missing chunks
    return;
  }
  
  // Calculate actual total file size from all chunks
  let totalSize = 0;
  for (let i = 0; i < transfer.chunks.length; i++) {
    if (transfer.chunks[i]) {
      totalSize += transfer.chunks[i].length;
    }
  }
  
  // Reassemble file from chunks in correct order
  const fileData = new Uint8Array(totalSize);
  let offset = 0;
  for (let i = 0; i < transfer.chunks.length; i++) {
    if (transfer.chunks[i]) {
      // Write chunk at correct offset (handles out-of-order arrival)
      fileData.set(transfer.chunks[i], offset);
      offset += transfer.chunks[i].length;
    }
  }
  
  // Download file
  const finalFileName = transfer.fileName || fileName || `purchased_file_${fileId}.bin`;
  downloadFile(finalFileName, fileData);
  
  // Mark as completed
  if (filePurchases[fileId]) {
    filePurchases[fileId].status = 'completed';
    filePurchases[fileId].fileName = finalFileName;
  }
  updateInviteeFileListUI();
  
  // Clean up
  delete fileTransferChunks[fileId];
  
  logStatus(`File reassembly complete: ${finalFileName} (${fileData.length} bytes, ${transfer.received}/${transfer.expected} chunks)`);
}
