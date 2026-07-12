import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Photo, Profile, UpdateProfilePayload } from './profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  readonly profile = signal<Profile | null>(null);

  loadProfile(): Observable<Profile> {
    return this.http
      .get<Profile>(`${environment.apiUrl}/profiles/me`)
      .pipe(tap((profile) => this.profile.set(profile)));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<Profile> {
    return this.http
      .patch<Profile>(`${environment.apiUrl}/profiles/me`, payload)
      .pipe(tap((profile) => this.profile.set(profile)));
  }

  uploadPhoto(file: File): Observable<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<Photo>(`${environment.apiUrl}/profiles/me/photos`, formData).pipe(
      tap((photo) => {
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, photos: [...current.photos, photo] });
        }
      }),
    );
  }

  deletePhoto(photoId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/profiles/me/photos/${photoId}`).pipe(
      tap(() => {
        const current = this.profile();
        if (current) {
          this.profile.set({ ...current, photos: current.photos.filter((p) => p.id !== photoId) });
        }
      }),
    );
  }
}
