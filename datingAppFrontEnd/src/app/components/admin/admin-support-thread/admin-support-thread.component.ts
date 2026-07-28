import { Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminSupportService } from '../../../core/admin/admin-support.service';
import { AdminService } from '../../../core/admin/admin.service';
import { SupportMessage } from '../../../core/admin/admin.models';

@Component({
  selector: 'app-admin-support-thread',
  templateUrl: './admin-support-thread.component.html',
  styleUrls: ['../admin-shared.css', './admin-support-thread.component.css'],
  imports: [NgFor, NgIf, DatePipe, FormsModule, RouterLink],
})
export class AdminSupportThreadComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminSupportService = inject(AdminSupportService);
  private readonly adminService = inject(AdminService);

  readonly userId = signal('');
  readonly userName = signal('');
  readonly messages = signal<SupportMessage[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isSending = signal(false);
  draft = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('userId');
    if (!id) {
      this.router.navigate(['/admin/messages']);
      return;
    }
    this.userId.set(id);
    this.loadThread();
    this.adminService.getUserDetail(id).subscribe({
      next: (detail) => this.userName.set(`${detail.firstName} ${detail.lastName}`),
    });
  }

  private loadThread(): void {
    this.adminSupportService.getThread(this.userId()).subscribe({
      next: (thread) => this.messages.set(thread.messages),
      error: (err) => this.errorMessage.set(err?.error?.message ?? 'Something went wrong.'),
    });
    this.adminSupportService.markRead(this.userId()).subscribe();
  }

  send(): void {
    const content = this.draft.trim();
    if (!content) return;
    this.isSending.set(true);
    this.adminSupportService.sendMessage(this.userId(), content).subscribe({
      next: (message) => {
        this.isSending.set(false);
        this.messages.update((msgs) => [...msgs, message]);
        this.draft = '';
      },
      error: (err) => {
        this.isSending.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Could not send message.');
      },
    });
  }
}
