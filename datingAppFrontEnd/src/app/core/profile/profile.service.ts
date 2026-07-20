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

  uploadCoverPhoto(file: File): Observable<Profile> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http
      .post<Profile>(`${environment.apiUrl}/profiles/me/cover-photo`, formData)
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

  setPrimaryPhoto(photoId: string): Observable<Photo> {
    return this.http.patch<Photo>(`${environment.apiUrl}/profiles/me/photos/${photoId}/primary`, {}).pipe(
      tap((updated) => {
        const current = this.profile();
        if (!current) return;

        // The backend swaps `order` with whoever was order:0, since every
        // photo list (discovery, matches, messages, this profile's own hero)
        // reads photos[0] after sorting by order, not the isPrimary flag -
        // mirror that swap locally so the UI doesn't wait on a reload to
        // agree with what was just picked.
        const previousOrder = current.photos.find((p) => p.id === photoId)?.order ?? 0;
        const photos = current.photos
          .map((p) => {
            if (p.id === updated.id) return { ...p, ...updated };
            if (p.order === updated.order) return { ...p, order: previousOrder, isPrimary: false };
            return { ...p, isPrimary: false };
          })
          .sort((a, b) => a.order - b.order);

        this.profile.set({ ...current, photos });
      }),
    );
  }

  setPhotoBlur(photoId: string, isBlurred: boolean): Observable<Photo> {
    return this.http
      .patch<Photo>(`${environment.apiUrl}/profiles/me/photos/${photoId}/blur`, { isBlurred })
      .pipe(
        tap((updated) => {
          const current = this.profile();
          if (current) {
            this.profile.set({
              ...current,
              photos: current.photos.map((p) => (p.id === updated.id ? updated : p)),
            });
          }
        }),
      );
  }
}
