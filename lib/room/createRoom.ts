import { PublicKey } from '@solana/web3.js';
import { Room, FileMetadata } from '@/lib/store/useRoomStore';

interface CreateRoomParams {
  rate: number;
  hostWallet: PublicKey;
  fileList: FileMetadata[];
  description?: string; // Optional, defaults to empty string
  options: {
    allowCamera: boolean;
    allowMic: boolean;
    allowFilePurchasesDuringCall: boolean;
  };
}

export async function createRoom(params: CreateRoomParams): Promise<Room> {
  // Ensure this only runs in the browser
  if (typeof window === 'undefined') {
    throw new Error('createRoom can only be called in the browser');
  }

  const { rate, hostWallet, fileList, description = '', options } = params;

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

  const baseUrl = window.location.origin;
  
  // Create standard URL
  const standardUrl = `${baseUrl}/join?room=${roomId}&code=${joinCode}`;
  
  const room: Room = {
    id: roomId,
    hostWallet,
    config: {
      rate,
      description: description || '', // Ensure empty string if not provided
      files: encryptedFiles,
      ...options,
    },
    joinCode,
    url: standardUrl,
    createdAt: Date.now(),
  };

  // Generate shareable URL with encoded data for cross-device support
  try {
    const { encodeRoomToUrl } = await import('@/lib/utils/roomSharing');
    const shareableUrl = encodeRoomToUrl(room, baseUrl);
    (room as any).shareableUrl = shareableUrl;
  } catch (error) {
    console.warn('Failed to generate shareable URL:', error);
    // Continue without shareable URL
  }

  // Store room in localStorage (in production, this would be on-chain or server)
  // Note: PublicKey must be serialized as string for JSON storage
  try {
    const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
    // Serialize room with PublicKey as string
    const serializableRoom = {
      ...room,
      hostWallet: room.hostWallet.toString(),
    };
    rooms.push(serializableRoom);
    localStorage.setItem('x402_rooms', JSON.stringify(rooms));
  } catch (error) {
    console.warn('Failed to store room in localStorage:', error);
    // Continue without storing in localStorage
  }

  return room;
}

