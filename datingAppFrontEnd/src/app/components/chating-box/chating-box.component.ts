import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChatService } from '../../core/chat/chat.service';
import { AuthService } from '../../core/auth/auth.service';
import { CallService } from '../../core/calls/call.service';
import { ChatMessage } from '../../core/chat/chat.models';
import { environment } from '../../../environments/environment';

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍'];
const TYPING_STOP_DELAY_MS = 2000;

@Component({
  selector: 'app-chating-box',
  templateUrl: './chating-box.component.html',
  styleUrls: ['./chating-box.component.css'],
  imports: [NgFor, NgIf, NgClass, FormsModule],
})
export class ChatingBoxComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly callService = inject(CallService);

  @ViewChild('messageInput') messageInputRef: ElementRef<HTMLInputElement>;
  @ViewChild('scrollAnchor') scrollAnchorRef: ElementRef<HTMLDivElement>;

  readonly apiUrl = environment.apiUrl;
  readonly quickReactions = QUICK_REACTIONS;
  readonly messages = this.chatService.messages;
  readonly typingUserIds = this.chatService.typingUserIds;
  readonly onlineUserIds = this.chatService.onlineUserIds;
  readonly currentUserId = this.authService.currentUser()?.id ?? '';

  readonly otherFirstName = signal('');
  readonly otherUserId = signal('');
  readonly conversationId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly replyTo = signal<ChatMessage | null>(null);
  readonly searchQuery = signal('');
  readonly searchResults = signal<ChatMessage[] | null>(null);
  readonly openReactionPickerFor = signal<string | null>(null);

  value = '';
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const targetUserId = this.route.snapshot.paramMap.get('id');
    if (!targetUserId) {
      this.errorMessage.set('No conversation specified.');
      return;
    }

    this.chatService.loadConversations().subscribe({
      next: (conversations) => {
        const conversation = conversations.find((c) => c.otherUserId === targetUserId);
        if (!conversation) {
          this.errorMessage.set('You can only chat with people you have matched with.');
          return;
        }
        this.otherFirstName.set(conversation.otherFirstName);
        this.otherUserId.set(conversation.otherUserId);
        this.conversationId.set(conversation.conversationId);
        this.chatService.setActiveConversation(conversation.conversationId);

        this.chatService.loadMessages(conversation.conversationId).subscribe(() => {
          this.scrollToBottom();
          this.markLatestRead();
        });
      },
      error: () => this.errorMessage.set('Could not load your conversations.'),
    });
  }

  ngOnDestroy(): void {
    this.chatService.setActiveConversation(null);
    if (this.typingStopTimer) {
      clearTimeout(this.typingStopTimer);
    }
  }

  startVoiceCall(): void {
    const conversationId = this.conversationId();
    if (!conversationId) return;
    void this.callService.startCall(conversationId, this.otherUserId(), this.otherFirstName(), 'VOICE');
  }

  startVideoCall(): void {
    const conversationId = this.conversationId();
    if (!conversationId) return;
    void this.callService.startCall(conversationId, this.otherUserId(), this.otherFirstName(), 'VIDEO');
  }

  isMine(message: ChatMessage): boolean {
    return message.senderId === this.currentUserId;
  }

  isOtherOnline(): boolean {
    return this.onlineUserIds().has(this.otherUserId());
  }

  isOtherTyping(): boolean {
    return this.typingUserIds().has(this.otherUserId());
  }

  onInputChange(): void {
    const conversationId = this.conversationId();
    if (!conversationId) return;

    this.chatService.setTyping(conversationId, true);
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
    this.typingStopTimer = setTimeout(() => this.chatService.setTyping(conversationId, false), TYPING_STOP_DELAY_MS);
  }

  sendMessage(): void {
    const conversationId = this.conversationId();
    if (!conversationId || !this.value.trim()) return;

    this.chatService.sendMessage(conversationId, {
      type: 'TEXT',
      content: this.value.trim(),
      replyToId: this.replyTo()?.id,
    });
    this.value = '';
    this.replyTo.set(null);
    setTimeout(() => this.scrollToBottom(), 50);
  }

  insertEmoji(emoji: string): void {
    this.value += emoji;
    this.messageInputRef?.nativeElement.focus();
  }

  startReply(message: ChatMessage): void {
    this.replyTo.set(message);
    this.messageInputRef?.nativeElement.focus();
  }

  cancelReply(): void {
    this.replyTo.set(null);
  }

  getReplySnippet(replyToId: string | null): string {
    if (!replyToId) return '';
    const original = this.messages().find((m) => m.id === replyToId);
    return original?.content ?? (original ? '[attachment]' : '[message]');
  }

  deleteMessage(message: ChatMessage): void {
    if (!this.isMine(message)) return;
    this.chatService.deleteMessage(message.id);
  }

  toggleReactionPicker(messageId: string): void {
    this.openReactionPickerFor.set(this.openReactionPickerFor() === messageId ? null : messageId);
  }

  react(messageId: string, emoji: string): void {
    this.chatService.reactToMessage(messageId, emoji);
    this.openReactionPickerFor.set(null);
  }

  hasMyReaction(message: ChatMessage, emoji: string): boolean {
    return message.reactions.some((r) => r.emoji === emoji && r.userId === this.currentUserId);
  }

  togglePin(message: ChatMessage): void {
    const conversationId = this.conversationId();
    if (!conversationId) return;
    const action$ = message.isPinned
      ? this.chatService.unpinMessage(conversationId, message.id)
      : this.chatService.pinMessage(conversationId, message.id);
    action$.subscribe({
      next: (updated) => {
        this.chatService.messages.update((current) => current.map((m) => (m.id === updated.id ? updated : m)));
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const conversationId = this.conversationId();
    if (!file || !conversationId) return;

    this.chatService.uploadAttachment(conversationId, file).subscribe({
      next: (result) => {
        this.chatService.sendMessage(conversationId, { type: result.type, mediaUrl: result.url });
        input.value = '';
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Could not upload that file.');
        input.value = '';
      },
    });
  }

  runSearch(): void {
    const conversationId = this.conversationId();
    const query = this.searchQuery().trim();
    if (!conversationId || !query) {
      this.searchResults.set(null);
      return;
    }
    this.chatService.searchMessages(conversationId, query).subscribe((results) => this.searchResults.set(results));
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set(null);
  }

  private markLatestRead(): void {
    const conversationId = this.conversationId();
    const latest = this.messages().at(-1);
    if (conversationId && latest) {
      this.chatService.markRead(conversationId, latest.id);
    }
  }

  private scrollToBottom(): void {
    this.scrollAnchorRef?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
