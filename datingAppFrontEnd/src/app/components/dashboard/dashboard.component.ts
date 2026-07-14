import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard-header/dashboard-header.component';
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
  imports: [DashboardHeaderComponent, NgFor, NgIf, ReactiveFormsModule, RouterLink],
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
          this.discoveryResults.set(feed.results);
          this.discoveryTotal.set(feed.total);
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set('Could not load profiles right now. Please try again.');
          this.isLoading.set(false);
        },
      });
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
