import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VerificationStatusInfo } from './verification.models';

@Injectable({ providedIn: 'root' })
export class VerificationService {
  private readonly http = inject(HttpClient);

  readonly status = signal<VerificationStatusInfo | null>(null);

  loadStatus(): Observable<VerificationStatusInfo> {
    return this.http
      .get<VerificationStatusInfo>(`${environment.apiUrl}/verification/me`)
      .pipe(tap((status) => this.status.set(status)));
  }

  submit(file: File): Observable<VerificationStatusInfo> {
    const formData = new FormData();
    formData.append('selfie', file);
    return this.http
      .post<VerificationStatusInfo>(`${environment.apiUrl}/verification/submit`, formData)
      .pipe(tap((status) => this.status.set(status)));
  }
}
