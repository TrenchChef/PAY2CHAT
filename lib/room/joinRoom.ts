import { PublicKey } from '@solana/web3.js';
import { Room } from '@/lib/store/useRoomStore';

export async function joinRoom(
  input: string,
  inviteeWallet: PublicKey
): Promise<Room> {
  let roomId: string | null = null;
  let code: string | null = null;

  // Parse input - could be URL, code, or room ID
  if (input.startsWith('http')) {
    const url = new URL(input);
    roomId = url.searchParams.get('room') || null;
    code = url.searchParams.get('code') || null;
  } else if (input.includes('?')) {
    const params = new URLSearchParams(input.split('?')[1]);
    roomId = params.get('room') || null;
    code = params.get('code') || null;
  } else {
    // Assume it's a room ID or code
    if (input.length === 6) {
      code = input.toUpperCase();
    } else {
      roomId = input;
    }
  }

  // Load room from localStorage (in production, this would be from server/on-chain)
  if (typeof window !== 'undefined') {
    const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
    const room = rooms.find(
      (r: Room) =>
        r.id === roomId ||
        r.joinCode === code ||
        (roomId && r.id === roomId)
    );

    if (!room) {
      throw new Error('Room not found. Please check the room code or URL.');
    }

    return room;
  }

  throw new Error('Unable to join room');
}

