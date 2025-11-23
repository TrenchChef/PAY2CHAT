'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { FileUploadList } from './FileUploadList';
import { createRoom } from '@/lib/room/createRoom';
import { useRoomStore, FileMetadata } from '@/lib/store/useRoomStore';

export function CreateRoomForm() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setRoom } = useRoomStore();
  const [step, setStep] = useState(1);
  const [rate, setRate] = useState(1.0);
  const [description, setDescription] = useState('');
  const [allowCamera, setAllowCamera] = useState(true);
  const [allowMic, setAllowMic] = useState(true);
  const [allowScreenShare, setAllowScreenShare] = useState(true);
  const [allowPreCallFilePurchases, setAllowPreCallFilePurchases] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  if (!publicKey) {
    return <div>Please connect your wallet first.</div>;
  }

  const handleStep1Next = () => {
    if (rate < 0.1 || rate > 100) {
      alert('Rate must be between 0.1 and 100 USDC per minute');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleCreateRoom = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const room = await createRoom({
        rate,
        hostWallet: publicKey,
        fileList: files,
        description,
        options: {
          allowCamera,
          allowMic,
          allowScreenShare,
          allowPreCallFilePurchases,
        },
      });

      setRoom(room, true);
      router.push(`/room/${room.id}/host`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create Room</h1>

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

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
              placeholder="Describe your room..."
            />
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
                checked={allowScreenShare}
                onChange={(e) => setAllowScreenShare(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Allow screen share</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowPreCallFilePurchases}
                onChange={(e) => setAllowPreCallFilePurchases(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Allow pre-call file purchases</span>
            </label>
          </div>

          <button
            onClick={handleStep1Next}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Next: Upload Files
          </button>
        </div>
      )}

      {step === 2 && (
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

      {step === 3 && (
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <h2 className="text-xl font-bold">Review & Create</h2>
          <div className="space-y-2">
            <p>
              <strong>Rate:</strong> {rate} USDC/min
            </p>
            <p>
              <strong>Description:</strong> {description || 'None'}
            </p>
            <p>
              <strong>Files:</strong> {files.length}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

