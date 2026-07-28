import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminSupportThreadsPage,
  SupportMessage,
  SupportThreadDetail,
} from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminSupportService {
  private readonly http = inject(HttpClient);

  listThreads(page = 1, limit = 20): Observable<AdminSupportThreadsPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<AdminSupportThreadsPage>(`${environment.apiUrl}/admin/support/threads`, { params });
  }

  getThread(userId: string): Observable<SupportThreadDetail> {
    return this.http.get<SupportThreadDetail>(`${environment.apiUrl}/admin/support/threads/${userId}`);
  }

  sendMessage(userId: string, content: string): Observable<SupportMessage> {
    return this.http.post<SupportMessage>(`${environment.apiUrl}/admin/support/threads/${userId}/messages`, {
      content,
    });
  }

  markRead(userId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/admin/support/threads/${userId}/read`, {});
  }
}
