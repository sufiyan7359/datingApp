import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatchingService } from '../../core/matching/matching.service';
import { LikesReceived } from '../../core/matching/matching.models';
import { SwipeAction } from '../../core/matching/matching.models';
import { environment } from '../../../environments/environment';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

@Component({
  selector: 'app-likes',
  templateUrl: './likes.component.html',
  styleUrls: ['./likes.component.css'],
  imports: [NgFor, NgIf, UserAvatarComponent],
})
export class LikesComponent implements OnInit {
  private readonly matchingService = inject(MatchingService);
  private readonly router = inject(Router);

  readonly apiUrl = environment.apiUrl;
  readonly likesReceived = signal<LikesReceived | null>(null);
  readonly isLoading = signal(false);
  readonly swipingUserId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly skeletonPlaceholders = Array.from({ length: 8 });

  ngOnInit(): void {
    this.isLoading.set(true);
    this.matchingService.loadLikesReceived().subscribe({
      next: (result) => {
        this.likesReceived.set(result);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  swipeBack(targetUserId: string, action: SwipeAction): void {
    this.errorMessage.set(null);
    this.swipingUserId.set(targetUserId);
    this.matchingService.swipe(targetUserId, action).subscribe({
      next: (result) => {
        this.swipingUserId.set(null);
        const current = this.likesReceived();
        if (current) {
          this.likesReceived.set({
            ...current,
            count: current.count - 1,
            likes: current.likes.filter((l) => l.userId !== targetUserId),
          });
        }
        if (result.isMatch) {
          void this.router.navigate(['/chating', targetUserId]);
        }
      },
      error: (err) => {
        this.swipingUserId.set(null);
        this.errorMessage.set(err?.error?.message ?? 'Could not record that swipe.');
      },
    });
  }

  goToPremium(): void {
    void this.router.navigate(['/premium']);
  }

  timeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
}
