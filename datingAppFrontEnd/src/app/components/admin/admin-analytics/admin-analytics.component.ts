import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/admin/admin.service';
import {
  AnalyticsEventType,
  AnalyticsSummary,
  Experiment,
  ExperimentResults,
} from '../../../core/admin/admin.models';

const ANALYTICS_EVENT_TYPES: AnalyticsEventType[] = [
  'SIGNUP',
  'LOGIN',
  'ONBOARDING_COMPLETED',
  'SWIPE',
  'MATCH',
  'MESSAGE_SENT',
  'SUBSCRIPTION_PURCHASED',
  'BOOST_ACTIVATED',
  'VERIFICATION_SUBMITTED',
  'PUSH_SUBSCRIBED',
];

@Component({
  selector: 'app-admin-analytics',
  templateUrl: './admin-analytics.component.html',
  styleUrls: ['../admin-shared.css', './admin-analytics.component.css'],
  imports: [NgFor, NgIf, FormsModule],
})
export class AdminAnalyticsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly eventTypes = ANALYTICS_EVENT_TYPES;
  readonly analyticsSummary = signal<AnalyticsSummary | null>(null);
  readonly errorMessage = signal<string | null>(null);
  analyticsDays = 30;

  readonly experiments = signal<Experiment[]>([]);
  newExperimentKey = '';
  newExperimentName = '';
  newExperimentSplit = 50;
  readonly viewingResultsKey = signal<string | null>(null);
  resultsGoalEvent: AnalyticsEventType = 'SUBSCRIPTION_PURCHASED';
  readonly experimentResults = signal<ExperimentResults | null>(null);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private handleError(err: { error?: { message?: string } }): void {
    this.errorMessage.set(err?.error?.message ?? 'Something went wrong.');
  }

  loadAnalytics(): void {
    this.adminService.getAnalyticsSummary(this.analyticsDays).subscribe({
      next: (summary) => this.analyticsSummary.set(summary),
      error: (err) => this.handleError(err),
    });
    this.adminService.listExperiments().subscribe({
      next: (experiments) => this.experiments.set(experiments),
      error: (err) => this.handleError(err),
    });
  }

  eventCount(type: AnalyticsEventType): number {
    return this.analyticsSummary()?.countByType[type] ?? 0;
  }

  createExperiment(): void {
    if (!this.newExperimentKey.trim() || !this.newExperimentName.trim()) return;
    this.adminService
      .createExperiment(this.newExperimentKey.trim(), this.newExperimentName.trim(), this.newExperimentSplit)
      .subscribe({
        next: () => {
          this.newExperimentKey = '';
          this.newExperimentName = '';
          this.newExperimentSplit = 50;
          this.loadAnalytics();
        },
        error: (err) => this.handleError(err),
      });
  }

  toggleExperimentActive(experiment: Experiment): void {
    this.adminService.setExperimentActive(experiment.key, !experiment.isActive).subscribe({
      next: () => this.loadAnalytics(),
      error: (err) => this.handleError(err),
    });
  }

  viewResults(key: string): void {
    this.viewingResultsKey.set(key);
    this.experimentResults.set(null);
    this.loadResults();
  }

  loadResults(): void {
    const key = this.viewingResultsKey();
    if (!key) return;
    this.adminService.getExperimentResults(key, this.resultsGoalEvent).subscribe({
      next: (results) => this.experimentResults.set(results),
      error: (err) => this.handleError(err),
    });
  }

  closeResults(): void {
    this.viewingResultsKey.set(null);
    this.experimentResults.set(null);
  }
}
