import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { UploadedMediaResult } from '../models/media.model';
import { Media } from '../models/memory.model';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/media';

  uploadSingleFile(file: File): Observable<UploadedMediaResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ApiResponse<UploadedMediaResult>>(`${this.baseUrl}/upload`, formData).pipe(
      map(res => res.data)
    );
  }

  updateTranscript(mediaId: string, transcript: string): Observable<Media> {
    return this.http.put<ApiResponse<Media>>(`${this.baseUrl}/${mediaId}/transcript`, { transcript }).pipe(
      map(res => res.data)
    );
  }
}
