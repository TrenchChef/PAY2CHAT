import { NextResponse } from 'next/server';

interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
}

/**
 * API route to fetch TURN server credentials from Metered.ca
 * This keeps the METERED_API_KEY server-side only
 */
export async function GET() {
  const apiKey = process.env.METERED_API_KEY;

  // If no API key, return null (client will fallback to STUN only)
  if (!apiKey) {
    return NextResponse.json({ credentials: null });
  }

  try {
    // Metered.ca API endpoint for getting TURN credentials
    // NOTE: Verify the exact endpoint in Metered.ca documentation
    // If the endpoint differs, update the URL below
    // Alternative endpoints to try:
    // - https://api.metered.ca/v1/turn/credentials
    // - https://api.metered.ca/turn/credentials
    // - https://turn.metered.ca/api/credentials
    const response = await fetch('https://api.metered.ca/v1/turn/credentials', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[TURN] Failed to fetch credentials from Metered.ca:', response.status);
      return NextResponse.json({ credentials: null });
    }

    const data = await response.json();

    // Metered.ca typically returns credentials in this format
    // Adjust based on actual API response structure
    const credentials: TurnCredentials = {
      username: data.username || data.user || data.credential?.username,
      credential: data.credential || data.password || data.credential?.password,
      urls: data.urls || [
        'turn:global.relay.metered.ca:80',
        'turn:global.relay.metered.ca:443',
        'turn:global.relay.metered.ca:443?transport=tcp',
      ],
    };

    // Validate credentials
    if (!credentials.username || !credentials.credential) {
      console.warn('[TURN] Invalid credentials format from Metered.ca');
      return NextResponse.json({ credentials: null });
    }

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('[TURN] Error fetching credentials:', error);
    // Return null on error - client will fallback to STUN only
    return NextResponse.json({ credentials: null });
  }
}

