import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { ChatService } from '../../core/chat/chat.service';
import { Conversation } from '../../core/chat/chat.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css'],
  imports: [NgFor, NgIf, DatePipe],
})
export class MessagesComponent implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  readonly apiUrl = environment.apiUrl;
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly conversations = computed(() =>
    [...this.chatService.conversations()].sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    }),
  );

  ngOnInit(): void {
    this.chatService.loadConversations().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Could not load your conversations.');
      },
    });
  }

  openChat(otherUserId: string): void {
    void this.router.navigate(['/chating', otherUserId]);
  }

  toggleMute(event: Event, conversationId: string, currentlyMuted: boolean): void {
    event.stopPropagation();
    this.chatService.setMuted(conversationId, !currentlyMuted).subscribe();
  }

  previewText(conversation: Conversation): string {
    const message = conversation.lastMessage;
    if (!message) return 'Say hi to your match!';
    if (message.deletedAt) return 'Message deleted';
    if (message.type === 'IMAGE') return '📷 Photo';
    if (message.type === 'VOICE') return '🎤 Voice message';
    return message.content ?? '';
  }
}
