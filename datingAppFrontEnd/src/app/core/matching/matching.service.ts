import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LikesReceived, MatchInfo, SwipeAction, SwipeLimits, SwipeResult } from './matching.models';

@Injectable({ providedIn: 'root' })
export class MatchingService {
  private readonly http = inject(HttpClient);

  readonly matches = signal<MatchInfo[]>([]);
  readonly limits = signal<SwipeLimits | null>(null);

  swipe(targetUserId: string, action: SwipeAction): Observable<SwipeResult> {
    return this.http.post<SwipeResult>(`${environment.apiUrl}/swipes`, { targetUserId, action });
  }

  undoLastSwipe(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/swipes/last`);
  }

  loadLimits(): Observable<SwipeLimits> {
    return this.http
      .get<SwipeLimits>(`${environment.apiUrl}/swipes/limits`)
      .pipe(tap((limits) => this.limits.set(limits)));
  }

  loadMatches(): Observable<MatchInfo[]> {
    return this.http
      .get<MatchInfo[]>(`${environment.apiUrl}/matches`)
      .pipe(tap((matches) => this.matches.set(matches)));
  }

  activateBoost(): Observable<{ boostedUntil: string }> {
    return this.http.post<{ boostedUntil: string }>(`${environment.apiUrl}/profiles/me/boost`, {});
  }

  loadLikesReceived(): Observable<LikesReceived> {
    return this.http.get<LikesReceived>(`${environment.apiUrl}/swipes/likes-received`);
  }
}
