'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { joinRoom } from '@/lib/room/joinRoom';
import { Room } from '@/lib/store/useRoomStore';
import { Spinner } from './Spinner';
import { getUSDCBalance } from '@/lib/solana/wallet';

interface JoinRoomFormProps {
  initialRoomId?: string;
  initialCode?: string;
}

export function JoinRoomForm({ initialRoomId, initialCode }: JoinRoomFormProps) {
  const router = useRouter();
  const { publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [step, setStep] = useState(0); // Start at step 0 (wallet connection)
  const [roomInput, setRoomInput] = useState(initialRoomId || initialCode || '');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joiningCall, setJoiningCall] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (publicKey) {
      setLoadingBalance(true);
      getUSDCBalance(publicKey)
        .then((bal) => {
          setBalance(bal);
          setLoadingBalance(false);
        })
        .catch(() => {
          setBalance(0);
          setLoadingBalance(false);
        });
      // Auto-advance to step 1 if wallet is connected and we're on step 0
      setStep((currentStep) => (currentStep === 0 ? 1 : currentStep));
    } else {
      // Reset to step 0 if wallet disconnects
      setStep(0);
    }
  }, [publicKey]);

  useEffect(() => {
    if (initialRoomId || initialCode) {
      if (publicKey && step === 1) {
        handleJoin();
      }
    }
  }, [initialRoomId, initialCode, publicKey, step]);

  const handleConnectWallet = () => {
    setVisible(true);
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
              <li>On-chain transaction finality</li>
              <li>Billing model and terms</li>
            </ul>
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
              'Agree & Join Call'
            )}
          </button>
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
            Connect your Solana wallet to join a room and start chatting.
          </p>
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

