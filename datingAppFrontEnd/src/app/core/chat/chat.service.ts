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

/** Nest's WS exception filter emits this shape for any rejected socket action. */
export interface SocketErrorEvent {
  status: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;

  readonly conversations = signal<Conversation[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly typingUserIds = signal<Set<string>>(new Set());
  readonly onlineUserIds = signal<Set<string>>(new Set());
  readonly isConnected = signal(false);
  readonly lastError = signal<SocketErrorEvent | null>(null);

  /**
   * The connection is app-wide now (not scoped to a single chat screen), so
   * "conversations" gets live preview updates for every conversation, but
   * "messages" (the detailed history) must stay scoped to whichever
   * conversation is actually open on screen - otherwise a message arriving
   * for conversation A while the user is viewing conversation B would leak
   * into B's message list. ChatingBoxComponent sets/clears this on enter/leave.
   */
  readonly activeConversationId = signal<string | null>(null);

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

    this.socket.on('connect', () => this.isConnected.set(true));
    this.socket.on('disconnect', () => this.isConnected.set(false));
    this.socket.on('exception', (err: SocketErrorEvent) => this.lastError.set(err));

    this.socket.on('newMessage', (message: ChatMessage) => {
      if (message.conversationId === this.activeConversationId()) {
        this.messages.update((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
      }
      this.bumpConversationPreview(message);
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
      this.conversations.update((current) =>
        current.map((c) => (c.otherUserId === event.userId ? { ...c, otherIsOnline: event.online } : c)),
      );
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected.set(false);
  }

  /** Call on entering a chat screen; pass null on leaving it. See activeConversationId above. */
  setActiveConversation(conversationId: string | null): void {
    this.activeConversationId.set(conversationId);
    if (conversationId === null) {
      this.messages.set([]);
    }
  }

  /** Generic escape hatch for other services (e.g. CallService) sharing this one connection. */
  on<T = unknown>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    this.socket?.off(event, handler);
  }

  emit<TAck = unknown>(event: string, payload: unknown, ack?: (response: TAck) => void): void {
    if (ack) {
      this.socket?.emit(event, payload, ack);
    } else {
      this.socket?.emit(event, payload);
    }
  }

  private bumpConversationPreview(message: ChatMessage): void {
    const currentUserId = this.authService.currentUser()?.id;
    this.conversations.update((current) =>
      current.map((c) => {
        if (c.conversationId !== message.conversationId) return c;
        const isIncoming = message.senderId !== currentUserId;
        return { ...c, lastMessage: message, unreadCount: isIncoming ? c.unreadCount + 1 : c.unreadCount };
      }),
    );
  }

  sendMessage(conversationId: string, payload: { type: 'TEXT' | 'IMAGE' | 'VOICE'; content?: string; mediaUrl?: string; replyToId?: string }): void {
    this.socket?.emit('sendMessage', { conversationId, ...payload });
  }

  setTyping(conversationId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  markRead(conversationId: string, upToMessageId: string): void {
    this.socket?.emit('markRead', { conversationId, upToMessageId });
    this.conversations.update((current) =>
      current.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
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

  setMuted(conversationId: string, muted: boolean): Observable<void> {
    const request$ = muted
      ? this.http.post<void>(`${environment.apiUrl}/conversations/${conversationId}/mute`, {})
      : this.http.delete<void>(`${environment.apiUrl}/conversations/${conversationId}/mute`);
    return request$.pipe(
      tap(() => {
        this.conversations.update((current) =>
          current.map((c) => (c.conversationId === conversationId ? { ...c, isMuted: muted } : c)),
        );
      }),
    );
  }
}
