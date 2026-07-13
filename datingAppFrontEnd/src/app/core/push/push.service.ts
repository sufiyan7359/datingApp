import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PushSubscriptionPayload } from './push.models';

export type PushStatus = 'unsupported' | 'unsubscribed' | 'subscribed';

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);

  readonly isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  readonly status = signal<PushStatus>(this.isSupported ? 'unsubscribed' : 'unsupported');

  async refreshStatus(): Promise<void> {
    if (!this.isSupported) return;
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    const existing = await registration.pushManager.getSubscription();
    this.status.set(existing ? 'subscribed' : 'unsubscribed');
  }

  async subscribe(): Promise<void> {
    if (!this.isSupported) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission was not granted');
    }

    const registration = await navigator.serviceWorker.register('/push-sw.js');
    const { publicKey } = await firstValueFrom(
      this.http.get<{ publicKey: string }>(`${environment.apiUrl}/notifications/vapid-public-key`),
    );

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await firstValueFrom(
      this.http.post<void>(`${environment.apiUrl}/notifications/subscribe`, subscription.toJSON()),
    );
    this.status.set('subscribed');
  }

  async unsubscribe(): Promise<void> {
    if (!this.isSupported) return;
    const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) {
      this.status.set('unsubscribed');
      return;
    }

    const payload = subscription.toJSON() as PushSubscriptionPayload;
    await subscription.unsubscribe();
    await firstValueFrom(
      this.http.request<void>('DELETE', `${environment.apiUrl}/notifications/subscribe`, {
        body: { endpoint: payload.endpoint },
      }),
    );
    this.status.set('unsubscribed');
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
