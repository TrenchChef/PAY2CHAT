import { Room } from '@/lib/store/useRoomStore';

/**
 * Base64 encode (cross-platform: browser or Node.js)
 */
function base64Encode(str: string): string {
  if (typeof window !== 'undefined') {
    // Browser: use btoa
    return btoa(str);
  } else {
    // Node.js: use Buffer
    return Buffer.from(str, 'utf-8').toString('base64');
  }
}

/**
 * Base64 decode (cross-platform: browser or Node.js)
 */
function base64Decode(str: string): string {
  if (typeof window !== 'undefined') {
    // Browser: use atob
    return atob(str);
  } else {
    // Node.js: use Buffer
    return Buffer.from(str, 'base64').toString('utf-8');
  }
}

/**
 * Encode room data into a shareable URL
 * Uses base64 encoding to include room configuration in URL
 */
export function encodeRoomToUrl(room: Room, baseUrl?: string): string {
  // Only encode in browser - this function should not be called during SSR
  if (typeof window === 'undefined') {
    throw new Error('encodeRoomToUrl can only be called in the browser');
  }

  const origin = baseUrl || window.location.origin;
  
  // Create a shareable room data object (exclude sensitive data)
  const shareableData = {
    id: room.id,
    code: room.joinCode,
    rate: room.config.rate,
    description: room.config.description || '',
    allowCamera: room.config.allowCamera,
    allowMic: room.config.allowMic,
    allowFilePurchases: room.config.allowFilePurchasesDuringCall,
    hostWallet: room.hostWallet.toString(),
  };

  // Encode to base64
  const encoded = base64Encode(JSON.stringify(shareableData));
  
  // Use URL hash to avoid server-side issues
  return `${origin}/join?data=${encodeURIComponent(encoded)}`;
}

/**
 * Decode room data from URL
 */
export function decodeRoomFromUrl(data: string): Partial<Room> | null {
  // Only decode in browser - this function should not be called during SSR
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const decoded = JSON.parse(base64Decode(decodeURIComponent(data)));
    return decoded;
  } catch (error) {
    console.error('Failed to decode room data:', error);
    return null;
  }
}

/**
 * Generate QR code data URL (requires qrcode library or canvas)
 * For now, returns the URL string that can be used with external QR services
 */
export function generateQRCodeUrl(roomUrl: string): string {
  // Use a free QR code API service
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(roomUrl)}`;
}

