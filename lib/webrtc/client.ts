import { useCallStore } from '@/lib/store/useCallStore';

interface WebRTCClientConfig {
  signalingUrl?: string;
  roomId: string;
  isHost: boolean;
}

export class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private config: WebRTCClientConfig;
  private signalingWs: WebSocket | null = null;

  constructor(config: WebRTCClientConfig) {
    this.config = config;
  }

  async initialize() {
    // Get user media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // Create peer connection
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN servers from config if available
    ];

    this.pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    this.localStream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.localStream!);
    });

    // Handle remote stream
    this.pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      useCallStore.getState().setRemoteStream(remoteStream);
    };

    // Handle connection state
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'connected') {
        useCallStore.getState().setConnectionState('connected');
      } else if (state === 'connecting') {
        useCallStore.getState().setConnectionState('connecting');
      } else if (state === 'failed' || state === 'disconnected') {
        useCallStore.getState().setConnectionState('failed');
      }
    };

    // Create data channel for signaling
    if (this.config.isHost) {
      this.dataChannel = this.pc.createDataChannel('chat');
      this.setupDataChannel();
    } else {
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }

    // Connect to signaling server if URL provided
    if (this.config.signalingUrl) {
      await this.connectSignaling();
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (err) {
        console.error('Failed to parse data channel message:', err);
      }
    };
  }

  private handleDataChannelMessage(message: any) {
    // Handle billing, tips, file purchases, etc.
    switch (message.type) {
      case 'billing':
        // Handle billing updates
        break;
      case 'tip':
        // Handle tip notifications
        break;
      case 'file_purchase':
        // Handle file purchase requests
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async connectSignaling() {
    if (!this.config.signalingUrl) return;

    return new Promise<void>((resolve, reject) => {
      this.signalingWs = new WebSocket(this.config.signalingUrl!);

      this.signalingWs.onopen = () => {
        // Join room
        this.signalingWs?.send(
          JSON.stringify({
            type: 'join',
            room: this.config.roomId,
          })
        );
        resolve();
      };

      this.signalingWs.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'offer') {
          await this.handleOffer(message.payload);
        } else if (message.type === 'answer') {
          await this.handleAnswer(message.payload);
        } else if (message.type === 'candidate') {
          await this.handleCandidate(message.payload);
        }
      };

      this.signalingWs.onerror = reject;
    });
  }

  async createOffer() {
    if (!this.pc) throw new Error('Peer connection not initialized');

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Send offer via signaling
    if (this.signalingWs) {
      this.signalingWs.send(
        JSON.stringify({
          type: 'offer',
          room: this.config.roomId,
          payload: offer,
        })
      );
    }

    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error('Peer connection not initialized');

    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Send answer via signaling
    if (this.signalingWs) {
      this.signalingWs.send(
        JSON.stringify({
          type: 'answer',
          room: this.config.roomId,
          payload: answer,
        })
      );
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error('Peer connection not initialized');
    await this.pc.setRemoteDescription(answer);
  }

  async handleCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) throw new Error('Peer connection not initialized');
    await this.pc.addIceCandidate(candidate);
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.pc) {
      this.pc.close();
    }
    if (this.signalingWs) {
      this.signalingWs.close();
    }
  }
}

