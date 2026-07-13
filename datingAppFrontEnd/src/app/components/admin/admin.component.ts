import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin/admin.service';
import {
  AdminPromoCode,
  AdminReport,
  AdminUserDetail,
  AdminUserSummary,
  DashboardStats,
  ReportStatus,
} from '../../core/admin/admin.models';

type Tab = 'dashboard' | 'users' | 'reports' | 'promo-codes';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
  imports: [NgFor, NgIf, DatePipe, FormsModule],
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);

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

  // Reports
  readonly reports = signal<AdminReport[]>([]);
  readonly reportsTotal = signal(0);
  readonly reportsPage = signal(1);
  reportStatusFilter: ReportStatus | '' = 'PENDING';
  readonly reviewingReportId = signal<string | null>(null);
  reviewNote = '';
  reviewSuspend = false;

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
    this.adminService.getUserDetail(id).subscribe({
      next: (detail) => this.selectedUser.set(detail),
      error: (err) => this.handleError(err),
    });
  }

  closeUserDetail(): void {
    this.selectedUser.set(null);
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
