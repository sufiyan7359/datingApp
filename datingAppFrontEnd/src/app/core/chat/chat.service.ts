import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  ChatMessage,
  Conversation,
  MessageDeletedEvent,
  MessageReactionEvent,
  MessagesReadEvent,
  PresenceEvent,
  TypingEvent,
} from './chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;

  readonly conversations = signal<Conversation[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly typingUserIds = signal<Set<string>>(new Set());
  readonly onlineUserIds = signal<Set<string>>(new Set());

  connect(): void {
    if (this.socket?.connected) {
      return;
    }
    const token = this.authService.getAccessToken();
    if (!token) {
      return;
    }

    this.socket = io(`${environment.apiUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('newMessage', (message: ChatMessage) => {
      this.messages.update((current) => [...current, message]);
    });

    this.socket.on('typing', (event: TypingEvent) => {
      this.typingUserIds.update((current) => {
        const next = new Set(current);
        if (event.isTyping) {
          next.add(event.userId);
        } else {
          next.delete(event.userId);
        }
        return next;
      });
    });

    this.socket.on('messagesRead', (event: MessagesReadEvent) => {
      this.messages.update((current) =>
        current.map((m) => (event.messageIds.includes(m.id) ? { ...m, readAt: new Date().toISOString() } : m)),
      );
    });

    this.socket.on('messageDeleted', (event: MessageDeletedEvent) => {
      this.messages.update((current) =>
        current.map((m) => (m.id === event.messageId ? { ...m, content: null, mediaUrl: null, deletedAt: new Date().toISOString() } : m)),
      );
    });

    this.socket.on('messageReaction', (event: MessageReactionEvent) => {
      this.messages.update((current) =>
        current.map((m) => {
          if (m.id !== event.messageId) return m;
          const reactions = event.added
            ? [...m.reactions, { emoji: event.emoji, userId: event.userId }]
            : m.reactions.filter((r) => !(r.emoji === event.emoji && r.userId === event.userId));
          return { ...m, reactions };
        }),
      );
    });

    this.socket.on('presence', (event: PresenceEvent) => {
      this.onlineUserIds.update((current) => {
        const next = new Set(current);
        if (event.online) {
          next.add(event.userId);
        } else {
          next.delete(event.userId);
        }
        return next;
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  sendMessage(conversationId: string, payload: { type: 'TEXT' | 'IMAGE' | 'VOICE'; content?: string; mediaUrl?: string; replyToId?: string }): void {
    this.socket?.emit('sendMessage', { conversationId, ...payload });
  }

  setTyping(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  markRead(conversationId: string, upToMessageId: string): void {
    this.socket?.emit('markRead', { conversationId, upToMessageId });
  }

  deleteMessage(messageId: string): void {
    this.socket?.emit('deleteMessage', { messageId });
  }

  reactToMessage(messageId: string, emoji: string): void {
    this.socket?.emit('reactToMessage', { messageId, emoji });
  }

  loadConversations(): Observable<Conversation[]> {
    return this.http
      .get<Conversation[]>(`${environment.apiUrl}/conversations`)
      .pipe(tap((conversations) => this.conversations.set(conversations)));
  }

  loadMessages(conversationId: string, before?: string): Observable<ChatMessage[]> {
    const url = before
      ? `${environment.apiUrl}/conversations/${conversationId}/messages?before=${before}`
      : `${environment.apiUrl}/conversations/${conversationId}/messages`;
    return this.http.get<ChatMessage[]>(url).pipe(
      tap((history) => {
        if (before) {
          this.messages.update((current) => [...history, ...current]);
        } else {
          this.messages.set(history);
        }
      }),
    );
  }

  searchMessages(conversationId: string, query: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${environment.apiUrl}/conversations/${conversationId}/messages/search?q=${encodeURIComponent(query)}`,
    );
  }

  listPinned(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${environment.apiUrl}/conversations/${conversationId}/pinned`);
  }

  pinMessage(conversationId: string, messageId: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${environment.apiUrl}/conversations/${conversationId}/messages/${messageId}/pin`, {});
  }

  unpinMessage(conversationId: string, messageId: string): Observable<ChatMessage> {
    return this.http.delete<ChatMessage>(`${environment.apiUrl}/conversations/${conversationId}/messages/${messageId}/pin`);
  }

  uploadAttachment(conversationId: string, file: File): Observable<{ url: string; type: 'IMAGE' | 'VOICE' }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; type: 'IMAGE' | 'VOICE' }>(
      `${environment.apiUrl}/conversations/${conversationId}/attachments`,
      formData,
    );
  }
}
