import { PublicKey } from '@solana/web3.js';
import { Room } from '@/lib/store/useRoomStore';
import { decodeRoomFromUrl } from '@/lib/utils/roomSharing';

// Ensure this only runs in browser (not during build)
const isBrowser = typeof window !== 'undefined';

export async function joinRoom(
  input: string,
  inviteeWallet: PublicKey
): Promise<Room> {
  // Early return if not in browser (prevents build-time execution)
  if (!isBrowser) {
    throw new Error('joinRoom can only be called in the browser');
  }
  let roomId: string | null = null;
  let code: string | null = null;
  let encodedData: string | null = null;

  // Parse input - could be URL, code, or room ID
  if (input.startsWith('http')) {
    const url = new URL(input);
    roomId = url.searchParams.get('room') || null;
    code = url.searchParams.get('code') || null;
    encodedData = url.searchParams.get('data') || null;
  } else if (input.includes('?')) {
    const params = new URLSearchParams(input.split('?')[1]);
    roomId = params.get('room') || null;
    code = params.get('code') || null;
    encodedData = params.get('data') || null;
  } else {
    // Assume it's a room ID or code
    if (input.length === 6) {
      code = input.toUpperCase();
    } else {
      roomId = input;
    }
  }

  // If we have encoded data, try to reconstruct room from it (cross-device support)
  if (encodedData) {
    const decodedRoom = decodeRoomFromUrl(encodedData);
    if (decodedRoom && decodedRoom.id) {
      // The decoded room has a flat structure from encodeRoomToUrl
      // Type assertion needed because decodeRoomFromUrl returns Partial<Room>
      const decoded = decodedRoom as any;
      
      // Ensure hostWallet is a string (from encoded data it should be a string)
      const hostWalletString = typeof decoded.hostWallet === 'string' 
        ? decoded.hostWallet 
        : decoded.hostWallet instanceof PublicKey 
          ? decoded.hostWallet.toString()
          : null;
      
      // Validate hostWallet string is not empty and looks like a valid Solana address
      if (!hostWalletString || hostWalletString.trim().length === 0) {
        throw new Error('Invalid room data: hostWallet is missing or invalid');
      }

      // Validate it's a valid base58 string (basic check)
      if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(hostWalletString)) {
        throw new Error('Invalid room data: hostWallet contains invalid characters');
      }

      // Reconstruct room object from decoded data
      let hostWallet: PublicKey;
      try {
        hostWallet = new PublicKey(hostWalletString);
      } catch (error) {
        throw new Error('Invalid room data: hostWallet is not a valid Solana address');
      }

      const room: Room = {
        id: decoded.id as string,
        hostWallet,
        config: {
          rate: decoded.rate as number,
          description: decoded.description as string || '',
          allowCamera: decoded.allowCamera as boolean ?? true,
          allowMic: decoded.allowMic as boolean ?? true,
          allowFilePurchasesDuringCall: decoded.allowFilePurchases as boolean ?? false,
          files: [], // Files not included in shareable data for size reasons
        },
        joinCode: decoded.code as string,
        url: input,
        createdAt: Date.now(),
      };
      return room;
    }
  }

  // Fallback to localStorage lookup (for same-device rooms)
  if (typeof window !== 'undefined') {
    const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
    const room = rooms.find(
      (r: Room) =>
        r.id === roomId ||
        r.joinCode === code ||
        (roomId && r.id === roomId)
    );

    if (room) {
      return room;
    }
  }

  // If we have roomId or code but no room found, throw error
  if (roomId || code) {
    throw new Error('Room not found. Please check the room code or URL.');
  }

  throw new Error('Unable to join room');
}

