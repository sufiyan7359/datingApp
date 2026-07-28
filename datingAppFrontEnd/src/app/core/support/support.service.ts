import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatService } from '../chat/chat.service';
import { SupportMessage, SupportThread } from './support.models';

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly http = inject(HttpClient);
  private readonly chatService = inject(ChatService);
  private listenerBound = false;

  readonly thread = signal<SupportThread | null>(null);

  /**
   * Wires the live-message listener onto the shared chat socket. Must be
   * called after ChatService.connect() (see app.component.ts) - calling it
   * from this service's constructor doesn't work because SupportService is
   * only ever lazily constructed (the first time some component injects it,
   * e.g. MessagesComponent), which can happen before or after connect() has
   * assigned the underlying socket. ChatService.on() silently no-ops if the
   * socket doesn't exist yet, so a listener registered too early is never
   * actually attached - this mirrors CallService.bindSignaling()'s exact
   * reasoning and guard-flag pattern.
   */
  bindSocketListener(): void {
    if (this.listenerBound) return;
    this.listenerBound = true;

    this.chatService.on<SupportMessage>('supportMessage', (message) => {
      const current = this.thread();
      if (current) {
        this.thread.set({
          ...current,
          messages: [...current.messages, message],
          unreadCount: current.unreadCount + 1,
        });
      } else {
        // Thread hasn't been loaded in this session yet (user hasn't
        // visited Messages/Support) - fetch it now so the message isn't
        // lost, instead of silently dropping it.
        this.getMyThread().subscribe();
      }
    });
  }

  getMyThread(): Observable<SupportThread> {
    return this.http
      .get<SupportThread>(`${environment.apiUrl}/support/thread`)
      .pipe(tap((thread) => this.thread.set(thread)));
  }

  sendMessage(content: string): Observable<SupportMessage> {
    return this.http.post<SupportMessage>(`${environment.apiUrl}/support/thread/messages`, { content }).pipe(
      tap((message) => {
        const current = this.thread();
        if (current) {
          this.thread.set({ ...current, messages: [...current.messages, message] });
        }
      }),
    );
  }

  markRead(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/support/thread/read`, {}).pipe(
      tap(() => {
        const current = this.thread();
        if (current) {
          this.thread.set({ ...current, unreadCount: 0 });
        }
      }),
    );
  }
}
