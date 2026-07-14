import { Component, DestroyRef, NgZone, effect, inject } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { CallOverlayComponent } from './components/call-overlay/call-overlay.component';
import { AuthService } from './core/auth/auth.service';
import { ChatService } from './core/chat/chat.service';
import { CallService } from './core/calls/call.service';
import { ThemeService } from './core/theme/theme.service';
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
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  // Injected only to force early instantiation - ThemeService applies the
  // saved/system theme in its own constructor, as soon as the app root
  // component is created, so every page loads with the right theme already
  // set instead of only after a user happens to visit Profile > Settings.
  private readonly themeService = inject(ThemeService);

  constructor() {
    this.bindMouseGlow();

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

  /**
   * Drives the .mouse-glow background layer (see app.component.css) with two
   * CSS custom properties. Runs entirely outside Angular's zone and writes
   * directly to the DOM - a signal/template binding here would trigger a full
   * change-detection pass on every mousemove event, which fires far too
   * often for that to be free.
   */
  private bindMouseGlow(): void {
    if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      let ticking = false;
      let lastEvent: MouseEvent | null = null;

      const apply = () => {
        ticking = false;
        if (!lastEvent) return;
        const root = document.documentElement.style;
        root.setProperty('--mouse-x', `${lastEvent.clientX}px`);
        root.setProperty('--mouse-y', `${lastEvent.clientY}px`);
      };

      const onMouseMove = (event: MouseEvent) => {
        lastEvent = event;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(apply);
        }
      };

      window.addEventListener('mousemove', onMouseMove, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('mousemove', onMouseMove));
    });
  }
}
