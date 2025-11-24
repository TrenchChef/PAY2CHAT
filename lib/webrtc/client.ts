/**
 * Stage 1: WebRTC P2P Call Core (Migrated to simple-peer)
 * 
 * Pure WebRTC implementation using simple-peer with:
 * - Direct Host → Invitee video/audio connections
 * - Offer/answer handshake via simple-peer
 * - Stable WebRTC DataChannel
 * - Reconnection logic and error events
 * 
 * NO payment logic, NO wallet logic, NO billing logic
 */

import Peer from 'simple-peer';
import { getIceServers } from './turnCredentials';
import { validateSignalingMessage, safeValidateSignalingMessage } from './schemas';

interface WebRTCClientConfig {
  signalingUrl?: string;
  roomId: string;
  isHost: boolean;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onDataChannelMessage?: (message: string) => void;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export class WebRTCClient {
  private peer: Peer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private config: WebRTCClientConfig;
  private signalingWs: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private candidateCount = 0;
  private isInitialized = false;
  private iceServers: RTCIceServer[] = [];

  constructor(config: WebRTCClientConfig) {
    this.config = config;
  }

  /**
   * Initialize WebRTC connection
   * Gets user media and sets up peer connection using simple-peer
   */
  async initialize(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error('WebRTC is only available in browser environments');
      }

      // Get user media with browser compatibility handling
      this.localStream = await this.getUserMedia();

      // Fetch ICE servers dynamically (includes TURN if available, falls back to STUN)
      this.iceServers = await getIceServers();

      // Connect to signaling server if URL provided (non-blocking)
      if (this.config.signalingUrl) {
        await this.connectSignaling();
      }

      // Create simple-peer instance
      this.createPeer();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      this.updateConnectionState('failed');
      throw error;
    }
  }

  /**
   * Get user media with browser compatibility
   */
  private async getUserMedia(): Promise<MediaStream> {
    // Try to get user media - try multiple methods for browser compatibility
    // Safari mobile requires HTTPS (or localhost) and has specific constraints
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Safari mobile needs simpler constraints
    const constraints: MediaStreamConstraints = isIOS || (isSafari && isMobile) ? {
      video: {
        facingMode: 'user',
      },
      audio: true,
    } : {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    let getUserMediaError: Error | null = null;

    // Check if we're in a secure context
    const isSecureContext = typeof window !== 'undefined' && (
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    
    const isLocalNetworkIP = typeof window !== 'undefined' && (
      window.location.hostname.match(/^192\.168\./) ||
      window.location.hostname.match(/^10\./) ||
      window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    );

    // Chrome blocks getUserMedia on HTTP with local IPs - provide helpful error
    if (!isSecureContext && isLocalNetworkIP && window.location.protocol === 'http:') {
      const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
      if (isChrome) {
        throw new Error('Chrome requires HTTPS for camera/microphone access from network IPs. Please use localhost instead: http://localhost:3000/room/test-123/host/call');
      }
    }

    // Safari mobile might work with local IPs, so don't block - just warn
    if (!isSecureContext && (isIOS || isSafari)) {
      console.warn('Safari may require HTTPS for camera/microphone. If it fails, try HTTPS or localhost.');
    }

    // Try modern API first
    if (navigator.mediaDevices) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: any) {
        getUserMediaError = error;
        // For Safari mobile, try even simpler constraints
        const basicConstraints = { video: true, audio: true };
        
        try {
          return await navigator.mediaDevices.getUserMedia(basicConstraints);
        } catch (basicError: any) {
          // Provide better error message for Safari
          if (isSafari || isIOS) {
            if (basicError.name === 'NotAllowedError' || basicError.name === 'PermissionDeniedError') {
              throw new Error('Camera/microphone permission denied. Please allow access in Safari settings and refresh.');
            } else if (basicError.name === 'NotFoundError') {
              throw new Error('No camera/microphone found. Please connect a device.');
            } else if (basicError.message?.includes('secure')) {
              throw new Error('Safari requires HTTPS for camera/microphone. Please use HTTPS or localhost.');
            }
          }
        }
      }
    }

    // If modern API failed or doesn't exist, try legacy APIs
    const getUserMediaFn = 
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia;

    if (getUserMediaFn) {
      try {
        return await new Promise<MediaStream>((resolve, reject) => {
          getUserMediaFn.call(navigator, constraints, resolve, reject);
        });
      } catch (error) {
        try {
          return await new Promise<MediaStream>((resolve, reject) => {
            getUserMediaFn.call(navigator, { video: true, audio: true }, resolve, reject);
          });
        } catch (basicError) {
          // All methods failed - provide the actual error if available
          if (getUserMediaError) {
            // Re-throw the original error with better context
            if (getUserMediaError.name === 'NotAllowedError' || getUserMediaError.name === 'PermissionDeniedError') {
              throw new Error('Camera/microphone permission denied. Please allow access in your browser settings and refresh.');
            } else if (getUserMediaError.name === 'NotFoundError' || getUserMediaError.name === 'DevicesNotFoundError') {
              throw new Error('No camera/microphone found. Please connect a device.');
            } else if (getUserMediaError.name === 'NotReadableError' || getUserMediaError.name === 'TrackStartError') {
              throw new Error('Camera/microphone is being used by another application.');
            } else if (getUserMediaError.message?.includes('secure') || getUserMediaError.message?.includes('HTTPS')) {
              throw new Error('Camera/microphone requires HTTPS or localhost. Please use http://localhost:3000 instead of the IP address.');
            }
            throw getUserMediaError;
          }
          throw new Error('getUserMedia is not supported in this browser. Please use Chrome, Firefox, or Safari.');
        }
      }
    } else {
      // No getUserMedia available at all
      if (getUserMediaError) {
        throw getUserMediaError;
      }
      throw new Error('getUserMedia is not supported in this browser. Please use Chrome, Firefox, or Safari.');
    }
  }

  /**
   * Create simple-peer instance
   */
  private createPeer(): void {
    if (!this.localStream) {
      throw new Error('Local stream not available');
    }

    // Destroy existing peer if any
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    // Create new simple-peer instance
    // initiator: true for host, false for invitee
    this.peer = new Peer({
      initiator: this.config.isHost,
      stream: this.localStream,
      trickle: true, // Send ICE candidates as they arrive
      config: {
        iceServers: this.iceServers,
      },
    });

    // Handle signal events (offer/answer/ICE candidates)
    this.peer.on('signal', (data: Peer.SignalData) => {
      this.handlePeerSignal(data);
    });

    // Handle connection established
    this.peer.on('connect', () => {
      console.log('✅ Peer connection established');
      this.updateConnectionState('connected');
      this.reconnectAttempts = 0; // Reset on successful connection
    });

    // Handle remote stream
    this.peer.on('stream', (stream: MediaStream) => {
      console.log('📹 Received remote stream');
      if (this.config.onRemoteStream) {
        this.config.onRemoteStream(stream);
      }
    });

    // Handle data channel messages
    this.peer.on('data', (data: Buffer | string) => {
      const message = typeof data === 'string' ? data : data.toString();
      if (this.config.onDataChannelMessage) {
        this.config.onDataChannelMessage(message);
      }
    });

    // Handle connection state changes
    this.peer.on('close', () => {
      console.log('🔌 Peer connection closed');
      this.updateConnectionState('disconnected');
    });

    this.peer.on('error', (error: Error) => {
      console.error('❌ Peer connection error:', error);
      this.updateConnectionState('failed');
      this.attemptReconnection();
    });

    // Track connection state via peer's internal connection
    // Note: simple-peer doesn't expose connectionState directly,
    // so we track it via events
    this.updateConnectionState('connecting');
  }

  /**
   * Handle signal data from simple-peer
   * Sends offer/answer/ICE candidates via signaling server
   */
  private handlePeerSignal(data: Peer.SignalData): void {
    if (!this.signalingWs || this.signalingWs.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Signaling not connected, signal data not sent');
      return;
    }

    // Determine message type based on signal data
    let messageType: 'offer' | 'answer' | 'candidate';
    if (data.type === 'offer') {
      messageType = 'offer';
      console.log('📤 Sending offer via signaling');
    } else if (data.type === 'answer') {
      messageType = 'answer';
      console.log('📤 Sending answer via signaling');
    } else {
      // ICE candidate
      messageType = 'candidate';
      this.candidateCount++;
      if (this.candidateCount <= 3 || this.candidateCount % 10 === 0) {
        console.log(`🧊 Sending ICE candidate (${this.candidateCount})`);
      }
    }

    // Send via signaling server
    this.signalingWs.send(
      JSON.stringify({
        type: messageType,
        room: this.config.roomId,
        payload: data,
      })
    );
  }

  /**
   * Connect to WebSocket signaling server
   */
  private async connectSignaling(): Promise<void> {
    if (!this.config.signalingUrl) return;

    return new Promise<void>((resolve, reject) => {
      this.signalingWs = new WebSocket(this.config.signalingUrl!);

      this.signalingWs.onopen = () => {
        console.log('✅ Signaling WebSocket connected to', this.config.signalingUrl);
        // Join room
        this.signalingWs?.send(
          JSON.stringify({
            type: 'join',
            room: this.config.roomId,
          })
        );
        console.log(`📡 Joined room: ${this.config.roomId} as ${this.config.isHost ? 'Host' : 'Invitee'}`);
        
        // Small delay to ensure peer connection is ready
        setTimeout(() => {
          resolve();
        }, 100);
      };

      this.signalingWs.onmessage = async (event) => {
        try {
          // Validate message with Zod
          const validation = safeValidateSignalingMessage(JSON.parse(event.data));
          
          if (!validation.success) {
            console.error('Invalid signaling message:', validation.error);
            return;
          }

          const message = validation.data;

          if (message.type === 'offer') {
            console.log('📥 Received offer from host');
            await this.handleOffer(message.payload);
          } else if (message.type === 'answer') {
            console.log('📥 Received answer from invitee');
            await this.handleAnswer(message.payload);
          } else if (message.type === 'candidate') {
            await this.handleCandidate(message.payload);
          } else if (message.type === 'peer-joined') {
            // Peer joined the room
            // Host will automatically create offer via simple-peer
            // Invitee will wait for offer
            if (this.config.isHost) {
              console.log('👋 Peer joined room, host will create offer automatically');
            } else {
              console.log('⏳ Invitee waiting for offer from host...');
            }
          }
        } catch (error) {
          console.error('Error handling signaling message:', error);
        }
      };

      this.signalingWs.onerror = (error) => {
        console.error('Signaling WebSocket error:', error);
        // Don't reject - allow connection to work without signaling (manual SDP exchange)
        console.warn('WebSocket signaling failed, but connection can still work with manual SDP exchange');
        resolve(); // Resolve anyway so initialization can continue
      };

      this.signalingWs.onclose = () => {
        console.log('Signaling WebSocket closed');
      };
    });
  }

  /**
   * Handle incoming offer (Invitee only)
   */
  private async handleOffer(offer: Peer.SignalData): Promise<void> {
    if (!this.peer) {
      console.warn('⚠️ Peer not initialized, cannot handle offer');
      return;
    }

    // Signal the peer with the offer
    // simple-peer will automatically create and send answer
    this.peer.signal(offer);
  }

  /**
   * Handle incoming answer (Host only)
   */
  private async handleAnswer(answer: Peer.SignalData): Promise<void> {
    if (!this.peer) {
      console.warn('⚠️ Peer not initialized, cannot handle answer');
      return;
    }

    // Signal the peer with the answer
    this.peer.signal(answer);
    console.log('✅ Answer set successfully');
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleCandidate(candidate: Peer.SignalData): Promise<void> {
    if (!this.peer) {
      console.warn('⚠️ Peer not initialized, cannot handle candidate');
      return;
    }

    // Signal the peer with the ICE candidate
    this.peer.signal(candidate);
  }

  /**
   * Manual offer/answer exchange (for copy/paste signaling)
   */
  async setRemoteDescription(description: Peer.SignalData): Promise<void> {
    if (!this.peer) {
      throw new Error('Peer connection not initialized');
    }
    this.peer.signal(description);
  }

  async getLocalDescription(): Promise<Peer.SignalData | null> {
    // simple-peer doesn't expose local description directly
    // We need to capture it from the 'signal' event
    // For now, return null and rely on signaling server
    return null;
  }

  /**
   * Send message over data channel
   */
  sendDataChannelMessage(message: string): void {
    if (!this.peer) {
      console.warn('Peer not initialized, cannot send message');
      return;
    }

    if (this.peer.connected) {
      try {
        this.peer.send(message);
      } catch (error) {
        console.error('Failed to send data channel message:', error);
      }
    } else {
      console.warn('Peer not connected, cannot send message');
    }
  }

  /**
   * Update connection state and notify callback
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.config.onConnectionStateChange) {
      this.config.onConnectionStateChange(state);
    }
  }

  /**
   * Attempt to reconnect on failure
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionState('failed');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Recreate peer connection
        if (this.localStream && this.isInitialized) {
          this.createPeer();
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Get local media stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Connect method (maintains API compatibility)
   * With simple-peer, connection happens automatically after signaling
   */
  async connect(): Promise<void> {
    // With simple-peer, connection is automatic after signaling
    // This method is kept for API compatibility
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Disconnect method (maintains API compatibility)
   */
  disconnect(): void {
    this.cleanup();
  }

  /**
   * Send data (alias for sendDataChannelMessage for API compatibility)
   */
  sendData(message: string): void {
    this.sendDataChannelMessage(message);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Destroy peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    // Close signaling WebSocket
    if (this.signalingWs) {
      this.signalingWs.close();
      this.signalingWs = null;
    }

    // Reset reconnection attempts
    this.reconnectAttempts = 0;
    this.candidateCount = 0;
    this.isInitialized = false;
  }
}
