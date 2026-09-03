import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../models/api-response.model';
import { TrashItem } from '../models/trash.model';

@Injectable({
  providedIn: 'root'
})
export class TrashService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/trash';

  getTrashItems(): Observable<TrashItem[]> {
    return this.http.get<ApiResponse<TrashItem[]>>(this.baseUrl).pipe(
      map(res => res.data || [])
    );
  }

  restoreMemory(id: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/restore/memory/${id}`, {}).pipe(
      map(res => res.data)
    );
  }

  restoreJourney(id: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/restore/journey/${id}`, {}).pipe(
      map(res => res.data)
    );
  }

  hardDeleteMemory(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/memory/${id}`).pipe(
      map(res => res.data)
    );
  }

  hardDeleteJourney(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/journey/${id}`).pipe(
      map(res => res.data)
    );
  }

  emptyTrash(): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/empty`).pipe(
      map(res => res.data)
    );
  }
}
