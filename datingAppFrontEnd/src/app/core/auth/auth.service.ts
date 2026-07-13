import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  TwoFactorChallenge,
  User,
  isTwoFactorChallenge,
} from './auth.models';

const ACCESS_TOKEN_KEY = 'datingapp_access_token';
const REFRESH_TOKEN_KEY = 'datingapp_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Returns a TwoFactorChallenge instead of tokens when the account has 2FA enabled - see isTwoFactorChallenge(). */
  login(payload: LoginPayload): Observable<AuthResponse | TwoFactorChallenge> {
    return this.http
      .post<AuthResponse | TwoFactorChallenge>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        tap((res) => {
          if (!isTwoFactorChallenge(res)) {
            this.setSession(res);
          }
        }),
      );
  }

  verifyTwoFactorLogin(challengeToken: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/2fa/login-verify`, { challengeToken, code })
      .pipe(tap((res) => this.setSession(res)));
  }

  setupTwoFactor(): Observable<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    return this.http.post<{ otpauthUrl: string; qrCodeDataUrl: string }>(
      `${environment.apiUrl}/auth/2fa/setup`,
      {},
    );
  }

  confirmTwoFactor(code: string): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/2fa/verify`, { code })
      .pipe(tap(() => this.refreshCurrentUser()));
  }

  disableTwoFactor(password: string): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/2fa/disable`, { password })
      .pipe(tap(() => this.refreshCurrentUser()));
  }

  private refreshCurrentUser(): void {
    this.loadCurrentUser().subscribe();
  }

  refreshAccessToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((res) => this.setSession(res)));
  }

  loadCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  /** Called once at app startup to restore the session from a stored access token, if any. */
  bootstrap(): Observable<User | null> {
    if (!this.getAccessToken()) {
      return of(null);
    }
    return this.loadCurrentUser().pipe(
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private setSession(res: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.currentUser.set(null);
  }
}
