import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Memory } from '../models/memory.model';
import { Journey } from '../models/journey.model';
import { User } from '../models/user.model';
import { environment } from '@env/environment';

export interface SharedLinkResponse {
  id: string;
  token: string;
  shareUrl: string;
  resourceType: 'MEMORY' | 'JOURNEY' | 'COLLECTION';
  resourceId: string;
  viewCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface PublicSharedData {
  resourceType: 'MEMORY' | 'JOURNEY' | 'COLLECTION';
  token: string;
  viewCount: number;
  sharedAt: string;
  sharedBy: User;
  memory?: Memory;
  journey?: Journey;
}

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  createShareLink(resourceType: 'MEMORY' | 'JOURNEY' | 'COLLECTION', resourceId: string, expiresInDays?: number): Observable<SharedLinkResponse> {
    return this.api.post<SharedLinkResponse>('/shared-links', {
      resourceType,
      resourceId,
      expiresInDays
    });
  }

  getPublicData(token: string): Observable<PublicSharedData> {
    return this.api.get<PublicSharedData>(`/public/s/${token}`);
  }

  downloadMemoryZip(memoryId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/export/memory/${memoryId}/zip`, { responseType: 'blob' });
  }

  downloadJourneyZip(journeyId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/export/journey/${journeyId}/zip`, { responseType: 'blob' });
  }

  getMemoryBookUrl(memoryId: string): string {
    return `${environment.apiUrl}/export/memory/${memoryId}/book`;
  }

  getJourneyBookUrl(journeyId: string): string {
    return `${environment.apiUrl}/export/journey/${journeyId}/book`;
  }
}
