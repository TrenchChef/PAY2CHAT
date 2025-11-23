import { PublicKey } from '@solana/web3.js';
import { Room, FileMetadata } from '@/lib/store/useRoomStore';

interface CreateRoomParams {
  rate: number;
  hostWallet: PublicKey;
  fileList: FileMetadata[];
  description: string;
  options: {
    allowCamera: boolean;
    allowMic: boolean;
    allowScreenShare: boolean;
    allowPreCallFilePurchases: boolean;
  };
}

export async function createRoom(params: CreateRoomParams): Promise<Room> {
  const { rate, hostWallet, fileList, description, options } = params;

  // Generate room ID and join code
  const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();

  // Encrypt files
  const { encryptFile } = await import('@/lib/files/encrypt');
  const encryptedFiles = await Promise.all(
    fileList.map(async (file) => {
      if (file.encryptedBlob) {
        // Already encrypted
        return file;
      }
      // For now, store the file reference - encryption happens on upload
      // In production, encrypt here
      return file;
    })
  );

  const room: Room = {
    id: roomId,
    hostWallet,
    config: {
      rate,
      description,
      files: encryptedFiles,
      ...options,
    },
    joinCode,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/join?room=${roomId}&code=${joinCode}`,
    createdAt: Date.now(),
  };

  // Store room in localStorage (in production, this would be on-chain or server)
  if (typeof window !== 'undefined') {
    const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
    rooms.push(room);
    localStorage.setItem('x402_rooms', JSON.stringify(rooms));
  }

  return room;
}

