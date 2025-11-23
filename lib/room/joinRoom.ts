import { PublicKey } from '@solana/web3.js';
import { Room } from '@/lib/store/useRoomStore';
import { decodeRoomFromUrl } from '@/lib/utils/roomSharing';

export async function joinRoom(
  input: string,
  inviteeWallet: PublicKey
): Promise<Room> {
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
      // Reconstruct room object from decoded data
      const room: Room = {
        id: decodedRoom.id as string,
        hostWallet: new PublicKey(decodedRoom.hostWallet as string),
        config: {
          rate: decodedRoom.rate as number,
          description: decodedRoom.description as string || '',
          allowCamera: decodedRoom.allowCamera as boolean ?? true,
          allowMic: decodedRoom.allowMic as boolean ?? true,
          allowFilePurchasesDuringCall: decodedRoom.allowFilePurchases as boolean ?? false,
          files: [], // Files not included in shareable data for size reasons
        },
        joinCode: decodedRoom.code as string,
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

