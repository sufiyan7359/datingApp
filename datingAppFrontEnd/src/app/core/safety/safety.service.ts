import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BlockedUser, ReportReason } from './safety.models';

@Injectable({ providedIn: 'root' })
export class SafetyService {
  private readonly http = inject(HttpClient);

  readonly blockedUsers = signal<BlockedUser[]>([]);

  block(userId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/safety/block`, { userId });
  }

  unblock(userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/safety/block/${userId}`).pipe(
      tap(() => this.blockedUsers.update((current) => current.filter((u) => u.userId !== userId))),
    );
  }

  loadBlocked(): Observable<BlockedUser[]> {
    return this.http
      .get<BlockedUser[]>(`${environment.apiUrl}/safety/blocked`)
      .pipe(tap((users) => this.blockedUsers.set(users)));
  }

  report(userId: string, reason: ReportReason, description?: string, alsoBlock?: boolean): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/safety/report`, {
      userId,
      reason,
      description: description || undefined,
      alsoBlock,
    });
  }
}
