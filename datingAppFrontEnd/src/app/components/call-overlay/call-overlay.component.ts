import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { CallService } from '../../core/calls/call.service';

@Component({
  selector: 'app-call-overlay',
  templateUrl: './call-overlay.component.html',
  styleUrls: ['./call-overlay.component.css'],
  imports: [NgIf],
})
export class CallOverlayComponent implements AfterViewChecked {
  readonly callService = inject(CallService);

  @ViewChild('localVideo') localVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef?: ElementRef<HTMLVideoElement>;

  ngAfterViewChecked(): void {
    const call = this.callService.activeCall();
    if (!call) return;

    const localEl = this.localVideoRef?.nativeElement;
    if (localEl && call.localStream && localEl.srcObject !== call.localStream) {
      localEl.srcObject = call.localStream;
    }

    const remoteEl = this.remoteVideoRef?.nativeElement;
    if (remoteEl && call.remoteStream && remoteEl.srcObject !== call.remoteStream) {
      remoteEl.srcObject = call.remoteStream;
    }
  }

  accept(): void {
    this.callService.acceptIncoming();
  }

  decline(): void {
    this.callService.declineIncoming();
  }

  hangUp(): void {
    this.callService.endCall();
  }

  toggleMute(): void {
    this.callService.toggleMute();
  }

  toggleCamera(): void {
    this.callService.toggleCamera();
  }
}
