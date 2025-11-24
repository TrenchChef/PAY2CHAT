/**
 * Vitest setup file
 * Configures test environment and mocks
 */

import { vi } from 'vitest';

// Mock WebRTC APIs for testing
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addTrack: vi.fn(),
  createDataChannel: vi.fn().mockReturnValue({
    send: vi.fn(),
    close: vi.fn(),
    readyState: 'open',
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
  }),
  close: vi.fn(),
  getLocalDescription: vi.fn().mockReturnValue(null),
  getRemoteDescription: vi.fn().mockReturnValue(null),
  connectionState: 'new',
  iceConnectionState: 'new',
  signalingState: 'stable',
  onconnectionstatechange: null,
  oniceconnectionstatechange: null,
  onicecandidate: null,
  ontrack: null,
  ondatachannel: null,
}));

// Mock MediaStream
global.MediaStream = vi.fn().mockImplementation(() => ({
  getTracks: vi.fn().mockReturnValue([]),
  getVideoTracks: vi.fn().mockReturnValue([]),
  getAudioTracks: vi.fn().mockReturnValue([]),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
}));

// Mock MediaStreamTrack
global.MediaStreamTrack = vi.fn().mockImplementation(() => ({
  stop: vi.fn(),
  enabled: true,
  kind: 'video',
  label: 'mock-track',
}));

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
});

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
  },
});

