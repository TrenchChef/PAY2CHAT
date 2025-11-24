'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Room } from '@/lib/store/useRoomStore';
import { Spinner } from './Spinner';
import { getUSDCBalance } from '@/lib/solana/wallet';
import { usePayments } from '@/lib/hooks/usePayments';
import { calculatePrepaymentAmount } from '@/lib/utils/paymentSplit';

// Lazy load joinRoom to prevent build-time evaluation
const loadJoinRoom = () => import('@/lib/room/joinRoom').then(m => m.joinRoom);

interface JoinRoomFormProps {
  initialRoomId?: string;
  initialCode?: string;
}

export function JoinRoomForm({ initialRoomId, initialCode }: JoinRoomFormProps) {
  const router = useRouter();
  const { publicKey, connecting, wallet, connect } = useWallet();
  const { setVisible } = useWalletModal();
  const [step, setStep] = useState(0); // Start at step 0 (wallet connection)
  const [roomInput, setRoomInput] = useState(initialRoomId || initialCode || '');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joiningCall, setJoiningCall] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [prepaymentComplete, setPrepaymentComplete] = useState(false);
  const [prepaymentTxid, setPrepaymentTxid] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);
  const connectingRef = useRef<string | null>(null);
  const { prepayForCall, loading: paymentLoading } = usePayments();

  // Auto-open wallet modal when component mounts if wallet is not connected
  useEffect(() => {
    if (!publicKey && !connecting && step === 0 && !hasAttemptedConnection) {
      const timer = setTimeout(() => {
        console.log('🔌 [JoinRoom] Auto-opening wallet connection modal...');
        setConnectionError(null);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [publicKey, connecting, step, setVisible, hasAttemptedConnection]);

  // Monitor wallet selection - the modal should auto-connect
  // We just track state and close modal when connected
  useEffect(() => {
    if (wallet && !publicKey) {
      console.log('🔌 [JoinRoom] Wallet selected:', wallet.adapter.name);
      setHasAttemptedConnection(true);
      setConnectionError(null);
    }
  }, [wallet, publicKey]);

  // Close modal when wallet connects
  useEffect(() => {
    if (publicKey) {
      console.log('✅ [JoinRoom] Wallet connected, closing modal');
      setVisible(false);
      setConnectionError(null);
      connectingRef.current = null;
    }
  }, [publicKey, setVisible]);

  // Auto-advance to step 1 when wallet connects
  useEffect(() => {
    if (publicKey && step === 0) {
      console.log('✅ [JoinRoom] Wallet connected, advancing to room input');
      setStep(1);
    } else if (!publicKey && step !== 0) {
      // Reset to step 0 if wallet disconnects
      setStep(0);
    }
  }, [publicKey, step]);

  // Load USDC balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      setLoadingBalance(true);
      getUSDCBalance(publicKey)
        .then((bal) => {
          setBalance(bal);
          setLoadingBalance(false);
        })
        .catch((error) => {
          console.error('[JoinRoom] Failed to load balance:', error);
          setBalance(0);
          setLoadingBalance(false);
        });
    } else {
      setBalance(null);
    }
  }, [publicKey]);

  // Handle auto-join when initialRoomId or initialCode is provided
  useEffect(() => {
    if ((initialRoomId || initialCode) && publicKey && step === 1 && !room) {
      const autoJoin = async () => {
        const roomInputValue = initialRoomId || initialCode || '';
        if (!roomInputValue.trim()) return;

        setLoading(true);
        setError('');

        try {
          const joinRoom = await loadJoinRoom();
          const joinedRoom = await joinRoom(roomInputValue, publicKey);
          setRoom(joinedRoom);
          setRoomInput(roomInputValue);
        } catch (err: any) {
          setError(err.message || 'Failed to join room');
        } finally {
          setLoading(false);
        }
      };
      
      autoJoin();
    }
  }, [initialRoomId, initialCode, publicKey, step, room]);

  const handleConnectWallet = async () => {
    console.log('🔌 [JoinRoom] User manually clicked Connect Wallet');
    setConnectionError(null);
    setHasAttemptedConnection(false);
    connectingRef.current = null;
    
    // If wallet is already selected but not connected, try to connect
    if (wallet && !publicKey && connect) {
      try {
        console.log('🔌 [JoinRoom] Attempting to connect to selected wallet:', wallet.adapter.name);
        await connect();
      } catch (error: any) {
        console.error('❌ [JoinRoom] Connection error:', error);
        setConnectionError(error?.message || 'Failed to connect. Please try again.');
        // Open modal as fallback
        setVisible(true);
      }
    } else {
      // Open modal to select wallet
      setVisible(true);
    }
  };

  const handleJoin = async () => {
    if (!roomInput.trim()) {
      setError('Please enter a room code or URL');
      return;
    }

    if (!publicKey) {
      setStep(0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const joinRoom = await loadJoinRoom();
      const joinedRoom = await joinRoom(roomInput, publicKey);
      setRoom(joinedRoom);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (room) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Pre-Call Lobby</h1>
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Host</h2>
            <p className="text-text-muted">
              {room.hostWallet.toString().slice(0, 4)}...
              {room.hostWallet.toString().slice(-4)}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Rate</h2>
            <p className="text-2xl font-bold text-primary">
              {room.config.rate} USDC/min
            </p>
          </div>

          {room.config.description && (
            <div>
              <h2 className="text-xl font-bold mb-2">Description</h2>
              <p className="text-text-muted">{room.config.description}</p>
            </div>
          )}

          {room.config.allowFilePurchasesDuringCall && (
            <div>
              <h2 className="text-xl font-bold mb-2">File Purchases</h2>
              <p className="text-text-muted">
                Files will be available for purchase during the call.
              </p>
            </div>
          )}

          <div className="bg-background rounded p-4 border border-border">
            <p className="text-sm text-text-muted mb-4">
              By joining this call, you agree to:
            </p>
            <ul className="text-sm text-text-muted space-y-2 list-disc list-inside">
              <li>Pay {room.config.rate} USDC per minute</li>
              <li>Prepay for first 3 minutes ({calculatePrepaymentAmount(room.config.rate)} USDC)</li>
              <li>On-chain transaction finality</li>
              <li>Billing model and terms</li>
            </ul>
          </div>

          {!prepaymentComplete ? (
            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent rounded p-4">
                <p className="text-sm font-medium mb-2">
                  Prepayment Required: {calculatePrepaymentAmount(room.config.rate)} USDC
                </p>
                <p className="text-xs text-text-muted">
                  This covers the first 3 minutes. 85% goes to the host, 15% to the platform.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!publicKey) {
                    setStep(0);
                    return;
                  }
                  try {
                    const result = await prepayForCall(room.hostWallet, room.config.rate);
                    setPrepaymentTxid(result.txid);
                    setPrepaymentComplete(true);
                  } catch (error: any) {
                    alert(`Prepayment failed: ${error.message}`);
                  }
                }}
                disabled={paymentLoading || !publicKey}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paymentLoading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  `Prepay ${calculatePrepaymentAmount(room.config.rate)} USDC (3 minutes)`
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-secondary/10 border border-secondary rounded p-4">
                <p className="text-sm font-medium text-secondary mb-1">
                  ✓ Prepayment Confirmed
                </p>
                {prepaymentTxid && (
                  <p className="text-xs text-text-muted font-mono">
                    TX: {prepaymentTxid.slice(0, 8)}...{prepaymentTxid.slice(-8)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (joiningCall) return;
                  setJoiningCall(true);
                  router.push(`/room/${room.id}/call`);
                }}
                disabled={joiningCall}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joiningCall ? (
                  <>
                    <Spinner size="sm" />
                    <span>Joining Call...</span>
                  </>
                ) : (
                  'Join Call'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Join Room</h1>

      {step === 0 && (
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <h2 className="text-xl font-bold">Connect Wallet</h2>
          <p className="text-text-muted">
            {connecting 
              ? 'Please confirm the wallet connection in your wallet extension.'
              : publicKey 
                ? 'Wallet connected! Click Continue to proceed.'
                : 'Connect your Solana wallet to join a room and start chatting. The wallet selection dialog should open automatically.'}
          </p>
          
          {connectionError && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm space-y-2">
              <p>{connectionError}</p>
              <button 
                onClick={handleConnectWallet}
                className="text-danger underline hover:no-underline text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {publicKey ? (
            <div className="space-y-4">
              <div className="bg-background rounded p-4 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-text-muted">Wallet Address</span>
                  <span className="font-mono text-sm">{formatAddress(publicKey.toString())}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-muted">USDC Balance</span>
                  <span className="font-mono text-sm">
                    {loadingBalance ? 'Loading...' : balance !== null ? `${balance.toFixed(2)} USDC` : '—'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              disabled={connecting}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connecting ? (
                <>
                  <Spinner size="sm" />
                  <span>Connecting...</span>
                </>
              ) : (
                'Connect Wallet'
              )}
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Room Code or URL
            </label>
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="Enter room code or paste invite URL"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
            />
            {error && <p className="text-danger text-sm mt-2">{error}</p>}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-3 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleJoin}
              disabled={loading || !roomInput.trim()}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Joining...</span>
                </>
              ) : (
                'Join Room'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

