import { Component, effect, inject } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { CallOverlayComponent } from './components/call-overlay/call-overlay.component';
import { AuthService } from './core/auth/auth.service';
import { ChatService } from './core/chat/chat.service';
import { CallService } from './core/calls/call.service';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [HeaderComponent, RouterOutlet, FooterComponent, CallOverlayComponent],
})
export class AppComponent {
  title = 'datingAppFront';

  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly callService = inject(CallService);
  private readonly swUpdate = inject(SwUpdate);

  constructor() {
    // Keep one socket connection alive for the whole authenticated session
    // (not scoped to a specific chat screen) so messages and incoming calls
    // reach the user from anywhere in the app.
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.chatService.connect();
        this.callService.bindSignaling();
      } else {
        this.chatService.disconnect();
      }
    });

    // Without this, a user could stay on a stale cached build indefinitely -
    // the service worker only fetches new versions in the background, it
    // never forces a reload on its own.
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY' && confirm('A new version of DatingApp is available. Reload now?')) {
          document.location.reload();
        }
      });
    }
  }
}
