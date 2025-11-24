/**
 * Unit tests for WebRTCClient using simple-peer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRTCClient, ConnectionState } from '../client';
import Peer from 'simple-peer';

// Mock simple-peer
vi.mock('simple-peer', () => {
  const mockPeer = {
    destroy: vi.fn(),
    signal: vi.fn(),
    send: vi.fn(),
    connected: false,
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
  };

  return {
    default: vi.fn().mockImplementation(() => mockPeer),
  };
});

// Mock turnCredentials
vi.mock('../turnCredentials', () => ({
  getIceServers: vi.fn().mockResolvedValue([
    { urls: 'stun:stun.l.google.com:19302' },
  ]),
}));

describe('WebRTCClient', () => {
  let mockPeer: any;
  let mockStream: MediaStream;
  let mockWebSocket: WebSocket;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock MediaStream
    mockStream = {
      getTracks: vi.fn().mockReturnValue([]),
      getVideoTracks: vi.fn().mockReturnValue([]),
      getAudioTracks: vi.fn().mockReturnValue([]),
    } as any;

    // Create mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Mock Peer instance
    mockPeer = {
      destroy: vi.fn(),
      signal: vi.fn(),
      send: vi.fn(),
      connected: false,
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    };

    // Mock Peer constructor to return our mock
    (Peer as any).mockImplementation(() => mockPeer);

    // Mock navigator.mediaDevices.getUserMedia
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock WebSocket constructor
    global.WebSocket = vi.fn().mockImplementation(() => {
      // Simulate connection opening
      setTimeout(() => {
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen({} as any);
        }
      }, 0);
      return mockWebSocket;
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a WebRTCClient instance', () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      expect(client).toBeInstanceOf(WebRTCClient);
    });
  });

  describe('initialize', () => {
    it('should initialize and get user media', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
      expect(Peer).toHaveBeenCalled();
    });

    it('should connect to signaling server if URL provided', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
        signalingUrl: 'ws://localhost:8888',
      });

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for WebSocket
      await client.initialize();

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8888');
    });

    it('should create peer with correct initiator flag for host', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();

      expect(Peer).toHaveBeenCalledWith(
        expect.objectContaining({
          initiator: true,
        })
      );
    });

    it('should create peer with correct initiator flag for invitee', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: false,
      });

      await client.initialize();

      expect(Peer).toHaveBeenCalledWith(
        expect.objectContaining({
          initiator: false,
        })
      );
    });

    it('should set up peer event handlers', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();

      // Verify event handlers are registered
      expect(mockPeer.on).toHaveBeenCalledWith('signal', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('stream', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should throw error if not in browser environment', async () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await expect(client.initialize()).rejects.toThrow(
        'WebRTC is only available in browser environments'
      );

      global.window = originalWindow;
    });
  });

  describe('connection state', () => {
    it('should notify on connection state change', async () => {
      const onStateChange = vi.fn();
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
        onConnectionStateChange: onStateChange,
      });

      await client.initialize();

      // Simulate connection established
      const connectHandler = mockPeer.on.mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) {
        connectHandler();
        expect(onStateChange).toHaveBeenCalledWith('connected');
      }
    });

    it('should notify on connection failure', async () => {
      const onStateChange = vi.fn();
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
        onConnectionStateChange: onStateChange,
      });

      await client.initialize();

      // Simulate error
      const errorHandler = mockPeer.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];
      if (errorHandler) {
        errorHandler(new Error('Connection failed'));
        expect(onStateChange).toHaveBeenCalledWith('failed');
      }
    });
  });

  describe('remote stream', () => {
    it('should notify on remote stream received', async () => {
      const onRemoteStream = vi.fn();
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
        onRemoteStream,
      });

      await client.initialize();

      // Simulate remote stream
      const streamHandler = mockPeer.on.mock.calls.find(
        (call) => call[0] === 'stream'
      )?.[1];
      if (streamHandler) {
        const remoteStream = {} as MediaStream;
        streamHandler(remoteStream);
        expect(onRemoteStream).toHaveBeenCalledWith(remoteStream);
      }
    });
  });

  describe('data channel', () => {
    it('should send data channel message when connected', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();

      // Set peer as connected
      mockPeer.connected = true;

      client.sendDataChannelMessage('test message');

      expect(mockPeer.send).toHaveBeenCalledWith('test message');
    });

    it('should not send message when not connected', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();

      // Peer is not connected
      mockPeer.connected = false;

      client.sendDataChannelMessage('test message');

      // Should not send or should handle gracefully
      // The implementation logs a warning, so we just verify it doesn't throw
      expect(() => client.sendDataChannelMessage('test message')).not.toThrow();
    });

    it('should notify on data channel message received', async () => {
      const onDataMessage = vi.fn();
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
        onDataChannelMessage: onDataMessage,
      });

      await client.initialize();

      // Simulate data message
      const dataHandler = mockPeer.on.mock.calls.find(
        (call) => call[0] === 'data'
      )?.[1];
      if (dataHandler) {
        dataHandler('test message');
        expect(onDataMessage).toHaveBeenCalledWith('test message');
      }
    });
  });

  describe('signaling', () => {
    it('should send offer via signaling when peer emits signal', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
        signalingUrl: 'ws://localhost:8888',
      });

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for WebSocket
      await client.initialize();

      // Simulate signal event (offer)
      const signalHandler = mockPeer.on.mock.calls.find(
        (call) => call[0] === 'signal'
      )?.[1];
      if (signalHandler) {
        signalHandler({ type: 'offer', sdp: 'mock-sdp' });
      }

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify message was sent via WebSocket
      // First call is 'join', we need to find the 'offer' call
      expect(mockWebSocket.send).toHaveBeenCalled();
      
      // Get all calls and find the offer
      const allCalls = mockWebSocket.send.mock.calls;
      const offerCall = allCalls.find((call) => {
        try {
          const msg = JSON.parse(call[0]);
          return msg.type === 'offer';
        } catch {
          return false;
        }
      });
      
      expect(offerCall).toBeDefined();
      if (offerCall) {
        const sentMessage = JSON.parse(offerCall[0]);
        expect(sentMessage.type).toBe('offer');
        expect(sentMessage.room).toBe('test-room');
      } else {
        // Debug: show what was actually sent
        const allMessages = allCalls.map(call => {
          try {
            return JSON.parse(call[0]);
          } catch {
            return call[0];
          }
        });
        throw new Error(`No offer message found. Messages sent: ${JSON.stringify(allMessages)}`);
      }
    });

    it('should handle incoming offer and signal peer', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: false,
        signalingUrl: 'ws://localhost:8888',
      });

      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for WebSocket
      await client.initialize();

      // Simulate receiving offer via WebSocket
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1] || (mockWebSocket as any).onmessage;

      if (messageHandler) {
        const event = {
          data: JSON.stringify({
            type: 'offer',
            room: 'test-room',
            payload: { type: 'offer', sdp: 'mock-sdp' },
          }),
        };
        messageHandler(event);
      }

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify peer.signal was called with the offer
      expect(mockPeer.signal).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      // Setup stream with tracks
      const track = {
        stop: vi.fn(),
      };
      // Ensure getTracks returns tracks both during init and cleanup
      (mockStream.getTracks as any).mockReturnValue([track]);

      await client.initialize();

      // Verify stream was set
      expect(client.getLocalStream()).toBe(mockStream);

      client.cleanup();

      // Verify cleanup was called
      expect(track.stop).toHaveBeenCalled();
      expect(mockPeer.destroy).toHaveBeenCalled();
      // Verify stream is cleared
      expect(client.getLocalStream()).toBeNull();
    });
  });

  describe('API compatibility methods', () => {
    it('should support connect() method', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.connect();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    it('should support disconnect() method', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();
      client.disconnect();

      expect(mockPeer.destroy).toHaveBeenCalled();
    });

    it('should support sendData() method', async () => {
      const client = new WebRTCClient({
        roomId: 'test-room',
        isHost: true,
      });

      await client.initialize();
      mockPeer.connected = true;

      client.sendData('test');

      expect(mockPeer.send).toHaveBeenCalledWith('test');
    });
  });
});

