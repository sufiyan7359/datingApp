import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard-header/dashboard-header.component';
import { NgFor, NgIf, NgStyle } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DiscoveryService } from '../../core/discovery/discovery.service';
import { DiscoveryProfile } from '../../core/discovery/discovery.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [DashboardHeaderComponent, NgFor, NgIf, NgStyle, ReactiveFormsModule],
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly discoveryService = inject(DiscoveryService);

  addRequest: boolean[] = [];
  MessageSend: boolean[] = [];

  readonly apiUrl = environment.apiUrl;
  readonly discoveryResults = signal<DiscoveryProfile[]>([]);
  readonly discoveryTotal = signal(0);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly filtersOpen = signal(false);

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

  sendMessage(index: number) {
    this.router.navigate(['/chating', index]);
    this.MessageSend[index] = !this.MessageSend[index];
  }

  addReq(index: number) {
    this.addRequest[index] = !this.addRequest[index];
  }
}
