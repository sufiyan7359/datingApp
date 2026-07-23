import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CallOverlayComponent } from './call-overlay.component';
import { CallService } from '../../core/calls/call.service';
import { ActiveCall } from '../../core/calls/call.models';

function makeActiveCall(overrides: Partial<ActiveCall>): ActiveCall {
  return {
    callId: 'call-1',
    conversationId: 'conv-1',
    otherUserId: 'user-1',
    otherFirstName: 'Priya',
    type: 'VOICE',
    phase: 'ACTIVE',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    ...overrides,
  };
}

describe('CallOverlayComponent', () => {
  let fixture: ComponentFixture<CallOverlayComponent>;
  let callServiceStub: {
    incomingCall: ReturnType<typeof signal<null>>;
    activeCall: ReturnType<typeof signal<ActiveCall | null>>;
    errorMessage: ReturnType<typeof signal<null>>;
  };

  beforeEach(async () => {
    callServiceStub = {
      incomingCall: signal(null),
      activeCall: signal<ActiveCall | null>(null),
      errorMessage: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [CallOverlayComponent],
      providers: [{ provide: CallService, useValue: callServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(CallOverlayComponent);
  });

  it('renders an <audio> element for a VOICE call and attaches the remote stream to it (regression: voice calls were silent - no media element existed to play the remote audio through)', () => {
    const remoteStream = new MediaStream();
    callServiceStub.activeCall.set(makeActiveCall({ type: 'VOICE', remoteStream }));
    fixture.detectChanges();

    const audioEl = fixture.nativeElement.querySelector('audio') as HTMLAudioElement | null;
    const videoEls = fixture.nativeElement.querySelectorAll('video');

    expect(audioEl).withContext('expected an <audio> element for a VOICE call').not.toBeNull();
    expect(videoEls.length).withContext('a VOICE call should render no <video> elements').toBe(0);
    expect(audioEl?.srcObject).toBe(remoteStream);
  });

  it('renders <video> elements for a VIDEO call and attaches the remote stream to the remote video, not an <audio> element', () => {
    const remoteStream = new MediaStream();
    callServiceStub.activeCall.set(makeActiveCall({ type: 'VIDEO', remoteStream }));
    fixture.detectChanges();

    const audioEl = fixture.nativeElement.querySelector('audio');
    const remoteVideoEl = fixture.nativeElement.querySelector('.remote-video') as HTMLVideoElement | null;

    expect(audioEl).withContext('a VIDEO call should not render an <audio> element').toBeNull();
    expect(remoteVideoEl).not.toBeNull();
    expect(remoteVideoEl?.srcObject).toBe(remoteStream);
  });
});
