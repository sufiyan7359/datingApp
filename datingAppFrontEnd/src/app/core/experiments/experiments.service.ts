import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExperimentAssignment } from './experiments.models';

@Injectable({ providedIn: 'root' })
export class ExperimentsService {
  private readonly http = inject(HttpClient);

  getAssignment(key: string): Observable<ExperimentAssignment> {
    return this.http.get<ExperimentAssignment>(`${environment.apiUrl}/experiments/${key}/assignment`);
  }
}
