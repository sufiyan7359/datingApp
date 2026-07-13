export type CallMediaType = 'VOICE' | 'VIDEO';

export type CallPhase = 'RINGING_OUTGOING' | 'RINGING_INCOMING' | 'ACTIVE' | 'ENDED';

export interface IncomingCallEvent {
  callId: string;
  conversationId: string;
  callerId: string;
  callerFirstName: string;
  type: CallMediaType;
}

export interface ActiveCall {
  callId: string;
  conversationId: string;
  otherUserId: string;
  otherFirstName: string;
  type: CallMediaType;
  phase: CallPhase;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
}

export interface CallHistoryEntry {
  callId: string;
  conversationId: string;
  otherUserId: string;
  otherFirstName: string;
  type: CallMediaType;
  status: 'RINGING' | 'ACTIVE' | 'ENDED' | 'MISSED' | 'DECLINED';
  startedAt: string;
  connectedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
}
