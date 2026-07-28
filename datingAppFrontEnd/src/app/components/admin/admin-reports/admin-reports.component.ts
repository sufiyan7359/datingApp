import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/admin/admin.service';
import { AdminReport, ReportStatus } from '../../../core/admin/admin.models';
import { AdminPaginationComponent } from '../admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.component.html',
  styleUrls: ['../admin-shared.css', './admin-reports.component.css'],
  imports: [NgFor, NgIf, DatePipe, FormsModule, AdminPaginationComponent],
})
export class AdminReportsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly reports = signal<AdminReport[]>([]);
  readonly reportsTotal = signal(0);
  readonly reportsPage = signal(1);
  readonly reportsLimit = signal(20);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly reviewingReportId = signal<string | null>(null);

  reportStatusFilter: ReportStatus | '' = 'PENDING';
  reviewNote = '';
  reviewSuspend = false;

  ngOnInit(): void {
    this.loadReports();
  }

  private handleError(err: { error?: { message?: string } }): void {
    this.errorMessage.set(err?.error?.message ?? 'Something went wrong.');
  }

  loadReports(page = 1): void {
    this.adminService.listReports(this.reportStatusFilter, page).subscribe({
      next: (result) => {
        this.reports.set(result.results);
        this.reportsTotal.set(result.total);
        this.reportsPage.set(result.page);
        this.reportsLimit.set(result.limit);
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
}
