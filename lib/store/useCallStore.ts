/**
 * Stage 1: Minimal Call Store
 * 
 * Only WebRTC-related state. NO payment logic, NO billing logic, NO wallet logic.
 */

import { create } from 'zustand';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

interface CallState {
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  startCall: () => void;
  endCall: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setConnectionState: (state: ConnectionState) => void;
}

export const useCallStore = create<CallState>((set) => ({
  isInCall: false,
  localStream: null,
  remoteStream: null,
  connectionState: 'disconnected',
  startCall: () => set({ isInCall: true, connectionState: 'connecting' }),
  endCall: () =>
    set({
      isInCall: false,
      localStream: null,
      remoteStream: null,
      connectionState: 'disconnected',
    }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setConnectionState: (state) => set({ connectionState: state }),
}));
