import { Component, HostListener, computed, effect, inject } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionsService } from '../../core/subscriptions/subscriptions.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [NgStyle, NgIf, RouterLink],
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly subscriptionsService = inject(SubscriptionsService);

  bgColor = 'transparent'; // Initialize header as transparent
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  readonly isPremium = computed(() => this.subscriptionsService.status()?.isPremium ?? false);
  readonly subscriptionTier = computed(() => this.subscriptionsService.status()?.tier ?? 'FREE');

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.subscriptionsService.loadStatus().subscribe();
      }
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    if (window.pageYOffset > 10) {
      this.bgColor = '#ffff'; // Change background color after scrolling 50px
    } else {
      this.bgColor = 'transparent'; // Change background color back to transparent
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
