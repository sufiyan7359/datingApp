import { Component, ElementRef, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { SupportService } from '../../core/support/support.service';

@Component({
  selector: 'app-support-chat',
  templateUrl: './support-chat.component.html',
  styleUrls: ['./support-chat.component.css'],
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule],
})
export class SupportChatComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly supportService = inject(SupportService);

  @ViewChild('scrollAnchor') scrollAnchorRef: ElementRef<HTMLDivElement>;

  readonly currentUserId = this.authService.currentUser()?.id ?? '';
  readonly thread = this.supportService.thread;
  readonly errorMessage = signal<string | null>(null);
  readonly isSending = signal(false);
  draft = '';

  constructor() {
    effect(() => {
      this.thread();
      queueMicrotask(() => this.scrollAnchorRef?.nativeElement.scrollIntoView({ behavior: 'smooth' }));
    });
  }

  ngOnInit(): void {
    this.supportService.getMyThread().subscribe({
      next: () => this.supportService.markRead().subscribe(),
      error: () => this.errorMessage.set('Could not load your conversation with the team.'),
    });
  }

  send(): void {
    const content = this.draft.trim();
    if (!content) return;
    this.isSending.set(true);
    this.supportService.sendMessage(content).subscribe({
      next: () => {
        this.isSending.set(false);
        this.draft = '';
      },
      error: () => {
        this.isSending.set(false);
        this.errorMessage.set('Could not send your message. Please try again.');
      },
    });
  }
}
