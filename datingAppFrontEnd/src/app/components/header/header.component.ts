import { Component, DestroyRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionsService } from '../../core/subscriptions/subscriptions.service';
import { ChatService } from '../../core/chat/chat.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [NgIf, RouterLink, RouterLinkActive],
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  readonly isPremium = computed(() => this.subscriptionsService.status()?.isPremium ?? false);
  readonly subscriptionTier = computed(() => this.subscriptionsService.status()?.tier ?? 'FREE');
  readonly unreadCount = computed(() =>
    this.chatService.conversations().reduce((sum, c) => sum + c.unreadCount, 0),
  );

  readonly isOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.subscriptionsService.loadStatus().subscribe();
        this.chatService.loadConversations().subscribe();
      }
    });

    // Closing on navigation covers every way a route can change - link
    // clicks, browser back/forward, programmatic redirects - without
    // needing a (click) handler wired to every single sidebar link.
    const sub = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isOpen.set(false);
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());

    // The mobile drawer covers the page - scrolling the body underneath it
    // while it's open is disorienting, so lock it for as long as it's open.
    effect(() => {
      document.body.classList.toggle('sidebar-open', this.isOpen());
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }

  toggleSidebar(): void {
    this.isOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.isOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
