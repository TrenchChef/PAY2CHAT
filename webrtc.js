// Pay2Chat Stage 1: WebRTC P2P Core
// No backend, no payments, no UI workarounds. Pure browser logic.

let localStream = null;
let pc = null;
let dataChannel = null;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 3;

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
  pc = new RTCPeerConnection();
  pc.onicecandidate = (e) => {
    if (e.candidate) return;
    localSDP.value = JSON.stringify(pc.localDescription);
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
  // If joining a room and not prepaid, block
  if (!hostRoom && joinHostAddr && joinHostAddr.value && !window.lastPrepay) {
    logStatus('Prepay required before creating offer. Use Prepay 3 minutes.');
    return;
  }
  createPeerConnection();
  dataChannel = pc.createDataChannel('chat');
  setupDataChannel();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
}

async function createAnswer() {
  // If joining a room and not prepaid, block
  if (!hostRoom && joinHostAddr && joinHostAddr.value && !window.lastPrepay) {
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
  // If host created a room and payment not detected, block accepting remote SDP
  if (hostRoom && !hostRoom.paid) {
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
    // listen for disconnect
    window.solana.on && window.solana.on('disconnect', () => {
      walletAddrSpan.textContent = '';
      usdcBalanceSpan.textContent = '-';
    });
    currentWallet = { provider: window.solana, pubkey, name: 'Phantom' };
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
    currentWallet = { provider: window.solflare, pubkey: pubkeyObj, name: 'Solflare' };
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
      return;
    }
    let total = 0;
    for (const acc of res.value) {
      const ui = acc.account.data.parsed.info.tokenAmount.uiAmount;
      total += (ui || 0);
    }
    usdcBalanceSpan.textContent = String(total);
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

connectPhantomBtn && (connectPhantomBtn.onclick = connectPhantom);
connectSolflareBtn && (connectSolflareBtn.onclick = connectSolflare);
connectWCBtn && (connectWCBtn.onclick = connectWalletConnect);
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

  homeCreateBtn && (homeCreateBtn.onclick = () => { showPanel('create'); });
  homeJoinBtn && (homeJoinBtn.onclick = () => { showPanel('join'); });

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

  function renderFileList() {
    if (!hostRoom || !hostRoom.files) { fileList.innerHTML = '<em>No files added</em>'; return; }
    fileList.innerHTML = hostRoom.files.map((f,i)=>`<div>${i+1}. ${f.name} — ${f.price} USDC</div>`).join('');
  }

  addFileBtn && (addFileBtn.onclick = () => {
    if (!hostRoom) { roomInfoSpan.textContent = 'Create room first to add files'; return; }
    const name = (fileNameInput.value || '').trim();
    const price = parseFloat(filePriceInput.value || '0');
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
        tipStatus.style.color = '#f66'; tipStatus.textContent = `Tip failed: ${err.message || err}`;
      }
    };
  }

// --- Stage 4: USDC Transfer Engine ---
const sendUsdcBtn = document.getElementById('sendUsdcBtn');
const txRecipientInput = document.getElementById('txRecipient');
const txAmountInput = document.getElementById('txAmount');
const txStatus = document.getElementById('txStatus');

const SPL_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// NOTE: We use mainnet USDC mint by default. For devnet testing, user must supply a devnet USDC mint.
const USDC_MINT_MAINNET = new solanaWeb3.PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

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
      txStatus.style.color = '#f66';
      txStatus.textContent = `Error (${err.code || 'UNKNOWN'}): ${err.message || err}`;
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
  const price = parseFloat(hostPriceInput.value);
  if (!(price > 0)) {
    roomInfoSpan.textContent = 'Invalid price';
    return;
  }
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
      prepayStatus.style.color = '#f66';
      prepayStatus.textContent = `Prepay failed (${err.code||'ERR'}): ${err.message || err}`;
    }
  };
}
