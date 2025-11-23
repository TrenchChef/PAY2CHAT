'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { FileMetadata } from '@/lib/store/useRoomStore';
import { usePayments } from '@/lib/hooks/usePayments';
import { generateTimeLimitedDownloadUrl } from '@/lib/files/decrypt';

interface FilePurchaseModalProps {
  onClose: () => void;
  files: FileMetadata[];
  hostWallet: PublicKey;
}

export function FilePurchaseModal({
  onClose,
  files,
  hostWallet,
}: FilePurchaseModalProps) {
  const [purchasingFileId, setPurchasingFileId] = useState<string | null>(null);
  const { purchaseFile, loading } = usePayments();

  const handlePurchase = async (file: FileMetadata) => {
    if (!file.encryptedBlob) {
      alert('File not available');
      return;
    }

    setPurchasingFileId(file.id);
    try {
      const result = await purchaseFile(hostWallet, file.price);

      // Generate time-limited download URL
      const { url, expiresAt } = await generateTimeLimitedDownloadUrl(
        file.encryptedBlob as Blob,
        5
      );

      // Open download in new window
      const downloadWindow = window.open(url, '_blank');
      if (downloadWindow) {
        downloadWindow.focus();
      }

      alert(`Purchase successful! Download link available until ${new Date(expiresAt).toLocaleTimeString()}`);
      onClose();
    } catch (error: any) {
      console.error('Purchase failed:', error);
      alert(`Failed to purchase file: ${error.message}`);
    } finally {
      setPurchasingFileId(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-border">
          <h2 className="text-2xl font-bold mb-4">No Files Available</h2>
          <button
            onClick={onClose}
            className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-border max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Purchase Files</h2>

        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-background rounded p-4 border border-border"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{file.name}</span>
                <span className="font-bold text-primary">{file.price} USDC</span>
              </div>
              <button
                onClick={() => handlePurchase(file)}
                disabled={loading || purchasingFileId === file.id}
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading || purchasingFileId === file.id ? 'Processing...' : 'Purchase'}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

