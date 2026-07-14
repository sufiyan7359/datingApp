import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin/admin.service';
import { environment } from '../../../environments/environment';
import {
  AdminPromoCode,
  AdminReport,
  AdminUserDetail,
  AdminUserSummary,
  AdminVerification,
  AnalyticsEventType,
  AnalyticsSummary,
  DashboardStats,
  Experiment,
  ExperimentResults,
  ReportStatus,
  RiskAssessment,
  VerificationStatus,
} from '../../core/admin/admin.models';

type Tab = 'dashboard' | 'users' | 'reports' | 'verifications' | 'analytics' | 'promo-codes';

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
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [NgFor, NgIf, DatePipe, FormsModule],
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly apiUrl = environment.apiUrl;
  readonly tab = signal<Tab>('dashboard');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Dashboard
  readonly stats = signal<DashboardStats | null>(null);

  // Users
  readonly users = signal<AdminUserSummary[]>([]);
  readonly usersTotal = signal(0);
  readonly usersPage = signal(1);
  userSearch = '';
  readonly selectedUser = signal<AdminUserDetail | null>(null);
  readonly riskAssessment = signal<RiskAssessment | null>(null);
  readonly riskLoading = signal(false);

  // Reports
  readonly reports = signal<AdminReport[]>([]);
  readonly reportsTotal = signal(0);
  readonly reportsPage = signal(1);
  reportStatusFilter: ReportStatus | '' = 'PENDING';
  readonly reviewingReportId = signal<string | null>(null);
  reviewNote = '';
  reviewSuspend = false;

  // Verifications
  readonly verifications = signal<AdminVerification[]>([]);
  readonly verificationsTotal = signal(0);
  readonly verificationsPage = signal(1);
  verificationStatusFilter: VerificationStatus = 'PENDING';
  readonly reviewingVerificationUserId = signal<string | null>(null);
  verificationReviewNote = '';

  // Analytics
  readonly eventTypes = ANALYTICS_EVENT_TYPES;
  readonly analyticsSummary = signal<AnalyticsSummary | null>(null);
  analyticsDays = 30;
  readonly experiments = signal<Experiment[]>([]);
  newExperimentKey = '';
  newExperimentName = '';
  newExperimentSplit = 50;
  readonly viewingResultsKey = signal<string | null>(null);
  resultsGoalEvent: AnalyticsEventType = 'SUBSCRIPTION_PURCHASED';
  readonly experimentResults = signal<ExperimentResults | null>(null);

  // Promo codes
  readonly promoCodes = signal<AdminPromoCode[]>([]);
  newPromoCode = '';
  newPromoDiscount = 20;
  newPromoMaxRedemptions: number | null = null;

  ngOnInit(): void {
    this.loadStats();
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (tab === 'dashboard') this.loadStats();
    if (tab === 'users') this.loadUsers();
    if (tab === 'reports') this.loadReports();
    if (tab === 'verifications') this.loadVerifications();
    if (tab === 'analytics') this.loadAnalytics();
    if (tab === 'promo-codes') this.loadPromoCodes();
  }

  private handleError(err: { error?: { message?: string } }): void {
    this.errorMessage.set(err?.error?.message ?? 'Something went wrong.');
  }

  loadStats(): void {
    this.adminService.getStats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err) => this.handleError(err),
    });
  }

  loadUsers(page = 1): void {
    this.adminService.listUsers(this.userSearch, page).subscribe({
      next: (result) => {
        this.users.set(result.results);
        this.usersTotal.set(result.total);
        this.usersPage.set(result.page);
      },
      error: (err) => this.handleError(err),
    });
  }

  viewUser(id: string): void {
    this.riskAssessment.set(null);
    this.adminService.getUserDetail(id).subscribe({
      next: (detail) => this.selectedUser.set(detail),
      error: (err) => this.handleError(err),
    });
  }

  closeUserDetail(): void {
    this.selectedUser.set(null);
    this.riskAssessment.set(null);
  }

  checkFakeProfileRisk(id: string): void {
    this.riskLoading.set(true);
    this.adminService.getRiskAssessment(id).subscribe({
      next: (assessment) => {
        this.riskLoading.set(false);
        this.riskAssessment.set(assessment);
      },
      error: (err) => {
        this.riskLoading.set(false);
        this.handleError(err);
      },
    });
  }

  suspendUser(id: string): void {
    if (!confirm('Suspend this account? They will be logged out and unable to log back in.')) return;
    this.adminService.suspendUser(id).subscribe({
      next: () => {
        this.loadUsers(this.usersPage());
        if (this.selectedUser()?.id === id) this.viewUser(id);
      },
      error: (err) => this.handleError(err),
    });
  }

  reactivateUser(id: string): void {
    this.adminService.reactivateUser(id).subscribe({
      next: () => {
        this.loadUsers(this.usersPage());
        if (this.selectedUser()?.id === id) this.viewUser(id);
      },
      error: (err) => this.handleError(err),
    });
  }

  loadReports(page = 1): void {
    this.adminService.listReports(this.reportStatusFilter, page).subscribe({
      next: (result) => {
        this.reports.set(result.results);
        this.reportsTotal.set(result.total);
        this.reportsPage.set(result.page);
      },
      error: (err) => this.handleError(err),
    });
  }

  startReview(report: AdminReport): void {
    this.reviewingReportId.set(report.id);
    this.reviewNote = '';
    this.reviewSuspend = false;
  }

  cancelReview(): void {
    this.reviewingReportId.set(null);
  }

  submitReview(status: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED'): void {
    const id = this.reviewingReportId();
    if (!id) return;
    this.adminService.reviewReport(id, status, this.reviewNote, this.reviewSuspend).subscribe({
      next: () => {
        this.reviewingReportId.set(null);
        this.successMessage.set('Report updated.');
        this.loadReports(this.reportsPage());
      },
      error: (err) => this.handleError(err),
    });
  }

  loadVerifications(page = 1): void {
    this.adminService.listVerifications(this.verificationStatusFilter, page).subscribe({
      next: (result) => {
        this.verifications.set(result.results);
        this.verificationsTotal.set(result.total);
        this.verificationsPage.set(result.page);
      },
      error: (err) => this.handleError(err),
    });
  }

  startVerificationReview(v: AdminVerification): void {
    this.reviewingVerificationUserId.set(v.userId);
    this.verificationReviewNote = '';
  }

  cancelVerificationReview(): void {
    this.reviewingVerificationUserId.set(null);
  }

  submitVerificationReview(status: 'APPROVED' | 'REJECTED'): void {
    const userId = this.reviewingVerificationUserId();
    if (!userId) return;
    if (status === 'REJECTED' && !this.verificationReviewNote.trim()) {
      this.errorMessage.set('A note explaining the rejection is required.');
      return;
    }
    this.adminService.reviewVerification(userId, status, this.verificationReviewNote).subscribe({
      next: () => {
        this.reviewingVerificationUserId.set(null);
        this.successMessage.set('Verification updated.');
        this.loadVerifications(this.verificationsPage());
      },
      error: (err) => this.handleError(err),
    });
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

  loadPromoCodes(): void {
    this.adminService.listPromoCodes().subscribe({
      next: (codes) => this.promoCodes.set(codes),
      error: (err) => this.handleError(err),
    });
  }

  createPromoCode(): void {
    if (!this.newPromoCode.trim()) return;
    this.adminService
      .createPromoCode(this.newPromoCode.trim(), this.newPromoDiscount, this.newPromoMaxRedemptions, null)
      .subscribe({
        next: () => {
          this.newPromoCode = '';
          this.newPromoDiscount = 20;
          this.newPromoMaxRedemptions = null;
          this.loadPromoCodes();
        },
        error: (err) => this.handleError(err),
      });
  }

  togglePromoActive(promo: AdminPromoCode): void {
    this.adminService.setPromoCodeActive(promo.id, !promo.isActive).subscribe({
      next: () => this.loadPromoCodes(),
      error: (err) => this.handleError(err),
    });
  }

  formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
