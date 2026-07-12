import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DiscoveryFeed, DiscoveryFilters } from './discovery.models';

@Injectable({ providedIn: 'root' })
export class DiscoveryService {
  private readonly http = inject(HttpClient);

  getFeed(filters: DiscoveryFilters): Observable<DiscoveryFeed> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<DiscoveryFeed>(`${environment.apiUrl}/discovery/feed`, { params });
  }
}
