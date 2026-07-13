import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatService } from '../chat/chat.service';
import { ActiveCall, CallHistoryEntry, CallMediaType, IncomingCallEvent } from './call.models';

// Google's public STUN servers - free, no account/credentials needed. There is
// intentionally no TURN server configured: TURN relays real media bandwidth
// and needs an actual paid/hosted service (Twilio, Xirsys, etc.) with API
// credentials, which aren't available. Direct P2P (what STUN enables) works
// for most networks; calls across restrictive NATs/corporate firewalls that
// need a relay will fail to connect until a TURN server is added.
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

@Injectable({ providedIn: 'root' })
export class CallService {
  private readonly http = inject(HttpClient);
  private readonly chatService = inject(ChatService);

  private peerConnection: RTCPeerConnection | null = null;
  private listenersBound = false;

  readonly incomingCall = signal<IncomingCallEvent | null>(null);
  readonly activeCall = signal<ActiveCall | null>(null);
  readonly errorMessage = signal<string | null>(null);

  /** Wires up the call-signaling listeners on the shared chat socket. Call once, after ChatService.connect(). */
  bindSignaling(): void {
    if (this.listenersBound) return;
    this.listenersBound = true;

    this.chatService.on<IncomingCallEvent>('incomingCall', (event) => {
      if (this.activeCall()) {
        // Already on a call - silently ignore for now (no call-waiting support).
        return;
      }
      this.incomingCall.set(event);
    });

    this.chatService.on<{ callId: string }>('callAccepted', (event) => {
      void this.onCallAccepted(event.callId);
    });

    this.chatService.on<{ callId: string }>('callDeclined', () => {
      this.errorMessage.set('Call declined.');
      this.teardown();
    });

    this.chatService.on<{ callId: string; status: string }>('callEnded', () => {
      this.teardown();
    });

    this.chatService.on<{ callId: string; sdp: RTCSessionDescriptionInit; from: string }>('webrtcOffer', (event) => {
      void this.onRemoteOffer(event.sdp);
    });

    this.chatService.on<{ callId: string; sdp: RTCSessionDescriptionInit; from: string }>('webrtcAnswer', (event) => {
      void this.onRemoteAnswer(event.sdp);
    });

    this.chatService.on<{ callId: string; candidate: RTCIceCandidateInit; from: string }>('webrtcIceCandidate', (event) => {
      void this.peerConnection?.addIceCandidate(new RTCIceCandidate(event.candidate)).catch(() => undefined);
    });
  }

  async startCall(conversationId: string, otherUserId: string, otherFirstName: string, type: CallMediaType): Promise<void> {
    this.errorMessage.set(null);
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'VIDEO' });
      this.createPeerConnection(localStream);

      this.activeCall.set({
        callId: '',
        conversationId,
        otherUserId,
        otherFirstName,
        type,
        phase: 'RINGING_OUTGOING',
        localStream,
        remoteStream: null,
        isMuted: false,
        isCameraOff: false,
      });

      this.chatService.emit<{ callId: string }>('callInvite', { conversationId, type }, (ack) => {
        this.activeCall.update((call) => (call ? { ...call, callId: ack.callId } : call));
      });
    } catch {
      this.errorMessage.set('Could not access your camera/microphone.');
      this.teardown();
    }
  }

  acceptIncoming(): void {
    const incoming = this.incomingCall();
    if (!incoming) return;
    this.incomingCall.set(null);
    void this.doAccept(incoming);
  }

  declineIncoming(): void {
    const incoming = this.incomingCall();
    if (!incoming) return;
    this.incomingCall.set(null);
    this.chatService.emit('callDecline', { callId: incoming.callId });
  }

  endCall(): void {
    const call = this.activeCall();
    if (call?.callId) {
      this.chatService.emit('callEnd', { callId: call.callId });
    }
    this.teardown();
  }

  toggleMute(): void {
    const call = this.activeCall();
    if (!call?.localStream) return;
    const nextMuted = !call.isMuted;
    call.localStream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    this.activeCall.set({ ...call, isMuted: nextMuted });
  }

  toggleCamera(): void {
    const call = this.activeCall();
    if (!call?.localStream || call.type !== 'VIDEO') return;
    const nextOff = !call.isCameraOff;
    call.localStream.getVideoTracks().forEach((track) => (track.enabled = !nextOff));
    this.activeCall.set({ ...call, isCameraOff: nextOff });
  }

  loadCallHistory(): Observable<CallHistoryEntry[]> {
    return this.http.get<CallHistoryEntry[]>(`${environment.apiUrl}/calls`);
  }

  private async doAccept(incoming: IncomingCallEvent): Promise<void> {
    this.errorMessage.set(null);
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incoming.type === 'VIDEO' });
      this.createPeerConnection(localStream);

      this.activeCall.set({
        callId: incoming.callId,
        conversationId: incoming.conversationId,
        otherUserId: incoming.callerId,
        otherFirstName: incoming.callerFirstName,
        type: incoming.type,
        phase: 'ACTIVE',
        localStream,
        remoteStream: null,
        isMuted: false,
        isCameraOff: false,
      });

      this.chatService.emit('callAccept', { callId: incoming.callId });
    } catch {
      this.errorMessage.set('Could not access your camera/microphone.');
      this.chatService.emit('callDecline', { callId: incoming.callId });
      this.teardown();
    }
  }

  private async onCallAccepted(callId: string): Promise<void> {
    const call = this.activeCall();
    if (!call || !this.peerConnection) return;
    this.activeCall.set({ ...call, callId, phase: 'ACTIVE' });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.chatService.emit('webrtcOffer', { callId, sdp: offer });
  }

  private async onRemoteOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    const call = this.activeCall();
    if (!call || !this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.chatService.emit('webrtcAnswer', { callId: call.callId, sdp: answer });
  }

  private async onRemoteAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  private createPeerConnection(localStream: MediaStream): void {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      const call = this.activeCall();
      if (event.candidate && call?.callId) {
        this.chatService.emit('webrtcIceCandidate', { callId: call.callId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const call = this.activeCall();
      if (call) {
        this.activeCall.set({ ...call, remoteStream: event.streams[0] });
      }
    };

    this.peerConnection = pc;
  }

  private teardown(): void {
    const call = this.activeCall();
    call?.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.activeCall.set(null);
    this.incomingCall.set(null);
  }
}
