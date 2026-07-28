import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/admin/admin.service';
import { AdminUserSummary } from '../../../core/admin/admin.models';
import { AdminPaginationComponent } from '../admin-pagination/admin-pagination.component';

const SEARCH_DEBOUNCE_MS = 350;

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['../admin-shared.css', './admin-users.component.css'],
  imports: [NgFor, NgIf, DatePipe, FormsModule, AdminPaginationComponent],
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly users = signal<AdminUserSummary[]>([]);
  readonly usersTotal = signal(0);
  readonly usersPage = signal(1);
  readonly usersLimit = signal(20);
  readonly errorMessage = signal<string | null>(null);
  userSearch = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
  }

  /** Live search - fires as the admin types, debounced so every keystroke doesn't hit the API. */
  onSearchInput(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.loadUsers(1), SEARCH_DEBOUNCE_MS);
  }

  loadUsers(page = 1): void {
    this.adminService.listUsers(this.userSearch, page).subscribe({
      next: (result) => {
        this.users.set(result.results);
        this.usersTotal.set(result.total);
        this.usersPage.set(result.page);
        this.usersLimit.set(result.limit);
      },
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
  }

  viewUser(id: string): void {
    this.router.navigate(['/admin/users', id]);
  }
}
