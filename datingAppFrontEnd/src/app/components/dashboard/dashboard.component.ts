import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DiscoveryService } from '../../core/discovery/discovery.service';
import { DiscoveryProfile } from '../../core/discovery/discovery.models';
import { MatchingService } from '../../core/matching/matching.service';
import { MatchInfo, SwipeAction } from '../../core/matching/matching.models';
import { SubscriptionsService } from '../../core/subscriptions/subscriptions.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [NgFor, NgIf, ReactiveFormsModule, RouterLink],
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly discoveryService = inject(DiscoveryService);
  private readonly matchingService = inject(MatchingService);
  private readonly subscriptionsService = inject(SubscriptionsService);

  readonly apiUrl = environment.apiUrl;
  readonly discoveryResults = signal<DiscoveryProfile[]>([]);
  readonly discoveryTotal = signal(0);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly filtersOpen = signal(false);
  readonly swipingUserId = signal<string | null>(null);
  readonly swipeError = signal<string | null>(null);
  readonly newMatch = signal<MatchInfo | null>(null);
  readonly limits = this.matchingService.limits;
  readonly matches = this.matchingService.matches;
  readonly subscriptionStatus = this.subscriptionsService.status;

  // ---- Swipeable card stack (top card only is draggable) ----
  readonly stackCards = computed(() => this.discoveryResults().slice(0, 3));
  readonly topCard = computed(() => this.discoveryResults()[0] ?? null);

  readonly dragCardId = signal<string | null>(null);
  readonly dragX = signal(0);
  readonly dragY = signal(0);
  readonly exitingCardId = signal<string | null>(null);
  readonly exitDirection = signal<'left' | 'right' | 'up' | null>(null);

  private dragStartX = 0;
  private dragStartY = 0;

  filtersForm = new FormGroup({
    minAge: new FormControl<number | null>(null),
    maxAge: new FormControl<number | null>(null),
    religion: new FormControl(''),
    language: new FormControl(''),
    profession: new FormControl(''),
    relationshipGoal: new FormControl(''),
    smoking: new FormControl(''),
    drinking: new FormControl(''),
    workout: new FormControl(''),
    interests: new FormControl(''),
    maxDistanceKm: new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.loadFeed();
    this.matchingService.loadLimits().subscribe();
    this.matchingService.loadMatches().subscribe();
    this.subscriptionsService.loadStatus().subscribe();
  }

  loadFeed(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    const startedAt = Date.now();

    const raw = this.filtersForm.value;
    this.discoveryService
      .getFeed({
        minAge: raw.minAge ?? undefined,
        maxAge: raw.maxAge ?? undefined,
        religion: raw.religion || undefined,
        language: raw.language || undefined,
        profession: raw.profession || undefined,
        relationshipGoal: (raw.relationshipGoal as never) || undefined,
        smoking: (raw.smoking as never) || undefined,
        drinking: (raw.drinking as never) || undefined,
        workout: (raw.workout as never) || undefined,
        interests: raw.interests || undefined,
        maxDistanceKm: raw.maxDistanceKm ?? undefined,
        limit: 20,
      })
      .subscribe({
        next: (feed) => {
          this.finishLoading(startedAt, () => {
            this.discoveryResults.set(feed.results);
            this.discoveryTotal.set(feed.total);
          });
        },
        error: () => {
          this.finishLoading(startedAt, () => {
            this.loadError.set('Could not load profiles right now. Please try again.');
          });
        },
      });
  }

  // Keeps the skeleton on screen for at least a second even when the API
  // responds almost instantly, so it reads as a deliberate loading state
  // instead of a flash.
  private finishLoading(startedAt: number, apply: () => void): void {
    const MIN_VISIBLE_MS = 1000;
    const remaining = MIN_VISIBLE_MS - (Date.now() - startedAt);
    setTimeout(() => {
      apply();
      this.isLoading.set(false);
    }, Math.max(0, remaining));
  }

  applyFilters(): void {
    this.loadFeed();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadFeed();
  }

  toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
  }

  // ---- Card stack transform + drag-to-swipe ----

  cardTransform(userId: string, index: number): string | null {
    if (index !== 0) {
      // transform-origin is bottom-center (see .stack-card), so scaling alone tucks
      // the card's top edge further under the front card - pulling it up with a
      // translateY beyond that inset is what makes a sliver peek out above, the
      // classic "next card in the deck" cue.
      const scale = 1 - index * 0.045;
      return `scale(${scale}) translateY(-${index * 5.5}%)`;
    }
    if (this.dragCardId() === userId) {
      const x = this.dragX();
      const y = this.dragY();
      return `translate(${x}px, ${y}px) rotate(${x / 18}deg)`;
    }
    return null;
  }

  likeStampOpacity(): number {
    const x = this.dragX();
    return x > 0 ? Math.min(x / 100, 1) : 0;
  }

  nopeStampOpacity(): number {
    const x = this.dragX();
    return x < 0 ? Math.min(-x / 100, 1) : 0;
  }

  onPointerDown(event: PointerEvent, userId: string): void {
    if (this.swipingUserId() || this.exitingCardId()) return;
    this.dragCardId.set(userId);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragCardId()) return;
    this.dragX.set(event.clientX - this.dragStartX);
    this.dragY.set(event.clientY - this.dragStartY);
  }

  onPointerUp(): void {
    const userId = this.dragCardId();
    if (!userId) return;

    const x = this.dragX();
    const threshold = 110;

    if (Math.abs(x) > threshold) {
      this.finishSwipe(userId, x > 0 ? 'LIKE' : 'PASS', x > 0 ? 'right' : 'left');
    } else {
      this.dragCardId.set(null);
      this.dragX.set(0);
      this.dragY.set(0);
    }
  }

  triggerSwipe(userId: string, action: SwipeAction): void {
    if (this.swipingUserId() || this.exitingCardId()) return;
    this.finishSwipe(userId, action, action === 'PASS' ? 'left' : action === 'SUPER_LIKE' ? 'up' : 'right');
  }

  private finishSwipe(userId: string, action: SwipeAction, direction: 'left' | 'right' | 'up'): void {
    this.dragCardId.set(null);
    this.exitingCardId.set(userId);
    this.exitDirection.set(direction);

    // Let the fly-off transition play before the card actually leaves discoveryResults().
    setTimeout(() => {
      this.swipe(userId, action);
      this.exitingCardId.set(null);
      this.exitDirection.set(null);
      this.dragX.set(0);
      this.dragY.set(0);
    }, 260);
  }

  swipe(targetUserId: string, action: SwipeAction): void {
    this.swipeError.set(null);
    this.swipingUserId.set(targetUserId);

    this.matchingService.swipe(targetUserId, action).subscribe({
      next: (result) => {
        this.discoveryResults.set(this.discoveryResults().filter((p) => p.userId !== targetUserId));
        this.swipingUserId.set(null);
        this.matchingService.loadLimits().subscribe();

        if (result.isMatch && result.match) {
          this.newMatch.set(result.match);
          this.matchingService.loadMatches().subscribe();
        }
      },
      error: (err) => {
        this.swipingUserId.set(null);
        this.swipeError.set(err?.error?.message ?? 'Could not record that swipe.');
      },
    });
  }

  dismissMatch(): void {
    this.newMatch.set(null);
  }

  goToChat(userId: string): void {
    this.newMatch.set(null);
    void this.router.navigate(['/chating', userId]);
  }

  activateBoost(): void {
    this.matchingService.activateBoost().subscribe({
      next: () => {
        this.matchingService.loadLimits().subscribe();
        this.loadFeed();
      },
      error: (err) => this.swipeError.set(err?.error?.message ?? 'Could not activate boost.'),
    });
  }
}
