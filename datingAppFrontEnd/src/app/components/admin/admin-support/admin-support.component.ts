import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AdminSupportService } from '../../../core/admin/admin-support.service';
import { AdminSupportThreadSummary } from '../../../core/admin/admin.models';
import { AdminPaginationComponent } from '../admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-support',
  templateUrl: './admin-support.component.html',
  styleUrls: ['../admin-shared.css', './admin-support.component.css'],
  imports: [NgFor, NgIf, DatePipe, AdminPaginationComponent],
})
export class AdminSupportComponent implements OnInit {
  private readonly adminSupportService = inject(AdminSupportService);
  private readonly router = inject(Router);

  readonly threads = signal<AdminSupportThreadSummary[]>([]);
  readonly threadsTotal = signal(0);
  readonly threadsPage = signal(1);
  readonly threadsLimit = signal(20);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadThreads();
  }

  loadThreads(page = 1): void {
    this.adminSupportService.listThreads(page).subscribe({
      next: (result) => {
        this.threads.set(result.results);
        this.threadsTotal.set(result.total);
        this.threadsPage.set(result.page);
        this.threadsLimit.set(result.limit);
      },
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
  }

  openThread(userId: string): void {
    this.router.navigate(['/admin/messages', userId]);
  }
}
