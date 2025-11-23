import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';

export interface FileMetadata {
  id: string;
  name: string;
  price: number; // USDC
  visibleBeforeCall: boolean;
  purchasableDuringCall: boolean;
  purchasableAfterCall: boolean;
  encryptedBlob?: Blob;
  downloadUrl?: string;
  expiresAt?: number;
}

export interface RoomConfig {
  rate: number; // USDC per minute
  description?: string; // Optional description
  allowCamera: boolean;
  allowMic: boolean;
  allowFilePurchasesDuringCall: boolean;
  files: FileMetadata[];
}

export interface Room {
  id: string;
  hostWallet: PublicKey;
  config: RoomConfig;
  joinCode: string;
  url: string;
  createdAt: number;
}

interface RoomState {
  currentRoom: Room | null;
  isHost: boolean;
  setRoom: (room: Room | null, isHost: boolean) => void;
  updateRoomConfig: (config: Partial<RoomConfig>) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  isHost: false,
  setRoom: (room, isHost) => set({ currentRoom: room, isHost }),
  updateRoomConfig: (config) =>
    set((state) => ({
      currentRoom: state.currentRoom
        ? {
            ...state.currentRoom,
            config: { ...state.currentRoom.config, ...config },
          }
        : null,
    })),
}));

