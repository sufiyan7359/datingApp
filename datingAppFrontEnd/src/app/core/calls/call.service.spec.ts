import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CallService } from './call.service';
import { ChatService } from '../chat/chat.service';
import { IncomingCallEvent } from './call.models';

describe('CallService', () => {
  let service: CallService;
  let router: jasmine.SpyObj<Router>;

  const incoming: IncomingCallEvent = {
    callId: 'call-1',
    conversationId: 'conv-1',
    callerId: 'user-42',
    callerFirstName: 'Asha',
    type: 'VOICE',
  };

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        CallService,
        provideHttpClient(),
        { provide: Router, useValue: router },
        { provide: ChatService, useValue: { on: () => undefined, emit: () => undefined } },
      ],
    });

    service = TestBed.inject(CallService);
  });

  it('navigates to the caller\'s conversation before answering', () => {
    // getUserMedia isn't available in the Karma/Chrome test runner without a
    // real camera/mic grant, and doAccept() is exercised by its own
    // concerns - this test is only about the navigation side effect.
    spyOn(service as unknown as { doAccept: () => Promise<void> }, 'doAccept').and.resolveTo();

    service.incomingCall.set(incoming);
    service.acceptIncoming();

    expect(router.navigate).toHaveBeenCalledWith(['/chating', incoming.callerId]);
    expect(service.incomingCall()).toBeNull();
  });

  it('does not navigate if there is no incoming call to accept', () => {
    service.acceptIncoming();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('starts the ringtone while a call is incoming and stops it once cleared', () => {
    const withRingtoneState = service as unknown as {
      ringtoneAudioContext: AudioContext | null;
      ringtoneIntervalId: ReturnType<typeof setInterval> | null;
    };

    expect(withRingtoneState.ringtoneAudioContext).toBeNull();

    service.incomingCall.set(incoming);
    TestBed.flushEffects();
    expect(withRingtoneState.ringtoneAudioContext).not.toBeNull();
    expect(withRingtoneState.ringtoneIntervalId).not.toBeNull();

    service.declineIncoming();
    TestBed.flushEffects();
    expect(withRingtoneState.ringtoneAudioContext).toBeNull();
    expect(withRingtoneState.ringtoneIntervalId).toBeNull();
  });
});
