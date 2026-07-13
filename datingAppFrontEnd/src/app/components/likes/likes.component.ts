import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { MatchingService } from '../../core/matching/matching.service';
import { LikesReceived } from '../../core/matching/matching.models';
import { SwipeAction } from '../../core/matching/matching.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-likes',
  templateUrl: './likes.component.html',
  styleUrls: ['./likes.component.css'],
  imports: [NgFor, NgIf],
})
export class LikesComponent implements OnInit {
  private readonly matchingService = inject(MatchingService);
  private readonly router = inject(Router);

  readonly apiUrl = environment.apiUrl;
  readonly likesReceived = signal<LikesReceived | null>(null);
  readonly isLoading = signal(false);
  readonly swipingUserId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

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
}
