/**
 * TURN Server Credentials Utility
 * Fetches TURN server credentials from the API route
 */

export interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Fetches TURN server credentials from the API
 * Returns null if unavailable (client should fallback to STUN only)
 */
export async function getTurnCredentials(): Promise<TurnCredentials | null> {
  try {
    const response = await fetch('/api/turn-credentials', {
      method: 'GET',
      cache: 'no-store', // Don't cache credentials
    });

    if (!response.ok) {
      console.warn('[TURN] Failed to fetch credentials:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.credentials) {
      return null;
    }

    return data.credentials as TurnCredentials;
  } catch (error) {
    console.warn('[TURN] Error fetching credentials:', error);
    return null;
  }
}

/**
 * Builds ICE server configuration with TURN and STUN servers
 * Falls back to STUN only if TURN is unavailable
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  const iceServers: RTCIceServer[] = [];

  // Always include STUN server as fallback
  iceServers.push({
    urls: 'stun:stun.l.google.com:19302',
  });

  // Try to get TURN credentials
  const turnCredentials = await getTurnCredentials();

  if (turnCredentials) {
    // Add TURN servers with credentials
    turnCredentials.urls.forEach((url) => {
      iceServers.push({
        urls: url,
        username: turnCredentials.username,
        credential: turnCredentials.credential,
      });
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[TURN] Using TURN servers for improved connectivity');
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[TURN] TURN servers unavailable, using STUN only');
    }
  }

  return iceServers;
}

