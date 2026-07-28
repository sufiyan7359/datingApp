import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/admin/admin.service';
import { DashboardStats, Growth } from '../../../core/admin/admin.models';
import { AdminTrendChartComponent, TrendPoint } from '../admin-trend-chart/admin-trend-chart.component';

// Validated categorical slots 1-3 (blue/orange/aqua) - the only run of the
// reference palette that clears every CVD/contrast floor as an all-pairs
// small-multiples set (see dataviz skill's palette.md).
const SIGNUPS_COLOR = '#2a78d6';
const MATCHES_COLOR = '#eb6834';
const MESSAGES_COLOR = '#1baf7a';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['../admin-shared.css', './admin-dashboard.component.css'],
  imports: [NgIf, NgFor, FormsModule, AdminTrendChartComponent],
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly stats = signal<DashboardStats | null>(null);
  readonly growth = signal<Growth | null>(null);
  readonly errorMessage = signal<string | null>(null);
  growthDays = 30;

  // Placeholder counts matching the real grids' item counts, so the
  // skeleton occupies the same space the real content will - otherwise the
  // page suddenly grows taller the instant stats/growth load, yanking
  // whatever the admin was scrolled to.
  readonly skeletonStatSlots = Array.from({ length: 12 });
  readonly skeletonChartSlots = Array.from({ length: 3 });

  ngOnInit(): void {
    this.adminService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
    this.loadGrowth();
  }

  loadGrowth(): void {
    this.adminService.getGrowth(this.growthDays).subscribe({
      next: (growth) => this.growth.set(growth),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
  }

  get signupPoints(): TrendPoint[] {
    return (this.growth()?.series ?? []).map((p) => ({ date: p.date, value: p.signups }));
  }

  get matchPoints(): TrendPoint[] {
    return (this.growth()?.series ?? []).map((p) => ({ date: p.date, value: p.matches }));
  }

  get messagePoints(): TrendPoint[] {
    return (this.growth()?.series ?? []).map((p) => ({ date: p.date, value: p.messages }));
  }

  readonly signupsColor = SIGNUPS_COLOR;
  readonly matchesColor = MATCHES_COLOR;
  readonly messagesColor = MESSAGES_COLOR;

  formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
