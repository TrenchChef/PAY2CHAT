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

  // Validate inputs
  if (!hostWallet) {
    throw new Error('Host wallet is required');
  }

  if (typeof rate !== 'number' || rate < 0.1 || rate > 100) {
    throw new Error('Rate must be between 0.1 and 100 USDC per minute');
  }

  // Validate wallet address
  try {
    new PublicKey(hostWallet.toString());
  } catch (error) {
    throw new Error('Invalid host wallet address');
  }

  console.log('🏗️ Creating room with params:', { rate, hostWallet: hostWallet.toString(), filesCount: fileList.length });

  // Generate room ID and join code
  const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();

  console.log('📝 Generated room ID:', roomId, 'join code:', joinCode);

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
    console.log('✅ Generated shareable URL');
  } catch (error) {
    console.warn('⚠️ Failed to generate shareable URL:', error);
    // Continue without shareable URL
  }

  // Store room in localStorage (in production, this would be on-chain or server)
  // Note: PublicKey must be serialized as string for JSON storage
  let storageErrors: string[] = [];
  
  try {
    // Check if localStorage is available
    if (typeof Storage === 'undefined') {
      throw new Error('localStorage is not available in this browser');
    }

    const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
    
    // Serialize room with PublicKey as string
    const serializableRoom = {
      ...room,
      hostWallet: room.hostWallet.toString(),
    };
    
    rooms.push(serializableRoom);
    
    try {
      localStorage.setItem('x402_rooms', JSON.stringify(rooms));
      console.log('✅ Room stored in localStorage successfully');
    } catch (storageError: any) {
      // Handle quota exceeded or other storage errors
      const errorMsg = storageError.name === 'QuotaExceededError' 
        ? 'Storage quota exceeded. Please clear some space and try again.'
        : `Failed to store room in localStorage: ${storageError.message}`;
      storageErrors.push(errorMsg);
      console.error('❌ localStorage error:', storageError);
      
      // Try to remove oldest rooms if quota exceeded
      if (storageError.name === 'QuotaExceededError' && rooms.length > 1) {
        console.log('🔄 Attempting to free space by removing oldest rooms...');
        try {
          // Sort by createdAt and remove oldest 50%
          const sortedRooms = rooms.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));
          const keptRooms = sortedRooms.slice(Math.floor(sortedRooms.length / 2));
          localStorage.setItem('x402_rooms', JSON.stringify(keptRooms));
          // Try again with the new room
          keptRooms.push(serializableRoom);
          localStorage.setItem('x402_rooms', JSON.stringify(keptRooms));
          console.log('✅ Freed space and stored room');
          storageErrors = []; // Clear error since we recovered
        } catch (retryError) {
          console.error('❌ Failed to free space:', retryError);
        }
      }
    }
  } catch (error: any) {
    const errorMsg = `Failed to access localStorage: ${error.message}`;
    storageErrors.push(errorMsg);
    console.error('❌ localStorage access error:', error);
  }

  // If localStorage storage failed critically, warn but don't fail room creation
  // Room will still be available in sessionStorage and memory
  if (storageErrors.length > 0) {
    console.warn('⚠️ Storage warnings:', storageErrors);
    // Don't throw - room creation should still succeed, room is in memory and will be in sessionStorage
  }

  console.log('✅ Room created successfully:', roomId);
  return room;
}

