import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Plan, PromoValidation, SubscriptionStatus } from './subscriptions.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);

  readonly status = signal<SubscriptionStatus | null>(null);

  loadPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${environment.apiUrl}/subscriptions/plans`);
  }

  loadStatus(): Observable<SubscriptionStatus> {
    return this.http
      .get<SubscriptionStatus>(`${environment.apiUrl}/subscriptions/me`)
      .pipe(tap((status) => this.status.set(status)));
  }

  validatePromo(code: string): Observable<PromoValidation> {
    return this.http.post<PromoValidation>(`${environment.apiUrl}/subscriptions/promo/validate`, { code });
  }

  subscribe(tier: 'GOLD' | 'PLATINUM', billingCycle: Plan['billingCycle'], promoCode?: string): Observable<SubscriptionStatus> {
    return this.http
      .post<SubscriptionStatus>(`${environment.apiUrl}/subscriptions/subscribe`, { tier, billingCycle, promoCode: promoCode || undefined })
      .pipe(tap((status) => this.status.set(status)));
  }

  cancelAutoRenew(): Observable<SubscriptionStatus> {
    return this.http
      .post<SubscriptionStatus>(`${environment.apiUrl}/subscriptions/cancel`, {})
      .pipe(tap((status) => this.status.set(status)));
  }
}
