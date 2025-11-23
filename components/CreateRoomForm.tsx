'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FileUploadList } from './FileUploadList';
import { Spinner } from './Spinner';
import { createRoom } from '@/lib/room/createRoom';
import { useRoomStore, FileMetadata } from '@/lib/store/useRoomStore';
import { getUSDCBalance } from '@/lib/solana/wallet';

export function CreateRoomForm() {
  const router = useRouter();
  const { publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { setRoom } = useRoomStore();
  const [step, setStep] = useState(0); // Start at step 0 (wallet connection)
  const [rate, setRate] = useState(1.0);
  const [allowCamera, setAllowCamera] = useState(true);
  const [allowMic, setAllowMic] = useState(true);
  const [allowFilePurchasesDuringCall, setAllowFilePurchasesDuringCall] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
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

  const handleConnectWallet = () => {
    setVisible(true);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleStep1Next = () => {
    if (rate < 0.1 || rate > 100) {
      alert('Rate must be between 0.1 and 100 USDC per minute');
      return;
    }
    // If file purchases are enabled, go to file upload step. Otherwise, skip to review.
    if (allowFilePurchasesDuringCall) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleCreateRoom = async () => {
    if (!publicKey) {
      setStep(0);
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom({
        rate,
        hostWallet: publicKey,
        fileList: files,
        options: {
          allowCamera,
          allowMic,
          allowFilePurchasesDuringCall,
        },
      });

      setRoom(room, true);
      // Store room immediately before navigation to ensure it's available
      // Also store in sessionStorage as backup
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('current_room', JSON.stringify({
            ...room,
            hostWallet: room.hostWallet.toString(),
          }));
        } catch (e) {
          console.warn('Failed to store room in sessionStorage:', e);
        }
      }
      router.push(`/room/${room.id}/host`);
    } catch (error: any) {
      console.error('Failed to create room:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to create room: ${errorMessage}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create Room</h1>

      {step === 0 && (
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <h2 className="text-xl font-bold">Connect Wallet</h2>
          <p className="text-text-muted">
            Connect your Solana wallet to create a room and start earning.
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
              Per-minute USDC rate
            </label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
            />
            <p className="text-sm text-text-muted mt-1">
              Minimum: 0.1 USDC, Maximum: 100 USDC
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowCamera}
                onChange={(e) => setAllowCamera(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Allow camera</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowMic}
                onChange={(e) => setAllowMic(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Allow mic</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowFilePurchasesDuringCall}
                onChange={(e) => setAllowFilePurchasesDuringCall(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Allow file purchases during call</span>
            </label>
          </div>

          <button
            onClick={handleStep1Next}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            {allowFilePurchasesDuringCall ? 'Next: Upload Files' : 'Next: Review & Create'}
          </button>
        </div>
      )}

      {step === 2 && publicKey && (
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <h2 className="text-xl font-bold">Upload Files (Optional)</h2>
          <FileUploadList files={files} setFiles={setFiles} />
          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStep2Next}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
            >
              Next: Create Room
            </button>
          </div>
        </div>
      )}

      {step === 3 && publicKey && (
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <h2 className="text-xl font-bold">Review & Create</h2>
          <div className="space-y-2">
            <p>
              <strong>Rate:</strong> {rate} USDC/min
            </p>
            <p>
              <strong>File Purchases:</strong> {allowFilePurchasesDuringCall ? 'Enabled' : 'Disabled'}
            </p>
            {allowFilePurchasesDuringCall && (
              <p>
                <strong>Files:</strong> {files.length}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setStep(allowFilePurchasesDuringCall ? 2 : 1)}
              className="flex-1 py-3 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Creating...</span>
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

