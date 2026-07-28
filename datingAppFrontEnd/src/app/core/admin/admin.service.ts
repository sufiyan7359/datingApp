import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminPromoCode,
  AdminReport,
  AdminReportsPage,
  AdminUpdateProfilePayload,
  AdminUserDetail,
  AdminUsersPage,
  AdminVerification,
  AdminVerificationsPage,
  AnalyticsEventType,
  AnalyticsSummary,
  DashboardStats,
  Experiment,
  ExperimentResults,
  Growth,
  ReportStatus,
  RiskAssessment,
  VerificationStatus,
} from './admin.models';
import { Profile } from '../profile/profile.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${environment.apiUrl}/admin/dashboard/stats`);
  }

  getGrowth(days: number): Observable<Growth> {
    const params = new HttpParams().set('days', days);
    return this.http.get<Growth>(`${environment.apiUrl}/admin/dashboard/growth`, { params });
  }

  listUsers(search: string, page: number, limit = 20): Observable<AdminUsersPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<AdminUsersPage>(`${environment.apiUrl}/admin/users`, { params });
  }

  getUserDetail(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${environment.apiUrl}/admin/users/${id}`);
  }

  getRiskAssessment(id: string): Observable<RiskAssessment> {
    return this.http.get<RiskAssessment>(`${environment.apiUrl}/admin/users/${id}/risk`);
  }

  suspendUser(id: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/admin/users/${id}/suspend`, {});
  }

  reactivateUser(id: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/admin/users/${id}/reactivate`, {});
  }

  getUserProfile(id: string): Observable<Profile> {
    return this.http.get<Profile>(`${environment.apiUrl}/admin/users/${id}/profile`);
  }

  updateUserProfile(id: string, payload: AdminUpdateProfilePayload): Observable<Profile> {
    return this.http.patch<Profile>(`${environment.apiUrl}/admin/users/${id}/profile`, payload);
  }

  deleteUserPhoto(id: string, photoId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/users/${id}/photos/${photoId}`);
  }

  listReports(status: ReportStatus | '', page: number, limit = 20): Observable<AdminReportsPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<AdminReportsPage>(`${environment.apiUrl}/admin/reports`, { params });
  }

  reviewReport(
    id: string,
    status: 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED',
    adminNote: string,
    suspendReportedUser: boolean,
  ): Observable<AdminReport> {
    return this.http.patch<AdminReport>(`${environment.apiUrl}/admin/reports/${id}`, {
      status,
      adminNote: adminNote || undefined,
      suspendReportedUser,
    });
  }

  listPromoCodes(): Observable<AdminPromoCode[]> {
    return this.http.get<AdminPromoCode[]>(`${environment.apiUrl}/admin/promo-codes`);
  }

  createPromoCode(
    code: string,
    discountPercent: number,
    maxRedemptions: number | null,
    expiresAt: string | null,
  ): Observable<AdminPromoCode> {
    return this.http.post<AdminPromoCode>(`${environment.apiUrl}/admin/promo-codes`, {
      code,
      discountPercent,
      maxRedemptions: maxRedemptions || undefined,
      expiresAt: expiresAt || undefined,
    });
  }

  setPromoCodeActive(id: string, isActive: boolean): Observable<AdminPromoCode> {
    return this.http.patch<AdminPromoCode>(`${environment.apiUrl}/admin/promo-codes/${id}`, { isActive });
  }

  listVerifications(
    status: VerificationStatus,
    page: number,
    limit = 20,
  ): Observable<AdminVerificationsPage> {
    const params = new HttpParams().set('status', status).set('page', page).set('limit', limit);
    return this.http.get<AdminVerificationsPage>(`${environment.apiUrl}/admin/verifications`, {
      params,
    });
  }

  reviewVerification(
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    note: string,
  ): Observable<AdminVerification> {
    return this.http.patch<AdminVerification>(`${environment.apiUrl}/admin/verifications/${userId}`, {
      status,
      note: note || undefined,
    });
  }

  getAnalyticsSummary(days: number): Observable<AnalyticsSummary> {
    const params = new HttpParams().set('days', days);
    return this.http.get<AnalyticsSummary>(`${environment.apiUrl}/admin/analytics/summary`, { params });
  }

  listExperiments(): Observable<Experiment[]> {
    return this.http.get<Experiment[]>(`${environment.apiUrl}/admin/experiments`);
  }

  createExperiment(key: string, name: string, variantBPercent: number): Observable<Experiment> {
    return this.http.post<Experiment>(`${environment.apiUrl}/admin/experiments`, {
      key,
      name,
      variantBPercent,
    });
  }

  setExperimentActive(key: string, isActive: boolean): Observable<Experiment> {
    return this.http.patch<Experiment>(`${environment.apiUrl}/admin/experiments/${key}`, { isActive });
  }

  getExperimentResults(key: string, goalEvent: AnalyticsEventType): Observable<ExperimentResults> {
    const params = new HttpParams().set('goalEvent', goalEvent);
    return this.http.get<ExperimentResults>(`${environment.apiUrl}/admin/experiments/${key}/results`, {
      params,
    });
  }
}
