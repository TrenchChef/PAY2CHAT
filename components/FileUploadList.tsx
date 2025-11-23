'use client';

import { useState } from 'react';
import { FileMetadata } from '@/lib/store/useRoomStore';

interface FileUploadListProps {
  files: FileMetadata[];
  setFiles: (files: FileMetadata[]) => void;
}

export function FileUploadList({ files, setFiles }: FileUploadListProps) {
  const handleFileAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Encrypt file
    const { encryptFile } = await import('@/lib/files/encrypt');
    const encryptedBlob = await encryptFile(file);

    const newFile: FileMetadata = {
      id: fileId,
      name: file.name,
      price: 20.0,
      visibleBeforeCall: false,
      purchasableDuringCall: true,
      purchasableAfterCall: false,
      encryptedBlob,
    };

    setFiles([...files, newFile]);
  };

  const handleFileRemove = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<FileMetadata>) => {
    setFiles(
      files.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        onChange={handleFileAdd}
        className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-hover"
      />

      {files.map((file) => (
        <div
          key={file.id}
          className="bg-background rounded-lg p-4 border border-border"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">{file.name}</span>
            <button
              onClick={() => handleFileRemove(file.id)}
              className="text-danger hover:text-danger/80"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Price (USDC)
              </label>
              <input
                type="number"
                min="5"
                max="1000"
                step="0.1"
                value={file.price}
                onChange={(e) =>
                  updateFile(file.id, { price: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 bg-surface border border-border rounded text-text"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={file.purchasableDuringCall}
                onChange={(e) =>
                  updateFile(file.id, {
                    purchasableDuringCall: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm">Purchasable during call</span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

