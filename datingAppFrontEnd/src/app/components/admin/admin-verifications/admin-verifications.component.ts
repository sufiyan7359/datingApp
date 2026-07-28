import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/admin/admin.service';
import { AdminVerification, VerificationStatus } from '../../../core/admin/admin.models';
import { environment } from '../../../../environments/environment';
import { AdminPaginationComponent } from '../admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-verifications',
  templateUrl: './admin-verifications.component.html',
  styleUrls: ['../admin-shared.css', './admin-verifications.component.css'],
  imports: [NgFor, NgIf, DatePipe, FormsModule, AdminPaginationComponent],
})
export class AdminVerificationsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly apiUrl = environment.apiUrl;
  readonly verifications = signal<AdminVerification[]>([]);
  readonly verificationsTotal = signal(0);
  readonly verificationsPage = signal(1);
  readonly verificationsLimit = signal(20);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly reviewingVerificationUserId = signal<string | null>(null);

  verificationStatusFilter: VerificationStatus = 'PENDING';
  verificationReviewNote = '';

  ngOnInit(): void {
    this.loadVerifications();
  }

  loadVerifications(page = 1): void {
    this.adminService.listVerifications(this.verificationStatusFilter, page).subscribe({
      next: (result) => {
        this.verifications.set(result.results);
        this.verificationsTotal.set(result.total);
        this.verificationsPage.set(result.page);
        this.verificationsLimit.set(result.limit);
      },
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
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
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
  }
}
